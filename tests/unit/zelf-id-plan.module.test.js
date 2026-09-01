const moment = require("moment");
const {
	ZELF_ID_RESERVATION_HOURS,
	getBareName,
	getBareNameLength,
	getReservationPinName,
	requiresHoldReservation,
	allowedPlansForName,
	resolvePaidPlan,
	resolveZelfIdPlan,
	resolveComplimentaryPlan,
	resolveUpgradePlan,
	effectivePlan,
	isUnpaidExpiredReservation,
	resolveV4PaymentStamp,
	getZelfIdPrice,
} = require("../../Repositories/ZelfID/modules/zelf-id-plan.module");

const licenseQuote = (price, extras = {}) => ({
	duration: "1",
	price,
	currency: "USD",
	reward: 0,
	discount: 0,
	priceWithoutDiscount: price,
	discountType: "percentage",
	length: extras.length,
	...extras,
});

const licenseDomain = (priceByName = {}) => ({
	getPrice: (tagName, duration, referralTagName) => {
		const bare = String(tagName || "").split(".")[0];
		let price = priceByName[bare] ?? priceByName["*"] ?? 40;
		if (referralTagName && String(referralTagName).includes("vip")) price = 0;
		else if (referralTagName) price = Math.round(price * 0.9 * 100) / 100;
		if (`${duration}` === "2") price = price * 2;
		return licenseQuote(price, { duration: `${duration}`, length: bare.length });
	},
});

