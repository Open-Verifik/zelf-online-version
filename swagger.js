const swaggerJSDoc = require("swagger-jsdoc");
const config = require("./Core/config");

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Zelf Wallet API",
			version: "1.0.0",
			description: "Comprehensive API documentation for Zelf Wallet - A secure cryptocurrency wallet with biometric authentication",
			contact: {
				name: "Zelf Wallet Support",
				email: "support@zelf.world",
				url: "https://zelf.world",
			},
			license: {
				name: "ISC",
				url: "https://opensource.org/licenses/ISC",
			},
		},
		servers: [
			{
				url: `http://localhost:${config.port}`,
				description: "Development server",
			},
			{
				url: "https://api.zelf.world",
				description: "Production server",
			},
		],
		components: {
			securitySchemes: {
				bearerAuth: {
					type: "http",
					scheme: "bearer",
					bearerFormat: "JWT",
					description: "JWT token obtained from /login endpoint",
				},
				apiKey: {
					type: "apiKey",
					in: "header",
					name: "x-api-key",
					description: "API key for client management endpoints",
				},
			},
			schemas: {
				LoginRequest: {
					type: "object",
					required: ["username", "password"],
					properties: {
						username: {
							type: "string",
							description: "User username",
							example: "user",
						},
						password: {
							type: "string",
							description: "User password",
							example: "password",
						},
					},
				},
				LoginResponse: {
					type: "object",
					properties: {
						token: {
							type: "string",
							description: "JWT token for authentication",
							example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
						},
					},
				},
				ProofRequest: {
					type: "object",
					properties: {
						proof: {
							type: "string",
							description: "Zero-knowledge proof to verify",
							example: "proof_data_here",
						},
					},
				},
				ProofResponse: {
					type: "object",
					properties: {
						proof: {
							type: "string",
							description: "Generated zero-knowledge proof",
							example: "generated_proof_data",
						},
					},
				},
				VerificationResponse: {
					type: "object",
					properties: {
						verification: {
							type: "boolean",
							description: "Whether the proof is valid",
							example: true,
						},
					},
				},
				Error: {
					type: "object",
					properties: {
						error: {
							type: "string",
							description: "Error message",
							example: "Invalid credentials",
						},
					},
				},
				ProtectedResponse: {
					type: "object",
					properties: {
						message: {
							type: "string",
							description: "Protected endpoint response",
							example: "This is a protected endpoint. Welcome, user!",
						},
					},
				},
				PublicResponse: {
					type: "object",
					properties: {
						message: {
							type: "string",
							description: "Public endpoint response",
							example: "This is a public endpoint",
						},
					},
				},
			},
		},
		tags: [
			{
				name: "Authentication",
				description: "Authentication and authorization endpoints",
			},
			{
				name: "Zero-Knowledge Proofs",
				description: "ZKP generation and verification endpoints",
			},
			{
				name: "Public",
				description: "Public endpoints that don't require authentication",
			},
			{
				name: "Protected",
				description: "Protected endpoints that require JWT authentication",
			},
			{
				name: "Client",
				description: "Client management endpoints",
			},
			{
				name: "IPFS",
				description: "IPFS storage and retrieval endpoints",
			},
			{
				name: "Mail",
				description: "Email service endpoints",
			},
			{
				name: "SuperAdmin",
				description: "Super admin management endpoints",
			},
			{
				name: "Session",
				description: "Session management endpoints",
			},
			{
				name: "Subscribers",
				description: "Subscriber management endpoints",
			},
			{
				name: "Wallet",
				description: "Wallet management endpoints",
			},
			{
				name: "Blockchain",
				description: "Blockchain integration endpoints (Avalanche, Bitcoin, Cardano, etc.)",
			},
			{
				name: "Data Analytics",
				description: "Data analytics and reporting endpoints",
			},
			{
				name: "Rewards",
				description: "Rewards and incentive endpoints",
			},
			{
				name: "Zelf Name Service - Search",
				description: "Zelf name search and availability checking endpoints",
			},
			{
				name: "Zelf Name Service - Leasing",
				description: "Zelf name leasing, recovery, and management endpoints",
			},
			{
				name: "Zelf Name Service - Purchasing",
				description: "Zelf name payment processing and reward management endpoints",
			},
			{
				name: "Zelf Name Service - Preview",
				description: "Zelf name and proof preview endpoints",
			},
			{
				name: "Zelf Name Service - Decryption",
				description: "Zelf name decryption and wallet access endpoints",
			},
			{
				name: "ZelfProof - Encryption",
				description: "ZelfProof encryption and QR code generation endpoints",
			},
			{
				name: "ZelfProof - Decryption",
				description: "ZelfProof decryption and data access endpoints",
			},
			{
				name: "ZelfProof - Preview",
				description: "ZelfProof preview and metadata endpoints",
			},
		],
	},
	apis: ["./Routes/*.js", "./Routes/*/*.js", "./Repositories/*/routes/*.js", "./Repositories/*/routes/*/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
