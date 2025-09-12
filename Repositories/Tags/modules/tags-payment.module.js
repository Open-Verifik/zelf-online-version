/**
 * Tags Payment Module
 * Handles payment logic for multi-domain tags system
 * Integrates with domain registry for pricing and payment methods
 */

const { getDomainConfig, getDomainPrice, getDomainPaymentMethods, getDomainCurrencies, getDomainLimits } = require("../config/supported-domains");

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
 * Get payment options for domain
 * @param {string} domain - Domain name
 * @returns {Object} - Payment options
 */
const getPaymentOptions = (domain) => {
	const domainConfig = getDomainConfig(domain);
	if (!domainConfig) {
		return { success: false, error: "Domain not supported" };
	}

	const paymentConfig = domainConfig.payment || {};
	const limits = getDomainLimits(domain);

	return {
		success: true,
		domain,
		methods: getDomainPaymentMethods(domain),
		currencies: getDomainCurrencies(domain),
		discounts: paymentConfig.discounts || {},
		limits: {
			maxTagsPerUser: limits.maxTagsPerUser,
			maxTransferPerDay: limits.maxTransferPerDay,
			maxRenewalPerDay: limits.maxRenewalPerDay,
		},
		pricing: {
			base: domainConfig.price,
			yearly: getDomainPrice(domain, "yearly"),
			lifetime: getDomainPrice(domain, "lifetime"),
		},
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
			error: `Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}` 
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
			error: `Payment processing failed: ${error.message}` 
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
	if (quantity >= 50) return 0.3;  // 30% discount for 50+ tags
	if (quantity >= 20) return 0.2;  // 20% discount for 20+ tags
	if (quantity >= 10) return 0.1;  // 10% discount for 10+ tags
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
