const config = require("./config");

const { MongoClient } = require("mongodb");

const upsert = {
	upsert: true,
};

const eventCollectionName = config.mongo.eventCollection;

const mongoClient = new MongoClient(uri, {
	maxPoolSize: 20,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

let db, eventCollection;

const init = async () => {
	if (!db) {
		try {
			await mongoClient.connect();
		} catch (error) {
			console.error("MONGO_ERROR", {
				error,
			});
			return process.exit(1);
		}

		db = mongoClient.db();

		eventCollection = db.collection(eventCollectionName);

		console.info("=============== STARTED MONGODB ===============");
	}
};

const isReady = () => !!db;

module.exports = {
	isReady,
	init,
	getEventCollection,
	setLocation,
	getUserLocations,
	getProviderLocations,
	getLocation,
};
