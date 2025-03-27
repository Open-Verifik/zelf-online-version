const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const captchaService = require("../../../Core/captcha");
const config = require("../../../Core/config");
const Session = require("../../Session/models/session.model");

const schemas = {
	search: {
		zelfName: string(),
		key: string(),
		value: string(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]),
		captchaToken: string(),
	},
	leaseOffline: {
		zelfName: string().required(),
		zelfProof: string().required(),
		zelfProofQRCode: string().required(),
	},
	leaseConfirmation: {
		zelfName: string().required(),
		coin: string().required(),
		network: stringEnum(["coinbase", "CB", "ETH", "SOL", "BTC"]).required(),
	},
	lease: {
		zelfName: string().required(),
		faceBase64: string().required(),
		type: stringEnum(["create", "import"]).required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	create: {
		password: string(),
		addServerPassword: boolean(),
		wordsCount: number().required(),
	},
	import: {
		password: string(),
		mnemonic: string().required(),
	},
	decrypt: {
		faceBase64: string().required(),
		password: string(),
		zelfName: string().required(),
		addServerPassword: boolean(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	preview: {
		zelfName: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	previewZelfProof: {
		zelfProof: string().required(),
		os: stringEnum(["DESKTOP", "ANDROID", "IOS"]).required(),
		captchaToken: string(),
	},
	revenueCatWebhook: {
		product_id: string().required(),
		period_type: string().required(),
		currency: string().required(),
		price: number().required(),
		id: string().required(),
		app_id: string().required(),
		transaction_id: string().required(),
		environment: string().required(),
	},
	update: {
		duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
	},
};

const transferMyZelfName = async (ctx, next) => {};

const renewMyZelfName = async (ctx, next) => {};

module.exports = {
	transferMyZelfName,
	renewMyZelfName,
};
