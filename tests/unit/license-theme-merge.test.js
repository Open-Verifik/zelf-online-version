/**
 * Unit: theme merge + remote payload shape (dashboard ThemeSettings / zns lightMode + darkMode).
 * Ensures the server merges official + remote theme documents without dropping light/dark color maps.
 */
const {
	deepMergeThemeSettingsObjects,
	normalizeRemoteThemePayload,
	parseIncludeThemeSettings,
	fetchAndMergeOfficialThemeSettings,
} = require("../../Repositories/License/modules/license.module");

const mkColors = (prefix) => ({
	primary: `${prefix}-primary`,
	secondary: `${prefix}-secondary`,
	background: `${prefix}-bg`,
	backgroundSecondary: `${prefix}-bg2`,
	text: `${prefix}-text`,
	textSecondary: `${prefix}-text2`,
	textMuted: `${prefix}-muted`,
	header: `${prefix}-header`,
	headerText: `${prefix}-headerText`,
	button: `${prefix}-btn`,
	buttonText: `${prefix}-btnText`,
	buttonHover: `${prefix}-btnHover`,
	buttonSecondary: `${prefix}-btn2`,
	buttonSecondaryText: `${prefix}-btn2Text`,
	border: `${prefix}-border`,
	borderHover: `${prefix}-borderH`,
	success: `${prefix}-ok`,
	successText: `${prefix}-okT`,
	warning: `${prefix}-warn`,
	warningText: `${prefix}-warnT`,
	error: `${prefix}-err`,
	errorText: `${prefix}-errT`,
	card: `${prefix}-card`,
	cardBorder: `${prefix}-cardB`,
	shadow: `${prefix}-shadow`,
});

const fullZnsTheme = (lightPrefix, darkPrefix) => ({
	zns: {
		enabled: true,
		currentMode: "light",
		lightMode: { colors: mkColors(lightPrefix) },
		darkMode: { colors: mkColors(darkPrefix) },
	},
});

describe("license theme merge (zns lightMode / darkMode)", () => {
	it("normalizeRemoteThemePayload unwraps { themeSettings: { ... } }", () => {
		const inner = fullZnsTheme("L", "D");
		expect(normalizeRemoteThemePayload({ themeSettings: inner })).toEqual(inner);
	});

	it("normalizeRemoteThemePayload treats root object as theme settings when no themeSettings key", () => {
		const root = fullZnsTheme("R", "S");
		expect(normalizeRemoteThemePayload(root)).toEqual(root);
	});

	it("deepMergeThemeSettingsObjects merges nested lightMode/darkMode colors (remote overrides)", () => {
		const base = fullZnsTheme("base", "baseD");
		const remote = {
			zns: {
				lightMode: { colors: { primary: "#REMOTE_LIGHT", background: "#REMOTE_BG" } },
				darkMode: { colors: { primary: "#REMOTE_DARK" } },
			},
		};
		const out = deepMergeThemeSettingsObjects(base, remote);
		expect(out.zns.lightMode.colors.primary).toBe("#REMOTE_LIGHT");
		expect(out.zns.lightMode.colors.background).toBe("#REMOTE_BG");
		expect(out.zns.lightMode.colors.text).toBe("base-text");
		expect(out.zns.darkMode.colors.primary).toBe("#REMOTE_DARK");
		expect(out.zns.darkMode.colors.text).toBe("baseD-text");
		expect(out.zns.enabled).toBe(true);
		expect(out.zns.currentMode).toBe("light");
	});

	it("deepMerge preserves full zns contract after merge (all color keys present)", () => {
		const base = { zns: { enabled: false, currentMode: "dark", lightMode: { colors: {} }, darkMode: { colors: {} } } };
		const remote = fullZnsTheme("mergedL", "mergedD");
		const out = deepMergeThemeSettingsObjects(base, remote);
		const { lightMode, darkMode } = out.zns;
		const keys = Object.keys(mkColors("x"));
		for (const k of keys) {
			expect(lightMode.colors).toHaveProperty(k);
			expect(typeof lightMode.colors[k]).toBe("string");
			expect(darkMode.colors).toHaveProperty(k);
			expect(typeof darkMode.colors[k]).toBe("string");
		}
	});
});

