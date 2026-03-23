const StellarHDWallet = require("stellar-hd-wallet").default;

const createStellarWallet = (mnemonic) => {
	try {
		const wallet = StellarHDWallet.fromMnemonic(mnemonic);

		return {
			address: wallet.getPublicKey(0),
			secretKey: wallet.getSecret(0),
		};
	} catch (exception) {
		const error = new Error("invalid_seed_phrase");

		error.status = 409;

		throw error;
	}
};

/**
 * Canonicalize `xlmAddress` from mnemonic, drop legacy `stellarAddress` on publicData.
 * @returns {{ stellar: { address: string, secretKey: string }, shouldPersistXlm: boolean, hadXlmBeforeHeal: boolean }}
 */
const healPublicDataXlm = (publicData, mnemonic) => {
	const stellar = createStellarWallet(mnemonic);
	const derivedXlm = stellar.address;
	const existingXlm = (publicData.xlmAddress || "").trim();
	const legacyStellar = (publicData.stellarAddress || "").trim();

	let shouldPersistXlm = false;

	if (!existingXlm) {
		publicData.xlmAddress = derivedXlm;
		shouldPersistXlm = true;
	} else if (existingXlm !== derivedXlm) {
		publicData.xlmAddress = derivedXlm;
		shouldPersistXlm = true;
	}

	if (legacyStellar) {
		delete publicData.stellarAddress;
		shouldPersistXlm = true;
	}

	return {
		stellar,
		shouldPersistXlm,
		hadXlmBeforeHeal: Boolean(existingXlm),
	};
};

module.exports = {
	createStellarWallet,
	healPublicDataXlm,
};
