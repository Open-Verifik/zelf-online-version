const bitcoinModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const ethModule = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const config = require("../../../Core/config");
const jwt = require("jsonwebtoken");
const secretKey = config.signedData.key;

/**
 *  confirm Pay Single Address
 * @param {String} network
 * @param {String} confirmationData
 * @returns Boolean
 */

const confirmPayUniqueAddress = async (network, confirmationData) => {
	try {
		const { amountDetected, paymentAddress } = verifyRecordData(
			confirmationData,
			secretKey
		);

		const confirmed = await {
			ETH: isETHPaymentConfirmed,
			SOL: isSolanaPaymentConfirmed,
			BTC: isBTCPaymentConfirmed,
		}[network]?.(paymentAddress, amountDetected);

		return {
			confirmed,
		};
	} catch (e) {
		console.log({ e });
		const error = new Error("zelfName_not_found");
		error.status = 404;
		throw error;
	}
};

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
const verifyRecordData = (confirmationData, secretKey) => {
	try {
		const decodedData = jwt.verify(confirmationData, secretKey);
		return decodedData;
	} catch (error) {
		error.status = 409;
		throw error;
	}
};
module.exports = {
	confirmPayUniqueAddress,
};
