/**
 * VaultLegacy demo mode — gated automation for demo inheritance plans only.
 * Requires LEGACY_DEMO_MODE=true and per-vault isDemo in MongoDB.
 */

const config = require("../../../Core/config");
const VaultLegacy = require("../models/vault-legacy.model");
const AvalancheManager = require("./avalanche-legacy.module");
const { sendTestatorPlanActive, sendBeneficiaryClaimable } = require("./email");

/** On-chain VaultRegistry.VaultState (inferred from backend usage) */
const VAULT_STATE = {
    PENDING_LAWYER: 0,
    ACTIVE: 1,
    WARNING: 2,
};

let _demoAvalancheManager = null;

const log = (msg) => console.log(`[LEGACY-DEMO] ${msg}`);

const isDemoModeEnabled = () => Boolean(config.legacyDemo?.enabled);

const getDemoLawyerAddress = () => (config.legacyDemo?.lawyerAddress || "").trim().toLowerCase();

const normalizeAddress = (address) => (address || "").trim().toLowerCase();

const normalizeVaultId = (vaultId) => {
    if (vaultId == null) return "";
    let hex;
    if (typeof vaultId === "bigint") {
        hex = vaultId.toString(16);
    } else {
        const s = String(vaultId).trim().toLowerCase();
        hex = s.startsWith("0x") ? s.slice(2) : s;
        if (!/^[0-9a-f]+$/i.test(hex)) {
            hex = BigInt(s).toString(16);
        }
    }
    return `0x${hex.padStart(64, "0")}`;
};

const assertDemoModeEnabled = () => {
    if (!isDemoModeEnabled()) {
        const err = new Error("Legacy demo mode is not enabled on this server");
        err.status = 403;
        throw err;
    }
    const lawyer = getDemoLawyerAddress();
    if (!lawyer) {
        const err = new Error("LEGACY_DEMO_LAWYER_ADDRESS is not configured");
        err.status = 503;
        throw err;
    }
};

const assertDemoLawyer = (lawyerAddress) => {
    assertDemoModeEnabled();
    const expected = getDemoLawyerAddress();
    const actual = normalizeAddress(lawyerAddress);
    if (!actual || actual !== expected) {
        const err = new Error(`Demo vaults must use lawyer address ${expected}`);
        err.status = 400;
        throw err;
    }
};

const getDemoAvalancheManager = () => {
    if (_demoAvalancheManager) return _demoAvalancheManager;

    const rpcUrl = process.env.LEGACY_AVALANCHE_RPC_URL || "http://127.0.0.1:8545";
    const contractAddress = process.env.LEGACY_VAULT_REGISTRY_ADDRESS;
    const privateKey =
        config.legacyDemo?.lawyerPrivateKey ||
        process.env.LEGACY_DEMO_LAWYER_PRIVATE_KEY ||
        process.env.LEGACY_RELAYER_PRIVATE_KEY;

    if (!privateKey) {
        const err = new Error("LEGACY_DEMO_LAWYER_PRIVATE_KEY or LEGACY_RELAYER_PRIVATE_KEY is required for demo automation");
        err.status = 503;
        throw err;
    }

    _demoAvalancheManager = new AvalancheManager(rpcUrl, contractAddress, privateKey);
    return _demoAvalancheManager;
};

const loadDemoVault = async (vaultId) => {
    const vaultIdNorm = normalizeVaultId(vaultId);
    const entry = await VaultLegacy.findOne({ vaultId: vaultIdNorm });
    if (!entry?.isDemo) {
        const err = new Error("Vault is not a demo inheritance plan");
        err.status = 404;
        throw err;
    }
    return entry;
};

const getIsDemoForVault = async (vaultId) => {
    const vaultIdNorm = normalizeVaultId(vaultId);
    const entry = await VaultLegacy.findOne({ vaultId: vaultIdNorm }).select("isDemo").lean();
    return Boolean(entry?.isDemo);
};

const assertNotDemoVaultForLawyerAction = async (vaultId) => {
    if (await getIsDemoForVault(vaultId)) {
        const err = new Error("Demo vaults are auto-accepted; lawyer action not required");
        err.status = 409;
        throw err;
    }
};

