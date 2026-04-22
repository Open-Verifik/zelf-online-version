/**
 * Tags Addresses Module
 *
 * Centralizes how chain addresses are packed into Pinata `keyvalues` and merged
 * back when reading. Pinata limits each metadata key/value to 250 characters
 * and caps the number of custom keyvalues per pin, so most chains are folded
 * into one or more JSON blobs (`addresses`, `addresses2`, `addresses3`).
 *
 * Searchable fields stay as top-level keyvalues so Pinata's `keyvalues` filter
 * can match on them directly:
 *   - `ethAddress`
 *   - `solanaAddress`
 *
 * Storage shape inside the chunked JSON uses **short keys** to save space; on
 * read they expand to canonical app field names (`*Address`):
 *   - `btc` → `btcAddress`
 *   - `arweave` → `arweaveAddress`
 *   - `sui` → `suiAddress`
 *   - `xlm` → `xlmAddress`
 *   - `dot` → `dotAddress`
 *   - `ksm` → `ksmAddress`
 *
 * Legacy pins may still have full `*Address` keys inside chunk JSON; those merge
 * onto `publicData` unchanged.
 */

const PINATA_KEYVALUE_MAX_LENGTH = 250;
const ADDRESS_CHUNK_KEYS = ["addresses", "addresses2", "addresses3"];
const MAX_ADDRESS_CHUNKS = ADDRESS_CHUNK_KEYS.length;

/**
 * Address fields that stay as their own Pinata keyvalues so they can be used
 * in `keyvalues` filter queries. Order is informational only.
 */
const TOP_LEVEL_ADDRESS_FIELDS = ["ethAddress", "solanaAddress"];

/**
 * Stable order in which fields are packed into the chunked JSON. Top-level
 * fields above are intentionally NOT in this list.
 */
const ADDRESS_FIELDS_ORDER = ["btc", "arweave", "sui", "xlm", "dot", "ksm"];

/**
 * Chunk JSON key → canonical app field name (expanded on merge).
 */
const SHORT_STORAGE_TO_APP = {
    btc: "btcAddress",
    arweave: "arweaveAddress",
    sui: "suiAddress",
    xlm: "xlmAddress",
    dot: "dotAddress",
    ksm: "ksmAddress",
};

const APP_TO_SHORT_STORAGE = {
    btcAddress: "btc",
    arweaveAddress: "arweave",
    suiAddress: "sui",
    xlmAddress: "xlm",
    dotAddress: "dot",
    ksmAddress: "ksm",
};

/** Canonical app field names exposed on `publicData`. */
const APP_ADDRESS_FIELDS = [...TOP_LEVEL_ADDRESS_FIELDS, "btcAddress", "arweaveAddress", "suiAddress", "xlmAddress", "dotAddress", "ksmAddress"];

const _isUsableString = (value) => typeof value === "string" && value.trim() !== "";

const _readAddressFromSource = (source, chunkKey) => {
    const appKey = SHORT_STORAGE_TO_APP[chunkKey];

    if (_isUsableString(source[appKey])) return source[appKey].trim();
    if (_isUsableString(source[chunkKey])) return source[chunkKey].trim();

    return null;
};

/**
 * Build the canonical address bundle (storage-key shape) for the chunked JSON
 * keyvalues. Top-level searchable fields (`ethAddress`, `solanaAddress`) are
 * intentionally excluded — see {@link buildTopLevelAddressKeyvalues}.
 *
 * @param {Object} source - Object that may contain any of the address fields
 * @returns {Object} Bundle keyed by short chunk labels
 */
const buildAddressBundle = (source) => {
    if (!source || typeof source !== "object") return {};

    const bundle = {};

    for (const chunkKey of ADDRESS_FIELDS_ORDER) {
        const value = _readAddressFromSource(source, chunkKey);
        if (value !== null) bundle[chunkKey] = value;
    }

    return bundle;
};

/**
 * Returns top-level Pinata keyvalues for the searchable address fields,
 * omitting any that are empty.
 */
const buildTopLevelAddressKeyvalues = (source) => {
    if (!source || typeof source !== "object") return {};

    const out = {};

    for (const appKey of TOP_LEVEL_ADDRESS_FIELDS) {
        if (_isUsableString(source[appKey])) out[appKey] = source[appKey].trim();
    }

    return out;
};

/**
 * Pack a bundle into up to three JSON-string keyvalues, each ≤ 250 characters.
 * Returns an object like `{ addresses: "...", addresses2: "..." }` ready to be
 * merged into Pinata metadata.
 *
 * @param {Object} bundle - Output of `buildAddressBundle`
 * @returns {Object} Keyvalues subset to merge into the Pinata metadata
 * @throws {Error} If a single field exceeds the per-keyvalue limit, or the
 *                 bundle requires more than {@link MAX_ADDRESS_CHUNKS} chunks.
 */
