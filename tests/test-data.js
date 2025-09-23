/**
 * Test Data Configuration
 *
 * This module provides test data for the Zelf API tests.
 * It can load data from external files or provide fallback defaults.
 */

const fs = require("fs");
const path = require("path");

// Try to load test data from config file
const TEST_DATA_PATH = path.join(__dirname, "..", "config", "0012589021.json");

let testData = {};

try {
	const testDataRaw = fs.readFileSync(TEST_DATA_PATH, "utf8");
	testData = JSON.parse(testDataRaw);
	console.log("✅ Test data loaded from config file");
} catch (error) {
	console.warn("⚠️  Could not load test data file, using defaults:", error.message);
	testData = {
		faceBase64:
			"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAImAhgDASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAAAwECBAUGAAcI/8QAUxAAAQMCBAMEAwsHCAgGAwEAAQACAwQRBRIhMQZBURMiYXEHMoEUFTVCkZKhsbLB0RYjUlRz",
		password: "909090",
	};
}

/**
 * Test data configuration
 */
const TEST_DATA = {
	// Face data for biometric verification
	faceBase64: testData.faceBase64,

	// Password for authentication
	password: testData.password,

	// Default test configurations
	defaults: {
		os: "DESKTOP",
		domain: "avax",
		wordsCount: 12,
		addServerPassword: false,
		removePGP: true,
	},

	// Test tag name generator
	generateTestTagName: () => {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `test-${timestamp}-${random}`;
	},

	// Validate test data
	isValid: () => {
		return testData.faceBase64 && testData.password;
	},
};

module.exports = TEST_DATA;
