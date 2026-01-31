// Global teardown for all tests
const mongoose = require("mongoose");

module.exports = async () => {
    // Clean up database and close connections
    try {
        if (mongoose.connection.readyState === 1) {
            // Only drop the test database, never production
            if (mongoose.connection.name === "zelf_testing") {
                await mongoose.connection.db.dropDatabase();
            } else {
                console.warn(`WARNING: Attempted to clean non-test database: ${mongoose.connection.name}`);
            }
            await mongoose.connection.close();
        }
    } catch (error) {
        console.error("Error during teardown:", error);
    }
};