describe("zelf-id-plan.module", () => {
	test("reservation window is 5 hours", () => {
		expect(ZELF_ID_RESERVATION_HOURS).toBe(5);
	});

	test("getBareName strips TLD and .hold", () => {
		expect(getBareName("mik.zelf")).toBe("mik");
		expect(getBareName("mik.hold")).toBe("mik");
		expect(getBareName("alice.zelf.hold")).toBe("alice");
		expect(getBareName("zid12345.zelf")).toBe("zid12345");
	});

	test("getReservationPinName is name.domain.hold", () => {
		expect(getReservationPinName("alice", "zelf")).toBe("alice.zelf.hold");
		expect(getReservationPinName("alice.zelf", "zelf")).toBe("alice.zelf.hold");
		expect(getReservationPinName("alice.zelf.hold", "zelf")).toBe("alice.zelf.hold");
		expect(getReservationPinName("alice.hold")).toBe("alice.zelf.hold");
	});

	test(".hold is only for names of 5 characters or fewer", () => {
		expect(requiresHoldReservation("mik.zelf")).toBe(true);
		expect(requiresHoldReservation("abcde")).toBe(true);
		expect(requiresHoldReservation("abcdef.zelf")).toBe(false);
		expect(requiresHoldReservation("zid12345.zelf")).toBe(false);
		expect(allowedPlansForName("mik.zelf")).toEqual(["unlimited"]);
		expect(allowedPlansForName("zid12345.zelf")).toEqual(["free", "premium", "unlimited"]);
		expect(resolvePaidPlan("mik.zelf")).toBe("unlimited");
		expect(resolvePaidPlan({ tagName: "abcdef.zelf", requestedPlan: "unlimited" })).toBe("unlimited");
		expect(resolvePaidPlan({ tagName: "abcdef.zelf", requestedPlan: "premium" })).toBe("premium");
	});

	test("resolveZelfIdPlan: long names lease free; short confirms are unlimited", () => {
		expect(resolveZelfIdPlan({ tagName: "zid12345.zelf" })).toBe("free");
		expect(resolveZelfIdPlan({ tagName: "mik.zelf" })).toBe("unlimited");
		expect(getBareNameLength("mik.zelf")).toBe(3);
	});

	test("resolveComplimentaryPlan: $0 is premium for 6+ and unlimited for 1–5", () => {
		expect(resolveComplimentaryPlan({ tagName: "zid12345.zelf", price: 0 })).toBe("premium");
		expect(resolveComplimentaryPlan({ tagName: "mik.zelf", price: 0 })).toBe("unlimited");
		expect(resolveComplimentaryPlan({ tagName: "zid12345.zelf", price: 24 })).toBeUndefined();
		expect(resolveComplimentaryPlan({ tagName: "mik.zelf", price: 40 })).toBeUndefined();
	});

	test("resolveUpgradePlan: long names choose premium or unlimited; short stays unlimited", () => {
		expect(resolveUpgradePlan({ tagName: "zid12345.zelf", requestedPlan: "premium" })).toBe("premium");
		expect(resolveUpgradePlan({ tagName: "zid12345.zelf", requestedPlan: "unlimited" })).toBe("unlimited");
		expect(resolveUpgradePlan({ tagName: "zid12345.zelf" })).toBe("premium");
		expect(resolveUpgradePlan({ tagName: "mik.zelf", requestedPlan: "premium" })).toBe("unlimited");
		expect(resolvePaidPlan("mik")).toBe("unlimited");
	});

	test("getZelfIdPrice reads the license table and never hardcodes a dollar amount", () => {
		const domainConfig = licenseDomain({ mik: 40, alice: 55, zid12345: 24 });

		const year = getZelfIdPrice({ tagName: "mik.zelf", duration: "1", domainConfig });
		expect(year.plan).toBe("unlimited");
		expect(year.allowedPlans).toEqual(["unlimited"]);
		expect(year.price).toBe(40);

		const twoYears = getZelfIdPrice({ tagName: "alice", duration: "2", domainConfig });
		expect(twoYears.price).toBe(110);
		expect(twoYears.plan).toBe("unlimited");

		const referred = getZelfIdPrice({
			tagName: "mik",
			duration: "1",
			referralTagName: "friend.zelf",
			domainConfig,
		});
		expect(referred.price).toBe(36);
		expect(referred.plan).toBe("unlimited");

		const complimentary = getZelfIdPrice({
			tagName: "mik",
			duration: "1",
			referralTagName: "vip.zelf",
			domainConfig,
		});
		expect(complimentary.price).toBe(0);
		expect(complimentary.plan).toBe("unlimited");
	});

	test("getZelfIdPrice: long names can stay free or pick a paid plan from the license", () => {
		const domainConfig = licenseDomain({ zid12345: 24 });

		const free = getZelfIdPrice({ tagName: "zid12345.zelf", duration: "1", domainConfig });
		expect(free.plan).toBe("free");
		expect(free.allowedPlans).toEqual(["free", "premium", "unlimited"]);
		expect(free.price).toBe(24);

		const premium = getZelfIdPrice({
			tagName: "zid12345.zelf",
			duration: "1",
			domainConfig,
			requestedPlan: "premium",
		});
		expect(premium.plan).toBe("premium");
		expect(premium.price).toBe(24);

		const unlimited = getZelfIdPrice({
			tagName: "zid12345.zelf",
			duration: "1",
			domainConfig,
			requestedPlan: "unlimited",
		});
		expect(unlimited.plan).toBe("unlimited");
	});

	test("getZelfIdPrice requires a license getPrice", () => {
		expect(() => getZelfIdPrice({ tagName: "mik.zelf" })).toThrow("409:license_price_required");
	});

	test("effectivePlan: expired mainnet reads as free, not a hold", () => {
		expect(
			effectivePlan({
				type: "mainnet",
				plan: "unlimited",
				expiresAt: moment().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe("free");

		expect(
			effectivePlan({
				type: "mainnet",
				plan: "premium",
				tagName: "zid12345.zelf",
				expiresAt: moment().add(6, "month").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe("premium");

		expect(
			effectivePlan({
				type: "mainnet",
				plan: "premium",
				tagName: "mik.zelf",
				expiresAt: moment().add(6, "month").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe("unlimited");
	});

	test("isUnpaidExpiredReservation deletes only expired unpaid holds", () => {
		expect(
			isUnpaidExpiredReservation({
				type: "hold",
				expiresAt: moment().subtract(6, "hour").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe(true);

		expect(
			isUnpaidExpiredReservation({
				type: "hold",
				expiresAt: moment().add(4, "hour").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe(false);

		expect(
			isUnpaidExpiredReservation({
				type: "mainnet",
				plan: "unlimited",
				expiresAt: moment().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe(false);

		expect(
			isUnpaidExpiredReservation({
				type: "mainnet",
				plan: "premium",
				expiresAt: moment().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss"),
			})
		).toBe(false);
	});

	test("resolveV4PaymentStamp: short is unlimited; long uses the requested paid plan", () => {
		const short = resolveV4PaymentStamp({ tagName: "mik", encryptVersion: 4, durationYears: 1 });
		expect(short.plan).toBe("unlimited");
		expect(moment(short.expiresAt).diff(moment(), "month")).toBeGreaterThanOrEqual(11);

		expect(resolveV4PaymentStamp({ tagName: "longname", encryptVersion: 4, requestedPlan: "premium" }).plan).toBe("premium");
		expect(resolveV4PaymentStamp({ tagName: "longname", encryptVersion: 4, requestedPlan: "unlimited" }).plan).toBe("unlimited");
		expect(resolveV4PaymentStamp({ tagName: "longname", encryptVersion: 4 }).plan).toBe("premium");

		expect(resolveV4PaymentStamp({ tagName: "legacy", encryptVersion: 3 })).toEqual({});
	});
});
