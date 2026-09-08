const {
	hasPlanPricing,
	isRemoteLicenseStale,
	mergeLicenseMap,
	pickNewestIpfsRecord,
	preferLicense,
	resolveLicenseRecord,
} = require("../../Repositories/License/modules/license-cache.util");

describe("license-cache.util", () => {
	const older = {
		name: "zelf",
		updatedAt: "2026-09-04T00:00:00.000Z",
		tags: { payment: { pricingTable: { "6-15": { 1: 24 } } } },
	};
	const newer = {
		name: "zelf",
		updatedAt: "2026-09-04T20:00:00.000Z",
		ipfsCid: "cid-new",
		tags: {
			payment: {
				pricingTable: { "6-15": { 1: 24 } },
				planPricing: { premium: { "6-15": { 1: 29 } } },
			},
		},
	};

	it("keeps a newer write when Pinata returns an older license", () => {
		expect(preferLicense(newer, older)).toBe(newer);
		expect(hasPlanPricing(newer)).toBe(true);
	});

	it("keeps cached planPricing when the incoming pin has none", () => {
		expect(preferLicense(newer, older)).toBe(newer);
		expect(isRemoteLicenseStale(newer, older)).toBe(true);
		expect(isRemoteLicenseStale(older, newer)).toBe(false);
	});

	it("mergeLicenseMap does not replace a seeded domain with a stale Pinata row", () => {
		const merged = mergeLicenseMap({ zelf: newer }, [older, { name: "sui", updatedAt: "2026-09-01T00:00:00.000Z" }]);

		expect(merged.zelf.tags.payment.planPricing.premium["6-15"][1]).toBe(29);
		expect(merged.sui.name).toBe("sui");
	});

	it("pickNewestIpfsRecord prefers the last-write CID, then the newest Timestamp", () => {
		const records = [
			{ id: "cid-old", Timestamp: "2026-09-04T18:00:00.000Z" },
			{ id: "cid-new", Timestamp: "2026-09-04T19:00:00.000Z" },
			{ id: "cid-mid", Timestamp: "2026-09-04T18:30:00.000Z" },
		];

		expect(pickNewestIpfsRecord(records, "cid-old").id).toBe("cid-old");
		expect(pickNewestIpfsRecord(records).id).toBe("cid-new");
	});

	it("resolveLicenseRecord keeps the seed until Pinata lists that CID", () => {
		const seeded = { id: "cid-new", domainConfig: newer };
		const stalePins = [{ id: "cid-old", Timestamp: "2026-09-04T21:00:00.000Z", url: "ipfs://old" }];

		expect(resolveLicenseRecord(stalePins, "cid-new", seeded)).toBe(seeded);
		expect(resolveLicenseRecord([...stalePins, seeded], "cid-new", seeded).id).toBe("cid-new");
	});
});
