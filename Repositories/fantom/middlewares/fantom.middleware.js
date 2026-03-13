const { isAddress } = require("web3-validator");

const validateAddress = async (ctx, next) => {
	try {
		const { id } = ctx.params;
		if (!id) {
			ctx.status = 400;
			ctx.body = { error: "Address parameter is required" };
			return;
		}

		if (!isAddress(id)) {
			ctx.status = 400;
			ctx.body = { error: "Invalid Fantom address format" };
			return;
		}

		ctx.request.query.address = id;
		await next();
	} catch (error) {
		console.error("Fantom address validation error:", error.message || "Unknown error");
		ctx.status = 400;
		ctx.body = { error: "Invalid address format" };
	}
};

const validateAddressTransactions = async (ctx, next) => {
	try {
		const { id } = ctx.params;
		if (!id) {
			ctx.status = 400;
			ctx.body = { error: "Address parameter is required" };
			return;
		}

		if (!isAddress(id)) {
			ctx.status = 400;
			ctx.body = { error: "Invalid Fantom address format" };
			return;
		}

		// Validate pagination parameters
		const { page, show } = ctx.request.query;
		if (page && (isNaN(page) || parseInt(page) < 0)) {
			ctx.status = 400;
			ctx.body = { error: "Invalid page parameter" };
			return;
		}
		if (show && (isNaN(show) || parseInt(show) < 1 || parseInt(show) > 100)) {
			ctx.status = 400;
			ctx.body = { error: "Invalid show parameter (must be between 1 and 100)" };
			return;
		}

		ctx.request.query.address = id;
		await next();
	} catch (error) {
		console.error("Fantom address transactions validation error:", error.message || "Unknown error");
		ctx.status = 400;
		ctx.body = { error: "Invalid parameters" };
	}
};

module.exports = {
	validateAddress,
	validateAddressTransactions,
};
