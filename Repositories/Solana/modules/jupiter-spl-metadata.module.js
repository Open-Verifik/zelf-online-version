const { getCleanInstance } = require("../../../Core/axios");
const config = require("../../../Core/config");

const JUPITER_TOKENS_BASE = "https://api.jup.ag/tokens/v2";
const BATCH_MAX = 100;
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

const instance = getCleanInstance(20000);

const cache = new Map();

function cacheTtlMs() {
	const n = Number(process.env.JUPITER_SPL_METADATA_CACHE_TTL_MS);
	return Number.isFinite(n) && n > 0 ? n : DEFAULT_CACHE_TTL_MS;
}

function cacheGet(mint) {
	const e = cache.get(mint);
	if (!e) return null;
	if (Date.now() > e.expires) {
		cache.delete(mint);
		return null;
	}
	return { name: e.name, symbol: e.symbol, image: e.image };
}

function cacheSet(mint, meta) {
	cache.set(mint, {
		name: meta.name,
		symbol: meta.symbol,
		image: meta.image || "",
		expires: Date.now() + cacheTtlMs(),
	});
}

/**
 * @param {unknown} data
 * @returns {Map<string, { name: string, symbol: string, image: string }>}
 */
function parseJupiterSearchItems(data) {
	if (!Array.isArray(data)) return new Map();
	const map = new Map();
	for (const item of data) {
		if (!item?.id || !item.name || !item.symbol) continue;
		map.set(item.id, {
			name: item.name,
			symbol: item.symbol,
			image: item.icon || "",
		});
	}
	return map;
}

function chunk(array, size) {
	const out = [];
	for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
	return out;
}

/**
 * @param {string[]} mints
 * @param {string} apiKey
 */
async function fetchJupiterSearchBatches(mints, apiKey) {
	const combined = new Map();
	for (const batch of chunk(mints, BATCH_MAX)) {
		if (!batch.length) break;
		const { data } = await instance.get(`${JUPITER_TOKENS_BASE}/search`, {
			params: { query: batch.join(",") },
			headers: { "x-api-key": apiKey },
		});
		for (const [mint, meta] of parseJupiterSearchItems(data)) {
			combined.set(mint, meta);
		}
	}
	return combined;
}

/**
 * Fills name/symbol/image for rows that still use the Source A placeholder (symbol "SPL").
 * Uses Jupiter Tokens API v2 search (comma-separated mints, up to 100) with a short in-memory cache.
 * No-op if `JUP_API_KEY` is unset or on request failure (rows keep generic "SPL …" labels).
 *
 * @param {Array<{ tokenType: string, symbol: string, tokenAddress?: string, name: string, image: string }>} tokens
 */
async function enrichSplTokenRowsWithJupiter(tokens) {
	const apiKey = config.solana?.jupiterApiKey;
	if (!apiKey) return;

	const splRows = tokens.filter(
		(t) => t.tokenType === "SPL" && t.symbol === "SPL" && t.tokenAddress
	);
	if (!splRows.length) return;

	const uniqueMints = [...new Set(splRows.map((t) => t.tokenAddress))];
	const lookup = new Map();

	for (const mint of uniqueMints) {
		const c = cacheGet(mint);
		if (c) lookup.set(mint, c);
	}

	const toFetch = uniqueMints.filter((m) => !lookup.has(m));
	if (toFetch.length) {
		try {
			const fromApi = await fetchJupiterSearchBatches(toFetch, apiKey);
			for (const [mint, meta] of fromApi) {
				cacheSet(mint, meta);
				lookup.set(mint, meta);
			}
		} catch (e) {
			console.warn("Jupiter SPL metadata batch failed:", e?.message || e);
		}
	}

	for (const t of splRows) {
		const meta = lookup.get(t.tokenAddress);
		if (!meta) continue;
		t.name = meta.name;
		t.symbol = meta.symbol;
		t.image = meta.image || "";
	}
}

function resetJupiterSplMetadataCacheForTests() {
	cache.clear();
}

module.exports = {
	enrichSplTokenRowsWithJupiter,
	parseJupiterSearchItems,
	resetJupiterSplMetadataCacheForTests,
	JUPITER_TOKENS_BASE,
	BATCH_MAX,
};
