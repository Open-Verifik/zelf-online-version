/**
 * Pinata metadata: 9 custom keyvalues, 250 chars per key/value, one-key filter.
 *
 * New writes keep addresses as standalone searchable keys. Overflow goes on
 * continuation pins that share the same QR and point back via `_tagName` /
 * `__tagName`. Old packed `addresses*` blobs stay readable via merge only.
 */

const PINATA_KEYVALUE_MAX_COUNT = 9;
const PINATA_KEYVALUE_MAX_LENGTH = 250;
const ADDRESS_CHUNK_KEYS = ["addresses", "addresses2", "addresses3"];
const MAX_ADDRESS_CHUNKS = ADDRESS_CHUNK_KEYS.length;

const CONTINUATION_LINK_KEY = "_tagName";
const CONTINUATION_LINK_KEY_2 = "__tagName";

const TOP_LEVEL_ADDRESS_FIELDS = ["ethAddress", "solanaAddress"];

const ADDRESS_FIELDS_ORDER = ["btc", "arweave", "sui", "xlm", "dot", "ksm", "ton", "aptos"];

const SHORT_STORAGE_TO_APP = {
    btc: "btcAddress",
    arweave: "arweaveAddress",
    sui: "suiAddress",
    xlm: "xlmAddress",
    dot: "dotAddress",
    ksm: "ksmAddress",
    ton: "tonAddress",
    aptos: "aptosAddress",
};

const APP_TO_SHORT_STORAGE = {
    btcAddress: "btc",
    arweaveAddress: "arweave",
    suiAddress: "sui",
    xlmAddress: "xlm",
    dotAddress: "dot",
    ksmAddress: "ksm",
    tonAddress: "ton",
    aptosAddress: "aptos",
};

const APP_ADDRESS_FIELDS = [
    ...TOP_LEVEL_ADDRESS_FIELDS,
    "btcAddress",
    "arweaveAddress",
    "suiAddress",
    "xlmAddress",
    "dotAddress",
    "ksmAddress",
    "tonAddress",
    "aptosAddress",
];

const SEARCHABLE_ADDRESS_FIELDS = [
    "ethAddress",
    "solanaAddress",
    "btcAddress",
    "suiAddress",
    "xlmAddress",
    "tonAddress",
    "arweaveAddress",
    "aptosAddress",
    "dotAddress",
    "ksmAddress",
];

const STANDALONE_ADDRESS_FIELDS = TOP_LEVEL_ADDRESS_FIELDS;
const PACKED_ONLY_ADDRESS_FIELDS = SEARCHABLE_ADDRESS_FIELDS.filter((field) => !STANDALONE_ADDRESS_FIELDS.includes(field));
const ADDRESS_KEYVALUE_CHUNKS = ADDRESS_CHUNK_KEYS;
const PRIMARY_RESERVED_KEYS = ["zelfName", "tagName", "domain", "extraParams"];

const ADDRESS_KEY_ALIASES = {
    eth: "ethAddress",
    ethereum: "ethAddress",
    sol: "solanaAddress",
    solana: "solanaAddress",
    bitcoin: "btcAddress",
    stellar: "xlmAddress",
    polkadot: "dotAddress",
    kusama: "ksmAddress",
    ...SHORT_STORAGE_TO_APP,
};

const _isUsableString = (value) => typeof value === "string" && value.trim() !== "";

const _readAddressFromSource = (source, chunkKey) => {
    const appKey = SHORT_STORAGE_TO_APP[chunkKey];

    if (_isUsableString(source[appKey])) return source[appKey].trim();
    if (_isUsableString(source[chunkKey])) return source[chunkKey].trim();

    return null;
};

const buildAddressBundle = (source) => {
    if (!source || typeof source !== "object") return {};

    const bundle = {};

    for (const chunkKey of ADDRESS_FIELDS_ORDER) {
        const value = _readAddressFromSource(source, chunkKey);
        if (value !== null) bundle[chunkKey] = value;
    }

    return bundle;
};

const buildTopLevelAddressKeyvalues = (source) => {
    if (!source || typeof source !== "object") return {};

    const out = {};

    for (const appKey of TOP_LEVEL_ADDRESS_FIELDS) {
        if (_isUsableString(source[appKey])) out[appKey] = source[appKey].trim();
    }

    return out;
};

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
 * Read-only compat for old packed pins. New writes must use
 * {@link buildSearchablePinPages} instead.
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

const resolveAddressKey = (key) => ADDRESS_KEY_ALIASES[String(key || "").toLowerCase()] || key;

const normalizeAddressMap = (source = {}) => {
    const addresses = {};

    if (!source || typeof source !== "object") return addresses;

    for (const field of SEARCHABLE_ADDRESS_FIELDS) {
        const value = source[field];
        if (_isUsableString(value)) addresses[field] = value.trim();
    }

    return addresses;
};

const isPackedAddressPublicData = (source = {}) => ADDRESS_CHUNK_KEYS.some((chunkKey) => Boolean(source?.[chunkKey]));

const isContinuationPublicData = (source = {}) => Boolean(source?.[CONTINUATION_LINK_KEY] || source?.[CONTINUATION_LINK_KEY_2]);

const getContinuationCanonicalName = (source = {}) => source?.[CONTINUATION_LINK_KEY] || source?.[CONTINUATION_LINK_KEY_2] || null;

const continuationPinName = (tagName, pageIndex) => {
    const prefix = pageIndex === 0 ? "_" : "__";
    return `${prefix}${tagName}`;
};

