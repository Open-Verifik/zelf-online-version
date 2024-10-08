const QRCode = require("qrcode");

const generateQRCode = async (hash) => {
	try {
		return await QRCode.toDataURL(hash, {
			errorCorrectionLevel: "H",
		});
	} catch (err) {
		console.error("Error generating QR code:", err);
	}
};

module.exports = {
	generateQRCode,
};
