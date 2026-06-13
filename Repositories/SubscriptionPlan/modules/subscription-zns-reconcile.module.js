const Stripe = require("stripe");
const config = require("../../../Core/config");
const SubscriptionZnsGrant = require("../models/subscription-zns-grant.model");
const {
	tryGrantMonthlyZnsForPaidInvoice,
	retryGrantForExistingInvoice,
	resolvePlanAndAmount,
	resolvePayoutSolanaAddress,
} = require("./subscription-zns-grant.module");
const { getMySubscription } = require("./subscription-plan.module");

/**
 * Cap for Stripe invoice list pagination per reconcile call. The newest invoice covers the
 * current period, but older entries help recover historical webhook misses without unbounded work.
 */
const RECONCILE_INVOICE_LIMIT = 12;

/** Trace reconcile decisions in server logs (grep: `[subscription-zns-reconcile]`). */
const logReconcile = (step, detail = {}) => {
	console.info("[subscription-zns-reconcile]", step, detail);
};

/**
 * Read the on-chain ZNS balance for the customer's payout wallet without touching the
 * sender keypair. Used as a context signal in the reconcile response — never as the gate
 * to issue a transfer (that gate is ledger + Stripe coverage).
 *
 * @param {string} solanaAddress
 * @returns {Promise<{ balance: number | null, ataAddress: string | null, error?: string }>}
 */
const readZnsBalanceForAddress = async (solanaAddress) => {
	if (!solanaAddress) return { balance: null, ataAddress: null };

	try {
		const useKit = config.solana?.useKit === true || config.solana?.useKit === "true";
		if (useKit) return { balance: null, ataAddress: null, error: "kit_mode_unsupported" };

		const solanaWeb3 = require("@solana/web3.js");
		const splManual = require("../../../Core/spl-token-manual");

		const connection = new solanaWeb3.Connection(config.solana.rpcUrl);
		const owner = new solanaWeb3.PublicKey(solanaAddress);
		const mint = new solanaWeb3.PublicKey(config.solana.tokenMintAddress);
		const ata = splManual.getAssociatedTokenAddress(owner, mint);
		const accountInfo = await connection.getAccountInfo(ata);

		if (!accountInfo) return { balance: 0, ataAddress: ata.toBase58() };

		const rawAmount = accountInfo.data.readBigUInt64LE(64);
		const balance = Number(rawAmount) / 10 ** 8;

		return { balance, ataAddress: ata.toBase58() };
	} catch (err) {
		console.warn("[subscription-zns-reconcile] failed to read on-chain balance:", err?.message || err);
		return { balance: null, ataAddress: null, error: err?.message || String(err) };
	}
};

const getStripeClient = () => {
	const apiKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
	if (!apiKey) throw new Error("500:stripe_key_missing");
	return new Stripe(apiKey, { apiVersion: "2024-06-20" });
};

/**
 * Reconcile the authenticated user's subscription against the SubscriptionZnsGrant ledger
 * and trigger any missing or failed monthly ZNS transfers.
 *
 * Decision matrix per recent paid invoice:
 * - no ledger row + Stripe paid + Client has solanaAddress → run `tryGrantMonthlyZnsForPaidInvoice`
 * - row in `failed` or stale `pending` → call `retryGrantForExistingInvoice`
 * - row in `completed` → skip
 *
 * Never trusts on-chain balance alone (a user may have spent the tokens). The balance is
 * returned as informational context for the dashboard.
 *
 * @param {object} authToken Koa `ctx.state.user` payload
 * @returns {Promise<object>}
 */
