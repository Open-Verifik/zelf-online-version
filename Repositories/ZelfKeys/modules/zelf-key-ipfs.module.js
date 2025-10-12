const IPFS = require("../../../Core/ipfs");

const saveZelfKey = async (payload, authUser) => {
	const { zelfProofQRCode, publicData, identifier } = payload;

	return await IPFS.pinFile(zelfProofQRCode, identifier, null, publicData);
};

module.exports = {
	saveZelfKey,
};
