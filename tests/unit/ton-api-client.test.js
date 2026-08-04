const { normalizeTonRpcUrl } = require("../../Repositories/TON/modules/ton-api.client");

describe("TON API client", () => {
	it("adds the JSON-RPC path when TON_RPC_URL contains the Toncenter API base URL", () => {
		expect(normalizeTonRpcUrl("https://toncenter.com/api/v2")).toBe(
			"https://toncenter.com/api/v2/jsonRPC"
		);
		expect(normalizeTonRpcUrl("https://testnet.toncenter.com/api/v2/")).toBe(
			"https://testnet.toncenter.com/api/v2/jsonRPC"
		);
	});

	it("preserves complete and provider-specific RPC URLs", () => {
		expect(normalizeTonRpcUrl("https://toncenter.com/api/v2/jsonRPC")).toBe(
			"https://toncenter.com/api/v2/jsonRPC"
		);
		expect(normalizeTonRpcUrl("https://rpc.example.com/custom-path/")).toBe(
			"https://rpc.example.com/custom-path"
		);
	});
});
