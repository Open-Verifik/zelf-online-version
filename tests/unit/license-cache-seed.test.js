const { getDomainConfig, upsertCachedDomain } = require("../../Repositories/Tags/config/supported-domains");

describe("license cache seed after save", () => {
	it("updates getDomainConfig immediately when Premium cells change", () => {
		upsertCachedDomain({
			name: "cacheseed",
			status: "active",
			tags: {
				payment: {
					pricingTable: {
						"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
					},
					planPricing: {
						premium: {
							"6-15": { 1: 29, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
						},
					},
				},
			},
		});

		const domain = getDomainConfig("cacheseed");

		expect(domain).toBeTruthy();
		expect(domain._lookupTablePrice(domain._pricingTableForPlan("premium"), 8, "1")).toBe(29);
		expect(domain._lookupTablePrice(domain._pricingTableForPlan(), 8, "1")).toBe(24);
	});

	it("does not let a later Pinata upsert without planPricing overwrite Premium cells", () => {
		upsertCachedDomain({
			name: "cacheseed",
			updatedAt: "2026-09-04T21:00:00.000Z",
			status: "active",
			tags: {
				payment: {
					pricingTable: {
						"6-15": { 1: 24, 2: 43, 3: 61, 4: 77, 5: 90, lifetime: 360 },
					},
				},
			},
		});

		const domain = getDomainConfig("cacheseed");

		expect(domain._lookupTablePrice(domain._pricingTableForPlan("premium"), 8, "1")).toBe(29);
	});
});