describe("parseIncludeThemeSettings (query flag)", () => {
	const f = parseIncludeThemeSettings;
	it("is false for undefined, null, empty string", () => {
		expect(f(undefined)).toBe(false);
		expect(f(null)).toBe(false);
		expect(f("")).toBe(false);
	});
	it("is true for boolean true, numeric/string 1, and case-insensitive true", () => {
		expect(f(true)).toBe(true);
		expect(f(false)).toBe(false);
		expect(f(1)).toBe(true);
		expect(f("1")).toBe(true);
		expect(f("true")).toBe(true);
		expect(f("TRUE")).toBe(true);
		expect(f("0")).toBe(false);
		expect(f("false")).toBe(false);
		expect(f("no")).toBe(false);
		expect(f("yes")).toBe(false);
	});
});

describe("normalizeRemoteThemePayload (remote JSON shapes)", () => {
	const n = normalizeRemoteThemePayload;
	it("returns {} for null, undefined, primitives", () => {
		expect(n(null)).toEqual({});
		expect(n(undefined)).toEqual({});
		expect(n(0)).toEqual({});
		expect(n("x")).toEqual({});
	});
	it("does not unwrap themeSettings when it is not a plain object (returns whole payload)", () => {
		expect(n({ themeSettings: null })).toEqual({ themeSettings: null });
		expect(n({ themeSettings: [] })).toEqual({ themeSettings: [] });
		expect(n({ themeSettings: "nope" })).toEqual({ themeSettings: "nope" });
	});
	it("returns the array itself when payload is an array (caller merges as-is)", () => {
		const arr = [1, 2];
		expect(n(arr)).toBe(arr);
	});
});

describe("deepMergeThemeSettingsObjects (edge cases)", () => {
	const m = deepMergeThemeSettingsObjects;
	it("returns target when source is null, undefined, or array", () => {
		const t = { a: 1 };
		expect(m(t, null)).toBe(t);
		expect(m(t, undefined)).toBe(t);
		expect(m(t, [])).toBe(t);
	});
	it("replaces with source copy when target is null or not a plain object", () => {
		expect(m(null, { x: 1 })).toEqual({ x: 1 });
		expect(m(undefined, { x: 1 })).toEqual({ x: 1 });
		expect(m([], { x: 1 })).toEqual({ x: 1 });
	});
});

describe("fetchAndMergeOfficialThemeSettings (no throw, optional URL)", () => {
	beforeAll(() => {
		jest.spyOn(console, "log").mockImplementation(() => {});
		jest.spyOn(console, "warn").mockImplementation(() => {});
	});
	afterAll(() => {
		console.log.mockRestore();
		console.warn.mockRestore();
	});

	it("no-ops when domainConfig missing or themeSettingsUrl empty/whitespace", async () => {
		await fetchAndMergeOfficialThemeSettings(null);
		await fetchAndMergeOfficialThemeSettings(undefined);
		const a = { themeSettings: { zns: { enabled: true } } };
		await fetchAndMergeOfficialThemeSettings(a);
		expect(a.themeSettings.zns.enabled).toBe(true);

		const b = { themeSettingsUrl: "", themeSettings: { foo: 1 } };
		await fetchAndMergeOfficialThemeSettings(b);
		expect(b.themeSettings).toEqual({ foo: 1 });

		const c = { themeSettingsUrl: "   \t", themeSettings: { bar: 2 } };
		await fetchAndMergeOfficialThemeSettings(c);
		expect(c.themeSettings).toEqual({ bar: 2 });
	});

	it("keeps existing themeSettings when URL fetch fails (e.g. connection refused)", async () => {
		const dc = {
			themeSettingsUrl: "http://127.0.0.1:9/theme.json",
			themeSettings: { zns: { enabled: true, currentMode: "dark" } },
		};
		await fetchAndMergeOfficialThemeSettings(dc);
		expect(dc.themeSettings.zns.enabled).toBe(true);
		expect(dc.themeSettings.zns.currentMode).toBe("dark");
	});
});
