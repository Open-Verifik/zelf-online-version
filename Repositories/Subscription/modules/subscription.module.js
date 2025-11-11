const Stripe = require("stripe");

const configuration = require("../../../Core/config");
const pinata = require("../../../Core/ipfs");
const SignerData = require("../../../config/0012589021.json");
const { calculateCryptoAmount } = require("../../../Utilities/crypto-price.module.js");
const { lockPriceData, verifyLockedPrice } = require("../../../Utilities/price-lock.module.js");

const { createEthWallet } = require("../../Wallet/modules/eth");
const { generateMnemonic } = require("../../Wallet/modules/helpers");
const ZelfProofModule = require("../../ZelfProof/modules/zelf-proof.module.js");

const processedWebhooks = new Map();

/**
 * Stripe client instance
 * @type {Stripe}
 */
const stripe = new Stripe(configuration.stripe.secretKey, {
	apiVersion: "2023-10-16",
});

/**
 *
 * @param {string | Date} date
 * @returns {string} formatted date string
 */
const formatDateTime = (date) => {
	const pad = (n) => String(n).padStart(2, "0");

	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
		date.getSeconds()
	)}`;
};

/**
 *
 * @param {Date} date
 * @param {number} minutes
 * @returns {Date} date with added minutes
 */
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

/**
 *
 * @param {Date} date
 * @param {number} months
 * @returns {Date} date with added months
 */
const addMonths = (date, months) => {
	const d = new Date(date.getTime());

	d.setMonth(d.getMonth() + months);

	return d;
};

/**
 *
 * @param {string} str
 * @returns {Date | null} parsed date
 */
const parseDateTime = (str) => {
	if (!str) return null;

	const isoLike = str.includes("T") ? str : str.replace(" ", "T");
	const d = new Date(isoLike);

	return isNaN(d.getTime()) ? null : d;
};

/**
 *
 * @param {string} tagName
 * @param {string} extension
 * @returns {string} converted zelfKeys format
 */
const convertToZelfKeysFormat = (tagName, extension = ".zelfkeys") => {
	if (!tagName) return tagName;

	tagName = tagName.split(".")[0];

	return `${tagName}${extension}`;
};

/**
 *
 * @param {Object} user
 * @returns {Object} subscription data
 */
const getActiveSubscription = async (user) => {
	const { tagName } = user;

	const zelfKeysTag = convertToZelfKeysFormat(tagName, ".zelfkeys");
	const subscriptionData = await searchSubscriptionInIPFS(zelfKeysTag);

	if (!subscriptionData) {
		return { success: false, message: "no_active_subscription_found", subscription: null };
	}

	return subscriptionData;
};

/**
 *
 * @returns {Object} available plans
 */
const getAvailablePlans = async () => {
	const plans = Object.entries(configuration.stripe.plans).map(([key, plan]) => ({
		id: key,
		name: plan.name,
		description: plan.description,
		price: plan.price,
		currency: plan.currency,
		interval: plan.interval,
		priceId: plan.priceId,
	}));

	return { success: true, plans };
};

/**
 *
 * @param {Object} body
 * @param {Object} user
 * @returns {Object} checkout session data
 */
const createCheckoutSession = async (body, user) => {
	const { tagName } = user;
	const { planId } = body;

	if (!planId || !configuration.stripe.plans[planId]) {
		const error = new Error("valid_plan_required");

		error.status = 400;

		throw error;
	}

	const planConfig = configuration.stripe.plans[planId];

	const session = await stripe.checkout.sessions.create({
		cancel_url: configuration.stripe.checkoutUrls.cancel,
		customer_email: `${tagName}@zelf.world`,
		line_items: [{ price: planConfig.priceId, quantity: 1 }],
		metadata: { tagName: tagName, plan: planId, source: "extension" },
		mode: "subscription",
		payment_method_types: ["card"],
		subscription_data: { metadata: { tagName: tagName, plan: planId, source: "extension" } },
		success_url: `${configuration.stripe.checkoutUrls.success}&session_id={CHECKOUT_SESSION_ID}`,
	});

	return { success: true, checkoutUrl: session.url, sessionId: session.id };
};

/**
 *
 * @param {Object} user
 * @returns {Object} cancellation result
 */
const cancelSubscription = async (user) => {
	const { tagName } = user;

	const zelfKeysTag = convertToZelfKeysFormat(tagName, ".zelfkeys");
	const subscriptionData = await searchSubscriptionInIPFS(zelfKeysTag);

	if (!subscriptionData) return { success: true, message: "no_active_subscription_found" };

	const subscription = await stripe.subscriptions.update(subscriptionData.stripeSubscriptionId, { cancel_at_period_end: true });

	await updateSubscriptionInIPFS(zelfKeysTag, { ...subscriptionData, cancelAtPeriodEnd: true });

	return {
		success: true,
		message: "subscription_will_be_canceled_at_period_end",
		subscription: {
			cancelAtPeriodEnd: subscription.cancel_at_period_end,
			currentPeriodEnd: new Date(subscription.current_period_end * 1000),
			id: subscriptionData.id,
			status: subscription.status,
		},
	};
};

/**
 *
 * @param {Object} body
 * @param {Object} authUser
 * @returns {Object} crypto payment data
 */
const createCryptoPayment = async (body, authUser) => {
	const { planId } = body;
	const { tagName } = authUser;

	const plans = configuration.stripe.plans;
	const selectedPlan = plans[planId];

	if (!selectedPlan) throw new Error("invalid_plan_selected");

	const zkPayTag = convertToZelfKeysFormat(tagName, ".zkpay");
	const recordsFound = await pinata.filter("zkPay", zkPayTag);
	const existingZkPay = recordsFound && Array.isArray(recordsFound) && recordsFound.length ? recordsFound[0] : null;

	const priceCalculation = await calculateCryptoAmount(selectedPlan.price, "AVAX");
	const isDemoMode = configuration.cryptoPayments.demoMode;
	const demoMultiplier = configuration.cryptoPayments.demoMultiplier;
	const demoUsdAmount = isDemoMode ? selectedPlan.price * demoMultiplier : selectedPlan.price;
	const demoPriceCalculation = isDemoMode ? await calculateCryptoAmount(demoUsdAmount, "AVAX") : priceCalculation;

	const priceLockData = {
		avaxAmount: isDemoMode ? demoPriceCalculation.cryptoAmount : priceCalculation.cryptoAmount,
		avaxPrice: priceCalculation.cryptoPrice,
		currency: "AVAX",
		isDemoMode,
		paymentAddress: existingZkPay?.publicData?.avalancheAddress,
		planId,
		usdAmount: isDemoMode ? demoUsdAmount : selectedPlan.price,
		tagName: tagName,
		zkPayTag,
	};

	const lockedPriceToken = lockPriceData(priceLockData, 30);

	if (existingZkPay) {
		const returnData = {
			amount: isDemoMode ? demoPriceCalculation.cryptoAmount : priceCalculation.cryptoAmount,
			avaxPrice: priceCalculation.cryptoPrice,
			currency: "AVAX",
			expiresAt: formatDateTime(addMinutes(new Date(), 30)),
			isDemoMode,
			lockedPriceToken,
			originalAmount: { usd: selectedPlan.price, avax: priceCalculation.cryptoAmount },
			paymentAddress: existingZkPay.publicData?.avalancheAddress,
			success: true,
			usdAmount: isDemoMode ? demoUsdAmount : selectedPlan.price,
		};

		return {
			...returnData,
			zkPay: {
				ipfs_pin_hash: existingZkPay.ipfs_pin_hash,
				name: existingZkPay.name,
				publicData: existingZkPay.publicData,
				url: existingZkPay.url,
			},
		};
	}

	const zkPay = await _storePaymentAddress(tagName, zkPayTag);

	const returnData = {
		amount: priceLockData.avaxAmount,
		avaxPrice: priceLockData.avaxPrice,
		currency: "AVAX",
		expiresAt: formatDateTime(addMinutes(new Date(), 30)),
		isDemoMode: priceLockData.isDemoMode,
		lockedPriceToken,
		originalAmount: { usd: priceLockData.originalUsdAmount, avax: priceLockData.originalAvaxAmount },
		paymentAddress: zkPay.publicData.avalancheAddress,
		success: true,
		usdAmount: priceLockData.usdAmount,
	};

	return { ...returnData, zkPay };
};

/**
 *
 * @param {string} tagName
 * @param {string} zkPay
 * @returns {Object} payment address data
 */
const _storePaymentAddress = async (tagName, zkPay) => {
	const mnemonic = generateMnemonic(12);
	const wallet = createEthWallet(mnemonic);

	const zkPayData = {
		faceBase64: SignerData.faceBase64,
		identifier: zkPay,
		livenessLevel: "REGULAR",
		metadata: { mnemonic },
		os: "DESKTOP",
		password: SignerData.password,
		publicData: { avalancheAddress: wallet.address, zkPay, customerTag: tagName },
		requireLiveness: true,
	};

	const { zelfQR } = await ZelfProofModule.encryptQRCode(zkPayData);

	const ipfsResult = await pinata.pinFile(zelfQR, `${zkPay}`, "application/json", { ...zkPayData.publicData });

	return {
		url: ipfsResult.url,
		ipfs_pin_hash: ipfsResult.IpfsHash,
		name: ipfsResult.Name,
		publicData: ipfsResult.metadata,
		paymentAddress: wallet.address,
	};
};

/**
 *
 * @param {Object} event - Stripe webhook event object
 * @returns {Object} webhook handler result
 */
const webhookHandler = async (event) => {
	try {
		const eventKey = `${event.type}_${event.data?.object?.id}_${event.created}`;

		if (processedWebhooks.has(eventKey)) {
			return { received: true, duplicate: true };
		}

		processedWebhooks.set(eventKey, Date.now());

		await new Promise((r) => setTimeout(r, 100));

		const oneHourAgo = Date.now() - 60 * 60 * 1000;

		for (const [key, ts] of processedWebhooks.entries()) if (ts < oneHourAgo) processedWebhooks.delete(key);

		let result = { received: true, eventKey };

		switch (event.type) {
			case "checkout.session.completed":
				await handleCheckoutSessionCompleted(event.data.object);

				result.checkoutProcessed = true;

				break;
			case "customer.subscription.created":
				await handleSubscriptionCreated(event.data.object);

				result.subscriptionCreated = true;

				break;
			case "customer.subscription.updated":
				await handleSubscriptionUpdated(event.data.object);

				result.subscriptionUpdated = true;

				break;
			case "customer.subscription.deleted":
				await handleSubscriptionDeleted(event.data.object);

				result.subscriptionDeleted = true;

				break;
			case "invoice.payment_succeeded":
				result.invoiceResult = await handleInvoicePaymentSucceeded(event.data.object);
				result.invoicePaymentProcessed = true;

				break;
			default:
				result.unhandledEvent = event.type;
		}

		return result;
	} catch (error) {
		const eventKey = `${event.type}_${event.data?.object?.id}_${event.created}`;

		processedWebhooks.delete(eventKey);

		throw error;
	}
};

/**
 *
 * @param {string} zelfKeysTag
 * @returns {Object} subscription data
 */
async function searchSubscriptionInIPFS(zelfKeysTag) {
	try {
		const files = await pinata.filter("tagName", zelfKeysTag);

		let activeSubscription = null;

		for (const element of files) {
			const keyValues = element.publicData;
			const isActiveOrCancelledActive = !keyValues.status || keyValues.status === "active" || keyValues.status === "cancelled_active";

			if (isActiveOrCancelledActive) {
				activeSubscription = {
					id: element.id,
					url: element.url,
					ipfs_pin_hash: element.ipfs_pin_hash,
					name: element.name,
					...keyValues,
					stripeData: keyValues.stripeData ? JSON.parse(keyValues.stripeData) : null,
					cryptoData: keyValues.cryptoData ? JSON.parse(keyValues.cryptoData) : null,
				};

				break;
			}
		}

		return activeSubscription;
	} catch (error) {
		console.error("Error searching subscription in IPFS:", error);
	}

	return null;
}

/**
 *
 * @param {string} zelfKeysTag
 * @param {Object} subscriptionData
 * @returns {Object} IPFS result
 */
async function updateSubscriptionInIPFS(zelfKeysTag, subscriptionData) {
	const ipfsResult = await pinata.pinFile(
		Buffer.from(JSON.stringify(subscriptionData)).toString("base64"),
		`${zelfKeysTag}.json`,
		"application/json",
		subscriptionData
	);

	if (!ipfsResult) throw new Error("failed_to_store_subscription_in_ipfs");

	return ipfsResult;
}

/**
 *
 * @param {Object} session
 */
async function handleCheckoutSessionCompleted(session) {
	try {
		// no-op; wait for payment confirmation
	} catch (error) {
		console.error("Error handling checkout session completed:", error);
	}
}

/**
 *
 * @param {Object} subscription
 */
async function handleSubscriptionCreated(subscription) {
	try {
		// no-op; wait for payment confirmation
	} catch (error) {
		console.error("Error handling subscription created:", error);
	}
}

/**
 *
 * @param {Object} invoice
 * @returns {Object} invoice payment succeeded result
 */
async function handleInvoicePaymentSucceeded(invoice) {
	try {
		if (!invoice.subscription) return { success: false, message: "not_a_subscription_invoice_skipping" };

		let subscription;
		let tagName;

		try {
			subscription = await stripe.subscriptions.retrieve(invoice.subscription);
			tagName = subscription.metadata.tagName;
		} catch (error) {
			tagName = invoice.metadata?.tagName;
			subscription = {
				id: invoice.subscription,
				customer: invoice.customer,
				status: "active",
				metadata: { tagName, plan: invoice.metadata?.plan || "basic" },
			};
		}

		if (!tagName) {
			return {
				success: false,
				message: "no_zelf_name_found_in_subscription_metadata",
				metadataInStripeSubscription: subscription.metadata,
			};
		}

		const zelfKeysTag = convertToZelfKeysFormat(tagName);
		const existingSubscription = await searchSubscriptionInIPFS(zelfKeysTag);

		if (existingSubscription) {
			return {
				success: false,
				message: "subscription_already_exists_skipping_creation",
				existingSubscriptionMetadata: existingSubscription.metadata,
			};
		}

		const subscriptionData = {
			stripeData: JSON.stringify({
				id: subscription.id,
				latestInvoice: subscription.latest_invoice,
				customer: subscription.customer,
				status: subscription.status,
				plan: subscription.plan?.id,
				planName: subscription.plan?.name,
				price: subscription.plan?.amount ? subscription.plan.amount / 100 : undefined,
			}),
			tagName: zelfKeysTag,
			startDate: formatDateTime(new Date(invoice.lines?.data?.[0]?.period?.start * 1000 || Date.now())),
			endDate: formatDateTime(new Date(invoice.lines?.data?.[0]?.period?.end * 1000 || Date.now())),
			paymentMethod: "stripe",
			type: "subscription",
		};

		const ipfsResult = await storeSubscriptionInIPFS(subscriptionData);

		return { success: true, ipfs: ipfsResult };
	} catch (error) {
		console.error("Error handling invoice payment succeeded:", error);

		throw error;
	}
}

/**
 *
 * @param {Object} subscription
 */
async function handleSubscriptionUpdated(subscription) {
	try {
		const tagName = subscription.metadata?.tagName;

		if (!tagName) return;

		const zelfKeysTag = convertToZelfKeysFormat(tagName);
		const existingSubscription = await searchSubscriptionInIPFS(zelfKeysTag);

		if (!existingSubscription) return;

		const stripeData =
			typeof existingSubscription.stripeData === "string" ? JSON.parse(existingSubscription.stripeData) : existingSubscription.stripeData || {};

		stripeData.status = subscription.cancel_at_period_end ? "cancelled_active" : subscription.status;
		stripeData.cancelledAt = subscription.cancel_at_period_end ? formatDateTime(new Date()) : null;
		stripeData.cancelAtPeriodEnd = subscription.cancel_at_period_end;
		stripeData.plan = subscription.plan.id;
		stripeData.planName = subscription.plan.name;
		stripeData.price = subscription.plan.amount / 100;

		const subscriptionData = {
			stripeData: JSON.stringify(stripeData),
			tagName: zelfKeysTag,
			startDate: formatDateTime(new Date(subscription.current_period_start * 1000)),
			endDate: formatDateTime(new Date(subscription.current_period_end * 1000)),
			paymentMethod: "stripe",
			type: "subscription",
		};

		const newRecord = await pinata.pinFile(
			Buffer.from(JSON.stringify(subscriptionData)).toString("base64"),
			`${zelfKeysTag}.json`,
			"application/json",
			subscriptionData
		);

		await pinata.unPinFiles([existingSubscription.ipfs_pin_hash]);

		return newRecord;
	} catch (error) {
		console.error("Error handling subscription updated:", error);
		throw error;
	}
}

/**
 *
 * @param {Object} subscription
 */
async function handleSubscriptionDeleted(subscription) {
	try {
		const tagName = subscription.metadata?.tagName;

		if (!tagName) return;

		const zelfKeysTag = convertToZelfKeysFormat(tagName);
		const existingSubscription = await searchSubscriptionInIPFS(zelfKeysTag);

		if (!existingSubscription) return;

		try {
			await pinata.unPinFiles([existingSubscription.ipfs_pin_hash]);
		} catch (unpinError) {
			const deletedSubscriptionData = {
				stripeData: JSON.stringify({
					...(existingSubscription.stripeData || {}),
					status: "deleted",
					deletedAt: formatDateTime(new Date()),
				}),
				tagName: zelfKeysTag,
				startDate: existingSubscription.startDate,
				endDate: existingSubscription.endDate,
				paymentMethod: "stripe",
				type: "subscription",
			};

			await updateSubscriptionInIPFS(zelfKeysTag, deletedSubscriptionData);
		}
	} catch (error) {
		console.error("Error handling subscription deleted:", error);

		throw error;
	}
}

/**
 *
 * @param {Object} subscriptionData
 * @returns {Object} IPFS result
 */
async function storeSubscriptionInIPFS(subscriptionData) {
	const ipfsResult = await pinata.pinFile(
		Buffer.from(JSON.stringify(subscriptionData)).toString("base64"),
		`${subscriptionData.tagName}.json`,
		"application/json",
		subscriptionData
	);

	if (!ipfsResult) throw new Error("failed_to_store_subscription_in_ipfs");

	return ipfsResult;
}

/**
 *
 * @param {Object} user
 * @returns {Object} customer portal session data
 */
const createCustomerPortalSession = async (user) => {
	const { tagName } = user;

	const zelfKeysTag = convertToZelfKeysFormat(tagName);
	const subscriptionData = await searchSubscriptionInIPFS(zelfKeysTag);

	if (!subscriptionData) throw new Error("no_active_subscription_found");
	if (!subscriptionData.stripeData?.customer) throw new Error("customer_id_not_found_in_subscription_data");

	const portalSession = await stripe.billingPortal.sessions.create({
		customer: subscriptionData.stripeData.customer,
		return_url: `${configuration.stripe.redirectUrl}/zelf-keys/billing`,
	});

	return { success: true, portalUrl: portalSession.url, sessionId: portalSession.id };
};

/**
 *
 * @param {Object} body
 * @param {Object} user
 * @returns {Object} crypto payment confirmation result
 */
const confirmCryptoPayment = async (body, user) => {
	try {
		const { lockedPriceToken } = body;
		const { tagName } = user;

		if (!lockedPriceToken) return { success: false, paymentConfirmed: false, message: "locked_price_token_required" };

		let priceLockData;

		try {
			priceLockData = verifyLockedPrice(lockedPriceToken);
		} catch (e) {
			return { success: false, paymentConfirmed: false, message: "invalid_or_expired_payment_token" };
		}

		if (priceLockData.tagName !== tagName) {
			return { success: false, paymentConfirmed: false, message: "payment_token_does_not_belong_to_user" };
		}

		const expiresDate = parseDateTime(priceLockData.expiresAt);

		if (!expiresDate || Date.now() > expiresDate.getTime()) {
			return { success: false, paymentConfirmed: false, message: "payment_token_expired" };
		}

		const zkPayTag = priceLockData.zkPayTag;
		const recordsFound = await pinata.filter("zkPay", zkPayTag);
		const zkPayRecord = recordsFound && Array.isArray(recordsFound) && recordsFound.length ? recordsFound[0] : null;

		if (!zkPayRecord) return { success: false, paymentConfirmed: false, message: "payment_record_not_found" };

		const paymentAddress = zkPayRecord.publicData.avalancheAddress;
		const requiredAmount = priceLockData.avaxAmount;
		const transactionResult = await checkAvalancheTransactions(paymentAddress, requiredAmount);

		if (transactionResult.paymentFound) {
			const zelfKeysTag = convertToZelfKeysFormat(tagName, ".zelfkeys");
			const existingSubscription = await searchSubscriptionInIPFS(zelfKeysTag);

			if (existingSubscription) {
				return {
					success: true,
					paymentConfirmed: true,
					transactionHash: transactionResult.transactionHash,
					subscriptionCreated: false,
					message: "payment_confirmed_subscription_already_exists",
				};
			}

			const subscriptionData = {
				cryptoData: JSON.stringify({
					customer: tagName,
					status: "active",
					plan: priceLockData.planId,
					planName: priceLockData.planName,
					price: priceLockData.usdAmount,
					paymentMethod: "crypto",
					transactionHash: transactionResult.transactionHash,
					isDemoMode: priceLockData.isDemoMode || false,
				}),
				tagName: zelfKeysTag,
				startDate: formatDateTime(new Date()),
				endDate: formatDateTime(addMonths(new Date(), 1)),
				paymentMethod: "crypto",
				type: "subscription",
			};

			await storeSubscriptionInIPFS(subscriptionData);

			return {
				success: true,
				paymentConfirmed: true,
				transactionHash: transactionResult.transactionHash,
				subscriptionCreated: true,
				message: "payment_confirmed_subscription_activated",
			};
		}

		return { success: true, paymentConfirmed: false, message: "no_sufficient_payment_found_yet" };
	} catch (error) {
		return { success: false, paymentConfirmed: false, message: "error_checking_payment" };
	}
};

/**
 *
 * @param {string} address
 * @param {number} requiredAmount
 * @returns {Object} transaction check result
 */
const checkAvalancheTransactions = async (address, requiredAmount) => {
	try {
		try {
			const snowTraceResponse = await fetch(
				`https://api.snowtrace.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=YourApiKeyToken`
			);

			const snowTraceData = await snowTraceResponse.json();

			if (snowTraceData.status === "1" && snowTraceData.result) {
				for (const tx of snowTraceData.result) {
					const txAmount = parseFloat(tx.value) / Math.pow(10, 18);
					const txTimestamp = parseInt(tx.timeStamp);

					if (txAmount >= requiredAmount) {
						return {
							paymentFound: true,
							transactionHash: tx.hash,
							amount: txAmount,
							blockNumber: tx.blockNumber,
							timestamp: txTimestamp,
							source: "snowtrace_api",
						};
					}
				}
			}
		} catch (e) {}

		const balanceResponse = await fetch(configuration.avalanche.rpcUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"], id: 4 }),
		});

		const balanceData = await balanceResponse.json();

		if (balanceData.result) {
			const balanceWei = BigInt(balanceData.result);
			const balanceAvax = Number(balanceWei) / Math.pow(10, 18);

			if (balanceAvax >= requiredAmount) {
				return {
					paymentFound: true,
					transactionHash: `balance_check_${Date.now()}`,
					amount: balanceAvax,
					note: "Payment confirmed via balance check (demo mode)",
					source: "balance_check",
				};
			}
		}

		return { paymentFound: false, message: "no_sufficient_payment_transactions_found_today" };
	} catch (error) {
		return { paymentFound: false, error: error.message };
	}
};

module.exports = {
	getActiveSubscription,
	getAvailablePlans,
	createCheckoutSession,
	cancelSubscription,
	createCustomerPortalSession,
	createCryptoPayment,
	confirmCryptoPayment,
	webhookHandler,
};