const resolveBeneficiaryTagName = (entry, vaultIdHex, index) => {
    const tagNames = entry.beneficiaryTagNames || [];
    const isSingle = entry.beneficiaryEmails.length === 1;
    let tagName = tagNames[index] || vaultIdHex;

    if (isSingle) {
        if (tagNames.length > 1) {
            const valTag = tagNames.find((t) => t.toLowerCase().includes("val"));
            if (valTag) tagName = valTag;
        }
        tagName = tagName.replace(/\.zelf$/, "");
    }
    return tagName;
};

/** Send claimable emails (awaited). Used after confirmDeath or when vault is already claimable. */
const notifyBeneficiaryClaimable = async (entry, vaultIdHex) => {
    if (!entry?.beneficiaryEmails?.length) {
        return { sent: 0, skipped: true, reason: "no_beneficiary_emails" };
    }

    const sends = entry.beneficiaryEmails.map((email, i) =>
        sendBeneficiaryClaimable(email, resolveBeneficiaryTagName(entry, vaultIdHex, i))
    );
    await Promise.all(sends);
    log(`notifyBeneficiaryClaimable: sent ${sends.length} email(s) for vault ${vaultIdHex}`);
    return { sent: sends.length, success: true };
};

/**
 * Idempotent beneficiary notification — safe to call from cron catch-up paths.
 */
const ensureBeneficiaryClaimableEmails = async (entry, vaultIdHex) => {
    if (entry.notifiedEvents?.beneficiaryClaimable) {
        return { skipped: true, reason: "already_notified" };
    }
    const result = await notifyBeneficiaryClaimable(entry, vaultIdHex);
    if (result.success) {
        await markNotifiedEvent(entry, "beneficiaryClaimable");
    }
    return result;
};

