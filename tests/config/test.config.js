// Test environment configuration
// This ensures tests never interfere with production/development databases
// NO MOCKING POLICY - All tests work with real data

module.exports = {
	// Database configuration for testing
	database: {
		uri: "mongodb://localhost:27017/zelf_testing",
		options: {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			// Additional options for test isolation
			maxPoolSize: 1, // Limit connections for tests
			serverSelectionTimeoutMS: 5000, // Keep alive for 5 seconds
			socketTimeoutMS: 45000, // Close sockets after 45 seconds
			bufferMaxEntries: 0, // Disable mongoose buffering
			bufferCommands: false, // Disable mongoose buffering
		},
	},

	// Environment variables for testing
	env: {
		NODE_ENV: "test",
		JWT_SECRET: "test-jwt-secret-key-for-testing-only",
		MONGODB_URI: "mongodb://localhost:27017/zelf_testing",
		// Add any other test-specific environment variables here
		PORT: 3001, // Use different port for testing
		LOG_LEVEL: "info", // Keep logs for debugging real data operations
		// NO MOCKING - Use real external service URLs
		EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || "https://api.example.com",
		BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL || "https://mainnet.infura.io/v3/your-key",
	},

	// Test-specific configurations
	test: {
		timeout: 30000, // 30 seconds timeout for tests
		retries: 0, // No retries for tests
		parallel: false, // Run tests sequentially to avoid conflicts
		// NO MOCKING POLICY
		useRealData: true, // Always use real data
		mockExternalServices: false, // Never mock external services
		mockDatabase: false, // Never mock database operations
	},

	// Real data testing configuration
	realData: {
		// Test with real blockchain data
		useRealBlockchainData: true,
		// Test with real API responses
		useRealApiResponses: true,
		// Test with real database operations
		useRealDatabaseOperations: true,
		// Test with real external service calls
		useRealExternalServices: true,
	},
};
