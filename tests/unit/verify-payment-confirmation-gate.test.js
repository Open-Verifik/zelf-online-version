/**
 * Ensures verifyPaymentConfirmation does not call addDurationToTag until payment is confirmed.
 * Manual follow-up: open SOL checkout without paying — storage should not churn each poll;
 * pay once — tag should extend once, then cache branch on later polls.
 */
jest.mock("../../Repositories/Solana/modules/solana-scrapping.module", () => ({
	getAddress: jest.fn(),
}));

jest.mock("../../Repositories/Tags/modules/tags.module", () => ({
	searchTag: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
	verify: jest.fn(),
}));

jest.mock("../../Repositories/Tags/config/supported-domains", () => ({
	getDomainConfig: jest.fn(() => ({
		getTagKey: () => "zelfName",
		isWalrusEnabled: () => false,
		isIPFSEnabled: () => false,
		isArweaveEnabled: () => false,
	})),
}));

jest.mock("../../Repositories/Tags/modules/tags-payment.module", () => ({
	buildMetadata: jest.fn().mockReturnValue({ metadata: {} }),
	ensureZelfProofQRCode: jest.fn().mockResolvedValue(undefined),
	storeInIPFS: jest.fn().mockResolvedValue(undefined),
	storeInWalrus: jest.fn().mockResolvedValue(undefined),
	storeInArweave: jest.fn().mockResolvedValue(undefined),
}));

const jwt = require("jsonwebtoken");
const { searchTag } = require("../../Repositories/Tags/modules/tags.module");
const solanaModule = require("../../Repositories/Solana/modules/solana-scrapping.module");
const tagsPayment = require("../../Repositories/Tags/modules/tags-payment.module");
const Module = require("../../Repositories/Tags/modules/my-tags.module");

const SESSION_UNIX = 1_700_000_000;

const baseTagObject = () => ({
	publicData: {
		zelfName: "one650.zelf",
		renewedAt: null,
		registeredAt: "2019-01-01 00:00:00",
		expiresAt: "2026-01-01 00:00:00",
		zelfProof: { stub: true },
	},
});

describe("verifyPaymentConfirmation gates addDurationToTag", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		jwt.verify.mockReturnValue({
			tagName: "one650.zelf",
			tagPayName: "pay",
			initiatedAt: SESSION_UNIX,
			prices: { SOL: { amountToSend: 0.0055 } },
			paymentAddress: { solanaAddress: "So11111111111111111111111111111111111111112" },
			duration: 1,
		});

		searchTag.mockResolvedValue({
			available: false,
			tagObject: baseTagObject(),
		});
	});

	it("does not run tag extension (ensureZelfProofQRCode) when payment is not confirmed", async () => {
		solanaModule.getAddress.mockResolvedValue({
			balance: "0",
			transactions: [],
		});

		const data = await Module.verifyPaymentConfirmation("one650", "zelf", "SOL", "fake.jwt");

		expect(data.confirmed).toBe(false);
		expect(tagsPayment.ensureZelfProofQRCode).not.toHaveBeenCalled();
		expect(tagsPayment.storeInIPFS).not.toHaveBeenCalled();
	});

	it("runs tag extension when Solana payment is confirmed", async () => {
		solanaModule.getAddress.mockResolvedValue({
			balance: "100",
			transactions: [{ traffic: "IN", amount: 1, timestamp: SESSION_UNIX + 120 }],
		});

		const data = await Module.verifyPaymentConfirmation("one650", "zelf", "SOL", "fake.jwt");

		expect(data.confirmed).toBe(true);
		expect(tagsPayment.ensureZelfProofQRCode).toHaveBeenCalledTimes(1);
	});
});
