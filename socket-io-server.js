const server = require("./index");
const config = require("./Core/config");

const socketIOModule = require("./Core/socket.io");

const DatabaseModule = require("./Core/database");

const redisModule = require("./Core/redis");

/**
 * Start Server, Connect to DB & Require Routes
 */
server.listen(config.secondary_port, () => {
	// DatabaseModule.initDB();
	const mongooseConnection = DatabaseModule.initMongoDB();

	mongooseConnection.on("error", (err) => {
		console.error("DB connection error :::", err);
		process.exit(1);
	});

	mongooseConnection.once("open", async () => {
		console.info(`MongoDB: Connection has been established successfully.`);
		require("./Routes/index")(server);

		await redisModule.initRedis();

		socketIOModule.initSocket(config.socketio.server_port, false);

		socketIOModule.initClientSocket();
	});
});

process.on("unhandledRejection", (reason, p) => {
	console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
	// application specific logging, throwing an error, or other logic here
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");
			process.exit(1);
		});
});

/**
 * Do all cleanuo actions
 */
const cleanup = async () => {
	await DatabaseModule.disconnect();

	// if (DatabaseModule.MongoConnection) {
	//     await DatabaseModule.MongoConnection.close();
	// }
};

process.on("SIGINT", () => {
	console.info("SIGINT: Attempting to terminate");
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");

			process.exit(1);
		});
});

process.on("SIGTERM", () => {
	console.info("SIGTERM: Attempting to terminate");
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");
			process.exit(1);
		});
});

process.on("SIGUSR2", async () => {
	console.info("SIGUSR2: Attempting to terminate");
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");
			process.exit(1);
		});
});
