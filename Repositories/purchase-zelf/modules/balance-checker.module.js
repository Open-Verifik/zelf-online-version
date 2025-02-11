const BigNumber = require("bignumber.js");
const bitcoinModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const ethModule = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");

/**
 * checkout BTC comparison
 * @param {String} address
 * @param {Number} amountDetected
 * @returns Boolean
 */
const isBTCPaymentConfirmed = async (address, amountDetected) => {
	try {
		const response = await bitcoinModule.getBalance({
			id: address,
		});

		const balance = Number(response.balance).toFixed(7);

		return Number(balance) === Number(amountDetected);
	} catch (error) {}

	return false;
};

const isETHPaymentConfirmed = async (address, amountDetected) => {
	try {
		const response = await ethModule.getAddress({ address });

		const balance = Number(response.balance).toFixed(7);

		return Number(balance) === Number(amountDetected);
	} catch (error) {
		console.log(error);
	}

	return false;
};

const isSolanaPaymentConfirmed = async (address, amountDetected) => {
	try {
		const response = await solanaModule.getAddress({ id: address });

		const balance = Number(response.balance).toFixed(7);

		return Number(balance) === Number(amountDetected);
	} catch (error) {}

	return false;
};

module.exports = {
	isBTCPaymentConfirmed,
	isETHPaymentConfirmed,
	isSolanaPaymentConfirmed,
};
