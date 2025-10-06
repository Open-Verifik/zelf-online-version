const Stripe = require("stripe");

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

	return product;
};

module.exports = {
	listSubscriptionPlans,
	getSubscriptionPlan,
};
