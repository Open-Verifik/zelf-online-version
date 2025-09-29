const { getDomainConfig, getDomainPrice, getDomainPaymentMethods, getDomainCurrencies, getDomainLimits } = require("../config/supported-domains");
const tagsIpfsModule = require("./tags-ipfs.module");
const TagsPartsModule = require("./tags-parts.module");
const { createEthWallet } = require("../../Wallet/modules/eth");
const { createBTCWallet } = require("../../Wallet/modules/btc");
const { createSolanaWallet } = require("../../Wallet/modules/solana");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const { createCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const moment = require("moment");
const { searchTag } = require("./tags.module");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");

/**
 * Tags Payment Module
 * Handles payment logic for multi-domain tags system
 * Integrates with domain registry for pricing and payment methods
 */

/**
 * Calculate payment amount for tag creation/renewal
 * @param {string} domain - Domain name
 * @param {string} duration - Duration ('yearly', 'lifetime')
 * @param {Object} options - Additional options
 * @returns {Object} - Payment calculation result
 */
const calculatePayment = (domain, duration = "yearly", options = {}) => {
	const domainConfig = getDomainConfig(domain);
	if (!domainConfig) {
		return { success: false, error: "Domain not supported" };
	}

	const basePrice = domainConfig.price;
	const discount = domainConfig.payment?.discounts?.[duration] || 0;
	const finalPrice = Math.round(basePrice * (1 - discount));

	// Apply additional discounts if provided
	let totalDiscount = discount;
	if (options.bulkDiscount) {
		totalDiscount += options.bulkDiscount;
	}
	if (options.earlyBirdDiscount) {
		totalDiscount += options.earlyBirdDiscount;
	}

	const finalAmount = Math.round(basePrice * (1 - totalDiscount));

	return {
		success: true,
		domain,
		duration,
		basePrice,
		discount: totalDiscount,
		finalAmount,
		currency: "USD", // Base currency
		paymentMethods: getDomainPaymentMethods(domain),
		supportedCurrencies: getDomainCurrencies(domain),
		discountBreakdown: {
			duration: discount,
			bulk: options.bulkDiscount || 0,
			earlyBird: options.earlyBirdDiscount || 0,
		},
	};
};

/**
 * Validate payment method for domain
 * @param {string} domain - Domain name
 * @param {string} paymentMethod - Payment method
 * @returns {Object} - Validation result
 */
const validatePaymentMethod = (domain, paymentMethod) => {
	const domainConfig = getDomainConfig(domain);
	if (!domainConfig) {
		return { valid: false, error: "Domain not supported" };
	}

	const supportedMethods = getDomainPaymentMethods(domain);
	const isValid = supportedMethods.includes(paymentMethod);

	return {
		valid: isValid,
		error: isValid ? null : `Payment method '${paymentMethod}' not supported for domain '${domain}'`,
		supportedMethods,
	};
};

/**
 * Validate currency for domain
 * @param {string} domain - Domain name
 * @param {string} currency - Currency code
 * @returns {Object} - Validation result
 */
const validateCurrency = (domain, currency) => {
	const domainConfig = getDomainConfig(domain);
	if (!domainConfig) {
		return { valid: false, error: "Domain not supported" };
	}

	const supportedCurrencies = getDomainCurrencies(domain);
	const isValid = supportedCurrencies.includes(currency);

	return {
		valid: isValid,
		error: isValid ? null : `Currency '${currency}' not supported for domain '${domain}'`,
		supportedCurrencies,
	};
};

/**
 * Get payment options
 * @param {string} tagName
 * @param {string} domain
 * @param {string} duration
 * @param {Object} authUser
 */
const getPaymentOptions = async (tagName, domain, duration, authUser) => {
	const domainConfig = getDomainConfig(domain);

	// Get current tag data
	const tagData = await searchTag({ tagName, domain, domainConfig }, authUser);

	if (tagData.available) {
		const error = new Error("tag_not_found");
		error.status = 404;
		throw error;
	}

	const tagObject = tagData.tagObject;

	const priceDetails = domainConfig.getPrice(tagName, duration);

	const recordsWithSameName = tagData.ipfs?.length || tagData.arweave?.length;

	const renewTagPayObject = await _fetchTagPayRecord(
		{
			tagName: `${tagData.tagName}.${domain}`,
			publicData: tagObject.publicData,
		},
		recordsWithSameName,
		priceDetails,
		domainConfig
	);

	if (!renewTagPayObject) {
		const error = new Error("tagPayRecord_not_found");
		error.status = 404;
		throw error;
	}

	const paymentAddress = {
		ethAddress: renewTagPayObject?.publicData?.ethAddress,
		btcAddress: renewTagPayObject?.publicData?.btcAddress,
		solanaAddress: renewTagPayObject?.publicData?.solanaAddress,
	};

	const prices = {
		ETH: null,
		SOL: null,
		BTC: null,
	};

	if (domainConfig?.payment?.currencies?.includes("ETH")) {
		prices.ETH = await calculateCryptoValue("ETH", priceDetails.price);
	}

	if (domainConfig?.payment?.currencies?.includes("SOL")) {
		prices.SOL = await calculateCryptoValue("SOL", priceDetails.price);
	}

	if (domainConfig?.payment?.currencies?.includes("BTC")) {
		prices.BTC = await calculateCryptoValue("BTC", priceDetails.price);
	}

	const returnData = {
		paymentAddress,
		prices,
		tagName: `${tagData.tagName}.${domain}`,
		tagPayName: `${tagData.tagName}.${domain}pay`,
		expiresAt: tagObject.publicData.expiresAt,
		ttl: moment().add("2", "hours").unix(),
		duration: parseInt(duration || 1),
		coinbase_hosted_url: renewTagPayObject.publicData.coinbase_hosted_url,
		coinbase_expires_at: renewTagPayObject.publicData.coinbase_expires_at,
		count: parseInt(renewTagPayObject.publicData.count),
		payment: {
			registeredAt: renewTagPayObject.publicData.registeredAt,
			expiresAt: renewTagPayObject.publicData.expiresAt,
			referralTagName: tagObject.publicData.referralTagName,
			referralSolanaAddress: tagObject.publicData.referralSolanaAddress,
		},
	};

	const signedDataPrice = jwt.sign(returnData, config.JWT_SECRET);

	return {
		...returnData,
		signedDataPrice,
	};
};

const calculateCryptoValue = async (token = "ETH", price_) => {
	try {
		const { price } = await getTickerPrice({ symbol: `${token}` });

		if (!price) throw new Error(`Unable to fetch ${token} price`);

		const cryptoValue = price_ / price;

		return {
			amountToSend: parseFloat(cryptoValue.toFixed(7)),
			ratePriceInUSD: parseFloat(parseFloat(price).toFixed(5)),
			price: price_,
		};
	} catch (error) {
		throw error;
	}
};

/**
 * check if the tag pay object requires an update
 * @param {Object} tagPayObject
 * @param {Object} priceDetails
 * @returns {boolean} - true if the tag pay object requires an update, false otherwise
 */
const _requiresUpdate = async (tagPayObject, priceDetails) => {
	const sameDuration = !tagPayObject || tagPayObject?.publicData?.duration == priceDetails.duration;

	if (!sameDuration && tagPayObject?.zelfProofQRCode) {
		console.log("deleting tag pay object...");

		await tagsIpfsModule.unPinFiles([tagPayObject.id]);

		return true;
	}

	// now check if the coinbase_expires_at is before the current date
	if (tagPayObject?.publicData?.coinbase_expires_at && moment(tagPayObject.publicData.coinbase_expires_at).isBefore(moment())) {
		console.log("deleting tag pay object...");
		await tagsIpfsModule.unPinFiles([tagPayObject.id]);

		return true;
	}

	return false;
};

/**
 * fetch the tag pay record
 * @param {Object} tagObject
 * @param {number} currentCount
 * @param {Object} priceDetails
 * @param {Object} domainConfig
 * @returns {Object} - tag pay object
 */
const _fetchTagPayRecord = async (tagObject, currentCount, priceDetails, domainConfig) => {
	const { tagName } = tagObject;

	const tagPayName = `${tagName}pay`;

	let tagPayRecords = await searchTag({ tagName: tagPayName, domainConfig });

	const tagPayObject = tagPayRecords.tagObject || {};

	const requiresUpdate = await _requiresUpdate(tagPayObject, priceDetails);

	if (!tagPayObject?.id || requiresUpdate) {
		const newTagPayObject = await createTagPay(
			{
				...tagPayObject,
				tagPayName,
			},
			tagObject,
			priceDetails,
			currentCount + 1,
			domainConfig
		);

		return newTagPayObject.tagObject;
	}

	return tagPayObject;
};

/**
 * create coinbase charge
 * @param {string} tagPayName
 * @param {Object} priceDetails
 * @param {number} currentCount
 * @param {Object} domainConfig
 * @returns {Object} - Coinbase charge object
 */
const _createCoinbaseCharge = async (tagPayName, priceDetails, currentCount, { ethAddress, btcAddress, solanaAddress }) => {
	const coinbasePayload = {
		name: tagPayName,
		description: `Purchase of the Zelf Name > ${tagPayName} for $${priceDetails.price}`,
		pricing_type: "fixed_price",
		local_price: {
			amount: `${priceDetails.price}`,
			currency: "USD",
		},
		metadata: {
			zelfName: tagPayName,
			ethAddress: ethAddress,
			btcAddress: btcAddress,
			solanaAddress: solanaAddress,
			count: `${currentCount}`,
		},
		redirect_url: "https://payment.zelf.world/checkout",
		cancel_url: "https://payment.zelf.world/checkout",
	};

	const coinbaseCharge = await createCoinbaseCharge(coinbasePayload);

	return coinbaseCharge;
};

/**
 * create tag pay
 * @param {string} tagPayName
 * @param {Object} tagObject
 * @param {Object} priceDetails
 * @param {number} currentCount
 * @param {Object} domainConfig
 * @returns {Object} - Tag pay object
 */
const createTagPay = async (tagPayObject, tagObject, priceDetails, currentCount, domainConfig) => {
	// we will get the price calculated,

	// const zkProof = await OfflineProofModule.createProof(mnemonic);

	let coinbaseCharge = null;

	if (!tagPayObject.zelfProofQRCode) {
		const mnemonic = generateMnemonic(12);
		const jsonfile = require("../../../config/0012589021.json");
		const eth = createEthWallet(mnemonic);
		const btc = createBTCWallet(mnemonic);
		const solana = await createSolanaWallet(mnemonic);

		const dataToEncrypt = {
			publicData: {
				ethAddress: eth.address,
				solanaAddress: solana.address,
				btcAddress: btc.address,
				customerZelfName: tagObject.tagName,
				[domainConfig.getTagKey()]: tagPayObject.tagPayName,
				currentCount: `${currentCount}`,
			},
			metadata: {
				mnemonic,
			},
			faceBase64: jsonfile.faceBase64,
			password: jsonfile.password,
			_id: tagPayObject.tagPayName,
			tolerance: "REGULAR",
			addServerPassword: true,
		};

		await TagsPartsModule.generateZelfProof(dataToEncrypt, tagPayObject);

		if (!tagPayObject.publicData) tagPayObject.publicData = {};

		tagPayObject.publicData.ethAddress = eth.address;
		tagPayObject.publicData.btcAddress = btc.address;
		tagPayObject.publicData.solanaAddress = solana.address;
	}

	if (domainConfig?.payment?.methods?.includes("coinbase")) {
		coinbaseCharge = await _createCoinbaseCharge(tagPayObject.tagPayName, priceDetails, currentCount, {
			ethAddress: tagPayObject.publicData.ethAddress,
			btcAddress: tagPayObject.publicData.btcAddress,
			solanaAddress: tagPayObject.publicData.solanaAddress,
		});
	}

	const payload = {
		base64: tagPayObject.zelfProofQRCode,
		name: tagPayObject.tagPayName,
		metadata: {
			hasPassword: tagObject.publicData.hasPassword,
			type: "mainnet",
			ethAddress: tagPayObject.publicData.ethAddress,
			solanaAddress: tagPayObject.publicData.solanaAddress,
			btcAddress: tagPayObject.publicData.btcAddress,
			[domainConfig.getTagKey()]: tagPayObject.tagPayName,
			extraParams: JSON.stringify({
				expiresAt: moment().add(100, "year").format("YYYY-MM-DD HH:mm:ss"),
				registeredAt: moment().format("YYYY-MM-DD HH:mm:ss"),
				price: priceDetails.price,
				duration: priceDetails.duration,
				count: `${currentCount}`,
			}),
		},
		pinIt: true,
	};

	if (coinbaseCharge) {
		payload.metadata.coinBase = JSON.stringify({
			hosted_url: coinbaseCharge.hosted_url,
			expires_at: coinbaseCharge.expires_at,
		});
	}

	let ipfs = await tagsIpfsModule.insert(payload, { pro: true });

	ipfs = tagsIpfsModule.formatRecord(ipfs);

	return {
		ipfs: [ipfs],
		tagObject: {
			...ipfs,
			zelfProofQRCode: tagObject.zelfProofQRCode,
			zelfProof: tagObject.zelfProof,
		},
		available: false,
		arweave: [],
	};
};

/**
 * Process payment for tag operation
 * @param {Object} paymentData - Payment data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Payment processing result
 */
const processPayment = async (paymentData, authUser) => {
	const { domain, amount, currency, paymentMethod, duration, tagName } = paymentData;

	// Validate domain
	const domainConfig = getDomainConfig(domain);
	if (!domainConfig) {
		return { success: false, error: "Domain not supported" };
	}

	// Validate payment method
	const methodValidation = validatePaymentMethod(domain, paymentMethod);
	if (!methodValidation.valid) {
		return { success: false, error: methodValidation.error };
	}

	// Validate currency
	const currencyValidation = validateCurrency(domain, currency);
	if (!currencyValidation.valid) {
		return { success: false, error: currencyValidation.error };
	}

	// Calculate expected amount
	const expectedAmount = getDomainPrice(domain, duration);
	if (amount !== expectedAmount) {
		return {
			success: false,
			error: `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`,
		};
	}

	// Process payment based on method
	try {
		let paymentResult;

		switch (paymentMethod) {
			case "coinbase":
				paymentResult = await processCoinbasePayment(paymentData, authUser);
				break;
			case "crypto":
				paymentResult = await processCryptoPayment(paymentData, authUser);
				break;
			case "wallet":
				paymentResult = await processWalletPayment(paymentData, authUser);
				break;
			case "enterprise":
				paymentResult = await processEnterprisePayment(paymentData, authUser);
				break;
			default:
				return { success: false, error: "Unsupported payment method" };
		}

		return {
			success: true,
			paymentId: paymentResult.paymentId,
			transactionId: paymentResult.transactionId,
			amount: paymentResult.amount,
			currency: paymentResult.currency,
			domain,
			tagName,
			duration,
			timestamp: new Date().toISOString(),
		};
	} catch (error) {
		return {
			success: false,
			error: `Payment processing failed: ${error.message}`,
		};
	}
};

/**
 * Process Coinbase payment
 * @param {Object} paymentData - Payment data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Payment result
 */
const processCoinbasePayment = async (paymentData, authUser) => {
	// TODO: Integrate with Coinbase Commerce API
	// This is a placeholder implementation
	return {
		paymentId: `coinbase_${Date.now()}`,
		transactionId: `tx_${Date.now()}`,
		amount: paymentData.amount,
		currency: paymentData.currency,
		status: "completed",
	};
};

/**
 * Process crypto payment
 * @param {Object} paymentData - Payment data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Payment result
 */
const processCryptoPayment = async (paymentData, authUser) => {
	// TODO: Integrate with crypto payment processors
	// This is a placeholder implementation
	return {
		paymentId: `crypto_${Date.now()}`,
		transactionId: `tx_${Date.now()}`,
		amount: paymentData.amount,
		currency: paymentData.currency,
		status: "completed",
	};
};

/**
 * Process wallet payment
 * @param {Object} paymentData - Payment data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Payment result
 */
const processWalletPayment = async (paymentData, authUser) => {
	// TODO: Integrate with user wallet system
	// This is a placeholder implementation
	return {
		paymentId: `wallet_${Date.now()}`,
		transactionId: `tx_${Date.now()}`,
		amount: paymentData.amount,
		currency: paymentData.currency,
		status: "completed",
	};
};

/**
 * Process enterprise payment
 * @param {Object} paymentData - Payment data
 * @param {Object} authUser - Authenticated user
 * @returns {Object} - Payment result
 */
const processEnterprisePayment = async (paymentData, authUser) => {
	// TODO: Integrate with enterprise billing system
	// This is a placeholder implementation
	return {
		paymentId: `enterprise_${Date.now()}`,
		transactionId: `tx_${Date.now()}`,
		amount: paymentData.amount,
		currency: paymentData.currency,
		status: "completed",
	};
};

/**
 * Get pricing table for all domains
 * @returns {Object} - Pricing table
 */
const getPricingTable = () => {
	const domains = Object.keys(getDomainConfig("zelf") ? {} : {}); // Get all domains
	const pricingTable = {};

	Object.entries(require("../config/supported-domains").SUPPORTED_DOMAINS).forEach(([domain, config]) => {
		pricingTable[domain] = {
			basePrice: config.price,
			yearly: getDomainPrice(domain, "yearly"),
			lifetime: getDomainPrice(domain, "lifetime"),
			currencies: getDomainCurrencies(domain),
			methods: getDomainPaymentMethods(domain),
			discounts: config.payment?.discounts || {},
			limits: getDomainLimits(domain),
		};
	});

	return pricingTable;
};

/**
 * Check if user can afford tag operation
 * @param {string} domain - Domain name
 * @param {string} duration - Duration
 * @param {Object} userWallet - User wallet data
 * @returns {Object} - Affordability check result
 */
const checkAffordability = (domain, duration, userWallet) => {
	const domainConfig = getDomainConfig(domain);
	if (!domainConfig) {
		return { canAfford: false, error: "Domain not supported" };
	}

	const requiredAmount = getDomainPrice(domain, duration);
	const userBalance = userWallet.balance || 0;

	return {
		canAfford: userBalance >= requiredAmount,
		requiredAmount,
		userBalance,
		shortfall: Math.max(0, requiredAmount - userBalance),
		domain,
		duration,
	};
};

/**
 * Apply bulk discount
 * @param {number} basePrice - Base price
 * @param {number} quantity - Number of tags
 * @returns {number} - Discount percentage
 */
const calculateBulkDiscount = (basePrice, quantity) => {
	if (quantity >= 100) return 0.5; // 50% discount for 100+ tags
	if (quantity >= 50) return 0.3; // 30% discount for 50+ tags
	if (quantity >= 20) return 0.2; // 20% discount for 20+ tags
	if (quantity >= 10) return 0.1; // 10% discount for 10+ tags
	return 0; // No discount
};

/**
 * Apply early bird discount
 * @param {string} domain - Domain name
 * @param {Date} launchDate - Domain launch date
 * @returns {number} - Discount percentage
 */
const calculateEarlyBirdDiscount = (domain, launchDate) => {
	const now = new Date();
	const daysSinceLaunch = Math.floor((now - launchDate) / (1000 * 60 * 60 * 24));

	// 20% discount for first 30 days
	if (daysSinceLaunch <= 30) return 0.2;
	// 10% discount for first 90 days
	if (daysSinceLaunch <= 90) return 0.1;

	return 0; // No discount
};

module.exports = {
	calculatePayment,
	validatePaymentMethod,
	validateCurrency,
	getPaymentOptions,
	processPayment,
	getPricingTable,
	checkAffordability,
	calculateBulkDiscount,
	calculateEarlyBirdDiscount,
};