const markNotifiedEvent = async (entry, key) => {
    const notifiedEvents = { ...(entry.notifiedEvents || {}), [key]: new Date().toISOString() };
    entry.notifiedEvents = notifiedEvents;
    entry.markModified("notifiedEvents");
    await entry.save();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDemoLawyerAddress = (lawyerAddress) => {
    if (!isDemoModeEnabled()) return false;
    const expected = getDemoLawyerAddress();
    if (!expected) return false;
    return normalizeAddress(lawyerAddress) === expected;
};

/** Persist demo flag (e.g. when register-emails failed but on-chain lawyer is the demo lawyer). */
const markVaultAsDemo = async (vaultId, extra = {}) => {
    const vaultIdNorm = normalizeVaultId(vaultId);
    await VaultLegacy.findOneAndUpdate(
        { vaultId: vaultIdNorm },
        { $set: { isDemo: true, ...extra } },
        { upsert: true, new: true }
    );
    return vaultIdNorm;
};

/**
 * Auto-accept a demo vault after creation (skips lawyer manual acceptance).
 */
const autoAcceptVault = async (vaultId) => {
    if (!isDemoModeEnabled()) return { skipped: true, reason: "demo_mode_disabled" };

    const vaultIdNorm = normalizeVaultId(vaultId);
    let entry;
    try {
        entry = await loadDemoVault(vaultIdNorm);
    } catch (e) {
        if (e.status === 404) return { skipped: true, reason: "not_demo_vault" };
        throw e;
    }

    if (entry.notifiedEvents?.demoAutoAccepted) {
        return { skipped: true, reason: "already_auto_accepted" };
    }

    const manager = getDemoAvalancheManager();
    const demoLawyer = getDemoLawyerAddress();
    const vault = await manager.getVault(vaultIdNorm);

    if (!vault.exists) {
        log(`autoAcceptVault: vault ${vaultIdNorm} does not exist on-chain yet`);
        return { skipped: true, reason: "vault_not_found" };
    }

    if (vault.state !== VAULT_STATE.PENDING_LAWYER) {
        if (vault.state === VAULT_STATE.ACTIVE || vault.state === VAULT_STATE.WARNING) {
            return { success: true, skipped: true, reason: "already_active", state: vault.state };
        }
        log(`autoAcceptVault: vault ${vaultIdNorm} state=${vault.state}, not pending lawyer`);
        return { skipped: true, reason: "not_pending", state: vault.state };
    }

    if (normalizeAddress(vault.lawyer) !== demoLawyer) {
        log(`autoAcceptVault: vault ${vaultIdNorm} lawyer mismatch`);
        return { skipped: true, reason: "lawyer_mismatch" };
    }

    const result = await manager.acceptVault(demoLawyer, vaultIdNorm);
    log(`autoAcceptVault: accepted vault ${vaultIdNorm} tx=${result.transactionHash}`);

    if (entry.testatorEmail) {
        sendTestatorPlanActive(entry.testatorEmail, vaultIdNorm).catch((e) =>
            console.error("[LEGACY-DEMO] Testator active email failed:", e.message)
        );
    }

    await markNotifiedEvent(entry, "demoAutoAccepted");
    return { success: true, ...result };
};

const ACCEPT_RETRYABLE = new Set(["vault_not_found", "not_pending"]);

/**
 * Retry auto-accept until the vault is ACTIVE (required before updateHeartbeat).
 */
const ensureVaultAccepted = async (vaultId, { maxAttempts = 6, delayMs = 2000 } = {}) => {
    assertDemoModeEnabled();

    const vaultIdNorm = normalizeVaultId(vaultId);
    let lastResult = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (!(await getIsDemoForVault(vaultIdNorm))) {
            await markVaultAsDemo(vaultIdNorm);
        }

        lastResult = await autoAcceptVault(vaultIdNorm);

        if (lastResult?.success) return lastResult;
        if (lastResult?.reason === "already_auto_accepted" || lastResult?.reason === "already_active") {
            return { success: true, ...lastResult };
        }
        if (lastResult?.reason === "lawyer_mismatch") {
            const err = new Error(
                `Demo vault lawyer does not match LEGACY_DEMO_LAWYER_ADDRESS (${getDemoLawyerAddress()})`
            );
            err.status = 400;
            throw err;
        }

        if (attempt < maxAttempts && ACCEPT_RETRYABLE.has(lastResult?.reason)) {
            log(`ensureVaultAccepted: ${vaultIdNorm} attempt ${attempt} → ${lastResult.reason}, retrying…`);
            await sleep(delayMs);
            continue;
        }
        break;
    }

    const err = new Error(
        `Demo vault could not be auto-accepted (${lastResult?.reason || "unknown"}). ` +
            "Verify LEGACY_DEMO_MODE, LEGACY_DEMO_LAWYER_ADDRESS, and LEGACY_RELAYER_PRIVATE_KEY."
    );
    err.status = 503;
    err.details = lastResult;
    throw err;
};

/**
 * After relayed createVault: mark demo in Mongo from on-chain lawyer and auto-accept.
 */
const syncDemoVaultAfterCreate = async ({ vaultId, lawyerAddress }) => {
    if (!isDemoModeEnabled()) return { skipped: true, reason: "demo_mode_disabled" };
    if (!isDemoLawyerAddress(lawyerAddress)) return { skipped: true, reason: "not_demo_lawyer" };

    const vaultIdNorm = await markVaultAsDemo(vaultId);
    log(`syncDemoVaultAfterCreate: ${vaultIdNorm}`);
    return ensureVaultAccepted(vaultIdNorm);
};

/**
 * Auto-confirm succession for demo vaults after liveness period expires.
 */
