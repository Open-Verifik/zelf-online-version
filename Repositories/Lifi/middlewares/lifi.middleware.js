const config = require("../../../Core/config");

const { string, object, array, validate, stringEnum, forbidden, stringOrNumber, minMaxNumber, number } = require("../../../Core/JoiUtils");

const schemas = {
	executeAdvancedStepTransaction: {
		fromChain: string().required(),
		id: string().required(),
		integrator: forbidden(),
		referrer: forbidden(),
		tool: string().required(),
		type: stringEnum("swap", "lifi", "cross").required(),
		action: object({
			fromAddress: string().required(),
			fromAmount: stringOrNumber().required(),
			fromChainId: stringOrNumber().required(),
			fromToken: string().required(),
			slippage: minMaxNumber(0, 1).required(),
			toAddress: string().required(),
			toChainId: stringOrNumber().required(),
			toToken: string().required(),
		}).required(),
		toolDetails: object({
			key: string(),
			name: string(),
			logoURI: string(),
		}),
		estimate: object({
			approvalAddress: string().required(),
			data: object(),
			executionDuration: string().required(),
			feeCosts: array().required(),
			fromAmount: stringOrNumber().required(),
			fromAmountUSD: stringOrNumber().required(),
			gasCosts: array().required(),
			toAmount: stringOrNumber().required(),
			toAmountMin: stringOrNumber().required(),
			toAmountUSD: stringOrNumber().required(),
			tool: string().required(),
		}),
	},
	getChains: {
		chainTypes: string(),
	},
	getByChainId: {
		chain: stringOrNumber().required(),
		token: string().required(),
	},
	getQuote: {
		fromAddress: string().required(),
		fromAmount: string().required(),
		fromChain: string().required(),
		fromToken: string().required(),
		integrator: forbidden(),
		referrer: forbidden(),
		slippage: minMaxNumber(0, 1).required(),
		toChain: string().required(),
		toToken: string().required(),
	},
	getStatus: {
		bridge: string(),
		fromChain: string(),
		toChain: string(),
		txHash: string().required(),
	},
	getTokens: {
		chains: string(),
		chainTypes: string(),
		minPriceUSD: number(),
	},
	getTools: {
		chain: stringOrNumber(),
	},
};

const executeAdvancedStepTransactionValidation = async (ctx, next) => {
	if (!_configValidation(ctx) || !_validate(ctx, "body", schemas.executeAdvancedStepTransaction)) return;

	return next();
};

const getChainsValidation = async (ctx, next) => {
	if (!_configValidation(ctx) || !_validate(ctx, "query", schemas.getChains)) return;

	return next();
};

const getQuoteValidation = async (ctx, next) => {
	if (!_configValidation(ctx) || !_validate(ctx, "query", schemas.getQuote)) return;

	return next();
};

const getStatusValidation = async (ctx, next) => {
	if (!_configValidation(ctx) || !_validate(ctx, "query", schemas.getStatus)) return;

	return next();
};

const getTokenByChainIdValidation = async (ctx, next) => {
	if (!_configValidation(ctx)) return;

	if (!_validate(ctx, "query", schemas.getByChainId)) return;

	return next();
};

const getTokensValidation = async (ctx, next) => {
	if (!_configValidation(ctx) || !_validate(ctx, "query", schemas.getTokens)) return;

	return next();
};

const getToolsValidation = async (ctx, next) => {
	if (!_configValidation(ctx)) return;

	return next();
};

const _configValidation = (ctx) => {
	if (!config.lifi.apiKey || !config.lifi.url || !config.lifi.integrator) {
		ctx.status = 501;
		ctx.body = { error: "service_unavailable" };

		return;
	}

	return true;
};

const _validate = (ctx, source, schema) => {
	const valid = validate(schema, ctx[source]);

	if (valid.error) {
		ctx.status = 400;
		ctx.body = { validationError: valid.error.message };

		return;
	}

	ctx[source] = valid.value;

	return true;
};

module.exports = {
	executeAdvancedStepTransactionValidation,
	getChainsValidation,
	getQuoteValidation,
	getStatusValidation,
	getTokenByChainIdValidation,
	getTokensValidation,
	getToolsValidation,
};
