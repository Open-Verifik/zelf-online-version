const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const jwt = require("koa-jwt");
const config = require("./Core/config");
const secret = config.JWT_SECRET; // Replace with your secret key
const cors = require("@koa/cors");
const DatabaseModule = require("./Core/database");
const { serverLog } = require("./Core/loggin");
const mongoose = require("mongoose"); // Add this line
const app = new Koa();
app.proxy = true; // Trust the proxy's X-Forwarded-For header
app.use(bodyParser());

// Enable CORS
app.use(cors());

// JWT error handling
app.use((ctx, next) => {
	return next().catch((err) => {
		if (err.status === 401) {
			ctx.status = 401;
			ctx.body = { error: "Protected resource, use Authorization header to get access" };
		} else {
			throw err;
		}
	});
});

const server = app.listen(config.port, () => {
	console.info(`Server running on port ${config.port}`);
	const mongooseConnection = DatabaseModule.initMongoDB();

	mongooseConnection.on("error", (err) => {
		console.error("DB connection error :::", err);

		process.exit(1);
	});

	mongooseConnection.once("open", async () => {
		serverLog(`Port: ${config.port}`);

		serverLog(`Connected MongoDB`);

		// Unprotected routes
		const unprotectedRoutes = require("./Routes/unprotected");

		app.use(unprotectedRoutes.routes());

		app.use(jwt({ secret }));

		// Protected routes
		const protectedRoutes = require("./Routes/protected");

		app.use(protectedRoutes.routes());
	});
});

process.on("unhandledRejection", (reason, p) => {
	console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");
			process.exit(1);
		});
});

const cleanup = () => {
	return new Promise((resolve, reject) => {
		console.info("Cleanup initiated...");
		server.close((err) => {
			if (err) {
				console.error("Error closing server:", err);
				reject(err);
			} else {
				console.info("Server closed");
				mongoose
					.disconnect()
					.then(() => {
						console.info("Disconnected MongoDB");
						resolve();
					})
					.catch((err) => {
						console.error("Error disconnecting MongoDB:", err);
						reject(err);
					});
			}
		});
	});
};

process.on("SIGINT", () => {
	console.info("SIGINT: Attempting to terminate");
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");
			process.exit(0);
		});
});

process.on("SIGTERM", () => {
	console.info("SIGTERM: Attempting to terminate");
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("exiting...");
			process.exit(0);
		});
});

// Handle nodemon restarts (if you are using it)
process.once("SIGUSR2", () => {
	console.info("SIGUSR2: Attempting to terminate");
	cleanup()
		.catch(console.error)
		.then(() => {
			console.info("Exiting...");
			setTimeout(() => {
				process.kill(process.pid, "SIGUSR2");
				console.info("exited..");
			}, 1000); // 1-second delay to ensure cleanup completes
		});
});

//lsof -ti :3002 | xargs kill -9
