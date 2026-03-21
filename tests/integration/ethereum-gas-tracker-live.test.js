/**
 * Live call: Etherscan gas oracle (if key works) or JSON-RPC eth_gasPrice fallback.
 * No mocks. Uses public mainnet RPC when ETH_MAINNET_RPC_URL is unset so CI/local
 * without Etherscan/Infura still exercises the RPC path.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), override: false });

if (!process.env.ETH_MAINNET_RPC_URL) {
	process.env.ETH_MAINNET_RPC_URL = "https://ethereum.publicnode.com";
}

const { getGasTracker } = require("../../Repositories/etherscan/modules/etherscan-scrapping.module");

describe("Ethereum getGasTracker (live)", () => {
	it("returns average.gwei suitable for wallet fee preview", async () => {
		const data = await getGasTracker({});

		expect(data).toBeDefined();
		expect(data).toHaveProperty("average");
		expect(data.average).toHaveProperty("gwei");
		expect(String(data.average.gwei).length).toBeGreaterThan(0);
		expect(Number.isFinite(Number(data.average.gwei))).toBe(true);
		expect(Number(data.average.gwei)).toBeGreaterThan(0);
	}, 60000);
});
