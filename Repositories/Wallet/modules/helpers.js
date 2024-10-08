const bip39 = require("bip39");

const generateMnemonic = (wordsCount) => {
	const strength = wordsCount === 24 ? 256 : 256 / 2;

	return bip39.generateMnemonic(strength);
};

module.exports = {
	generateMnemonic,
};
