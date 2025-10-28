const config = require("../../../Core/config");
const { searchTag } = require("./tags.module");
const moment = require("moment");
const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const { addPurchaseReward } = require("./tags-token.module");
const { getDomainConfig } = require("../config/supported-domains");
const jwt = require("jsonwebtoken");
const bitcoinModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const ETHModule = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const AvalancheModule = require("../../Avalanche/modules/avalanche-scrapping.module");

/**
 * Confirm payment with Coinbase
 * @param {string} coinbase_hosted_url
 * @returns {Object} - Payment confirmation
 */
const _confirmPaymentWithCoinbase = async (coinbase_hosted_url) => {
	const chargeID = coinbase_hosted_url?.split("/pay/")[1];

	if (!chargeID) {
		const error = new Error("coinbase_charge_id_not_found");
		error.status = 404;
		throw error;
	}

	const charge = await getCoinbaseCharge(chargeID);

	if (!charge) {
		const error = new Error("coinbase_charge_not_found");
		error.status = 404;
		throw error;
	}

	const timeline = charge.timeline;

	let confirmed = false;

	for (let index = 0; index < timeline.length; index++) {
		const _timeline = timeline[index];

		if (_timeline.status === "COMPLETED") {
			confirmed = true;
		}
	}

	return {
		charge,
		confirmed: config.coinbase.forceApproval || confirmed,
		amountReceived: config.coinbase.forceApproval || confirmed ? charge.pricing.settlement?.amount : 0,
	};
};

/**
 * Renew my tag
 * @param {string} tagName
 * @param {string} domain
 * @param {string} network
 * @param {string} token
 */
const verifyPaymentConfirmation = async (tagName, domain, network, token) => {
	const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

	const domainConfig = getDomainConfig(domain);

	if (!tokenDecoded || !tokenDecoded.tagName || !tokenDecoded.tagPayName) {
		const error = new Error("tag_not_authenticated");
		error.status = 401;
		throw error;
	}

	// Verify the tag belongs to the user
	if (tokenDecoded.tagName !== `${tagName}.${domain}`) {
		const error = new Error("tag_not_owned");
		error.status = 403;
		throw error;
	}

	// Get current tag data
	const tagData = await searchTag({ tagName, domain }, {});

	if (tagData.available) {
		const error = new Error("tag_not_found");
		error.status = 404;
		throw error;
	}

	const tagObject = tagData.tagObject;

	const amountToPay = tokenDecoded.prices[network]?.amountToSend;

	const addressMapping = {
		ETH: tokenDecoded.paymentAddress.ethAddress,
		SOL: tokenDecoded.paymentAddress.solanaAddress,
		BTC: tokenDecoded.paymentAddress.btcAddress,
		coinbase: tokenDecoded.coinbase_hosted_url,
		CB: tokenDecoded.coinbase_hosted_url,
		AVAX: tokenDecoded.paymentAddress.avalancheAddress || tokenDecoded.paymentAddress.ethAddress,
	};

	const paymentConfirmation = await confirmPayUniqueAddress(network, addressMapping[network], amountToPay);

	return { confirmed: paymentConfirmation.confirmed, paymentConfirmation, amountReceived: paymentConfirmation.amountReceived };

	// Renew the tag
	const renewedTag = await updateTag({ tagName, domain, duration: 1 }, authUser);

	// Add purchase reward
	await addPurchaseReward(authUser, domain, renewalPrice);

	return {
		tagName: `${tagName}.${domain}`,
		domain,
		domainConfig,
		renewedTag,
		expiresAt: renewedTag.expiresAt,
		renewedAt: moment().toISOString(),
	};
};

const isETHPaymentConfirmed = async (address, amountToPay) => {
	try {
		const response = await ETHModule.getAddress({ address });

		if (response?.balance && Number(response?.balance) <= amountToPay) {
			return {
				confirmed: false,
				amountReceived: 0,
				amountToPay,
				transactions: response?.transactions,
				balance: response?.balance,
				checkedFactor: "balance",
			};
		}

		const amountReceived = response.transactions
			.filter((transaction) => transaction.traffic === "IN")
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		return {
			confirmed: amountReceived >= amountToPay,
			amountReceived,
			amountToPay,
			transactions: response?.transactions,
			balance: response?.balance,
			checkedFactor: "transactions",
		};
	} catch (error) {
		console.error(error);
	}

	return false;
};

const isSolanaPaymentConfirmed = async (address, amountToPay) => {
	try {
		const response = await solanaModule.getAddress({ id: address });

		if (response?.balance && Number(response?.balance) <= amountToPay) {
			return {
				confirmed: false,
				amountReceived: 0,
				amountToPay,
				transactions: response?.transactions,
				balance: response?.balance,
				checkedFactor: "balance",
			};
		}

		const amountReceived = response?.transactions
			.filter((transaction) => transaction.traffic === "IN")
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		return {
			confirmed: amountReceived >= amountToPay,
			amountReceived,
			amountToPay,
			transactions: response?.transactions,
			balance: response?.balance,
			checkedFactor: "transactions",
		};
	} catch (error) {}

	return false;
};

const isAvalanchePaymentConfirmed = async (address, amountToPay) => {
	try {
		const response = await AvalancheModule.getAddress({ id: address });

		if (response?.balance && Number(response?.balance) <= amountToPay) {
			return {
				confirmed: false,
				amountReceived: 0,
				amountToPay,
				transactions: response?.transactions,
				balance: response?.balance,
				checkedFactor: "balance",
			};
		}

		const amountReceived = response?.transactions
			.filter((transaction) => transaction.traffic === "IN")
			.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

		return {
			confirmed: amountReceived >= amountToPay,
			amountReceived,
			amountToPay,
			transactions: response?.transactions,
			balance: response?.balance,
			checkedFactor: "transactions",
		};
	} catch (error) {
		console.error(error);
	}

	return false;
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

const confirmPayUniqueAddress = async (network, address, amountToPay) => {
	const map = {
		ETH: isETHPaymentConfirmed,
		SOL: isSolanaPaymentConfirmed,
		BTC: isBTCPaymentConfirmed,
		AVAX: isAvalanchePaymentConfirmed,
		coinbase: _confirmPaymentWithCoinbase,
	};

	try {
		const confirmation = await map[network](address, amountToPay);
		console.log({ confirmation });
		return confirmation;
	} catch (exception) {
		console.error(exception);

		const error = new Error("payment_confirmation_failed");
		error.status = 500;

		throw error;
	}
};

/**
 * Transfer my tag
 * @param {Object} params
 * @param {Object} authUser
 */
const transferMyTag = async (params, authUser) => {
	return "not-implemented";
};

/**
 * Update old tag object
 * @param {Object} tagObject
 * @param {string} domain
 */
const updateOldTagObject = async (tagObject, domain = "zelf") => {
	return "not-implemented";
};

/**
 * Add duration to tag (for RevenueCat webhook)
 * @param {Object} params - Parameters including tagName, domain, duration, eventID, eventPrice
 * @param {Object} preview - Tag preview object
 * @returns {Object} - Updated tag records
 */
const addDurationToTag = async (params, preview) => {
	return "not-implemented";
};

module.exports = {
	verifyPaymentConfirmation,
	transferMyTag,
	updateOldTagObject,
	addDurationToTag,
	// Utility functions
	_confirmPaymentWithCoinbase,
};
