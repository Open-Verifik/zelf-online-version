const server = require("./index");

const config = require("./Core/config");

const DatabaseModule = require("./Core/database");

const { serverLog } = require("./Core/loggin");

server.get("/", (req, res, next) => {
	res.setHeader("Content-Type", "text/html");
	res.write(`<html>`);
	res.write("<body>");
	res.write("<h1> Wallet API </h1/");
	res.write("</body></html>");
	res.end();
	next();
});

server.get("/async-endpoint", async (req, res) => {
	try {
		const data = await someAsyncFunction();
		res.send(data, null);
	} catch (error) {
		console.error({ error });

		if (!res.headersSent) {
			res.send(500, { error: error.message });
		}
	}
});

function respond(req, res, next) {
	res.send({ message: "hello" });
	return next();
}

server.get("/hello", respond);

async function someAsyncFunction() {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({ message: "Hello, world!" });
		}, 1000);
	});
}

/**
 * Start Server, Connect to DB & Require Routes
 */
server.listen(config.port, () => {
	const mongooseConnection = DatabaseModule.initMongoDB();

	mongooseConnection.on("error", (err) => {
		console.error("DB connection error :::", err);

		process.exit(1);
	});

	mongooseConnection.once("open", async () => {
		serverLog(`Port: ${config.port}`);

		serverLog(`Connected MongoDB`);

		require("./Routes/index")(server);
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
