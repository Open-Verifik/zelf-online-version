const IPFS = require("../../../Core/ipfs");
const TagsIPFSModule = require("../../Tags/modules/tags-ipfs.module");

const saveZelfKey = async (payload, authUser) => {
	const { zelfProofQRCode, publicData, identifier } = payload;

	const record = await IPFS.pinFile(zelfProofQRCode, identifier, null, publicData);

	return TagsIPFSModule.formatRecord(record);
};

module.exports = {
	saveZelfKey,
};
