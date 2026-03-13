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
		console.error("Failed to connect to test database:", error);
		// Don't exit in test environment, just log the error
		console.log("Continuing without database connection for unit tests");
	}
};
