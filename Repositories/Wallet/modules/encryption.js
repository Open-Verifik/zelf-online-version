const ZelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");

/**
 * Map wallet / ZNS encrypt payloads to zelf-proof.module shape (public /zelf/* URLs).
 * @param {Object} data
 * @returns {Object}
 */
const _toZelfProofPayload = (data) => ({
    publicData: data.publicData ?? data.cleartext_data,
    faceBase64: data.faceBase64,
    metadata: data.metadata,
    password: data.password,
    identifier: data.identifier,
    record_id: data.record_id,
    _id: data._id,
    requireLiveness: data.requireLiveness ?? data.require_live_face ?? true,
    tolerance: data.tolerance,
    verifierKey: data.verifierKey,
    addServerPassword: data.addServerPassword,
    os: data.os,
    generateZelfProof: data.generateZelfProof,
    check_live_face_before_creation: data.check_live_face_before_creation,
});

const encrypt = async (data) => {
    try {
        const { zelfProof } = await ZelfProofModule.encrypt(_toZelfProofPayload(data));

        return zelfProof;
    } catch (exception) {
        console.error({
            data: exception.response?.data,
            exception,
        });

        const code = exception.code || exception.response?.data?.code;
        let error = new Error(code || exception.message);

        error.code = code;

        switch (code) {
            case "ERR_INVALID_IMAGE":
                error.status = 400;
                error.message = "Invalid ZelfProof payload";

                break;

            default:
                error.status = exception.status ?? 500;
                break;
        }

        throw error;
    }
};

const encryptQR = async (data) => {
    try {
        const result = await ZelfProofModule.encryptQRCode(_toZelfProofPayload(data));

        if (result && typeof result === "object" && result.zelfQR) {
            return result.zelfQR;
        }

        return result;
    } catch (exception) {
        console.error({ VWEx: exception });

        return exception?.message;
    }
};

const decrypt = async (data) => {
    const payload = {
        ...data,
        zelfProof: data.zelfProof.replace(/ /g, "+"),
    };

    try {
        return await ZelfProofModule.decrypt(payload);
    } catch (exception) {
        const code = exception.code;
        let error = new Error(code || exception.message);

        error.code = code;

        switch (code) {
            case "ERR_INVALID_IMAGE":
            case "ERR_INVALID_SENSEPRINT_BYTES":
                error.status = 400;

                error.message = "Decrypting error";

                break;
            case "ERR_PASSWORD_REQUIRED":
                error.status = 409;

                error.message = "Password required";

                break;
            default:
                error.status = exception.status || 500;
                error.message = exception.message;

                break;
        }

        throw error;
    }
};

const preview = async (data) => {
    try {
        return await ZelfProofModule.preview(data);
    } catch (exception) {
        console.error({
            exception,
            _exception: exception.response?.data,
        });
    }

    return null;
};

module.exports = {
    encrypt,
    encryptQR,
    decrypt,
    preview,
};
