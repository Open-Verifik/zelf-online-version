/**
 * Integration: license + tags theme (`includeThemeSettings`) — zelf contract and common HTTP paths.
 * Requires a running API. Uses jest.integration.http.config.js (no Mongo).
 */
const request = require("supertest");
const testConfig = require("../config/test.config");

const API_BASE_URL = `http://localhost:${process.env.PORT || testConfig.env.PORT || 3000}`;

/** Keys from official zelf license theme JSON (includes buttonSecondaryHover). */
const ZNS_COLOR_KEYS = [
	"primary",
	"secondary",
	"background",
	"backgroundSecondary",
	"text",
	"textSecondary",
	"textMuted",
	"header",
	"headerText",
	"button",
	"buttonText",
	"buttonHover",
	"buttonSecondary",
	"buttonSecondaryText",
	"border",
	"borderHover",
	"success",
	"successText",
	"warning",
	"warningText",
	"error",
	"errorText",
	"card",
	"cardBorder",
	"shadow",
	"buttonSecondaryHover",
];

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function assertColorToken(value) {
	expect(typeof value).toBe("string");
	expect(value.length).toBeGreaterThan(0);
	const isHex = HEX_RE.test(value);
	const isRgb = /^rgba?\(/i.test(value);
	expect(isHex || isRgb).toBe(true);
}

function assertZnsModeColors(colors) {
	expect(colors).toBeDefined();
	expect(typeof colors).toBe("object");
	for (const key of ZNS_COLOR_KEYS) {
		expect(colors).toHaveProperty(key);
		assertColorToken(colors[key]);
	}
}

function authorized(req, token) {
	return req.set("Origin", "https://test.example.com").set("Authorization", `Bearer ${token}`);
}

describe("License / tags theme (includeThemeSettings)", () => {
	let authToken;

	beforeAll(async () => {
		const sessionResponse = await request(API_BASE_URL)
			.post("/api/sessions")
			.set("Origin", "https://test.example.com")
			.send({
				identifier: `license_theme_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			})
			.expect(200);

		authToken = sessionResponse.body.data.token;
		expect(authToken).toBeDefined();
	});

	describe("GET /api/license?domain=zelf (full zns color map)", () => {
		it("returns 200 with domainConfig.themeSettings.zns and full light/dark color keys", async () => {
			const res = await authorized(
				request(API_BASE_URL)
					.get("/api/license")
					.query({ domain: "zelf", withJSON: "true", includeThemeSettings: "1" }),
				authToken,
			);

			expect(res.status).toBe(200);
			expect(res.body.data.domainConfig.name).toBe("zelf");
			expect(res.body.data.domainConfig.themeSettings).toBeDefined();
			const { zns } = res.body.data.domainConfig.themeSettings;
			expect(zns).toBeDefined();
			expect(typeof zns.enabled).toBe("boolean");
			expect(["light", "dark"]).toContain(zns.currentMode);
			assertZnsModeColors(zns.lightMode?.colors);
			assertZnsModeColors(zns.darkMode?.colors);
		});
	});

	describe("GET /api/license (all licenses, includeThemeSettings=1)", () => {
		it("returns 200 with data array and zelf entry with full domainConfig.themeSettings.zns", async () => {
			const res = await authorized(
				request(API_BASE_URL).get("/api/license").query({ withJSON: "true", includeThemeSettings: "1" }),
				authToken,
			);

			expect(res.status).toBe(200);
			expect(Array.isArray(res.body.data)).toBe(true);
			expect(res.body.data.length).toBeGreaterThan(0);

			const zelfRow = res.body.data.find((row) => row.domainConfig && String(row.domainConfig.name).toLowerCase() === "zelf");
			expect(zelfRow).toBeDefined();
			expect(zelfRow.domainConfig.themeSettings).toBeDefined();
			const { zns } = zelfRow.domainConfig.themeSettings;
			expect(zns).toBeDefined();
			expect(typeof zns.enabled).toBe("boolean");
			expect(["light", "dark"]).toContain(zns.currentMode);
			assertZnsModeColors(zns.lightMode?.colors);
			assertZnsModeColors(zns.darkMode?.colors);
		});
	});

	describe("GET /api/license edge cases", () => {
		it("returns 401 without Authorization", async () => {
			const res = await request(API_BASE_URL)
				.get("/api/license")
				.query({ domain: "zelf", withJSON: "true", includeThemeSettings: "1" })
				.set("Origin", "https://test.example.com");

			expect(res.status).toBe(401);
			expect(res.body).toHaveProperty("error", "Protected resource, use Authorization header to get access");
		});

		it("returns 409 for invalid includeThemeSettings", async () => {
			const res = await authorized(
				request(API_BASE_URL).get("/api/license").query({ domain: "zelf", includeThemeSettings: "yes" }),
				authToken,
			);

			expect(res.status).toBe(409);
			expect(res.body).toHaveProperty("validationError");
		});

		it("returns 200 with includeThemeSettings=0 (no extra theme fetch)", async () => {
			const res = await authorized(
				request(API_BASE_URL).get("/api/license").query({ domain: "zelf", includeThemeSettings: "0" }),
				authToken,
			);

			expect(res.status).toBe(200);
			expect(res.body.data.domainConfig).toBeDefined();
			expect(res.body.data.domainConfig.name).toBe("zelf");
		});
	});

	describe("GET /api/tags/domains (theme on map)", () => {
		it("returns zelf with themeSettings object", async () => {
			const res = await authorized(request(API_BASE_URL).get("/api/tags/domains"), authToken);

			expect(res.status).toBe(200);
			expect(res.body.data).toHaveProperty("zelf");
			expect(typeof res.body.data.zelf.themeSettings).toBe("object");
			expect(res.body.data.zelf.themeSettings).not.toBeNull();
		});

		it("returns zelf.themeSettings with includeThemeSettings=1", async () => {
			const res = await authorized(
				request(API_BASE_URL).get("/api/tags/domains").query({ includeThemeSettings: "1" }),
				authToken,
			);

			expect(res.status).toBe(200);
			expect(res.body.data.zelf.themeSettings).toBeDefined();
			expect(typeof res.body.data.zelf.themeSettings).toBe("object");
		});

		it("returns 401 without Authorization", async () => {
			const res = await request(API_BASE_URL).get("/api/tags/domains").set("Origin", "https://test.example.com");

			expect(res.status).toBe(401);
			expect(res.body).toHaveProperty("error", "Protected resource, use Authorization header to get access");
		});
	});

	describe("GET /api/tags/domains/zelf", () => {
		it("returns themeSettings.zns light/dark primary colors with includeThemeSettings=1", async () => {
			const res = await authorized(
				request(API_BASE_URL).get("/api/tags/domains/zelf").query({ includeThemeSettings: "1" }),
				authToken,
			);

			expect(res.status).toBe(200);
			const ts = res.body.data.themeSettings;
			expect(ts.zns).toBeDefined();
			expect(typeof ts.zns.lightMode.colors.primary).toBe("string");
			expect(typeof ts.zns.darkMode.colors.primary).toBe("string");
		});
	});
});
