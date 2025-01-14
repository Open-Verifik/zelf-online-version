const IPFS = require("../../../Core/ipfs");

const config = require("../../../Core/config");

const get = async (data) => {
	const { cid, zelfName, key, value, exipres } = data;

	if (cid) return await IPFS.retrieve(cid, expires);

	if (zelfName) return await IPFS.filter("name", zelfName);

	if (key && value) return await IPFS.filter(key, value);

	const error = new Error("Conditions_not_acceptable");

	error.status = 412;

	throw error;
};

const show = async (data, authUser) => {
	const { cid, expires } = data;

	try {
		const file = await IPFS.retrieve(cid);

		return file;
	} catch (exception) {
		const error = new Error("file_not_found");

		error.status = 404;

		throw error;
	}
};

const insert = async (data, authUser) => {
	const { base64, metadata, name, pinIt } = data;

	if ((authUser.pro || config.env === "development") && pinIt) return await IPFS.pinFile(base64, name, null, metadata);

	return await IPFS.upload(base64, name, null, metadata);
};

const unPinFiles = async (CIDs = []) => {
	const unpinnedFiles = await IPFS.unPinFiles(CIDs);

	return unpinnedFiles;
};

module.exports = {
	get,
	show,
	insert,
	unPinFiles,
};
