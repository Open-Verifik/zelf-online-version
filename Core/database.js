const mongoose = require("mongoose");

let MongoConnection = null;

const config = require("./config");
// Option 1: Passing parameters separately
let pool = null;

const initMongoDB = () => {
	mongoose.Promise = global.Promise;

	// Setup options applicable to all environments
	const setup = {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	};

	// Construct the MongoDB URI with poolSize parameter if needed
	let uri = config.db.uri;
	// if (config.env === "production") {
	// const poolSizeParam = `poolSize=${config.db.poolSize}`;

	// uri += uri.includes("?") ? `&${poolSizeParam}` : `?${poolSizeParam}`;
	// }

	mongoose.connect(uri, setup);

	MongoConnection = mongoose.connection;

	return MongoConnection;
};

/**
 * Disconnects from the DB gracefully
 * @return {Promise}
 */
const disconnect = () => {
	// return sequelize.close();
};

module.exports = {
	initMongoDB,
	MongoConnection,
	disconnect,
	getPool: () => {
		return pool;
	},
};
