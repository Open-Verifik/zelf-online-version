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
	opencv: {
		environment: process.env.OPENCV_ENV || "production",
		defaultClient: process.env.OPENCV_DEFAULT_CLIENT || "613375a1eab2fe08527f81e2",
		url: "https://us.opencv.fr",
		apiKey: process.env.OPENCV_APIKEY || null,
	},
	zelfProof: {
		url: process.env.ZELF_PROOF_URL || "https://api.zelf.world",
		apiKey: process.env.ZELF_PROOF_API_KEY || "password",
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
};

module.exports = configuration;
