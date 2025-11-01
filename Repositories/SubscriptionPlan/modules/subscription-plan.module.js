const Stripe = require("stripe");
const config = require("../../../Core/config");
const { getMyLicense } = require("../../License/modules/license.module");

/**
 * Get Stripe client
 */
const getStripeClient = () => {
	const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
	if (!apiKey) throw new Error("500:stripe_key_missing");
	return new Stripe(apiKey, { apiVersion: "2024-06-20" });
};

/**
 * List subscription plans from Stripe filtered by metadata and ordered by price
 * - planType must equal "license"
 * - zelfPlan in [zelfBasic, ZelfGold, zelfBusiness, zelfStartUp, zelfEnterprise]
 * Sorted by unit_amount ascending, and limited to 0-4999 (cents) inclusive
 */
const listSubscriptionPlans = async () => {
	const stripe = getStripeClient();

	// 1) List active products (paged)
	const products = [];
	let prodStartingAfter;
	let prodHasMore = true;
	while (prodHasMore) {
		const page = await stripe.products.list({ active: true, limit: 100, starting_after: prodStartingAfter });
		products.push(...(page.data || []));
		prodHasMore = Boolean(page.has_more);
		prodStartingAfter = prodHasMore && page.data?.length ? page.data[page.data.length - 1].id : undefined;
	}

	// 2) Filter products by metadata (planType license OR code includes 'enroll'), zelfPlan in allowed
	const allowedZelfPlans = new Set(["zelfBasic", "zelfGold", "zelfBusiness", "zelfStartUp", "zelfEnterprise"]);

	const filteredProducts = products.filter((p) => {
		const planType = p?.metadata?.planType;
		const zelfPlan = p?.metadata?.zelfPlan || p?.metadata?.plan;

		if (!planType || !zelfPlan) return false;

		const codeIncludesEnroll = typeof p?.metadata?.code === "string" && p.metadata.code.includes("enroll");

		return (planType === "license" || codeIncludesEnroll) && zelfPlan && allowedZelfPlans.has(zelfPlan);
	});

	for (const product of filteredProducts) {
		const pricesList = await stripe.prices.list({
			product: product.id,
			active: true,
			limit: 100,
		});

		if (!pricesList || pricesList.data.length === 0) continue;

		product.prices = pricesList.data;
	}

	return filteredProducts;
};

/**
 * Get a single subscription plan by product ID
 */
const getSubscriptionPlan = async (productId) => {
	if (!productId) throw new Error("400:product_id_required");
	const stripe = getStripeClient();

	const allowedZelfPlans = new Set(["zelfBasic", "zelfGold", "zelfBusiness", "zelfStartUp", "zelfEnterprise"]);

	const product = await stripe.products.retrieve(productId);

	if (!product) throw new Error("404:plan_not_found");

	if (!allowedZelfPlans.has(product.metadata.zelfPlan)) throw new Error("404:plan_not_found");

	const pricesList = await stripe.prices.list({
		product: product.id,
		active: true,
		limit: 100,
	});

	if (!pricesList || pricesList.data.length === 0) throw new Error("404:plan_not_found");

	product.prices = pricesList.data;

	return product;
};

/**
 * Create a Stripe checkout session for subscription
 * @param {string} productId - Stripe product ID
 * @param {string} priceId - Stripe price ID
 * @param {string} customerEmail - Customer email (optional)
 * @returns {Promise<Object>} - Stripe checkout session
 */
const createCheckoutSession = async (productId, priceId, customerEmail = null) => {
	const stripe = getStripeClient();

	// Validate that the product and price exist and are active
	const product = await stripe.products.retrieve(productId);

	if (!product || !product.active) {
		throw new Error("404:product_not_found");
	}

	const price = await stripe.prices.retrieve(priceId);

	if (!price || !price.active) {
		throw new Error("404:price_not_found");
	}

	// Verify the price belongs to the product
	if (price.product !== productId) {
		throw new Error("400:price_product_mismatch");
	}

	// Create checkout session
	const sessionParams = {
		payment_method_types: ["card"],
		line_items: [
			{
				price: priceId,
				quantity: 1,
			},
		],
		mode: "subscription",
		success_url: config.stripe.checkoutUrls.success,
		cancel_url: config.stripe.checkoutUrls.cancel,
		metadata: {
			productId: productId,
			priceId: priceId,
			customerEmail: customerEmail,
		},
	};

	// Add customer email if provided
	if (customerEmail) {
		sessionParams.customer_email = customerEmail;
	}

	const session = await stripe.checkout.sessions.create(sessionParams);

	return session;
};

const getMySubscription = async (authToken) => {
	const { myLicense, zelfAccount } = await getMyLicense(authToken, true);

	if (!myLicense?.domainConfig?.stripe?.subscriptionId) {
		throw new Error("404:subscription_not_found");
	}

	const stripe = getStripeClient();

	const subscription = await stripe.subscriptions.retrieve(myLicense.domainConfig.stripe?.subscriptionId);

	const product = await stripe.products.retrieve(myLicense.domainConfig.stripe?.productId);

	return { myLicense, zelfAccount, subscription, product };
};

/**
 * Create a Stripe customer portal session for subscription management
 * @param {Object} authToken - Authentication token containing user info
 * @returns {Promise<Object>} - Stripe portal session
 */
const createPortalSession = async (authToken) => {
	const stripe = getStripeClient();

	// Get the user's subscription to find the customer ID
	const { myLicense } = await getMyLicense(authToken, true);

	if (!myLicense?.domainConfig?.stripe?.customerId) {
		throw new Error("400:no_customer_found");
	}

	const customerId = myLicense.domainConfig.stripe.customerId;

	// Create portal session
	const sessionParams = {
		customer: customerId,
		return_url: config.stripe.frontendUrl + "/settings/plan-billing",
	};

	const session = await stripe.billingPortal.sessions.create(sessionParams);

	return session;
};

module.exports = {
	listSubscriptionPlans,
	getSubscriptionPlan,
	createCheckoutSession,
	getMySubscription,
	createPortalSession,
};
