const bitcoinModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const ethModule = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const config = require("../../../Core/config");

/**
 *  confirm Pay Single Address
 * @param {String} network
 * @param {String} confirmationData
 * @returns Boolean
 */

const confirmPayUniqueAddress = async (network, session) => {
	const map = {
		ETH: isETHPaymentConfirmed,
		SOL: isSolanaPaymentConfirmed,
		BTC: isBTCPaymentConfirmed,
	};

	const addressMap = {
		ETH: session.paymentAddress.ethAddress,
		SOL: session.paymentAddress.solanaAddress,
		BTC: session.paymentAddress.btcAddress,
	};

	const amountMap = {
		ETH: session.ethPrices.amountToSend,
		SOL: session.solPrices.amountToSend,
		BTC: session.btcPrices?.amountToSend,
	};

	try {
		const confirmation = await map[network](addressMap[network], amountMap[network]);

		return confirmation;
	} catch (exception) {
		console.error({ exception });
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
const isBTCPaymentConfirmed = async (address, zelfNamePrice) => {
	try {
		const response = await bitcoinModule.getBalance({
			id: address,
		});

		const amountReceived = Number(response.balance).toFixed(7);

		return {
			amountReceived,
			confirmed: Number(amountReceived) === Number(zelfNamePrice),
			zelfNamePrice,
		};
	} catch (error) {}

	return false;
};

const isETHPaymentConfirmed = async (address, zelfNamePrice) => {
	try {
		const response = await ethModule.getAddress({ address });

		// const balance = Number(response.balance).toFixed(7);

		// in the near future, we should be able to check for transactions
		const amountReceived = response.transactions
			.filter((transaction) => transaction.traffic === "IN")
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		return { confirmed: Number(amountReceived) >= Number(zelfNamePrice), amountReceived, zelfNamePrice };
	} catch (error) {
		console.error(error);
	}

	return false;
};

const isSolanaPaymentConfirmed = async (address, zelfNamePrice) => {
	try {
		const response = await solanaModule.getAddress({ id: address });

		const amountReceived = Number(response.balance);

		return {
			confirmed: false,
			amountReceived,
			address,
			zelfNamePrice,
			response,
		};
	} catch (error) {}

	return false;
};

module.exports = {
	confirmPayUniqueAddress,
};
