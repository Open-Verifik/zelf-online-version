const swaggerJSDoc = require("swagger-jsdoc");
const config = require("./Core/config");

const options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Zelf Name Service",
			version: "1.0.0",
			description: "Comprehensive API documentation for Zelf Name Service - Your Face is your key.",
			contact: {
				name: "Zelf World",
				email: "miguel@zelf.world",
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
				name: "Zero-Knowledge Proofs",
				description: "ZKP generation and verification endpoints",
			},
			{
				name: "Client",
				description: "Client management endpoints",
			},
			{
				name: "Session",
				description: "Session management endpoints",
			},
			{
				name: "Rewards",
				description: "Rewards and incentive endpoints",
			},
			{
				name: "Tags - Search",
				description: "Tag search and availability checking endpoints with multi-domain support",
			},
			{
				name: "Tags - Leasing",
				description: "Tag leasing, recovery, and management endpoints with multi-domain support",
			},
			{
				name: "Tags - Management",
				description: "Tag management, deletion, and update endpoints with multi-domain support",
			},
			{
				name: "Tags - Preview & Decryption",
				description: "Tag preview, decryption, and zelf proof endpoints with multi-domain support",
			},
			{
				name: "Tags - Rewards & Webhooks",
				description: "Tag rewards, webhooks, and payment processing endpoints",
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
			{
				name: "License",
				description: "License management operations",
			},
			{
				name: "My Tags",
				description: "User-specific tag management operations",
			},
		],
	},
	apis: ["./Routes/*.js", "./Routes/*/*.js", "./Repositories/*/routes/*.js", "./Repositories/*/routes/*/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
