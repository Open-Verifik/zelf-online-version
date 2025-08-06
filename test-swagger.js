const swaggerSpec = require("./swagger");
const config = require("./Core/config");

console.log("🔍 Testing Swagger Configuration...\n");

// Test if swagger spec is generated correctly
if (swaggerSpec && swaggerSpec.openapi) {
	console.log("✅ Swagger specification generated successfully");
	console.log(`📋 API Title: ${swaggerSpec.info.title}`);
	console.log(`📋 API Version: ${swaggerSpec.info.version}`);
	console.log(`📋 API Description: ${swaggerSpec.info.description}`);
	console.log(`🔗 Servers: ${swaggerSpec.servers.length} configured`);

	// Count endpoints
	let endpointCount = 0;
	if (swaggerSpec.paths) {
		Object.keys(swaggerSpec.paths).forEach((path) => {
			Object.keys(swaggerSpec.paths[path]).forEach((method) => {
				endpointCount++;
			});
		});
	}

	console.log(`🔗 Endpoints: ${endpointCount} documented`);
	console.log(`🏷️  Tags: ${swaggerSpec.tags ? swaggerSpec.tags.length : 0} defined`);
	console.log(
		`🔐 Security Schemes: ${
			swaggerSpec.components && swaggerSpec.components.securitySchemes ? Object.keys(swaggerSpec.components.securitySchemes).length : 0
		} configured`
	);

	console.log("\n📝 Available Tags:");
	if (swaggerSpec.tags) {
		swaggerSpec.tags.forEach((tag) => {
			console.log(`  - ${tag.name}: ${tag.description}`);
		});
	}

	console.log("\n🔗 Available Endpoints:");
	if (swaggerSpec.paths) {
		Object.keys(swaggerSpec.paths).forEach((path) => {
			Object.keys(swaggerSpec.paths[path]).forEach((method) => {
				const endpoint = swaggerSpec.paths[path][method];
				console.log(`  ${method.toUpperCase()} ${path} - ${endpoint.summary || "No summary"}`);
			});
		});
	}

	console.log("\n✅ Swagger configuration is valid and ready to use!");
	console.log(`🌐 Access the documentation at: http://localhost:${config.port}/docs`);
} else {
	console.log("❌ Swagger specification generation failed");
	console.log("Please check your swagger.js configuration");
}

console.log("\n📚 Next steps:");
console.log("1. Start the server: npm start");
console.log(`2. Open http://localhost:${config.port}/docs in your browser`);
console.log("3. Test the /login endpoint to get a JWT token");
console.log('4. Use the "Authorize" button to add your token');
console.log("5. Test protected endpoints");
