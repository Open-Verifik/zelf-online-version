// Global teardown for all tests
const mongoose = require("mongoose");
const testConfig = require("./config/test.config");

module.exports = async () => {
	// Clean up database and close connections
	try {
		if (mongoose.connection.readyState === 1) {
			// Only drop the test database, never production
			if (mongoose.connection.name === "zelf_testing") {
				await mongoose.connection.db.dropDatabase();
				console.log("Test database 'zelf_testing' cleaned up");
			} else {
				console.warn(`WARNING: Attempted to clean non-test database: ${mongoose.connection.name}`);
			}
			await mongoose.connection.close();
			console.log("Test database connection closed");
		}
	} catch (error) {
		console.error("Error during teardown:", error);
	}
};
