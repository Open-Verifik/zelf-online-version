// Global setup for all tests (integration Jest config enables this).
// Waits for MongoDB like server.js waits for mongoose connection — retries until the DB is up or max attempts.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), override: false });

const mongoose = require("mongoose");
const testConfig = require("./config/test.config");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async () => {
	Object.assign(process.env, testConfig.env);

	const { uri, options } = testConfig.database;
	const wait = testConfig.database.wait || {};
	const maxAttempts = wait.maxAttempts || 60;
	const delayMs = wait.delayMs || 1000;

	let lastError;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			if (mongoose.connection.readyState !== 0) {
				await mongoose.disconnect();
			}

			await mongoose.connect(uri, {
				...options,
				serverSelectionTimeoutMS: 3000,
			});

			console.log(`[jest globalSetup] Connected to test database: ${uri}`);
			return;
		} catch (error) {
			lastError = error;
			await mongoose.disconnect().catch(() => {});

			if (attempt < maxAttempts) {
				console.warn(
					`[jest globalSetup] MongoDB not ready (attempt ${attempt}/${maxAttempts}): ${error?.message || error}. Retrying in ${delayMs}ms...`,
				);
				await sleep(delayMs);
			}
		}
	}

	const reason = lastError?.message || String(lastError);
	console.warn(
		`[jest globalSetup] Skipping test DB after ${maxAttempts} attempts: ${uri} — ${reason}. HTTP-only tests can still pass.`,
	);
};
