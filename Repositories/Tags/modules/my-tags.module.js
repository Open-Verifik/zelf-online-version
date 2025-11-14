const config = require("../../../Core/config");
const { searchTag } = require("./tags.module");
const moment = require("moment");
const { getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const { getDomainConfig } = require("../config/supported-domains");
const jwt = require("jsonwebtoken");
const bitcoinModule = require("../../bitcoin/modules/bitcoin-scrapping.module");
const ETHModule = require("../../etherscan/modules/etherscan-scrapping.module");
const solanaModule = require("../../Solana/modules/solana-scrapping.module");
const AvalancheModule = require("../../Avalanche/modules/avalanche-scrapping.module");
const { sendEmail } = require("../../purchase-zelf/modules/purchase.module");
const { buildMetadata, storeInIPFS, storeInWalrus, storeInArweave } = require("./tags-payment.module");

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

	const initiatedAt = tokenDecoded.initiatedAt ? moment.unix(tokenDecoded.initiatedAt) : null;

	const renewedAtCondition = Boolean(tagObject.publicData.renewedAt && initiatedAt && moment(tagObject.publicData.renewedAt).isAfter(initiatedAt));

	const registeredAtCondition = Boolean(tokenDecoded.initiatedAt && moment(tagObject.publicData.registeredAt).isAfter(initiatedAt));

	if (renewedAtCondition || registeredAtCondition) {
		return {
			cache: true,
			confirmed: paymentConfirmation.confirmed,
			amountReceived: paymentConfirmation.amountReceived,
			paymentConfirmation,
			publicData: tagObject.publicData,
			reward: "pending_to_code",
			//await getPurchaseReward(zelfNameObject.publicData.zelfName, moment(authUser.payment.registeredAt)),
		};
	}
	// logic to extend the duration of the tag
	await addDurationToTag(
		{
			tagName: tagObject.publicData[domainConfig.getTagKey()].split(".")[0],
			price: amountToPay,
			domain,
			duration: tokenDecoded.duration || 1,
			domainConfig,
		},
		tagObject
	);

	return {
		tagObject,
		confirmed: paymentConfirmation.confirmed,
		amountReceived: paymentConfirmation.amountReceived,
		// paymentConfirmation,
		amountReceived: paymentConfirmation.amountReceived,
	};
};

const isETHPaymentConfirmed = async (address, amountToPay) => {
	try {
		const response = await ETHModule.getAddress({ address });

		const numericBalance = Number(response?.balance ?? 0);

		if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
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

const isSolanaPaymentConfirmed = async (address, amountToPay) => {
	try {
		const response = await solanaModule.getAddress({ id: address });

		const numericBalance = Number(response?.balance ?? 0);

		if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
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

		const numericBalance = Number(response?.balance ?? 0);

		if (!Number.isNaN(numericBalance) && numericBalance <= amountToPay) {
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

		const numericReceived = Number(response?.balance ?? 0);
		const amountReceived = Number.isNaN(numericReceived) ? "0" : numericReceived.toFixed(7);

		return {
			amountReceived,
			confirmed: !Number.isNaN(numericReceived) && numericReceived === Number(zelfNamePrice),
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
const addDurationToTag = async (params, tagObject) => {
	const { tagName, domain, duration, price } = params;

	const domainConfig = params.domainConfig || getDomainConfig(domain || "zelf");

	const { metadata } = buildMetadata(params, tagObject, domainConfig);

	if (domainConfig.tags.storage.walrusEnabled) {
		// await storeInWalrus(tagObject, domainConfig, metadata);
	}

	if (domainConfig.tags.storage.ipfsEnabled) {
		await storeInIPFS(tagObject, domainConfig, metadata);
	}

	if (domainConfig.tags.storage.arweaveEnabled) {
		await storeInArweave(tagObject, domainConfig, metadata);
	}

	return tagObject;
};

const sendEmailReceipt = async (tagName, domain, network, email, token) => {
	const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

	if (!tokenDecoded) {
		throw new Error("invalid_token");
	}

	// Get current tag data
	const tagData = await searchTag({ tagName, domain }, {});

	if (tagData.available) {
		const error = new Error("tag_not_found");
		error.status = 404;
		throw error;
	}

	const tagObject = tagData.tagObject;

	const price =
		tokenDecoded.prices[network]?.price ||
		tokenDecoded.prices.ETH?.price ||
		tokenDecoded.prices.SOL?.price ||
		tokenDecoded.prices.BTC?.price ||
		tokenDecoded.prices.AVAX?.price;

	return await sendEmail({
		language: tokenDecoded.language || "es",
		template: "Purchase_receipt",
		tagName: tokenDecoded.tagName,
		transactionDate: tagObject.publicData.registeredAt,
		price,
		subtotal: price,
		discount: tokenDecoded.discount || 0,
		expires: tagObject.publicData.expiresAt,
		year: tokenDecoded.duration,
		email,
	});
};

module.exports = {
	verifyPaymentConfirmation,
	transferMyTag,
	updateOldTagObject,
	addDurationToTag,
	// Utility functions
	_confirmPaymentWithCoinbase,
	sendEmailReceipt,
};
