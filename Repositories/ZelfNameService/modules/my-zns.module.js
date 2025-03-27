const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");

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

module.exports = {
	renewMyZelfName,
	transferMyZelfName,
};
