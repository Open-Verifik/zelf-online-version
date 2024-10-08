require("dotenv").config();

const API_ROOT = "/api";

const configuration = {
	name: "API",
	env: process.env.NODE_ENV || "development",
	port: process.env.PORT || "3000",
	base_url: process.env.BASE_URL,
	db: {
		uri: process.env.MONGODB_URI,
		user: process.env.MONGO_USER,
		password: process.env.MONGO_PASSWORD,
		test_uri: "mongodb://127.0.0.1:27017/testdb",
	},
	// key to generate/verify JWT
	JWT_SECRET: process.env.CONNECTION_KEY,
	// will be used to building route paths
	basePath: (path) => {
		return API_ROOT.replace(/\/$/, "") + "/" + path.replace(/^\//, "");
	},
	full_url: process.env.BASE_URL + ":" + process.env.PORT,
	strings: {
		slogan: "Comida que inspira",
	},
	twilio: {
		accountSID: process.env.TWILIO_ACCOUNT_SID,
		token: process.env.TWILIO_AUTH_TOKEN,
	},
};

module.exports = configuration;

console.info("process.env.NODE_ENV =>", process.env.NODE_ENV, " ::: PORT => ", configuration.port);
