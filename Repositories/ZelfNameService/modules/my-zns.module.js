const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const { searchZelfName } = require("./zns.v2.module");

// TODO
// 1. expire zelfpay domains after the month

const renewMyZelfName = async (zelfName, years = 1) => {
	// 1. validate that the zelfName exists
	// 2. validate that the payment has been done successfully
	// 3. renew the zelfName

	return {
		renew: true,
	};
};

const transferMyZelfName = async (zelfName, newOwner) => {
	// 1. validate that the zelfName exists
	// 2. validate that the newOwner exists
	// 3. transfer the zelfName

	return {
		transfer: true,
	};
};

const howToRenewMyZelfName = async (params) => {
	const { zelfName } = params;
	// 1. validate that the zelfName exists
	// 2. return the renewal process
	const publicKeys = await searchZelfName({ zelfName });

	const zelfNameObject = publicKeys.ipfs?.length ? publicKeys.ipfs[0] : publicKeys.arweave[0];

	const isMainnet = zelfNameObject.publicData.type !== "hold";

	return {
		zelfName,
		zelfNameObject,
		isMainnet,
		howToRenew: true,
	};
};

module.exports = {
	renewMyZelfName,
	transferMyZelfName,
	howToRenewMyZelfName,
};
