const axios = require("../../../Core/axios").getEncryptionInstance();
const config = require("../../../Core/config");
const QRCode = require("qrcode");
const IPFSModule = require("../../IPFS/modules/ipfs.module");

const encrypt = async (data) => {
	const { proofName } = data;

	let zelfNameService = undefined;

	try {
		const encryptedResponse = await axios.post("/zelf/encrypt", {
			cleartext_data: data.publicData,
			face_base_64: data.faceBase64,
			metadata: data.metadata,
			password: data.password || undefined,
			record_id: data.identifier,
			require_live_face: data.requireLiveness || true,
			tolerance: data.tolerance || "REGULAR",
			verifiers_auth_key: data.verifierKey || undefined,
		});

		const zelfProof = encryptedResponse.data.zelfProof;

		// if (proofName) {
		// 	zelfNameService = await IPFSModule.insert(
		// 		{
		// 			name,
		// 			metadata: metadata || wallet.publicData,
		// 			pinIt,
		// 			base64: qrCode,
		// 			forcePin,
		// 		},
		// 		authUser
		// 	);
		// }

		// proofName: string (Optional) - The unique Zelf Proof Name associated with the ZelfProof (e.g., miguel:nextflix.proof). It is used for querying and retrieving the ZelfProof stored on the Zelf Name Service (ZNS), enabling secure decryption with additional factors such as face + password. This name simplifies user interactions with the system by providing a memorable identifier for accessing and managing their encrypted data.

		return { zelfProof };
	} catch (exception) {
		console.error({
			data: exception.response?.data,
		});

		return null;
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
				record_id: data.identifier,
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

		return { zelfQR };
	} catch (exception) {
		console.log({ VWEx: exception });

		return exception?.message;
	}
};

const decrypt = async (data) => {
	try {
		const encryptedResponse = await axios.post("/zelf/decrypt", {
			face_base_64: data.faceBase64,
			os: data.os || "DESKTOP",
			password: data.password || undefined,
			senseprint_base_64: data.zelfProof,
			verifiers_auth_key: data.verifierKey || undefined,
		});

		return encryptedResponse?.data;
	} catch (exception) {
		console.error({ exception: exception.response?.data });

		const error = _formattingError(exception.response?.data);

		return {
			error,
		};
	}
};

const preview = async (data) => {
	try {
		const encryptedResponse = await axios.post("/zelf/preview", {
			senseprint_base_64: data.zelfProof,
			verifiers_auth_key: data.verifierKey || undefined,
		});

		return encryptedResponse?.data;
	} catch (exception) {
		console.error({ _ex: exception, exception: exception.response?.data });

		const error = _formattingError(exception.response?.data);

		return {
			error,
		};
	}
};

const _formattingError = (error = {}) => {
	if (error?.code.includes(config.terms.zk)) {
		error.code = error.code.replaceAll(config.terms.zk, config.terms._zk).toUpperCase();
	}

	error.message = error.message.toUpperCase();

	if (error.message.includes(config.terms.zk)) {
		error.message = error.message.replaceAll(config.terms.zk, config.terms._zk).toUpperCase();
	}

	return error;
};

module.exports = {
	encrypt,
	encryptQRCode,
	decrypt,
	preview,
};
