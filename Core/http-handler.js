const axios = require("axios");
const config = require("./config");

/**
 * try catch log
 * @param {*} status
 * @param {*} message
 * @param {*} code
 * @param {*} exception
 * @param {*} ctx - Koa context object (optional)
 * @author Miguel Trevino
 */
const tryCatchLog = async (status = "failed", message, code, exception, ctx = null) => {
	try {
		// if exception is not a string, convert it to a string
		if (typeof exception !== "string") {
			exception = JSON.stringify(exception);
		}

		// Create a beautiful Discord embed-style message
		const timestamp = new Date().toISOString();
		const statusEmoji = status >= 500 ? "🔴" : status >= 400 ? "🟡" : "🟢";
		const statusColor = status >= 500 ? "**CRITICAL**" : status >= 400 ? "**WARNING**" : "**INFO**";
		const methodEmoji =
			{
				GET: "📖",
				POST: "➕",
				PUT: "✏️",
				DELETE: "🗑️",
				PATCH: "🔧",
			}[ctx?.method] || "❓";

		let headerMessage = `## ${statusEmoji} **ERROR DETECTED** ${statusEmoji}\n`;
		headerMessage += `### ${statusColor} - Status ${status}\n\n`;

		// Error Details Section
		headerMessage += `### 📊 **Error Details**\n`;
		headerMessage += `**Status Code:** \`${status}\`\n`;
		headerMessage += `**Error Code:** \`${code}\`\n`;
		headerMessage += `**Error Message:** \`${message}\`\n`;

		// Exception Section (only if not empty and not too long)
		if (exception && exception !== "{}" && exception !== "null" && exception !== "undefined") {
			const exceptionStr = typeof exception === "string" ? exception : JSON.stringify(exception);
			if (exceptionStr.length > 0 && exceptionStr.length < 200) {
				headerMessage += `\n### 🚨 **Exception**\n`;
				headerMessage += `\`\`\`\n${exceptionStr}\n\`\`\``;
			}
		}

		// Add context information if available
		if (ctx) {
			headerMessage += `\n### 🌐 **Request Context**\n`;

			// Method and URL
			if (ctx.method && ctx.url) {
				headerMessage += `${methodEmoji} **${ctx.method}** \`${ctx.url}\``;
			}

			// User Information
			if (ctx.state && ctx.state.user) {
				const user = ctx.state.user;
				headerMessage += `\n### 👤 **User Information**\n`;
				if (user.clientId) headerMessage += `**ID:** \`${user.clientId}\``;
				if (user.email) headerMessage += `\n**Email:** \`${user.email}\``;
				if (user.countryCode && user.phone) headerMessage += `\n**Phone:** \`${user.countryCode} ${user.phone}\``;
			}

			// Request Details with enhanced IP detection
			headerMessage += `\n### 📡 **Request Details**\n`;

			if (ctx.request && ctx.request.headers) {
				const headers = ctx.request.headers;
				// only keep the following headers
				const _headersToKeep = ["x-real-ip", "x-forwarded-host", "user-agent"];

				const headersToKeep = Object.fromEntries(Object.entries(headers).filter(([key]) => _headersToKeep.includes(key)));

				headerMessage += `\n**Headers:**\n\`\`\`json\n${JSON.stringify(headersToKeep, null, 2)}\n\`\`\`\n`;

				if (headers["user-agent"]) {
					headerMessage += `\n**User-Agent:** \`${headers["user-agent"].substring(0, 100)}${
						headers["user-agent"].length > 100 ? "..." : ""
					}\``;
				}
				if (headers["referer"]) {
					headerMessage += `\n**Referer:** \`${headers["referer"]}\``;
				}
				if (headers["origin"]) {
					headerMessage += `\n**Origin:** \`${headers["origin"]}\``;
				}
			}

			// Request Body and Query Parameters (if available and not too large)
			if (ctx.request) {
				const hasBody = ctx.request.body && Object.keys(ctx.request.body).length > 0;
				const hasQuery = ctx.request.query && Object.keys(ctx.request.query).length > 0;

				if (hasBody || hasQuery) {
					if (hasBody) {
						headerMessage += `\n### 📝 **Request Parameters**\n`;
						const bodyStr = JSON.stringify(ctx.request.body, null, 2);
						headerMessage += `**Request Body:**\n\`\`\`json\n${
							bodyStr.length > 300 ? bodyStr.substring(0, 300) + "..." : bodyStr
						}\n\`\`\``;
					}

					if (hasQuery) {
						const queryStr = JSON.stringify(ctx.request.query, null, 2);
						headerMessage += `\n**Query Parameters:**\n\`\`\`json\n${
							queryStr.length > 200 ? queryStr.substring(0, 200) + "..." : queryStr
						}\n\`\`\``;
					}
				}
			}
		}

		// Environment and Summary
		headerMessage += `\n### 🔧 **Environment**\n`;
		headerMessage += `**Environment:** \`${config.env || "unknown"}\`\n`;
		headerMessage += `**Timestamp:** \`${timestamp}\``;

		// Summary
		headerMessage += `\n### 📋 **Summary**\n`;
		headerMessage += `• **Error Type:** ${status >= 500 ? "Server Error" : status >= 400 ? "Client Error" : "Information"}\n`;
		headerMessage += `• **Severity:** ${status >= 500 ? "High" : status >= 400 ? "Medium" : "Low"}\n`;
		headerMessage += `• **Context Available:** ${ctx ? "Yes" : "No"}`;

		headerMessage += `\n---\n*🚀 Error logged by Verifik Backend System*`;

		// Check Discord character limit (2000 chars) and truncate if necessary
		const DISCORD_LIMIT = 1900; // Leave some buffer
		if (headerMessage.length > DISCORD_LIMIT) {
			headerMessage = headerMessage.substring(0, DISCORD_LIMIT - 50) + "\n\n... *[Message truncated due to length]*";
		}

		// await axios.post(config.discord.tryCatchURL, {
		// 	content: headerMessage,
		// });
	} catch (exception) {
		console.error("Error in tryCatchLog:", exception);
		return false;
	}

	return true;
};

