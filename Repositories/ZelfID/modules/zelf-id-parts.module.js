const TagsPartsModule = require("../../Tags/modules/tags-parts.module");
const { encrypt, preview, encryptQRCode } = require("../../ZelfProof/modules/zelf-proof.module");
const { generateQRFromZelfProof } = require("../../Tags/modules/qr-zelfproof-extractor.module");
const { getDomainConfig } = require("../../Tags/config/supported-domains");
const config = require("../../../Core/config");

const withV4 = (data) => ({ ...data, stack: "v4" });

/**
 * Encrypt a Zelf ID proof on v4 and attach QR onto `tagObject`.
 * @param {Object} dataToEncrypt inbound for ZelfProof `encrypt` (`publicData`, `faceBase64`, `metadata`, `password?`, `addServerPassword?`, …)
 * @param {Object} tagObject mutated with `zelfProof` and `zelfProofQRCode`
 * @returns {Promise<void>}
 */
const generateZelfProof = async (dataToEncrypt, tagObject) => {
    const { zelfProof } = await encrypt(withV4(dataToEncrypt));

    tagObject.zelfProof = zelfProof;
    tagObject.zelfProofQRCode = await generateQRFromZelfProof(zelfProof);
};

/**
 * Encrypt params on v4 with the server verifier key.
 * Inbound: `faceBase64`, `password`, `metadata`, `tagName`, `domain`.
 *
 * @param {Object} params
 * @param {Object} authUser
 * @returns {Promise<Object>}
 */
const encryptParams = async (params, authUser) => {
    const { faceBase64, password, metadata, tagName, domain } = params;
    const domainConfig = getDomainConfig(domain);

    if (!domainConfig) {
        throw new Error(`Domain '${domain}' is not supported`);
    }

    const encryptedResult = await encrypt(
        withV4({
            faceBase64,
            password,
            metadata,
            verifierKey: config.zelfEncrypt.serverKey,
        })
    );

    if (encryptedResult.error) {
        const error = new Error(encryptedResult.error.code);
        error.status = 409;
        throw error;
    }

    return {
        zelfProof: encryptedResult.zelfProof,
        zelfProofQRCode: encryptedResult.zelfProofQRCode,
        tagName,
        domain,
        domainConfig,
    };
};

/**
 * Preview a proof on v4 with the server verifier key.
 * Inbound: `zelfProof`, `tagName`, `domain`.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const previewTag = async (params) => {
    const { zelfProof, tagName, domain } = params;
    const domainConfig = getDomainConfig(domain);

    if (!domainConfig) {
        throw new Error(`Domain '${domain}' is not supported`);
    }

    const previewResult = await preview(
        withV4({
            zelfProof,
            verifierKey: config.zelfEncrypt.serverKey,
        })
    );

    return {
        preview: previewResult,
        tagName,
        domain,
        domainConfig,
    };
};

/**
 * QR-encrypt a proof on v4 with the server verifier key.
 * Inbound: `zelfProof`, `tagName`, `domain`.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const generateQRCode = async (params) => {
    const { zelfProof, tagName, domain } = params;
    const domainConfig = getDomainConfig(domain);

    if (!domainConfig) {
        throw new Error(`Domain '${domain}' is not supported`);
    }

    const qrCodeResult = await encryptQRCode(
        withV4({
            zelfProof,
            verifierKey: config.zelfEncrypt.serverKey,
        })
    );

    return {
        qrCode: qrCodeResult,
        tagName,
        domain,
        domainConfig,
    };
};

module.exports = {
    ...TagsPartsModule,
    generateZelfProof,
    encryptParams,
    previewTag,
    generateQRCode,
};
