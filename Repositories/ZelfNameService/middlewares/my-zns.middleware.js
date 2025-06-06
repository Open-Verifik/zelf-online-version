const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const Session = require("../../Session/models/session.model");
const moment = require("moment");

const schemas = {
	transfer: {
		zelfName: string().required(),
		faceBase64: string().required(),
		password: string().required(),
	},
	renew: {
		network: string().required(),
		token: string().required(),
	},
	howToRenew: {
		zelfName: string().required(),
	},
};

const transferValidation = async (ctx, next) => {
	const valid = validate(schemas.transfer, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;

		ctx.body = { validationError: valid.error.message };

		return;
	}

	const { zelfName } = ctx.request.body;

	const failed = validateZelfName(zelfName, ctx);

	if (failed) return;

	await next();
};

/**
 *
 * @param {Object} ctx
 * @param {Object} next
 */
const howToRenewValidation = async (ctx, next) => {
	const valid = validate(schemas.howToRenew, {
		...ctx.request.query,
		...ctx.request.params,
	});

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const { zelfName } = { ...ctx.request.params, ...ctx.request.query };

	const failed = validateZelfName(zelfName, ctx);

	if (failed) return;

	await next();
};

const validateZelfName = (zelfName, ctx) => {
	// check that name includes .zelf
	if (!zelfName.includes(".zelf")) {
		ctx.status = 409;
		ctx.body = { validationError: "Not a valid zelf name" };
		return {
			failed: true,
		};
	}

	if (zelfName.length < 6) {
		ctx.status = 409;
		ctx.body = { validationError: "ZelfName should be 1 character or more." };
		return {
			failed: true,
		};
	}

	return null;
};

const renewValidation = async (ctx, next) => {
	const valid = validate(schemas.renew, ctx.request.body);

	if (valid.error) {
		ctx.status = 409;
		ctx.body = { validationError: valid.error.message };
		return;
	}

	const { ttl, zelfName, ethPrices, solPrices, paymentAddress } = ctx.state.user;

	if (!ttl || !zelfName || !ethPrices || !solPrices || !paymentAddress) {
		ctx.status = 409;
		ctx.body = { validationError: "Prices expired, generate a new token" };
		return;
	}

	if (moment.unix(ttl).isBefore(moment())) {
		ctx.status = 409;
		ctx.body = { validationError: "Prices expired, generate a new token" };
		return;
	}

	await next();
};

module.exports = {
	transferValidation,
	howToRenewValidation,
	renewValidation,
};
