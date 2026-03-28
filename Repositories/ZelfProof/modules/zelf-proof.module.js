const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");
const { QRZelfProofExtractor } = require("../../Tags/modules/qr-zelfproof-extractor.module");
const QRCode = require("qrcode");

const encrypt = async (data) => {
    try {
        const encryptedResponse = await axios.post("/zelf/encrypt", {
            cleartext_data: data.publicData,
            face_base_64: data.faceBase64,
            metadata: data.metadata,
            password: data.password || undefined,
            record_id: data.identifier || data.record_id || data._id,
            require_live_face: data.requireLiveness || true,
            tolerance: data.tolerance || "REGULAR",
            verifiers_auth_key: data.verifierKey || data.addServerPassword ? config.zelfEncrypt.serverKey : undefined,
        });

        const zelfProof = encryptedResponse.data.zelfProof;

        return { zelfProof };
    } catch (exception) {
        const _error = exception.response?.data;

        let error = new Error(_error?.message || "Something went wrong");

        switch (_error.code) {
            case "ERR_INVALID_IMAGE":
                error.status = 400;

                break;

            default:
                break;
        }

        throw error;
    }
};

const generateQRCode = async (data) => {
    try {
        const base64Data = Buffer.from(data.zelfProof, "binary").toString("base64");

        // Generate the QR code with the base64 string
        const qrCode = await QRCode.toDataURL(base64Data, {
            errorCorrectionLevel: "H", // High error correction
        });

        return { zelfProof: base64Data, QRCode: qrCode };
    } catch (error) {
        console.error("Error generating QR code:", error);
        return null;
    }
};

const encryptQRCode = async (data) => {
    try {
        const encryptedResponse = await axios.post(
            "/zelf/encrypt-qr-code",
            {
                cleartext_data: data.publicData,
                face_base_64: data.faceBase64,
                metadata: data.metadata,
                password: data.password || undefined,
                record_id: data.identifier || data.record_id || data._id,
                require_live_face: data.requireLiveness || true,
                tolerance: data.tolerance || "REGULAR",
                verifiers_auth_key: data.verifierKey || undefined,
                qr_format: "PNG",
                os: data.os || "DESKTOP",
            },
            { responseType: "arraybuffer" }
        );

        if (!encryptedResponse?.data) return encryptedResponse;

        const base64Image = Buffer.from(encryptedResponse.data).toString("base64");
        const zelfQR = `data:image/png;base64,${base64Image}`;

        let zelfProof = null;

        if (data.generateZelfProof) {
            zelfProof = await QRZelfProofExtractor.extractZelfProof(base64Image);
        }

        return { zelfQR, zelfProof: zelfProof || undefined };
    } catch (exception) {
        console.error({ exception });

        return exception?.message;
    }
};

const decrypt = async (data) => {
    if (!data.zelfProof) throw new Error("400:missing_zelf_proof");

    if (data.hasPassword == "false") data.password = undefined;

    try {
        const encryptedResponse = await axios.post("/zelf/decrypt", {
            face_base_64: data.faceBase64,
            os: data.os || "DESKTOP",
            password: data.password || undefined,
            senseprint_base_64: data.zelfProof,
            verifiers_auth_key: data.verifierKey || data.addServerPassword ? config.zelfEncrypt.serverKey : undefined,
        });

        return encryptedResponse?.data;
    } catch (exception) {
        const error = _formattingError(exception.response?.data);

        let _error = new Error(error.message);

        _error.status = error.status;

        throw _error;
    }
};

/**
 * Preview ZelfProof
 * @param {Object} data
 * @returns {Object}
 */
const preview = async (data) => {
    if (!data.zelfProof || typeof data.zelfProof !== "string") throw new Error("400:missing_zelf_proof");

    try {
        const encryptedResponse = await axios.post("/zelf/preview", {
            senseprint_base_64: data.zelfProof,
            verifiers_auth_key: data.verifierKey || (data.addServerPassword ? config.zelfEncrypt.serverKey : undefined),
        });

        return encryptedResponse?.data;
    } catch (exception) {
        const error = _formattingError(exception.response?.data);

        let _error = new Error(error.message);

        _error.status = error.status;

        throw _error;
    }
};

const _formattingError = (error = {}) => {
    if (error?.code?.includes(config.terms.zk)) {
        error.code = error.code.replaceAll(config.terms.zk, config.terms._zk).toUpperCase();
    }

    error.message = error.message?.toUpperCase();

    if (error.message.includes(config.terms.zk)) {
        error.message = error.message.replaceAll(config.terms.zk, config.terms._zk).toUpperCase();
    }

    // Determine appropriate HTTP status code based on error type
    if (!error.status) {
        const message = error.message || "";
        const code = error.code || "";

        // Face validation errors - 422 Unprocessable Entity
        if (
            message.includes("FACE IS NOT CENTRAL") ||
            message.includes("NOT CENTRAL") ||
            message.includes("MULTIPLE FACE") ||
            message.includes("NO FACE DETECTED") ||
            message.includes("FACE NOT RECOGNIZED") ||
            message.includes("LIVENESS") ||
            message.includes("FACE QUALITY") ||
            message.includes("FACE TOO SMALL") ||
            message.includes("FACE TOO LARGE") ||
            code.includes("FACE_")
        ) {
            error.status = 422;
        }
        // Authentication/verification errors - 401 Unauthorized
        else if (
            message.includes("INVALID PASSWORD") ||
            message.includes("AUTHENTICATION FAILED") ||
            message.includes("UNAUTHORIZED") ||
            code.includes("AUTH_")
        ) {
            error.status = 401;
        }
        // Invalid image or data format - 400 Bad Request
        else if (
            message.includes("INVALID IMAGE") ||
            message.includes("INVALID FORMAT") ||
            message.includes("INVALID DATA") ||
            code === "ERR_INVALID_IMAGE"
        ) {
            error.status = 400;
        }
        // Default to 500 for unknown errors
        else {
            error.status = 500;
        }
    }

    return error;
};

module.exports = {
    encrypt,
    encryptQRCode,
    decrypt,
    preview,
};
