const moment = require("moment");
const { buildMetadata } = require("../../Repositories/ZelfID/modules/zelf-ids-payment.module");

const domainConfig = {
	getTagKey: () => "tagName",
};

describe("zelf-ids-payment.module", () => {
	test("buildMetadata stamps a long name as the requested paid plan", () => {
		const tagObject = {
			publicData: {
				origin: "online",
				type: "mainnet",
				plan: "free",
				hasPassword: "true",
				v: "4",
				duration: "0",
			},
		};

		const { metadata, fullTagName } = buildMetadata(
			{ tagName: "zid12345", domain: "zelf", duration: 1, price: 24, plan: "premium" },
			tagObject,
			domainConfig
		);

		expect(fullTagName).toBe("zid12345.zelf");
		expect(metadata.tagName).toBe("zid12345.zelf");
		expect(metadata.domain).toBe("zelf");

		const extra = JSON.parse(metadata.extraParams);
		expect(extra.plan).toBe("premium");
		expect(extra.type).toBe("mainnet");
		expect(Number(extra.v)).toBe(4);
		expect(extra.origin).toBe("online");
		expect(moment(extra.expiresAt).diff(moment(), "month")).toBeGreaterThanOrEqual(11);
	});

	test("buildMetadata can stamp a long name as unlimited when requested", () => {
		const tagObject = {
			publicData: {
				origin: "online",
				type: "mainnet",
				plan: "free",
				hasPassword: "true",
				v: "4",
			},
		};

		const { metadata } = buildMetadata(
			{ tagName: "zid12345", domain: "zelf", duration: 1, price: 24, plan: "unlimited" },
			tagObject,
			domainConfig
		);
		const extra = JSON.parse(metadata.extraParams);
		expect(extra.plan).toBe("unlimited");
		expect(extra.type).toBe("mainnet");
	});

	test("buildMetadata stamps a short hold as unlimited", () => {
		const tagObject = {
			publicData: {
				origin: "online",
				type: "hold",
				hasPassword: "true",
				v: "4",
			},
		};

		const { metadata } = buildMetadata({ tagName: "mik", domain: "zelf", duration: 1, price: 99 }, tagObject, domainConfig);
		const extra = JSON.parse(metadata.extraParams);
		expect(extra.plan).toBe("unlimited");
		expect(extra.type).toBe("mainnet");
	});
});
