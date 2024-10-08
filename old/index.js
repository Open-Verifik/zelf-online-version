const config = require("./Core/config");

const restify = require("restify");

// const restifyPlugins = require("restify-plugins");
// "restify-plugins": "^1.6.0",
/**
 * Middleware
 */
// const restifyPlugins = restify.plugins;

const jwt = require("restify-jwt-community");

const corsMiddleware = require("restify-cors-middleware2");

const requestLimitsMiddleware = require("./request-limits.middleware");

const allowedEndpointsWithOutJWT = require("./unprotected-routes").list;

const { cacheEngine } = require("./cache-engine");

const fs = require("fs");

//'Access-Control-Allow-Origin'
const cors = corsMiddleware({
	origins: ["*"],
	allowHeaders: ["authorization", "content-type", "Access-Control-Allow-Origin", "X-User-Agent", "timeout"],
	exposeHeaders: ["*"],
	credentials: false,
});

/**
 * Initialize Server
 */
const server = restify.createServer({
	name: config.name,
	version: config.version,
	timeout: 300000,
	// key: fs.readFileSync(path.resolve(__dirname, "private.key")), // Adjust the path based on your project structure
	// cert: fs.readFileSync(path.resolve(__dirname, "certificate.crt")), // Adjust the path based on your project structure
});

server.pre(cors.preflight);

server.use(cors.actual);

// Auth
var jwtConfig = {
	secret: config.JWT_SECRET,
};

// secure all routes. except /the following (does not require the JWT)
server.use(
	jwt(jwtConfig).unless({
		path: allowedEndpointsWithOutJWT,
	})
);

/**
 * Middleware
 */
// server.use(restify.plugins.acceptParser(server.acceptable));

// server.use(restify.plugins.jsonBodyParser({ mapParams: true }));
// // Body parsers
// server.use(restify.plugins.bodyParser());

// server.use(restifyPlugins.urlEncodedBodyParser({ mapParams: false }));

// server.use(
// 	restifyPlugins.queryParser({
// 		mapParams: true,
// 	})
// );

// server.use(restifyPlugins.fullResponse());

// server.use(
// 	restifyPlugins.throttle({
// 		burst: 100,
// 		rate: 30,
// 		ip: true,
// 	})
// );

// server.use(cacheEngine);

// server.use(requestLimitsMiddleware);

module.exports = server;
