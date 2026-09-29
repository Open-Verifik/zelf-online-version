jest.mock("../../Repositories/TON/modules/ton-api.client", () => {
	const actual = jest.requireActual("../../Repositories/TON/modules/ton-api.client");
	return {
		...actual,
		tonApiGet: jest.fn(),
	};
});

const { tonApiGet, toTonUpstreamError } = require("../../Repositories/TON/modules/ton-api.client");
const { assertValidTonAddress } = require("../../Repositories/TON/modules/ton-address.util");
const TonModule = require("../../Repositories/TON/modules/ton-scrapping.module");

const VALID_ADDRESS = "EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW";

describe("TON address validation", () => {
	it("accepts bounceable mainnet addresses", () => {
		expect(assertValidTonAddress(VALID_ADDRESS)).toBe(VALID_ADDRESS);
	});

	it("rejects malformed addresses before upstream calls", () => {
		let error;
		try {
			assertValidTonAddress("not-a-ton-address");
		} catch (caught) {
			error = caught;
		}

		expect(error).toMatchObject({
			message: "invalid_ton_address",
			status: 409,
		});
	});
});

describe("TON upstream error mapping", () => {
	it("maps TonAPI decode failures to 409 invalid_ton_address", () => {
		const error = toTonUpstreamError({ response: { status: 400 } });

		expect(error.message).toBe("invalid_ton_address");
		expect(error.status).toBe(409);
	});

	it("preserves upstream auth and rate-limit statuses", () => {
		expect(toTonUpstreamError({ response: { status: 403 } })).toMatchObject({
			message: "ton_api_forbidden",
			status: 403,
		});
		expect(toTonUpstreamError({ response: { status: 429 } })).toMatchObject({
			message: "ton_api_rate_limited",
			status: 429,
		});
	});

	it("maps provider outages to ton_balance_unavailable", () => {
		expect(toTonUpstreamError({ response: { status: 503 } })).toMatchObject({
			message: "ton_balance_unavailable",
			status: 502,
		});
	});
});

describe("TON scrapping module errors", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("getAddress rejects invalid addresses without calling TonAPI", async () => {
		await expect(TonModule.getAddress({ id: "bad-address" })).rejects.toMatchObject({
			message: "invalid_ton_address",
			status: 409,
		});
		expect(tonApiGet).not.toHaveBeenCalled();
	});

	it("getTokens surfaces invalid address errors instead of ton_balance_unavailable", async () => {
		await expect(TonModule.getTokens({ id: "bad-address" }, { page: "0", show: "10" })).rejects.toMatchObject({
			message: "invalid_ton_address",
			status: 409,
		});
		expect(tonApiGet).not.toHaveBeenCalled();
	});

	it("getAddress maps TonAPI 429 to ton_api_rate_limited", async () => {
		tonApiGet.mockRejectedValue({ response: { status: 429 } });

		await expect(TonModule.getAddress({ id: VALID_ADDRESS })).rejects.toMatchObject({
			message: "ton_api_rate_limited",
			status: 429,
		});
	});
});
