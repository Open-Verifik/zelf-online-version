require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const config = require("../../Core/config");
const VaultLegacy = require("./models/vault-legacy.model");
const LegacyDemo = require("./modules/vault-legacy-demo.module");
const { sendTestatorGracePeriod, sendLawyerLivenessFailed } = require("./modules/email");

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || process.env.MONGODB_URL;
const AVALANCHE_RPC_URL = process.env.LEGACY_AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const CONTRACT_ADDRESS = process.env.LEGACY_VAULT_REGISTRY_ADDRESS;

const isDemoSuccessionSuccess = (result) =>
    Boolean(
        result?.success ||
            result?.reason === "already_claimable" ||
            result?.reason === "beneficiary_emails_catchup"
    );

async function runCronJob() {
    console.log(`\n🔍 [${new Date().toISOString()}] Cron: checking vault states from MongoDB...`);

    if (!MONGODB_URI || !CONTRACT_ADDRESS) {
        console.error("❌ Missing required environment variables (MONGODB_URI or LEGACY_VAULT_REGISTRY_ADDRESS)");
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const provider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL);
    const abiPath = path.resolve(__dirname, "./contracts/VaultRegistry.json");
    const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const vaultContract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, provider);

    const vaults = await VaultLegacy.find({});
    const now = Math.floor(Date.now() / 1000);

    let checked = 0,
        warned = 0,
        errors = 0,
        demoConfirmed = 0,
        demoEmailsCatchup = 0;

    for (const entry of vaults) {
        checked++;
        const vaultId = entry.vaultId;

        try {
            let vault = await vaultContract.getVault(vaultId);
            if (!vault.exists) continue;

            // Backfill isDemo when on-chain lawyer matches demo lawyer (register-emails may have missed isDemo)
            if (
                !entry.isDemo &&
                config.legacyDemo?.enabled &&
                LegacyDemo.isDemoLawyerAddress(vault.lawyer)
            ) {
                entry.isDemo = true;
                await entry.save();
                console.log(`[LEGACY-DEMO] Marked vault ${vaultId} as isDemo (lawyer address match)`);
            }

            let state = Number(vault.state);
            const lastPing = Number(vault.lastPing);
            const heartbeatInterval = Number(vault.heartbeatInterval);
            const timeSincePing = now - lastPing;
            const fractionElapsed = heartbeatInterval > 0 ? timeSincePing / heartbeatInterval : 0;

            let updatedEvents = false;
            const notifiedEvents = entry.notifiedEvents || {};

            const isDemoVault = entry.isDemo && config.legacyDemo?.enabled;

            // Demo: auto-accept if still pending lawyer but heartbeat already expired
            if (isDemoVault && state === 0 && fractionElapsed >= 1.0) {
                console.log(`[LEGACY-DEMO] Vault ${vaultId} pending lawyer but heartbeat expired — auto-accepting`);
                await LegacyDemo.ensureVaultAccepted(vaultId).catch((e) =>
                    console.error(`[LEGACY-DEMO] ensureVaultAccepted failed for ${vaultId}:`, e.message)
                );
                vault = await vaultContract.getVault(vaultId);
                state = Number(vault.state);
            }

            if (state === 1 || state === 2) {
                const daysRemaining = Math.max(0, Math.floor((heartbeatInterval - timeSincePing) / 86400));

                if (fractionElapsed >= 0.75 && !notifiedEvents.gracePeriod) {
                    if (entry.testatorEmail) {
                        console.log(`⚠️ Vault ${vaultId}: sending grace period warning to testator`);
                        await sendTestatorGracePeriod(entry.testatorEmail, vaultId, daysRemaining).catch((e) =>
                            console.error("❌ Grace period email failed:", e.message)
                        );
                        notifiedEvents.gracePeriod = new Date().toISOString();
                        updatedEvents = true;
                        warned++;
                    }
                }

                if (fractionElapsed >= 1.0 && !notifiedEvents.livenessFailed) {
                    if (isDemoVault) {
                        const demoResult = await LegacyDemo.autoConfirmDeath(vaultId, { fractionElapsed }).catch(
                            (e) => {
                                console.error(`[LEGACY-DEMO] autoConfirmDeath cron error for ${vaultId}:`, e.message);
                                return { skipped: true, error: e.message };
                            }
                        );
                        if (isDemoSuccessionSuccess(demoResult)) {
                            demoConfirmed++;
                            if (demoResult?.reason === "beneficiary_emails_catchup") demoEmailsCatchup++;
                            notifiedEvents.livenessFailed = new Date().toISOString();
                            updatedEvents = true;
                        } else if (demoResult?.reason === "no_beneficiary_emails") {
                            console.warn(
                                `[LEGACY-DEMO] Vault ${vaultId}: succession ready but beneficiaryEmails is empty in Mongo`
                            );
                        }
                    } else if (entry.lawyerEmail) {
                        const testatorAddress = vault.owner;
                        console.log(`🔔 Vault ${vaultId}: sending liveness-failed email to lawyer`);
                        await sendLawyerLivenessFailed(entry.lawyerEmail, vaultId, testatorAddress).catch((e) =>
                            console.error("❌ Liveness failed email failed:", e.message)
                        );
                        notifiedEvents.livenessFailed = new Date().toISOString();
                        updatedEvents = true;
                        warned++;
                    }
                }
            }

            if (state === 1 && fractionElapsed < 0.5) {
                if (notifiedEvents.gracePeriod || notifiedEvents.livenessFailed) {
                    delete notifiedEvents.gracePeriod;
                    delete notifiedEvents.livenessFailed;
                    updatedEvents = true;
                    console.log(`♻️ Vault ${vaultId}: reset notification flags (testator pinged)`);
                }
            }

            if (updatedEvents) {
                entry.notifiedEvents = notifiedEvents;
                entry.markModified("notifiedEvents");
                await entry.save();
            }
        } catch (e) {
            console.error(`❌ Error checking vault ${vaultId}:`, e.message);
            errors++;
        }
    }

    console.log(
        `✅ Cron complete: ${checked} checked, ${warned} warnings sent, ${demoConfirmed} demo succession handled, ${demoEmailsCatchup} beneficiary catch-up, ${errors} errors.`
    );

    await mongoose.disconnect();
    process.exit(0);
}

runCronJob().catch((err) => {
    console.error("❌ Cron failed:", err.message);
    process.exit(1);
});
