const IPFS = require("../../../Core/ipfs");

const config = require("../../../Core/config");

const get = async (data) => {
	const { cid, name, key, value, exipres } = data;

	if (cid) return await IPFS.retrieve(cid, expires);

	if (name) return await IPFS.filter("name", name);

	if (key && value) return await IPFS.filter(key, value);

	return null;
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

const destroy = async () => {
	return null;
};

module.exports = {
	get,
	show,
	insert,
	destroy,
};
