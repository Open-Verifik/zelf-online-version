require("dotenv").config();

const API_ROOT = "/api";

const configuration = {
	name: "API",
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT || "3000",
	secondary_port: process.env.SECONDARY_PORT || "3001",
	base_url: process.env.BASE_URL || "https://verifik.co",
	documentationUrl: process.env.DOCUMENTATION_URL || "null",
	sessionSecret: process.env.SESSION_SECRET,
	so: process.env.ENVOS,
	azureVision: {
		key: process.env.AZURE_VISION_KEY || null,
		url:
			process.env.AZURE_VISION_URL ||
			"https://vision-verifik-ocr.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2023-02-01-preview&features=read&language=en&gender-neutral-caption=False",
		forms: {
			key: process.env.AZURE_VISION_FORMS_KEY || "NOKEY",
			endpoint: process.env.AZURE_VISION_FORMS_ENDPOINT || "https://verifik-forms.cognitiveservices.azure.com",
		},
	},
	openai: {
		key: process.env.OPENAI_API_KEY,
	},
	signedData: {
		key: process.env.SECRET_KEY_PRICI,
	},
	debug: {
		mongo: Boolean(process.env.DEBUG_MONGO),
		sendEmail: Boolean(process.env.DEBUG_SEND_EMAIL),
		sendSms: Boolean(process.env.DEBUG_SEND_SMS),
		sendWhatsapp: Boolean(process.env.DEBUG_SEND_WHATSAPP),
		sendWebhookEvent: Boolean(process.env.DEBUG_SEND_WEBHOOK_EVENT),
		whatsAppNumber: process.env.WHATSAPP_NUMBER,
	},
	db: {
		uri: process.env.MONGODB_URI_PROD || process.env.MONGODB_URI,
		user: process.env.MONGO_USER,
		password: process.env.MONGO_PASSWORD,
		poolSize: Number(process.env.MONGO_POOLSIZE) || 50,
		test_uri: "mongodb://127.0.0.1:27017/testdb",
	},
	backup: {
		isActive: Boolean(process.env.AWS_ACCESS_KEY_ID) || true,
		access_key_id: process.env.AWS_ACCESS_KEY_ID,
		secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
	},
	queue: {
		collectionName: process.env.QUEUE_NAME,
		instance: Number(process.env.QUEUE_INSTANCE),
		time: process.env.QUEUE_TIME,
	},
	cronjob: {
		instance: Number(process.env.CRONJOB_INSTANCE),
		active: {},
		times: {},
	},
	adminVersion: 1,
	JWT_SECRET: process.env.CONNECTION_KEY,
	SUPERADMIN_JWT_SECRET: process.env.SUPER_ADMINS_JWT_SECRET,
	encryptionSecret: process.env.FRONTEND_KEY,
	basePath: (path) => {
		return API_ROOT.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
	},
	full_url: process.env.BASE_URL + ":" + process.env.PORT,
	proxy: {
		port: process.env.PROXY_PORT || 4250,
		basePath: process.env.PROXY_BASEPATH || "http://localhost",
	},
	zelfEncrypt: {
		serverKey: process.env.ZELF_ENCRYPT_SERVER_KEY,
	},
	zelfProof: {
		url: process.env.ZELF_PROOF_URL || "https://api.zelf.world",
		apiKey: process.env.ZELF_PROOF_API_KEY || "password",
	},
	token: {
		rewardPrice: process.env.REWARD_PRICE || 0.05,
		whitelist: process.env.WHITELIST,
	},
	pgp: {
		secretKey: process.env.PGP_SECRET_KEY || "",
		passphrase: process.env.PGP_PASSPHRASE || "",
		globalSecretKey: process.env.PGP_GLOBAL_SECRET_KEY || "",
		globalPassphrase: process.env.PGP_GLOBAL_PASSPHRASE || "",
	},
	etherscan: {
		urlEtherscan: "https://api.etherscan.io/api",
		apiKey: process.env.INFURA_APIKEY,
	},
	binance: {
		urlBinance: "https://api.binance.com/",
	},
	mailgun: {
		apiKey: process.env.MAILGUN_API_KEY || "my_key",
	},
	terms: {
		zk: process.env.ZK1 || "_",
		_zk: process.env.ZELF1 || "_",
	},
	arwave: {
		key: process.env.ARWAVE_KEY,
		owner: process.env.ARWEAVE_OWNER,
		n: process.env.ARWAVE_N,
		e: process.env.ARWAVE_E,
		d: process.env.ARWAVE_D,
		p: process.env.ARWAVE_P,
		q: process.env.ARWAVE_Q,
		dp: process.env.ARWAVE_DP,
		dq: process.env.ARWAVE_DQ,
		qi: process.env.ARWAVE_QI,
		hold: {
			owner: process.env._ARWEAVE_OWNER,
			n: process.env._ARWAVE_N,
			e: process.env._ARWAVE_E,
			d: process.env._ARWAVE_D,
			p: process.env._ARWAVE_P,
			q: process.env._ARWAVE_Q,
			dp: process.env._ARWAVE_DP,
			dq: process.env._ARWAVE_DQ,
			qi: process.env._ARWAVE_QI,
		},
		parentName: process.env.ARWEAVE_PARENT_NAME,
		processId: process.env.ARWEAVE_PROCESS_ID,
		transactionId: process.env.ARWEAVE_TRANSACTION_ID,
	},
	coinbase: {
		key: process.env.COINBASE_API_KEY,
	},
	google: {
		captchaProjectID: process.env.CAPTCHA_PROJECT_ID,
		webSiteKey: process.env.CAPTCHA_WEB_SITE_KEY,
		androidSiteKey: process.env.CAPTCHA_ANDROID_SITE_KEY,
		iOSSiteKey: process.env.CAPTCHA_IOS_SITE_KEY,
	},
	revenueCat: {
		allowedEmail: process.env.REVENUECAT_ALLOWED_EMAIL,
	},
	solana: {
		senderPublicKey: process.env.SOLANA_SENDER_PUBLIC_KEY,
		sender: process.env.SENDER_KEY,
	},
	addressZelf: [
		{
			id: "ETH",
			address: "0x1BC125bC681685f216935798453F70fb423eB392",
			//address: "0x9eB697C8500e4abc9cF6C4E17F1Be8508010bd23",
		},
		{
			id: "SOL",
			address: "6gDQQQMRveayDFSz5bA2wyjNZr9Jue9hS1S4kkmLDqBt",
		},
		{
			id: "BTC",
			address: "bc1p6lsrl8amjuwrwxcwaa9ncuuzljuc3zv4jg55xdruuq5nxxwnvj4qd23dxl",
		},
		{
			id: "BNB",
			address: "0xD3b0d838cCCEAe7ebF1781D11D1bB741DB7Fe1A7",
		},
		{
			id: "MINA",
			address: "B62qoA5XwfEVnXbcrzphGH1TVuqxeJ5bhX7vTS3hcxpQFHnStG3MQk9",
		},
		{
			id: "ADA",
			address: "stake1u9m0ny47rdn9x43gcg0hjmg6xsnlz80hnz7kf6v6vplqtrcd9pnhj",
		},

		{
			id: "TRX",
			address: "TXPLNPmLC7XSazCEPVZMQkyx9YEdbvFXkU",
		},
		{
			id: "XRP",
			address: "rvpkkVqZyqPFz4uzT4YbbrBMLzuUUyTdm",
		},
	],
};

module.exports = configuration;
