const { Address } = require("@ton/core");

const invalidTonAddressError = () => {
	const error = new Error("invalid_ton_address");
	error.status = 409;
	return error;
};

const assertValidTonAddress = (value) => {
	const trimmed = String(value || "").trim();
	if (!trimmed) throw invalidTonAddressError();

	try {
		Address.parse(trimmed);
	} catch (_) {
		throw invalidTonAddressError();
	}

	return trimmed;
};

module.exports = {
	assertValidTonAddress,
};