const errorHandler = (exception, ctx = null, optionalMessage) => {
	// if (config.env === "development") {
	console.error({ exception });
	// }

	// Handle MongoDB validation errors
	if (exception && exception.keyPattern && MongoError.includes(exception.name)) {
		const message = `ValidationError: ${Object.keys(exception.keyPattern).join(",")} is not valid`;
		return {
			status: 422,
			message: message,
		};
	}

	let status = 500;
	let message = "Internal Server Error";
	let code = "InternalServerError";

	switch (exception.message) {
		case "400":
			status = 400;
			message = optionalMessage || "Bad Request";
			code = "BadRequest";
			break;
		case "403":
			status = 403;
			message = optionalMessage || "Access forbidden";
			code = "Forbidden";
			break;
		case "404":
			status = 404;
			message = optionalMessage || "Record not found.";
			code = "NotFound";
			break;
		case "409":
			status = 409;
			message = optionalMessage || "Record conflicts with existing records in place.";
			code = "Conflict";
			break;
		case "412":
			status = 412;
			message = optionalMessage || "Pre condition to create this request, failed";
			code = "PreconditionFailed";
			break;
		case "422":
			status = 422;
			message = optionalMessage || "Record cannot be saved with the current params";
			code = "UnprocessableEntity";
			break;
		case "423":
			status = 423;
			message = optionalMessage || "The resource that is being accessed is locked";
			code = "Locked";
			break;
		case "451":
			status = 451;
			message = optionalMessage || "The endpoint does not contain the data requested";
			code = "NotFound";
			break;
		case "500":
			status = 500;
			message = optionalMessage || "Server error.";
			code = "InternalServerError";
			break;
		case "504":
			status = 504;
			message = optionalMessage || "Endpoint timed out, try again later.";
			code = "Timeout";
			break;
		default:
			if (exception.message) {
				const exceptionArray = exception.message.split(":");

				if (exceptionArray.length === 2) {
					return errorHandler(
						{
							message: exceptionArray[0],
						},
						ctx,
						exceptionArray[1]
					);
				}
			}

			status = 500;
			message = exception?.message || "Internal Server Error";
			code = "InternalServerError";
			break;
	}

	if (config.env !== "development" && status !== 404) {
		// tryCatchLog(status, message, code, exception, ctx);
	}

	return {
		status,
		message,
		code,
	};
};

module.exports = {
	tryCatchLog,
	errorHandler,
};