const reconcileSubscriptionZnsGrants = async (authToken) => {
	const summary = {
		reconciled: false,
		actions: [],
		latestInvoiceId: null,
		ledgerSnapshots: [],
		onChainZnsBalance: null,
		ataAddress: null,
		solanaAddress: null,
		skippedReason: null,
	};

	logReconcile("start", {
		jwtEmailPresent: Boolean(authToken?.email),
		sub: authToken?.sub ?? authToken?.id ?? null,
	});

	let context;
	try {
		context = await getMySubscription(authToken);
	} catch (err) {
		summary.skippedReason = "subscription_lookup_failed";
		logReconcile("stop", { reason: summary.skippedReason, error: err?.message || String(err) });
		return summary;
	}

	const { subscription } = context || {};

	if (!subscription || !subscription.id) {
		summary.skippedReason = "no_subscription";
		logReconcile("stop", {
			reason: summary.skippedReason,
			hint: "getMySubscription returned no Stripe subscription object — check IPFS subscription record + Stripe IDs on license",
		});
		return summary;
	}

	if (subscription.status !== "active" && subscription.status !== "trialing" && subscription.status !== "past_due") {
		summary.skippedReason = `subscription_status_${subscription.status}`;
		logReconcile("stop", { reason: summary.skippedReason, subscriptionId: subscription.id });
		return summary;
	}

	const customerEmail = authToken?.email;
	if (!customerEmail) {
		summary.skippedReason = "missing_customer_email";
		logReconcile("stop", {
			reason: summary.skippedReason,
			hint: "JWT must expose email for reconcile to resolve Stripe customer + Mongo client",
		});
		return summary;
	}

	const walletResolution = await resolvePayoutSolanaAddress(customerEmail, authToken);
	if (walletResolution.skippedReason) {
		summary.skippedReason = walletResolution.skippedReason;
		logReconcile("stop", {
			reason: summary.skippedReason,
			customerEmailDomain: customerEmail.includes("@") ? customerEmail.split("@")[1] : "unknown",
			hint: "Wallet not in JWT (solanaAddress) and not on IPFS Client record — re-login to refresh JWT, or link a wallet",
		});
		return summary;
	}

	summary.solanaAddress = walletResolution.solanaAddress;
	logReconcile("wallet_resolved", {
		source: walletResolution.source,
		solanaPreview: `${walletResolution.solanaAddress.slice(0, 4)}…${walletResolution.solanaAddress.slice(-4)}`,
	});

	let stripe;
	try {
		stripe = getStripeClient();
	} catch (err) {
		summary.skippedReason = "stripe_client_unavailable";
		logReconcile("stop", { reason: summary.skippedReason, error: err?.message || String(err) });
		return summary;
	}

	let invoices;
	try {
		logReconcile("stripe_context", {
			subscriptionId: subscription.id,
			subscriptionStatus: subscription.status,
			customerEmailDomain: customerEmail.includes("@") ? customerEmail.split("@")[1] : "unknown",
			solanaPreview:
				typeof walletResolution.solanaAddress === "string"
					? `${walletResolution.solanaAddress.slice(0, 4)}…${walletResolution.solanaAddress.slice(-4)}`
					: null,
		});

		const expandedSubscription = subscription?.items?.data?.[0]?.price?.unit_amount
			? subscription
			: await stripe.subscriptions.retrieve(subscription.id, { expand: ["items.data.price"] });

		const invoicesResp = await stripe.invoices.list({
			subscription: subscription.id,
			status: "paid",
			limit: RECONCILE_INVOICE_LIMIT,
		});

		invoices = invoicesResp?.data || [];
		summary.latestInvoiceId = invoices[0]?.id || null;

		if (!invoices.length) {
			summary.skippedReason = "no_paid_invoices";
			logReconcile("stripe_invoices", {
				count: 0,
				subscriptionId: subscription.id,
				hint: "No paid invoices returned — check Stripe billing / subscription age",
			});
		} else {
			logReconcile("stripe_invoices", { count: invoices.length, latestInvoiceId: summary.latestInvoiceId });
		}

		for (const invoice of invoices) {
			const action = await reconcileInvoice({
				invoice,
				subscription: expandedSubscription,
				customerEmail,
				authUser: authToken,
			});
			summary.actions.push(action);
			summary.ledgerSnapshots.push({
				invoiceId: invoice.id,
				status: action.ledgerStatus,
				signature: action.signature || null,
			});
			if (action.granted) summary.reconciled = true;
		}
	} catch (err) {
		console.error("[subscription-zns-reconcile] reconcile failed:", err?.message || err);
		summary.skippedReason = summary.skippedReason || "reconcile_error";
		logReconcile("stop", { reason: summary.skippedReason, error: err?.message || String(err) });
	}

	const onChain = await readZnsBalanceForAddress(walletResolution.solanaAddress);
	summary.onChainZnsBalance = onChain.balance;
	summary.ataAddress = onChain.ataAddress;

	logReconcile("done", {
		reconciled: summary.reconciled,
		skippedReason: summary.skippedReason,
		invoiceActions: summary.actions.length,
		onChainZnsBalance: summary.onChainZnsBalance,
		ledgerSnapshots: summary.ledgerSnapshots,
	});

	return summary;
};

