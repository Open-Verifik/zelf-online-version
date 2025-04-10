const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");

const encrypt = async (data) => {
	try {
		const encryptedResponse = await axios.post("/vw/generate-wallet", {
			cleartext_data: data.cleartext_data || data.publicData,
			face_base_64: data.faceBase64,
			metadata: data.metadata,
			password: data.password || undefined,
			record_id: data._id,
			require_live_face: data.require_live_face || true,
			tolerance: data.tolerance || "REGULAR",
			verifiers_auth_key: data.addServerPassword ? config.zelfEncrypt.serverKey : undefined,
		});

		return encryptedResponse?.data?.zelfProof;
	} catch (exception) {
		const _error = exception.response?.data;
		console.error({
			data: _error,
			exception,
		});

		let error = new Error(_error?.code);

		switch (_error.code) {
			case "ERR_INVALID_IMAGE":
				error.status = 400;
				error.message = "Invalid ZelfProof payload";

				break;

			default:
				break;
		}

		throw error;
	}
};

const encryptQR = async (data) => {
	try {
		const encryptedResponse = await axios.post(
			"/vw/generate-wallet-qr",
			{
				cleartext_data: data.cleartext_data || data.publicData,
				face_base_64: data.faceBase64,
				metadata: data.metadata,
				password: data.password || undefined,
				record_id: data._id || data.record_id,
				require_live_face: data.require_live_face || true,
				check_live_face_before_creation: data.check_live_face_before_creation || false,
				tolerance: data.tolerance || "REGULAR",
				verifiers_auth_key: data.addServerPassword ? config.zelfEncrypt.serverKey : undefined,
				qr_format: "PNG",
				os: data.os || "DESKTOP",
			},
			{ responseType: "arraybuffer" }
		);

		if (encryptedResponse?.data) {
			const base64Image = Buffer.from(encryptedResponse.data).toString("base64");

			return `data:image/png;base64,${base64Image}`;
		}
	} catch (exception) {
		console.error({ VWEx: exception });

		return exception?.message;
	}
};

async function getPngAsBase64(url) {
	try {
		const response = await axios.get(url, { responseType: "arraybuffer" });
		const base64Image = Buffer.from(response.data, "binary").toString("base64");
		return base64Image;
	} catch (error) {
		console.error("Error fetching the PNG image:", error);
	}
}

const decrypt = async (data) => {
	try {
		const encryptedResponse = await axios.post("/vw/decrypt-wallet", {
			face_base_64: data.faceBase64,
			os: data.os || "DESKTOP",
			password: data.password || undefined,
			senseprint_base_64: data.zelfProof,
			verifiers_auth_key: data.addServerPassword ? config.zelfEncrypt.serverKey : undefined,
		});

		return encryptedResponse?.data;
	} catch (exception) {
		const _error = exception.response?.data;

		let error = new Error(_error.code);

		switch (_error.code) {
			case "ERR_INVALID_IMAGE":
			case "ERR_INVALID_SENSEPRINT_BYTES":
				error.status = 400;

				error.message = "Decrypting error";

				break;
			case "ERR_PASSWORD_REQUIRED":
				error.status = 409;

				error.message = "Password required";

			default:
				break;
		}

		throw error;
	}
};

const preview = async (data) => {
	try {
		const encryptedResponse = await axios.post("/vw/preview-wallet", {
			senseprint_base_64: data.zelfProof,
			verifiers_auth_key: data.addServerPassword ? config.walletServer.authKey : undefined,
		});

		return encryptedResponse.data;
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
