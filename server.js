const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const jwt = require("koa-jwt");
const config = require("./Core/config");
const secret = config.JWT_SECRET; // Replace with your secret key
const cors = require("@koa/cors");
const DatabaseModule = require("./Core/database");
const { serverLog } = require("./Core/loggin");
const mongoose = require("mongoose"); // Add this line
const swaggerSpec = require("./swagger");
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

		// Swagger documentation setup
		app.use(async (ctx, next) => {
			if (ctx.path === "/docs") {
				ctx.type = "html";
				ctx.body = `
					<!DOCTYPE html>
					<html>
					<head>
						<title>Zelf Wallet API Documentation</title>
						<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
						<style>
							html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
							*, *:before, *:after { box-sizing: inherit; }
							body { margin:0; background: #fafafa; }
							.swagger-ui .topbar { display: none; }
							.swagger-ui .info .title { color: #2c3e50; }
							.swagger-ui .info .description { color: #34495e; }
						</style>
					</head>
					<body>
						<div id="swagger-ui"></div>
						<script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
						<script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
						<script>
							window.onload = function() {
								const ui = SwaggerUIBundle({
									url: '/swagger.json',
									dom_id: '#swagger-ui',
									deepLinking: true,
									presets: [
										SwaggerUIBundle.presets.apis,
										SwaggerUIStandalonePreset
									],
									plugins: [
										SwaggerUIBundle.plugins.DownloadUrl
									],
									layout: "StandaloneLayout",
									validatorUrl: null,
									oauth2RedirectUrl: window.location.origin + '/swagger-ui/oauth2-redirect.html'
								});
							};
						</script>
					</body>
					</html>
				`;
			} else if (ctx.path === "/swagger.json") {
				ctx.type = "application/json";
				ctx.body = swaggerSpec;
			} else {
				await next();
			}
		});

		// Unprotected routes
		const unprotectedRoutes = require("./Routes/unprotected");

		app.use(unprotectedRoutes.routes());

		app.use(
			jwt({
				secret,
				getToken: (ctx) => {
					const indexOfToken = ctx.headers?.authorization?.indexOf("ey");

					if (indexOfToken !== -1) {
						return ctx.headers.authorization?.substring(indexOfToken);
					}

					// ok now if it starts with JWT, then we can return the token
					if (ctx.headers?.authorization?.startsWith("JWT") || ctx.headers?.authorization?.startsWith("Bearer")) {
						return ctx.headers.authorization?.split(" ")[1];
					}

					const token = ctx.request.query?.token || ctx.request?.body?.token;
					if (!token) return null;

					const _indexOfToken = token.indexOf("ey");

					if (_indexOfToken !== -1) {
						return token?.substring(_indexOfToken);
					}

					return null;
				},
			})
		);

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