/**
 * Resolve a single invoice: read the ledger row (if any) and dispatch to grant or retry.
 * Always returns a structured action so the caller can build a single summary.
 */
const reconcileInvoice = async ({ invoice, subscription, customerEmail, authUser }) => {
	const invoiceId = invoice.id;
	const action = {
		invoiceId,
		amountPaid: invoice.amount_paid,
		ledgerStatus: null,
		granted: false,
		retried: false,
		skippedReason: null,
	};

	let grantDoc;
	try {
		grantDoc = await SubscriptionZnsGrant.findOne({ invoiceId });
	} catch (err) {
		action.skippedReason = "ledger_lookup_failed";
		logReconcile("invoice_ledger_lookup_error", { invoiceId, error: err?.message || String(err) });
		return action;
	}

	if (!grantDoc) {
		logReconcile("invoice_no_ledger_row_try_grant", { invoiceId, amountPaid: invoice.amount_paid });

		const result = await tryGrantMonthlyZnsForPaidInvoice({
			invoiceId,
			subscriptionId: invoice.subscription || subscription?.id,
			customerEmail,
			subscription,
			amountPaid: invoice.amount_paid,
			authUser,
		});

		action.granted = Boolean(result.granted);
		action.signature = result.signature || null;
		action.skippedReason = result.skippedReason || null;
		action.tokenAmount = result.tokenAmount || null;
		action.planCode = result.planCode || null;

		if (result.granted) {
			action.ledgerStatus = "completed";
		} else if (result.skippedReason === "duplicate_invoice") {
			action.ledgerStatus = "duplicate_race";
			logReconcile("invoice_grant_skipped_race_duplicate", { invoiceId, skippedReason: result.skippedReason });
		} else if (
			result.skippedReason === "plan_not_found" ||
			result.skippedReason === "invalid_reward_price" ||
			result.skippedReason === "zero_or_unconfigured_amount" ||
			result.skippedReason === "no_solana_wallet" ||
			result.skippedReason === "missing_parameters"
		) {
			action.ledgerStatus = null;
		} else if (result.skippedReason === "transfer_failed") {
			action.ledgerStatus = "failed";
		} else {
			action.ledgerStatus = "skipped";
		}

		logReconcile("invoice_grant_result", {
			invoiceId,
			granted: action.granted,
			ledgerStatus: action.ledgerStatus,
			skippedReason: action.skippedReason,
			planCode: action.planCode,
			tokenAmount: action.tokenAmount,
		});

		return action;
	}

	action.ledgerStatus = grantDoc.status;
	action.signature = grantDoc.signature || null;
	action.tokenAmount = Number(grantDoc.tokenAmount) || null;
	action.planCode = grantDoc.planCode || null;

	logReconcile("invoice_existing_ledger", {
		invoiceId,
		status: grantDoc.status,
		hasSignature: Boolean(grantDoc.signature),
	});

	if (grantDoc.status === "completed") {
		action.skippedReason = "already_completed";
		logReconcile("invoice_skip_already_completed", { invoiceId });
		return action;
	}

	logReconcile("invoice_retry_path", { invoiceId, priorStatus: grantDoc.status });

	const retryResult = await retryGrantForExistingInvoice(grantDoc, {
		subscription,
		amountPaid: invoice.amount_paid,
		authUser,
	});

	action.ledgerStatus = grantDoc.status;
	action.granted = Boolean(retryResult.granted);
	action.retried = Boolean(retryResult.retried);
	action.signature = retryResult.signature || grantDoc.signature || null;
	action.skippedReason = retryResult.skippedReason || null;
	action.tokenAmount = retryResult.tokenAmount || action.tokenAmount;
	action.planCode = retryResult.planCode || action.planCode;

	logReconcile("invoice_retry_result", {
		invoiceId,
		granted: action.granted,
		finalLedgerStatus: grantDoc.status,
		skippedReason: action.skippedReason,
	});

	return action;
};

module.exports = {
	reconcileSubscriptionZnsGrants,
	readZnsBalanceForAddress,
	resolvePlanAndAmount,
	RECONCILE_INVOICE_LIMIT,
};
