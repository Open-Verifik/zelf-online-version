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
			verifiers_auth_key: data.addServerPassword ? config.walletServer.authKey : undefined,
		});

		return encryptedResponse?.data?.zelfProof;
	} catch (exception) {
		console.log({
			exception,
			data: exception.response?.data,
		});

		return null;
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
				verifiers_auth_key: data.addServerPassword ? config.walletServer.authKey : undefined,
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
		console.log({ VWEx: exception });

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
			verifiers_auth_key: data.addServerPassword ? config.walletServer.authKey : undefined,
		});

		return encryptedResponse?.data;
	} catch (exception) {
		console.error({ exception: exception.response?.data });

		return {
			error: exception.response?.data,
		};
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
		console.log({
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
