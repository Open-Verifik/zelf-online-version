/**
 * Unit coverage for the pure planning math used by both the Stripe webhook grant and the
 * dashboard reconcile flow. Touches no Mongo, Stripe, or Solana state — exercises the
 * behavior that decides how many ZNS to issue per paid invoice.
 */

const config = require("../../Core/config");
const {
	resolvePlanAndAmount,
	resolvePayoutSolanaAddress,
} = require("../../Repositories/SubscriptionPlan/modules/subscription-zns-grant.module");

const buildSubscription = (unitAmount) => ({
	items: { data: [{ price: { unit_amount: unitAmount } }] },
});

describe("subscription-zns-grant.resolvePlanAndAmount", () => {
	const originalRewardPrice = config.token.rewardPrice;

	afterEach(() => {
		config.token.rewardPrice = originalRewardPrice;
	});

	it("computes ceil(monthlyUsd / rewardPrice) for the basic plan", () => {
		config.token.rewardPrice = 0.05;
		const result = resolvePlanAndAmount({ subscription: buildSubscription(9900) });

		expect(result.skippedReason).toBeUndefined();
		expect(result.plan.code).toBe("zelfBasic");
		expect(result.tokenAmount).toBe(Math.ceil(99 / 0.05));
		expect(result.priceToMatch).toBe(9900);
	});

	it("falls back to invoice.amount_paid when subscription has no unit_amount", () => {
		config.token.rewardPrice = 0.05;
		const result = resolvePlanAndAmount({
			subscription: { items: { data: [{ price: {} }] } },
			amountPaid: 49900,
		});

		expect(result.plan.code).toBe("zelfStartUp");
		expect(result.tokenAmount).toBe(Math.ceil(499 / 0.05));
	});

	it("returns plan_not_found when the price does not map to a license tier", () => {
		const result = resolvePlanAndAmount({ subscription: buildSubscription(123) });

		expect(result.skippedReason).toBe("plan_not_found");
		expect(result.priceToMatch).toBe(123);
	});

	it.each([0, -1, "abc", null, undefined, Number.POSITIVE_INFINITY])(
		"returns invalid_reward_price when token.rewardPrice is %p",
		(badPrice) => {
			config.token.rewardPrice = badPrice;
			const result = resolvePlanAndAmount({ subscription: buildSubscription(9900) });

			expect(result.skippedReason).toBe("invalid_reward_price");
			expect(result.planCode).toBe("zelfBasic");
		}
	);
});

describe("subscription-zns-grant.resolvePayoutSolanaAddress (JWT-first path)", () => {
	it("returns the JWT solanaAddress when the authenticated email matches the customer email", async () => {
		const result = await resolvePayoutSolanaAddress("Buyer@Example.com", {
			email: "buyer@example.com",
			solanaAddress: "52KjAddressFromJwt",
		});

		expect(result.skippedReason).toBeUndefined();
		expect(result.solanaAddress).toBe("52KjAddressFromJwt");
		expect(result.source).toBe("jwt");
	});

	it("trims whitespace and ignores case when comparing JWT email with customer email", async () => {
		const result = await resolvePayoutSolanaAddress("  buyer@example.com  ", {
			email: "BUYER@EXAMPLE.COM",
			solanaAddress: "52KjAddressFromJwt",
		});

		expect(result.solanaAddress).toBe("52KjAddressFromJwt");
		expect(result.source).toBe("jwt");
	});
});

