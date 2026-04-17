require("dotenv").config({ path: "../../.env" });
const axios = require("axios");
const {
	btcBookFallbackDefaultUrl,
	solanaBookFallbackDefaultUrl,
	polygonBookFallbackDefaultUrl,
	ethereumBookFallbackDefaultUrl,
	bscBookFallbackDefaultUrl,
} = require("../../Core/source-a-naas");

describe("SourceA RPC integration tests (Live endpoints)", () => {
    // Requires physical network requests.
	// Ensure your .env has all SOURCE_A_* host variables configured, including SOURCE_A_SESSION_ID.
	
	const callJsonRpc = async (url, method, params = []) => {
		const res = await axios.post(
			url,
			{
				jsonrpc: "2.0",
				id: 1,
				method,
				params,
			},
			{ headers: { "Content-Type": "application/json" }, timeout: 15000 }
		);
		return res.data;
	};

	it("should retrieve Blockbook status for BTC", async () => {
		const url = btcBookFallbackDefaultUrl();
		const res = await axios.get(`${url}/api/v2/`, { timeout: 15000 });
		expect(res.status).toBe(200);
		expect(res.data.blockbook).toBeDefined();
		expect(res.data.blockbook.coin).toBe("Bitcoin");
	}, 15000);

	it("should respond to getVersion for Solana", async () => {
		const url = solanaBookFallbackDefaultUrl();
		const data = await callJsonRpc(url, "getVersion");
		expect(data).toHaveProperty("result");
		expect(data.result).toHaveProperty("solana-core");
	}, 15000);

	it("should respond to eth_chainId for Polygon", async () => {
		const url = polygonBookFallbackDefaultUrl();
		const data = await callJsonRpc(url, "eth_chainId");
		expect(data).toHaveProperty("result");
		// Polygon mainnet is 137 (0x89)
		expect(data.result).toBe("0x89");
	}, 15000);

	it("should respond to eth_chainId for Ethereum", async () => {
		const url = ethereumBookFallbackDefaultUrl();
		const data = await callJsonRpc(url, "eth_chainId");
		expect(data).toHaveProperty("result");
		// Ethereum mainnet is 1 (0x1)
		expect(data.result).toBe("0x1");
	}, 15000);

	it("should respond to eth_chainId for BSC", async () => {
		const url = bscBookFallbackDefaultUrl();
		const data = await callJsonRpc(url, "eth_chainId");
		expect(data).toHaveProperty("result");
		// BSC mainnet is 56 (0x38)
		expect(data.result).toBe("0x38");
	}, 15000);
});
