/**
 * HumanAuthn raw encrypt API — always ZelfEncrypt v4 (`stack: "v4"` → `/zelf-v4/*`).
 * HTTP: `/api/human-authn/{encrypt,encrypt-qr-code,decrypt,preview,upgrade}`.
 * Clients do not send `stack`. Response uses `zelfID` / `zelfIDQR` aliases.
 */
const ZelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");

const withV4 = (data = {}) => ({ ...data, stack: "v4" });

/** HumanAuthn encrypt always runs a creation-time liveness check; `livenessLevel` is the v4 `liveness_tolerance`. */
const withV4Encrypt = (data = {}) => ({
    ...data,
    stack: "v4",
    check_live_face_before_creation: data.check_live_face_before_creation !== false,
    liveness_tolerance: data.liveness_tolerance || data.livenessLevel || "REGULAR",
});

/**
 * Encrypt a face-bound proof on v4.
 * Inbound (after Joi): same as ZelfProof encrypt — `faceBase64`, `metadata`, `identifier`,
 * `livenessLevel`, `os` required; `publicData`, `password`, `requireLiveness`, `tolerance`,
 * `verifierKey`, `livenessDetectionPriorCreation`, `referenceFaceBase64` optional.
 *
 * @param {Object} data `ctx.request.body`
 * @returns {Promise<{ zelfID: string }>} `zelfID` is the raw proof (ZelfProof `zelfProof`)
 */
const encrypt = async (data) => {
    const encrypted = await ZelfProofModule.encrypt(withV4Encrypt(data));

    return { zelfID: encrypted.zelfProof };
};

/**
 * Encrypt and return a PNG QR on v4.
 * Inbound: same as {@link encrypt} plus optional `generateZelfProof`.
 *
 * @param {Object} data `ctx.request.body`
 * @returns {Promise<{ zelfIDQR: string, zelfID?: string }|string>}
 */
const encryptQRCode = async (data) => {
    const encrypted = await ZelfProofModule.encryptQRCode(withV4Encrypt(data));

    if (typeof encrypted === "string") return encrypted;

    return {
        zelfIDQR: encrypted.zelfQR,
        zelfID: encrypted.zelfProof,
    };
};

/**
 * Decrypt a proof on v4.
 * Inbound: `faceBase64`, `os`, `zelfProof` required; `password`, `verifierKey`, `livenessLevel` optional.
 *
 * @param {Object} data `ctx.request.body`
 * @returns {Promise<Object>} upstream decrypt payload
 */
const decrypt = async (data) => {
    return ZelfProofModule.decrypt(withV4(data));
};

/**
 * Preview public fields of a proof on v4 (no face).
 * Inbound: `zelfProof` required; `verifierKey` optional.
 *
 * @param {Object} data `ctx.request.body`
 * @returns {Promise<Object>} upstream preview payload
 */
const preview = async (data) => {
    return ZelfProofModule.preview(withV4(data));
};

/**
 * Re-issue a 3.1.6 (or older) proof as a v4 SensePrint.
 * Inbound: `faceBase64`, `os`, `zelfProof` required; `password`, `verifierKey`, `requireLiveness` optional.
 *
 * @param {Object} data `ctx.request.body`
 * @returns {Promise<{ zelfID: string }>}
 */
const upgrade = async (data) => {
    const upgraded = await ZelfProofModule.upgrade(withV4(data));

    return { zelfID: upgraded.zelfProof };
};

module.exports = {
    encrypt,
    encryptQRCode,
    decrypt,
    preview,
    upgrade,
};
