/**
 * Shared timeouts for VaultLegacy (Avalanche tx.wait, Pinata / IPFS HTTP).
 * Invalid or non-positive env values fall back to defaults.
 */

function intEnv(name, fallback) {
    const v = Number(process.env[name]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
}

const txWaitTimeoutMs = intEnv("LEGACY_TX_WAIT_TIMEOUT_MS", 120000);
const ipfsRequestTimeoutMs = intEnv("LEGACY_IPFS_REQUEST_TIMEOUT_MS", 30000);

/**
 * ethers v6 rejects tx.wait(…, timeoutMs) with code "TIMEOUT" (and a timeout-related message).
 */
function isTransactionWaitTimeout(err) {
    if (!err || typeof err !== "object") return false;
    if (err.code === "TIMEOUT") return true;
    const msg = err.shortMessage || err.message || "";
    return typeof msg === "string" && /timeout/i.test(msg);
}

module.exports = {
    txWaitTimeoutMs,
    ipfsRequestTimeoutMs,
    isTransactionWaitTimeout,
};
