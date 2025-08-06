/**
 * Simple test to check Fantom RPC connectivity and get basic balance
 */

const axios = require("axios");

const FANTOM_RPC = "https://fragrant-wild-smoke.fantom.quiknode.pro/9f6de2bac71c11f7c08e97e7be74a9d770c62a86";

console.log("=== Testing Fantom RPC Connectivity ===");

const testAddress = "0x2b4c76d0dc16be1c31d4c1dc53bf9b45987fc75c";

(async () => {
	try {
		// Test 1: Check if RPC is reachable
		console.log("Testing Fantom RPC connectivity...");
		const response = await axios.post(
			FANTOM_RPC,
			{
				jsonrpc: "2.0",
				method: "eth_blockNumber",
				params: [],
				id: 1,
			},
			{
				headers: { "Content-Type": "application/json" },
				timeout: 10000,
			}
		);

		console.log("✅ Fantom RPC is reachable");
		console.log("Response:", JSON.stringify(response.data, null, 2));
		console.log("Latest block:", parseInt(response.data.result, 16));

		// Test 2: Get balance
		console.log("\nTesting balance fetch...");
		const balanceResponse = await axios.post(
			FANTOM_RPC,
			{
				jsonrpc: "2.0",
				method: "eth_getBalance",
				params: [testAddress, "latest"],
				id: 1,
			},
			{
				headers: { "Content-Type": "application/json" },
				timeout: 10000,
			}
		);

		const balanceWei = balanceResponse.data.result;
		const balanceEth = parseInt(balanceWei, 16) / Math.pow(10, 18);

		console.log("✅ Balance fetched successfully");
		console.log("Balance Response:", JSON.stringify(balanceResponse.data, null, 2));
		console.log("Balance (Wei):", balanceWei);
		console.log("Balance (FTM):", balanceEth);

		// Test 3: Get price from Binance
		console.log("\nTesting price fetch...");
		try {
			const priceResponse = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=FTMUSDT", {
				timeout: 5000,
			});
			const price = parseFloat(priceResponse.data.price);
			console.log("✅ Price fetched successfully");
			console.log("FTM Price (USD):", price);

			const fiatBalance = balanceEth * price;
			console.log("Fiat Balance (USD):", fiatBalance);
		} catch (priceError) {
			console.log("❌ Price fetch failed:", priceError.message);
		}
	} catch (error) {
		console.log("❌ Fantom RPC test failed:", error.message);
		if (error.code) console.log("Error code:", error.code);
	}
})();
