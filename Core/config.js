require("dotenv").config();

const API_ROOT = "/api";

const configuration = {
	name: "API",
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT || "3000",
	base_url: process.env.BASE_URL || "https://verifik.co",
	sessionSecret: process.env.SESSION_SECRET,
	so: process.env.ENVOS,
	sessions: {
		version: 2,
		globalLimit: process.env.GLOBAL_LIMIT || 5 * 60 * 10, // 5 requests per second for 10 minutes
		previewLimit: process.env.PREVIEW_LIMIT || 1 * 30 * 10, // 1 request per 2 seconds for 10 minutes
		searchLimit: process.env.SEARCH_LIMIT || 1 * 30 * 10, // 1 request per 2 seconds for 10 minutes
		leaseLimit: process.env.LEASE_LIMIT || 15, // 30 requests max per 10 minutes
		decryptLimit: process.env.DECRYPT_LIMIT || 30, // 30 requests max per 10 minutes
	},
	email_providers: {
		mailgun: {
			proxyEmail: process.env.MAILGUN_PROXY_EMAIL,
			apiKey: process.env.MAILGUN_API_KEY,
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
		skipArweave: process.env.SKIP_ARWEAVE || false,
	},
	token: {
		rewardPrice: process.env.REWARD_PRICE || 0.05,
		whitelist: process.env.WHITELIST || "",
		priceEnv: process.env.PRICE_ENV || "production",
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
	walrus: {
		network: process.env.WALRUS_NETWORK || "testnet",
		privateKey: process.env.WALRUS_PRIVATE_KEY,
		suiRpcUrl: process.env.WALRUS_SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
		defaultEpochs: Number(process.env.WALRUS_DEFAULT_EPOCHS) || 5,
		maxFileSize: Number(process.env.WALRUS_MAX_FILE_SIZE) || 100 * 1024, // 100KB
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
		nodeSecret: process.env.SOLANA_NODE_SECRET,
		tokenMintAddress: process.env.SOLANA_TOKEN_MINT_ADDRESS,
	},
	oklink: {
		apiKey: process.env.OKLINK_API_KEY,
	},
	lifi: {
		url: process.env.LIFI_API_URL || "https://li.quest/v1",
		apiKey: process.env.LIFI_API_KEY,
		integrator: process.env.LIFI_INTEGRATOR,
	},
};

module.exports = configuration;
