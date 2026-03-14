/**
 * VaultLegacy Relay Controller (Koa)
 *
 * Handles relay endpoints called by the Android WebView JS bundle:
 *   - POST /api/vault-legacy/relay/ipfs-upload     → Pinata proxy
 *   - POST /api/vault-legacy/relay/send-tx         → broadcast pre-built calldata
 *   - POST /api/vault-legacy/relay/register-emails → email registry (MongoDB)
 *   - POST /api/vault-legacy/relay/collect-share   → in-memory share store
 *   - GET  /api/vault-legacy/relay/shares/:vaultId → retrieve collected shares
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const VaultLegacy = require("../models/vault-legacy.model");

const {
    sendLawyerNewPlan,
    sendTestatorPlanActive,
    sendBeneficiaryClaimable,
} = require("../modules/email");

const config = require("../../../Core/config");

// ─────────────────────────────────────────────────────────────────────────────
// Pinata keys (from Core/config)
// ─────────────────────────────────────────────────────────────────────────────
const PINATA_API_KEY = config.pinata.vaultLegacy.apiKey;
const PINATA_SECRET_KEY = config.pinata.vaultLegacy.secretKey;
const PINATA_JWT = config.pinata.vaultLegacy.jwt;

// ─────────────────────────────────────────────────────────────────────────────
// Relayer wallet + contract ABI
// ─────────────────────────────────────────────────────────────────────────────
const AVALANCHE_RPC_URL =
    process.env.LEGACY_AVALANCHE_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const RELAYER_PRIVATE_KEY = process.env.LEGACY_RELAYER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.LEGACY_VAULT_REGISTRY_ADDRESS;

let provider = null;
let relayerWallet = null;
let iface = null;

function initRelayer() {
    if (relayerWallet) return;

    console.log(
        `🔑 Pinata keys: API_KEY=${PINATA_API_KEY ? PINATA_API_KEY.slice(0, 6) + "..." : "MISSING"}, JWT=${PINATA_JWT ? "present" : "MISSING"}`
    );

    if (!RELAYER_PRIVATE_KEY) {
        console.warn("⚠️  LEGACY_RELAYER_PRIVATE_KEY not set — relay/send-tx will fail");
        return;
    }

    provider = new ethers.JsonRpcProvider(AVALANCHE_RPC_URL);
    relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    console.log(`🔑 VaultLegacy relayer wallet: ${relayerWallet.address}`);

    try {
        const abiPath = path.resolve(__dirname, "../contracts/VaultRegistry.json");
        const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
        iface = new ethers.Interface(artifact.abi);
    } catch {
        console.warn("⚠️  VaultRegistry ABI not found — calldata decoding disabled");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory share store (collect-share / get-shares)
// ─────────────────────────────────────────────────────────────────────────────
const collectedShares = {};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vault-legacy/relay/ipfs-upload
// ─────────────────────────────────────────────────────────────────────────────
const ipfsUpload = async (ctx) => {
    try {
        const { data, filename } = ctx.request.body;

        // Prefer JWT-based auth (modern Pinata), fall back to API key pair
        const pinataHeaders = { "Content-Type": "application/json" };
        if (PINATA_JWT) {
            pinataHeaders["Authorization"] = `Bearer ${PINATA_JWT}`;
        } else {
            pinataHeaders["pinata_api_key"] = PINATA_API_KEY;
            pinataHeaders["pinata_secret_api_key"] = PINATA_SECRET_KEY;
        }

        const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
            method: "POST",
            headers: pinataHeaders,
            body: JSON.stringify({
                pinataContent: data,
                pinataMetadata: { name: filename || "zelf-data" },
            }),
        });

        const rawText = await response.text();
        if (!response.ok) {
            console.error(`❌ Pinata API Error (${response.status}):`, rawText);
            ctx.status = 502;
            ctx.body = { error: rawText };
            return;
        }

        const result = JSON.parse(rawText);
        console.log(`✅ IPFS Proxy Upload: ${result.IpfsHash}`);
        ctx.body = { ipfsHash: result.IpfsHash };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: error.message };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vault-legacy/relay/register-emails
// ─────────────────────────────────────────────────────────────────────────────
const registerEmails = async (ctx) => {
    try {
        const { vaultId, testatorEmail, lawyerEmail, beneficiaryEmails, beneficiaryTagNames } =
            ctx.request.body;

        if (!vaultId) {
            ctx.status = 400;
            ctx.body = { error: "Missing vaultId" };
            return;
        }

        await VaultLegacy.findOneAndUpdate(
            { vaultId },
            {
                $set: {
                    testatorEmail: testatorEmail || null,
                    lawyerEmail: lawyerEmail || null,
                    beneficiaryEmails: beneficiaryEmails || [],
                    beneficiaryTagNames: beneficiaryTagNames || [],
                },
            },
            { upsert: true, new: true }
        );

        console.log(`📋 Registered emails for vault ${vaultId} (MongoDB)`);
        ctx.body = { success: true };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: error.message };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vault-legacy/relay/send-tx
// ─────────────────────────────────────────────────────────────────────────────
const sendTx = async (ctx) => {
    try {
        initRelayer();
        if (!relayerWallet) {
            ctx.status = 503;
            ctx.body = { error: "Relayer not configured" };
            return;
        }

        const { to, calldata, value } = ctx.request.body;
        if (!to || !calldata) {
            ctx.status = 400;
            ctx.body = { error: "Missing required fields: to, calldata" };
            return;
        }

        let fnName = "unknown";
        let decoded = null;
        if (iface) {
            try {
                decoded = iface.parseTransaction({ data: calldata });
                fnName = decoded?.name || "unknown";
            } catch { }
        }
        console.log(`📡 Relaying tx → ${fnName} (${calldata.substring(0, 10)}...)`);

        const tx = await relayerWallet.sendTransaction({ to, data: calldata, value: value || "0x0" });
        console.log(`📤 Tx sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Confirmed in block ${receipt.blockNumber}`);

        // ── Email notification hooks (fire-and-forget) ──────────────────────
        if (decoded) {
            try {
                if (fnName === "createVault") {
                    const vaultId = decoded.args[1];
                    const vaultIdHex =
                        typeof vaultId === "bigint"
                            ? "0x" + vaultId.toString(16).padStart(64, "0")
                            : vaultId.toString();
                    const testatorAddress = decoded.args[0];

                    const entry = await VaultLegacy.findOne({ vaultId: vaultIdHex });
                    if (entry?.lawyerEmail) {
                        console.log(`📧 Sending "new plan" email to lawyer ${entry.lawyerEmail}`);
                        sendLawyerNewPlan(entry.lawyerEmail, vaultIdHex, testatorAddress).catch(
                            (e) => console.error("❌ Lawyer email failed:", e.message)
                        );
                    }
                } else if (fnName === "acceptVault") {
                    const vaultIdHex = decoded.args[0].toString();
                    const entry = await VaultLegacy.findOne({ vaultId: vaultIdHex });
                    if (entry?.testatorEmail) {
                        console.log(
                            `📧 Sending "plan active" email to testator ${entry.testatorEmail}`
                        );
                        sendTestatorPlanActive(entry.testatorEmail, vaultIdHex).catch((e) =>
                            console.error("❌ Testator active email failed:", e.message)
                        );
                    }
                } else if (fnName === "confirmDeath") {
                    const vaultIdHex = decoded.args[0].toString();
                    const entry = await VaultLegacy.findOne({ vaultId: vaultIdHex });

                    if (entry && entry.beneficiaryEmails.length > 0) {
                        const tagNames = entry.beneficiaryTagNames || [];
                        const isSingle = entry.beneficiaryEmails.length === 1;

                        for (let i = 0; i < entry.beneficiaryEmails.length; i++) {
                            const email = entry.beneficiaryEmails[i];
                            let tagName = tagNames[i] || vaultIdHex;

                            if (isSingle) {
                                if (tagNames.length > 1) {
                                    const valTag = tagNames.find((t) =>
                                        t.toLowerCase().includes("val")
                                    );
                                    if (valTag) tagName = valTag;
                                }
                                tagName = tagName.replace(/\.zelf$/, "");
                            }

                            console.log(`📧 Sending claimable email to beneficiary ${email}`);
                            sendBeneficiaryClaimable(email, tagName).catch((e) =>
                                console.error("❌ Beneficiary email failed:", e.message)
                            );
                        }
                    }
                }
            } catch (emailErr) {
                console.error("⚠️ Email hook error (non-fatal):", emailErr.message);
            }
        }

        ctx.body = { txHash: tx.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { error: error.message };
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/vault-legacy/relay/collect-share
// ─────────────────────────────────────────────────────────────────────────────
const collectShare = async (ctx) => {
    const { vaultId, beneficiaryAddress, partyShare, lawyerShare } = ctx.request.body;

    if (!collectedShares[vaultId]) collectedShares[vaultId] = [];

    const existing = collectedShares[vaultId].find((s) => s.beneficiary === beneficiaryAddress);
    if (!existing) {
        collectedShares[vaultId].push({ beneficiary: beneficiaryAddress, partyShare, lawyerShare });
    }

    ctx.body = { success: true, count: collectedShares[vaultId].length };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vault-legacy/relay/shares/:vaultId
// ─────────────────────────────────────────────────────────────────────────────
const getShares = async (ctx) => {
    const shares = collectedShares[ctx.params.vaultId] || [];
    ctx.body = { shares };
};

module.exports = {
    ipfsUpload,
    sendTx,
    registerEmails,
    collectShare,
    getShares,
};
