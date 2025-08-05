/**
 * Performance Monitor for Walrus Image Storage with Node Intelligence
 *
 * This script helps you understand and optimize Walrus network performance
 * and showcases the intelligent node selection system
 * Usage: node monitor-performance.js [blob-id]
 */

const {
	prepareImageForFrontend,
	getPerformanceStats,
	resetPerformanceStats,
	logNetworkHealth,
	logNodeIntelligence,
	getNodeRankings,
	resetNodeIntelligence,
	walrusIDToBase64,
	nodePerformanceTracker,
} = require("./modules/walrus.module");

async function monitorPerformance(blobId) {
	console.log("🔍 Walrus Performance Monitor with Node Intelligence");
	console.log("=".repeat(60));

	// Use your blob ID if provided, otherwise use a sample
	const testBlobId = blobId || "hE4xX3k0_rrII4117jIHRl2lhQAaR_iQmedOSZXMJ7k";

	console.log(`📊 Testing with blob: ${testBlobId}\n`);

	// Reset stats for clean testing
	resetPerformanceStats();
	resetNodeIntelligence();

	// Test 1: Single retrieval to start learning
	console.log("1️⃣ Testing initial image retrieval (Node Learning Phase)...");
	console.log("-".repeat(50));

	const startTime = Date.now();

	try {
		const imageData = await prepareImageForFrontend(testBlobId);
		const endTime = Date.now();

		if (imageData.success) {
			console.log(`✅ Successfully retrieved image`);
			console.log(`⏱️  Total time: ${endTime - startTime}ms`);
			console.log(`📏 Size: ${imageData.sizeInKB} KB`);
			console.log(`🎯 Content type: ${imageData.contentType}`);
		} else {
			console.log(`❌ Failed to retrieve image: ${imageData.error}`);
		}

		// Show initial node intelligence
		console.log("\n🧠 Node Intelligence after first request:");
		logNodeIntelligence();
	} catch (error) {
		console.error("❌ Test failed:", error.message);
	}

	// Test 2: Multiple retrievals to build node intelligence
	console.log("\n\n2️⃣ Testing multiple retrievals (Node Intelligence Building)...");
	console.log("-".repeat(50));

	const retrievalTimes = [];

	for (let i = 0; i < 5; i++) {
		try {
			console.log(`\n🔄 Attempt ${i + 1}/5...`);
			const start = Date.now();
			const result = await walrusIDToBase64(testBlobId);
			const end = Date.now();

			const timeTaken = end - start;
			retrievalTimes.push(timeTaken);

			console.log(`✅ Retrieval ${i + 1} completed in ${timeTaken}ms`);

			// Show node rankings after each attempt
			const rankings = getNodeRankings(3);
			if (rankings.topNodes.length > 0) {
				console.log(`🏆 Current top node: ${rankings.topNodes[0].nodeId} (${(rankings.topNodes[0].score * 100).toFixed(1)}%)`);
			}
		} catch (error) {
			console.log(`❌ Retrieval ${i + 1} failed: ${error.message}`);
		}
	}

	// Test 3: Node intelligence analysis
	console.log("\n\n3️⃣ Node Intelligence Analysis...");
	console.log("-".repeat(50));

	const finalRankings = getNodeRankings(10);

	console.log("📊 Final Node Rankings:");
	console.log(`   Total nodes tracked: ${finalRankings.summary.totalNodes}`);
	console.log(`   Qualified nodes: ${finalRankings.summary.qualifiedNodes}`);
	console.log(`   Preferred nodes: ${finalRankings.summary.preferredNodes}`);
	console.log(`   Average score: ${(finalRankings.summary.avgScore * 100).toFixed(1)}%`);

	if (finalRankings.topNodes.length > 0) {
		console.log("\n🏆 Top 3 Performing Nodes:");
		finalRankings.topNodes.slice(0, 3).forEach((node, index) => {
			console.log(`   ${index + 1}. ${node.nodeId}`);
			console.log(`      Score: ${(node.score * 100).toFixed(1)}%`);
			console.log(`      Success Rate: ${(node.successRate * 100).toFixed(1)}%`);
			console.log(`      Average Response Time: ${node.avgResponseTime.toFixed(0)}ms`);
			console.log(`      Attempts: ${node.attempts}`);
		});
	}

	if (finalRankings.problematicNodes.length > 0) {
		console.log("\n⚠️  Problematic Nodes:");
		finalRankings.problematicNodes.slice(0, 3).forEach((node, index) => {
			console.log(`   ${index + 1}. ${node.nodeId}`);
			console.log(`      Score: ${(node.score * 100).toFixed(1)}%`);
			console.log(`      Success Rate: ${(node.successRate * 100).toFixed(1)}%`);
			console.log(`      Attempts: ${node.attempts}`);
		});
	}

	if (finalRankings.preferredNodes.length > 0) {
		console.log("\n🎯 Preferred Nodes (System will try these first):");
		finalRankings.preferredNodes.forEach((pref, index) => {
			const score = pref.stats ? (pref.stats.score * 100).toFixed(1) : "N/A";
			console.log(`   ${index + 1}. ${pref.nodeId} (Score: ${score}%)`);
		});
	}

	// Calculate performance metrics
	if (retrievalTimes.length > 0) {
		const avgTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;
		const minTime = Math.min(...retrievalTimes);
		const maxTime = Math.max(...retrievalTimes);

		console.log("\n📈 Performance Analysis:");
		console.log(`   Average time: ${avgTime.toFixed(0)}ms`);
		console.log(`   Fastest: ${minTime}ms`);
		console.log(`   Slowest: ${maxTime}ms`);

		// Performance insights
		if (maxTime > avgTime * 2) {
			console.log("💡 High variance detected - node intelligence will help stabilize performance");
		}

		if (avgTime > 5000) {
			console.log("⚠️  High average response time - preferred nodes should improve this");
		}

		if (minTime < 1000) {
			console.log("🚀 Fast minimum time - system found responsive nodes");
		}

		// Show improvement potential
		if (finalRankings.topNodes.length > 0) {
			const topNodeTime = finalRankings.topNodes[0].avgResponseTime;
			if (topNodeTime < avgTime) {
				const improvement = (((avgTime - topNodeTime) / avgTime) * 100).toFixed(1);
				console.log(`🎯 Potential improvement: ${improvement}% faster with preferred nodes`);
			}
		}
	}

	// Test 4: Demonstrate preference system
	console.log("\n\n4️⃣ Testing Preferred Node System...");
	console.log("-".repeat(50));

	const preferredNodes = nodePerformanceTracker.getPreferredNodes();
	if (preferredNodes.length > 0) {
		console.log(`✅ System has learned ${preferredNodes.length} preferred nodes`);
		console.log(`🎯 Next requests will try these nodes first: ${preferredNodes.slice(0, 3).join(", ")}`);

		// Test one more retrieval to show the preference system in action
		console.log("\n🔄 Testing with preferred node selection...");
		const preferredStart = Date.now();

		try {
			const preferredResult = await walrusIDToBase64(testBlobId);
			const preferredEnd = Date.now();
			console.log(`✅ Preferred node retrieval completed in ${preferredEnd - preferredStart}ms`);
		} catch (error) {
			console.log(`❌ Preferred node retrieval failed: ${error.message}`);
		}
	} else {
		console.log(`ℹ️  No preferred nodes identified yet - system needs more data`);
	}

	// Final comprehensive reports
	console.log("\n\n🏥 Final Network Health Report:");
	console.log("=".repeat(60));
	logNetworkHealth();

	console.log("\n🧠 Final Node Intelligence Report:");
	console.log("=".repeat(60));
	logNodeIntelligence();

	// Node Intelligence recommendations
	if (finalRankings.recommendations.length > 0) {
		console.log("\n🎯 Node Intelligence Recommendations:");
		finalRankings.recommendations.forEach((rec, index) => {
			console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
		});
	}

	// Usage recommendations with node intelligence
	console.log("\n💡 Advanced Usage Recommendations:");
	console.log("1. Cache blob data on your server to reduce repeated network requests");
	console.log("2. Use the preferred node system for optimal performance");
	console.log("3. Monitor node intelligence regularly with logNodeIntelligence()");
	console.log("4. Consider implementing node selection in your production code");
	console.log("5. Use getNodeRankings() to identify the best nodes for your use case");

	console.log("\n🔧 Production Implementation Example:");
	console.log(`
// In your production code:
const { getNodeRankings, logNodeIntelligence } = require('./modules/walrus.module');

// Get current best nodes
const rankings = getNodeRankings(5);
console.log('Top nodes:', rankings.topNodes.map(n => n.nodeId));

// Monitor node performance
setInterval(logNodeIntelligence, 300000); // Every 5 minutes

// The system will automatically use preferred nodes for future requests
const imageData = await prepareImageForFrontend(blobId);
	`);

	console.log("\n🎯 Key Node Intelligence Benefits:");
	console.log("✅ Automatic identification of reliable nodes");
	console.log("✅ Intelligent node selection for future requests");
	console.log("✅ Performance optimization based on historical data");
	console.log("✅ Reduced error rates through problematic node avoidance");
	console.log("✅ Faster response times by preferring high-performing nodes");
}

// Run the monitor
if (require.main === module) {
	const blobId = process.argv[2];
	monitorPerformance(blobId).catch(console.error);
}

module.exports = { monitorPerformance };
