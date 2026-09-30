const { isAddress } = require("ethers");
const bitcoin = require("bitcoinjs-lib");
const { Address: TonAddress } = require("@ton/core");
const bs58 = require("bs58").default || require("bs58");

const { NETWORKS } = require("./networks");

/**
 * Per-network address checks for device registration, plus the normalized form
 * used as the watch-cursor key, so the same account registered with a different
 * spelling (EVM checksum case, TON EQ/UQ/raw) shares one cursor.
 *
 * Every function returns `{ key, queryAddress }` or `null` when invalid.
 * `key` identifies the account; `queryAddress` is what the chain API gets.
 */

const validateEvm = (address) => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address) || !isAddress(address)) return null;
    const lower = address.toLowerCase();
    return { key: lower, queryAddress: lower };
};

const validateSolana = (address) => {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) return null;
    try {
        if (bs58.decode(address).length !== 32) return null;
    } catch (_) {
        return null;
    }
    return { key: address, queryAddress: address };
};

const validateBitcoin = (address) => {
    if (!/^[a-zA-Z0-9]{25,90}$/.test(address)) return null;

    if (/^bc1/i.test(address)) {
        // Mixed case is invalid in bech32; decoding checks the checksum and program.
        if (address !== address.toLowerCase() && address !== address.toUpperCase()) return null;
        try {
            const decoded = bitcoin.address.fromBech32(address.toLowerCase());
            if (decoded.prefix !== "bc") return null;
            if (decoded.version === 0 && decoded.data.length !== 20 && decoded.data.length !== 32) return null;
            if (decoded.version === 1 && decoded.data.length !== 32) return null;
            if (decoded.version > 16) return null;
        } catch (_) {
            return null;
        }
        const lower = address.toLowerCase();
        return { key: lower, queryAddress: lower };
    }

    try {
        const decoded = bitcoin.address.fromBase58Check(address);
        if (decoded.version !== bitcoin.networks.bitcoin.pubKeyHash && decoded.version !== bitcoin.networks.bitcoin.scriptHash) return null;
    } catch (_) {
        return null;
    }
    return { key: address, queryAddress: address };
};

const validateTon = (address) => {
    if (!/^[A-Za-z0-9_\-+/=:]{48,70}$/.test(address)) return null;
    try {
        if (TonAddress.isFriendly(address)) {
            const parsed = TonAddress.parseFriendly(address);
            if (parsed.isTestOnly) return null;
        } else if (!TonAddress.isRaw(address)) {
            return null;
        }
        const raw = TonAddress.parse(address).toRawString().toLowerCase();
        return { key: raw, queryAddress: raw };
    } catch (_) {
        return null;
    }
};

/** Aptos account: 0x + 64 hex; wallets may drop leading zeros, but short special addresses (0x1) are not wallets. */
const validateAptos = (address) => {
    if (!/^0x[0-9a-fA-F]{50,64}$/.test(address)) return null;
    const long = `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;
    return { key: long, queryAddress: long };
};

const validateSui = (address) => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(address)) return null;
    const lower = address.toLowerCase();
    return { key: lower, queryAddress: lower };
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Decode = (input) => {
    let bits = 0;
    let value = 0;
    const out = [];
    for (const char of input) {
        const index = BASE32_ALPHABET.indexOf(char);
        if (index === -1) return null;
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(out);
};

const crc16Xmodem = (bytes) => {
    let crc = 0x0000;
    for (const byte of bytes) {
        crc ^= byte << 8;
        for (let i = 0; i < 8; i += 1) {
            crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
        }
    }
    return crc;
};

/** Stellar account id (G…): StrKey version byte 6<<3, 32-byte key, CRC16-XModem checksum. */
const validateStellar = (address) => {
    if (!/^G[A-Z2-7]{55}$/.test(address)) return null;
    const decoded = base32Decode(address);
    if (!decoded || decoded.length !== 35 || decoded[0] !== 6 << 3) return null;
    const payload = decoded.subarray(0, 33);
    const checksum = decoded[33] | (decoded[34] << 8);
    if (crc16Xmodem(payload) !== checksum) return null;
    return { key: address, queryAddress: address };
};

const validateSubstrate = (address) => {
    if (!/^[1-9A-HJ-NP-Za-km-z]{46,50}$/.test(address)) return null;
    try {
        const { decodeAddress } = require("@polkadot/util-crypto");
        decodeAddress(address);
    } catch (_) {
        return null;
    }
    return { key: address, queryAddress: address };
};

const VALIDATORS = {
    evm: validateEvm,
    solana: validateSolana,
    bitcoin: validateBitcoin,
    ton: validateTon,
    aptos: validateAptos,
    sui: validateSui,
    stellar: validateStellar,
    substrate: validateSubstrate,
};

/** `{ key, queryAddress }` for a supported network, or null when the address is invalid. */
const validateNetworkAddress = (network, address) => {
    const definition = NETWORKS[network];
    if (!definition || typeof address !== "string") return null;
    const trimmed = address.trim();
    if (!trimmed || trimmed !== address) return null;
    return VALIDATORS[definition.family](address);
};

const watchKey = (network, normalizedAddress) => `${network}:${normalizedAddress}`;

module.exports = {
    crc16Xmodem,
    validateNetworkAddress,
    watchKey,
};
