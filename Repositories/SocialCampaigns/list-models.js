/**
 * Script to list available Gemini models
 * Helps identify the latest, cost-effective model for image analysis
 */

const { listAvailableModels } = require("./modules/gemini-ai.module");

// Using service account authentication from gemini_key.json
console.log("🔍 Listing available Gemini models...\n");

const listModels = async () => {
	try {
		const models = await listAvailableModels();

		if (!models || models.length === 0) {
			console.log("❌ No models found");
			return;
		}

		console.log(`✅ Found ${models.length} available models:\n`);
		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		
		// Filter and sort models
		const imageModels = models.filter((model) => {
			const name = model.name?.toLowerCase() || "";
			return name.includes("gemini") && (name.includes("flash") || name.includes("pro") || name.includes("vision"));
		});

		// Sort by: flash models first (cheaper), then by version (latest first)
		imageModels.sort((a, b) => {
			const aName = a.name?.toLowerCase() || "";
			const bName = b.name?.toLowerCase() || "";
			
			// Flash models first (cheaper)
			const aIsFlash = aName.includes("flash");
			const bIsFlash = bName.includes("flash");
			if (aIsFlash !== bIsFlash) {
				return aIsFlash ? -1 : 1;
			}
			
			// Then by version (1.5 > 1.0 > pro)
			const aVersion = aName.includes("1.5") ? 2 : aName.includes("1.0") ? 1 : 0;
			const bVersion = bName.includes("1.5") ? 2 : bName.includes("1.0") ? 1 : 0;
			if (aVersion !== bVersion) {
				return bVersion - aVersion;
			}
			
			// Then by "latest" suffix
			const aLatest = aName.includes("latest");
			const bLatest = bName.includes("latest");
			if (aLatest !== bLatest) {
				return aLatest ? -1 : 1;
			}
			
			return 0;
		});

		imageModels.forEach((model, index) => {
			const name = model.name || "Unknown";
			const displayName = model.displayName || name;
			const description = model.description || "No description";
			const supportedMethods = model.supportedGenerationMethods || [];
			const supportsImages = supportedMethods.includes("generateContent");
			
			console.log(`${index + 1}. ${displayName}`);
			console.log(`   Name: ${name}`);
			console.log(`   Description: ${description}`);
			console.log(`   Supports Images: ${supportsImages ? "✅" : "❌"}`);
			console.log(`   Methods: ${supportedMethods.join(", ") || "None"}`);
			console.log("");
		});

		console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		
		// Recommend best model
		const bestModel = imageModels.find((m) => {
			const name = m.name?.toLowerCase() || "";
			return name.includes("flash") && name.includes("1.5") && m.supportedGenerationMethods?.includes("generateContent");
		});

		if (bestModel) {
			console.log(`\n💡 Recommended model for image analysis: ${bestModel.displayName || bestModel.name}`);
			console.log(`   (Cheapest option with image support: Flash models are ~10x cheaper than Pro models)`);
		}

		console.log("\n✨ Done!");
	} catch (error) {
		console.error("\n❌ Error listing models:", error.message);
		console.error("\nFull error:", error);
		process.exit(1);
	}
};

// Run the script
if (require.main === module) {
	listModels()
		.then(() => {
			process.exit(0);
		})
		.catch((error) => {
			console.error("Unhandled error:", error);
			process.exit(1);
		});
}

module.exports = {
	listModels,
};