const resolveEncryptVersion = (source = {}) => {
    const raw = source.v ?? source.zelfEncryptVersion ?? source.encryptVersion;
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    return parsed === 4 ? 4 : 3;
};

const stampExtraParamsVersion = (extraParams = {}, version) => {
    const parsed =
        typeof extraParams === "string"
            ? (() => {
                  try {
                      return JSON.parse(extraParams);
                  } catch (_error) {
                      return {};
                  }
              })()
            : { ...(extraParams || {}) };

    parsed.v = Number(version) === 4 ? 4 : 3;
    delete parsed.zelfEncryptVersion;
    return parsed;
};

const collectReservedKeyvalues = (reserved = {}) => {
    const keyvalues = {};

    for (const [key, value] of Object.entries(reserved || {})) {
        if (value === undefined || value === null || value === "") continue;
        if (SEARCHABLE_ADDRESS_FIELDS.includes(key)) continue;
        if (ADDRESS_CHUNK_KEYS.includes(key)) continue;
        if (key === CONTINUATION_LINK_KEY || key === CONTINUATION_LINK_KEY_2) continue;
        keyvalues[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
    }

    return keyvalues;
};

const collectAddressEntries = (addresses = {}) => {
    const normalized = normalizeAddressMap(addresses);
    const entries = [];

    for (const field of SEARCHABLE_ADDRESS_FIELDS) {
        if (!normalized[field]) continue;
        entries.push([field, normalized[field]]);
    }

    return entries;
};

/**
 * Split reserved metadata + addresses into a primary pin and overflow pages.
 * Primary always keeps the domain storage key, domain, and extraParams.
 */
const buildSearchablePinPages = ({ reserved = {}, addresses = {}, tagName } = {}) => {
    const reservedKeyvalues = collectReservedKeyvalues(reserved);
    const addressEntries = collectAddressEntries(addresses);
    const reservedCount = Object.keys(reservedKeyvalues).length;
    const primaryAddressBudget = Math.max(0, PINATA_KEYVALUE_MAX_COUNT - reservedCount);

    const primaryAddresses = addressEntries.slice(0, primaryAddressBudget);
    const overflow = addressEntries.slice(primaryAddressBudget);

    const primaryKeyvalues = { ...reservedKeyvalues };
    for (const [key, value] of primaryAddresses) {
        primaryKeyvalues[key] = value;
    }

    const pages = {
        primary: {
            name: tagName,
            keyvalues: primaryKeyvalues,
        },
        continuations: [],
    };

    const pageSize = PINATA_KEYVALUE_MAX_COUNT - 1;
    const linkKeys = [CONTINUATION_LINK_KEY, CONTINUATION_LINK_KEY_2];

    for (let pageIndex = 0; pageIndex < linkKeys.length && overflow.length > pageIndex * pageSize; pageIndex += 1) {
        const slice = overflow.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
        const keyvalues = {
            [linkKeys[pageIndex]]: tagName,
        };

        for (const [key, value] of slice) {
            keyvalues[key] = value;
        }

        pages.continuations.push({
            name: continuationPinName(tagName, pageIndex),
            keyvalues,
            linkKey: linkKeys[pageIndex],
        });
    }

    return pages;
};

const extractAddressKeyvaluesFromPublicData = (source = {}) => {
    const expanded = {};

    if (source && typeof source === "object") {
        for (const chunkKey of ADDRESS_CHUNK_KEYS) {
            const chunk = _parseChunk(source[chunkKey]);
            if (!chunk) continue;

            for (const [rawKey, value] of Object.entries(chunk)) {
                if (!_isUsableString(value)) continue;
                expanded[resolveAddressKey(rawKey)] = value.trim();
            }
        }
    }

    return normalizeAddressMap({
        ...expanded,
        ...(source || {}),
    });
};

const mergeContinuationAddresses = (target = {}, source = {}) => {
    for (const field of SEARCHABLE_ADDRESS_FIELDS) {
        if (source[field] && !target[field]) target[field] = source[field];
    }
    return target;
};

const omitAddressKeyvalues = (metadata = {}) => collectReservedKeyvalues(metadata);

module.exports = {
    ADDRESS_CHUNK_KEYS,
    ADDRESS_FIELDS_ORDER,
    ADDRESS_KEYVALUE_CHUNKS,
    APP_ADDRESS_FIELDS,
    APP_TO_SHORT_STORAGE,
    CONTINUATION_LINK_KEY,
    CONTINUATION_LINK_KEY_2,
    MAX_ADDRESS_CHUNKS,
    PACKED_ONLY_ADDRESS_FIELDS,
    PINATA_KEYVALUE_MAX_COUNT,
    PINATA_KEYVALUE_MAX_LENGTH,
    PRIMARY_RESERVED_KEYS,
    SEARCHABLE_ADDRESS_FIELDS,
    SHORT_STORAGE_TO_APP,
    STANDALONE_ADDRESS_FIELDS,
    TOP_LEVEL_ADDRESS_FIELDS,
    buildAddressBundle,
    buildAddressKeyvalues,
    buildSearchablePinPages,
    buildTopLevelAddressKeyvalues,
    collectReservedKeyvalues,
    continuationPinName,
    extractAddressKeyvaluesFromPublicData,
    getAllChainAddresses,
    getContinuationCanonicalName,
    isContinuationPublicData,
    isPackedAddressPublicData,
    mergeAddressKeyvaluesIntoPublicData,
    mergeContinuationAddresses,
    normalizeAddressMap,
    omitAddressKeyvalues,
    resolveEncryptVersion,
    serializeAddressBundleToPinataKeyvalues,
    stampExtraParamsVersion,
};
