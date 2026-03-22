// Global setup for all tests
const mongoose = require("mongoose");
const testConfig = require("./config/test.config");

module.exports = async () => {
	// Set test environment variables from config
	Object.assign(process.env, testConfig.env);

	// Connect to test database with test-specific options
	try {
		await mongoose.connect(testConfig.database.uri, testConfig.database.options);
		console.log(`Connected to test database: ${testConfig.database.uri}`);
	} catch (error) {
		// Many suites (e.g. HTTP-only integration) do not need MongoDB; avoid dumping a full stack trace.
		const reason = error?.message || String(error);
		console.warn(
			`[jest globalSetup] Skipping test DB: ${testConfig.database.uri} — ${reason}. HTTP-only tests can still pass.`,
		);
	}
};
