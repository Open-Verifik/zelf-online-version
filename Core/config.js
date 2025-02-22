require("dotenv").config();

const API_ROOT = "/api";

const configuration = {
	name: "API",
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT || "3000",
	base_url: process.env.BASE_URL || "https://verifik.co",
	sessionSecret: process.env.SESSION_SECRET,
	so: process.env.ENVOS,
	openai: {
		key: process.env.OPENAI_API_KEY,
	},
	email_providers: {
		mailgun: {
			proxyEmail: process.env.MAILGUN_PROXY_EMAIL,
			user: process.env.MAILGUN_USER,
			password: process.env.MAILGUN_PASS,
			host: process.env.MAILGUN_HOST,
			port: process.env.MAILGUN_PORT,
			from: process.env.MAILGUN_DEFAULT_FROM,
			apiKey: process.env.MAILGUN_API_KEY,
			publicKey: process.env.MAILGUN_PUBLIC_KEY,
		},
	},
	signedData: {
		key: process.env.SECRET_KEY_PRICI,
	},
	debug: {
		mongo: process.env.DEBUG_MONGO === "true",
		sendEmail: process.env.DEBUG_SEND_EMAIL === "true",
	},
	db: {
		uri: process.env.MONGODB_URI_PROD || process.env.MONGODB_URI,
		user: process.env.MONGO_USER,
		password: process.env.MONGO_PASSWORD,
		poolSize: Number(process.env.MONGO_POOLSIZE) || 50,
		test_uri: "mongodb://127.0.0.1:27017/testdb",
	},
	queue: {
		collectionName: process.env.QUEUE_NAME,
		instance: Number(process.env.QUEUE_INSTANCE),
		time: process.env.QUEUE_TIME,
	},
	JWT_SECRET: process.env.CONNECTION_KEY,
	SUPERADMIN_JWT_SECRET: process.env.SUPER_ADMINS_JWT_SECRET,
	encryptionSecret: process.env.FRONTEND_KEY,
	basePath: (path) => {
		return API_ROOT.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
	},
	full_url: process.env.BASE_URL + ":" + process.env.PORT,
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
		forceApproval: Boolean(process.env.COINBASE_FORCE_APPROVAL === "true"),
	},
	google: {
		captchaProjectID: process.env.CAPTCHA_PROJECT_ID,
		webSiteKey: process.env.CAPTCHA_WEB_SITE_KEY,
		androidSiteKey: process.env.CAPTCHA_ANDROID_SITE_KEY,
		iOSSiteKey: process.env.CAPTCHA_IOS_SITE_KEY,
		captchaApproval: Boolean(process.env.CAPTCHA_APPROVAL === "true"),
	},
	revenueCat: {
		allowedEmail: process.env.REVENUECAT_ALLOWED_EMAIL,
	},
	solana: {
		senderPublicKey: process.env.SOLANA_SENDER_PUBLIC_KEY,
		sender: process.env.SENDER_KEY,
	},
	oklink: {
		apiKey: process.env.OKLINK_API_KEY,
	},
};

module.exports = configuration;