const autoConfirmDeath = async (vaultId, { fractionElapsed } = {}) => {
    if (!isDemoModeEnabled()) return { skipped: true, reason: "demo_mode_disabled" };

    const vaultIdNorm = normalizeVaultId(vaultId);
    let entry;
    try {
        entry = await loadDemoVault(vaultIdNorm);
    } catch (e) {
        if (e.status === 404) return { skipped: true, reason: "not_demo_vault" };
        throw e;
    }

    if (entry.notifiedEvents?.demoAutoConfirmed) {
        const catchUp = await ensureBeneficiaryClaimableEmails(entry, vaultIdNorm);
        if (catchUp.success) {
            return { success: true, reason: "beneficiary_emails_catchup", ...catchUp };
        }
        return { skipped: true, reason: "already_auto_confirmed" };
    }

    const manager = getDemoAvalancheManager();
    const demoLawyer = getDemoLawyerAddress();
    const vault = await manager.getVault(vaultIdNorm);

    if (!vault.exists) {
        return { skipped: true, reason: "vault_not_found" };
    }

    if (vault.state !== VAULT_STATE.ACTIVE && vault.state !== VAULT_STATE.WARNING) {
        log(`autoConfirmDeath: vault ${vaultIdNorm} state=${vault.state}, skip`);
        return { skipped: true, reason: "invalid_state", state: vault.state };
    }

    const now = Math.floor(Date.now() / 1000);
    const timeSincePing = now - vault.lastPing;
    const elapsed = fractionElapsed != null ? fractionElapsed : timeSincePing / vault.heartbeatInterval;

    if (elapsed < 1.0) {
        return { skipped: true, reason: "heartbeat_not_expired", fractionElapsed: elapsed };
    }

    if (normalizeAddress(vault.lawyer) !== demoLawyer) {
        return { skipped: true, reason: "lawyer_mismatch" };
    }

    let claimable = false;
    try {
        claimable = await manager.isClaimable(vaultIdNorm);
    } catch {
        /* contract may revert before death confirmed */
    }

    if (claimable) {
        log(`autoConfirmDeath: vault ${vaultIdNorm} already claimable — sending beneficiary emails if needed`);
        const emailResult = await ensureBeneficiaryClaimableEmails(entry, vaultIdNorm);
        await markNotifiedEvent(entry, "demoAutoConfirmed");
        return { success: true, reason: "already_claimable", ...emailResult };
    }

    try {
        const result = await manager.confirmDeath(demoLawyer, vaultIdNorm);
        log(`autoConfirmDeath: confirmed vault ${vaultIdNorm} tx=${result.transactionHash}`);

        await ensureBeneficiaryClaimableEmails(entry, vaultIdNorm);
        await markNotifiedEvent(entry, "demoAutoConfirmed");
        return { success: true, ...result };
    } catch (e) {
        log(`autoConfirmDeath: vault ${vaultIdNorm} failed (${e.message}) — will retry on next cron`);
        return { skipped: true, reason: "confirm_failed", error: e.message };
    }
};

const resolveDemoHeartbeatInterval = (isDemo, heartbeatInterval) => {
    if (!isDemo) return heartbeatInterval;
    if (heartbeatInterval != null && heartbeatInterval > 0) return heartbeatInterval;
    return config.legacyDemo?.heartbeatInterval || 2592000;
};

const getDemoStatus = async () => {
    const RelayerHealth = require("./vault-legacy-relayer.module");
    const relayer = await RelayerHealth.getRelayerHealth().catch(() => ({
        contractAddress: null,
        onChainRelayer: null,
        serverRelayer: null,
        relayerMatches: false,
        relayerPrivateKeyConfigured: false,
    }));

    return {
        enabled: isDemoModeEnabled(),
        demoLawyerAddress: isDemoModeEnabled() ? getDemoLawyerAddress() : null,
        demoHeartbeatInterval: config.legacyDemo?.heartbeatInterval || 2592000,
        relayer,
    };
};

module.exports = {
    VAULT_STATE,
    isDemoModeEnabled,
    isDemoLawyerAddress,
    getDemoLawyerAddress,
    normalizeAddress,
    normalizeVaultId,
    assertDemoModeEnabled,
    assertDemoLawyer,
    markVaultAsDemo,
    loadDemoVault,
    getIsDemoForVault,
    assertNotDemoVaultForLawyerAction,
    autoAcceptVault,
    ensureVaultAccepted,
    syncDemoVaultAfterCreate,
    autoConfirmDeath,
    resolveDemoHeartbeatInterval,
    getDemoStatus,
    notifyBeneficiaryClaimable,
    ensureBeneficiaryClaimableEmails,
    resolveBeneficiaryTagName,
};
