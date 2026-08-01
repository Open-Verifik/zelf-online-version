const bip39 = require("bip39");
const { Account } = require("@aptos-labs/ts-sdk");

/** BIP44 coin type for Aptos (SLIP-0044). Ledger-compatible Ed25519 path. */
const APTOS_DERIVATION_PATH = "m/44'/637'/0'/0'/0'";

const validateMnemonic = (mnemonic) => {
    const normalized = String(mnemonic || "")
        .trim()
        .replace(/\s+/g, " ");

    if (!bip39.validateMnemonic(normalized)) {
        throw new Error("409:wallet_cannot_be_generated_invalid_mnemonic");
    }

    return normalized;
};

/**
 * Derive the Aptos signing account used by protected backend transfer flows.
 * Never serialize or log the returned account because it contains private key material.
 *
 * @param {string} mnemonic
 * @returns {import("@aptos-labs/ts-sdk").Account}
 */
const deriveAptosAccount = (mnemonic) =>
    Account.fromDerivationPath({
        mnemonic: validateMnemonic(mnemonic),
        path: APTOS_DERIVATION_PATH,
    });

/**
 * Derive the canonical public Aptos wallet data from a BIP39 mnemonic.
 *
 * @param {string} mnemonic
 * @returns {Promise<{ address: string, publicKey: string, derivationPath: string, scheme: string }>}
 */
async function createAptosWallet(mnemonic) {
    const account = deriveAptosAccount(mnemonic);

    return {
        address: account.accountAddress.toStringLong(),
        publicKey: account.publicKey.toString(),
        derivationPath: APTOS_DERIVATION_PATH,
        scheme: "Ed25519",
    };
}

module.exports = {
    APTOS_DERIVATION_PATH,
    createAptosWallet,
    deriveAptosAccount,
};
