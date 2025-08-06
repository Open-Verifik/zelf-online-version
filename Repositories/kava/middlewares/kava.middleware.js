const { isAddress } = require("web3-validator");

/**
 * Validate Kava address format
 * @param {Object} ctx - Koa context
 * @param {Function} next - Next middleware function
 */
const validateAddress = async (ctx, next) => {
	try {
		const { id } = ctx.params;

		if (!id) {
			ctx.status = 400;
			ctx.body = { error: "Address parameter is required" };
			return;
		}

		// Kava supports both Cosmos-style addresses and EVM addresses
		// Cosmos addresses start with 'kava1' and are 44 characters long
		// EVM addresses are standard Ethereum addresses (0x...)
		const isCosmosAddress = id.startsWith("kava1") && id.length === 44;
		const isEvmAddress = isAddress(id);

		if (!isCosmosAddress && !isEvmAddress) {
			ctx.status = 400;
			ctx.body = { error: "Invalid Kava address format" };
			return;
		}

		ctx.request.query.address = id;
		await next();
	} catch (error) {
		console.error("Kava address validation error:", error);
		ctx.status = 400;
		ctx.body = { error: "Invalid address format" };
	}
};

/**
 * Validate address transactions parameters
 * @param {Object} ctx - Koa context
 * @param {Function} next - Next middleware function
 */
const validateAddressTransactions = async (ctx, next) => {
	try {
		const { id } = ctx.params;
		const { page, show } = ctx.request.query;

		if (!id) {
			ctx.status = 400;
			ctx.body = { error: "Address parameter is required" };
			return;
		}

		// Validate pagination parameters
		if (page && (isNaN(page) || parseInt(page) < 0)) {
			ctx.status = 400;
			ctx.body = { error: "Invalid page parameter" };
			return;
		}

		if (show && (isNaN(show) || parseInt(show) < 1 || parseInt(show) > 100)) {
			ctx.status = 400;
			ctx.body = { error: "Show parameter must be between 1 and 100" };
			return;
		}

		// Set default values
		ctx.request.query.address = id;
		ctx.request.query.page = page || "0";
		ctx.request.query.show = show || "25";

		await next();
	} catch (error) {
		console.error("Kava address transactions validation error:", error);
		ctx.status = 400;
		ctx.body = { error: "Invalid parameters" };
	}
};

module.exports = {
	validateAddress,
	validateAddressTransactions,
};