const serializeAddressBundleToPinataKeyvalues = (bundle) => {
    if (!bundle || typeof bundle !== "object") return {};

    const entries = ADDRESS_FIELDS_ORDER.filter((key) => _isUsableString(bundle[key])).map((key) => [key, bundle[key]]);

    if (!entries.length) return {};

    const chunks = [];
    let current = {};

    const flushCurrent = () => {
        if (Object.keys(current).length) {
            chunks.push(current);
            current = {};
        }
    };

    for (const [key, value] of entries) {
        const probe = { ...current, [key]: value };
        const probeLength = JSON.stringify(probe).length;

        if (probeLength <= PINATA_KEYVALUE_MAX_LENGTH) {
            current = probe;
            continue;
        }

        const singleLength = JSON.stringify({ [key]: value }).length;

        if (singleLength > PINATA_KEYVALUE_MAX_LENGTH) {
            const error = new Error(`tags_addresses_field_too_long:${key}:${singleLength}`);
            error.status = 400;
            throw error;
        }

        flushCurrent();
        current = { [key]: value };
    }

    flushCurrent();

    if (chunks.length > MAX_ADDRESS_CHUNKS) {
        const error = new Error(`tags_addresses_too_many_chunks:${chunks.length}`);
        error.status = 400;
        throw error;
    }

    const result = {};

    chunks.forEach((chunk, index) => {
        result[ADDRESS_CHUNK_KEYS[index]] = JSON.stringify(chunk);
    });

    return result;
};

/**
 * Convenience wrapper used by every Pinata write path. Returns the merged set
 * of keyvalues to spread into the metadata: top-level `ethAddress` /
 * `solanaAddress` for search, plus chunked `addresses[N]` for everything else.
 */
const buildAddressKeyvalues = (source) => ({
    ...buildTopLevelAddressKeyvalues(source),
    ...serializeAddressBundleToPinataKeyvalues(buildAddressBundle(source)),
});

const _parseChunk = (raw) => {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw !== "string") return null;

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
        return null;
    }
};

/**
 * Mutates `publicData`: parses each `addresses[N]` chunk, merges the contained
 * fields onto the root, expands short chunk keys to canonical `*Address` names,
 * and removes the chunk keys. Top-level `ethAddress` / `solanaAddress` pass
 * through. Legacy chunk JSON may still use full `*Address` keys; those are
 * merged as-is.
 *
 * @param {Object} publicData - Public data object as returned from Pinata
 * @returns {Object} The same `publicData` reference, mutated in place
 */
const mergeAddressKeyvaluesIntoPublicData = (publicData) => {
    if (!publicData || typeof publicData !== "object") return publicData;

    const merged = {};

    for (const chunkKey of ADDRESS_CHUNK_KEYS) {
        const chunk = _parseChunk(publicData[chunkKey]);
        if (chunk) Object.assign(merged, chunk);
        if (chunkKey in publicData) delete publicData[chunkKey];
    }

    for (const [shortKey, appKey] of Object.entries(SHORT_STORAGE_TO_APP)) {
        if (shortKey in merged) {
            if (merged[appKey] === undefined) merged[appKey] = merged[shortKey];
            delete merged[shortKey];
        }
    }

    Object.assign(publicData, merged);

    return publicData;
};

/**
 * Returns a flat object containing every chain address under its canonical app
 * field name, sourced from a `publicData`-shaped object. Useful when callers
 * want a single "all addresses" view without mutating the input.
 */
const getAllChainAddresses = (publicData) => {
    if (!publicData || typeof publicData !== "object") return {};

    const out = {};

    for (const appKey of APP_ADDRESS_FIELDS) {
        if (_isUsableString(publicData[appKey])) {
            out[appKey] = publicData[appKey];
            continue;
        }

        const shortKey = APP_TO_SHORT_STORAGE[appKey];

        if (shortKey && _isUsableString(publicData[shortKey])) {
            out[appKey] = publicData[shortKey];
        }
    }

    return out;
};

module.exports = {
    PINATA_KEYVALUE_MAX_LENGTH,
    ADDRESS_CHUNK_KEYS,
    MAX_ADDRESS_CHUNKS,
    ADDRESS_FIELDS_ORDER,
    APP_ADDRESS_FIELDS,
    TOP_LEVEL_ADDRESS_FIELDS,
    SHORT_STORAGE_TO_APP,
    APP_TO_SHORT_STORAGE,
    buildAddressBundle,
    buildTopLevelAddressKeyvalues,
    serializeAddressBundleToPinataKeyvalues,
    buildAddressKeyvalues,
    mergeAddressKeyvaluesIntoPublicData,
    getAllChainAddresses,
};
