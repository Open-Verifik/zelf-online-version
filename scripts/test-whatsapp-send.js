#!/usr/bin/env node
/**
 * Standalone Meta WhatsApp Cloud API send test (no dependencies).
 * Usage:
 *   WHATSAPP_API_TOKEN=... WHATSAPP_API_PHONE_IDENTIFIER=111417608275326 \
 *   node scripts/test-whatsapp-send.js [recipient] [otp]
 */

const os = require("os");
const https = require("https");

const phoneId = process.env.WHATSAPP_API_PHONE_IDENTIFIER || "111417608275326";
const token = process.env.WHATSAPP_API_TOKEN;
const to = (process.argv[2] || "50765342766").replace(/\D/g, "");
const otp = process.argv[3] || `${Math.floor(100000 + Math.random() * 900000)}`;

const httpsGet = (url) =>
	new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => resolve(data.trim()));
			})
			.on("error", reject);
	});

const httpsPostJson = (url, headers, body) =>
	new Promise((resolve, reject) => {
		const payload = JSON.stringify(body);
		const req = https.request(
			url,
			{
				method: "POST",
				headers: {
					...headers,
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(payload),
				},
			},
			(res) => {
				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => {
					try {
						resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
					} catch (parseError) {
						resolve({ status: res.statusCode, body: { raw: data } });
					}
				});
			}
		);
		req.on("error", reject);
		req.write(payload);
		req.end();
	});

const run = async () => {
	if (!token) {
		console.error("Missing WHATSAPP_API_TOKEN");
		process.exit(1);
	}

	let outboundIp = "unknown";

	try {
		outboundIp = await httpsGet("https://ifconfig.me/ip");
	} catch (ipError) {
		outboundIp = `lookup failed: ${ipError.message}`;
	}

	console.log(
		JSON.stringify(
			{
				host: os.hostname(),
				outboundIp,
				phoneId,
				to,
				otp,
				tokenPrefix: token.slice(0, 12),
			},
			null,
			2
		)
	);

	const payload = {
		messaging_product: "whatsapp",
		to,
		type: "template",
		template: {
			name: "authentication",
			language: { code: "es" },
			components: [
				{
					type: "body",
					parameters: [{ type: "text", text: `${otp}` }],
				},
				{
					type: "button",
					sub_type: "url",
					index: "0",
					parameters: [{ type: "text", text: `${otp}` }],
				},
			],
		},
	};

	try {
		const response = await httpsPostJson(
			`https://graph.facebook.com/v22.0/${phoneId}/messages`,
			{ Authorization: `Bearer ${token}` },
			payload
		);

		if (response.status >= 200 && response.status < 300) {
			console.log(
				JSON.stringify(
					{
						result: "OK",
						httpStatus: response.status,
						messageId: response.body?.messages?.[0]?.id,
						otp,
					},
					null,
					2
				)
			);
			return;
		}

		const metaError = response.body?.error;

		console.error(
			JSON.stringify(
				{
					result: "FAIL",
					httpStatus: response.status,
					code: metaError?.code,
					message: metaError?.message,
					isTransient: metaError?.is_transient,
					fbtraceId: metaError?.fbtrace_id,
				},
				null,
				2
			)
		);
		process.exit(1);
	} catch (error) {
		console.error(JSON.stringify({ result: "FAIL", message: error.message }, null, 2));
		process.exit(1);
	}
};

run();
