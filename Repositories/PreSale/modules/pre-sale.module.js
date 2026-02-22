const Stripe = require("stripe");
const config = require("../../../Core/config");
const { createCoinbaseCharge, getCoinbaseCharge } = require("../../coinbase/modules/coinbase_commerce.module");
const Mailgun = require("../../../Core/mailgun");
const IPFS = require("../../IPFS/modules/ipfs.module");

const ZNSTokenModule = require("../../ZelfNameService/modules/zns-token.module");
const axios = require("axios");

const testingStripeCards = {
    4242424242424242: "tok_visa",
    4000000000003220: "tok_mastercard",
    378282246310005: "tok_amex",
    // Add more test cards as needed
    4000000000009999: "tok_visa",
    4000000000000002: "tok_mastercard",
    378282246310005: "tok_amex",
};

const templatesMap = {
    en: {
        Presale_receipt: {
            subject: "ZNS Token Pre-Sale Receipt",
            template: "purchase receipt",
        },
    },
};

const sendReceiptEmail = async ({ email, amount, tokens, transactionId, date }) => {
    const template = templatesMap.en.Presale_receipt;

    const formatDate = (date) =>
        new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
        }).format(new Date(date));

    const extraParams = {
        "recipient-variables": {
            [email]: {
                transactionDate: formatDate(date || new Date()),
                subtotal: amount,
                total: amount,
                tokens: tokens,
                transactionId: transactionId,
                product: "ZNS Pre-Sale Tokens",
            },
        },
    };

    try {
        await Mailgun.sendEmail(email, template.subject, template.template, extraParams);
        return { success: true };
    } catch (error) {
        console.error("Error sending receipt email:", error);
        throw error;
    }
};

// Initialize Stripe with the secret key from config
const stripe = Stripe(config.stripe.secretKey);

// Configuration for Pre-Sale
const PRESALE_CONFIG = {
    tokenPrice: 0.05, // USD per token
    bonusTiers: [
        { minAmount: 1000, bonus: 0.5, label: "50% BONUS" },
        { minAmount: 500, bonus: 0.25, label: "25% BONUS" },
        { minAmount: 100, bonus: 0.1, label: "10% BONUS" },
        { minAmount: 0, bonus: 0, label: "NO BONUS" },
    ],
};

const getBonusTier = (amount) => {
    return PRESALE_CONFIG.bonusTiers.find((tier) => amount >= tier.minAmount) || PRESALE_CONFIG.bonusTiers[PRESALE_CONFIG.bonusTiers.length - 1];
};

const calculateTokens = (usdAmount) => {
    const tier = getBonusTier(usdAmount);
    const baseTokens = usdAmount / PRESALE_CONFIG.tokenPrice;
    const bonusTokens = baseTokens * tier.bonus;

    return {
        baseTokens,
        bonusTokens,
        totalTokens: baseTokens + bonusTokens,
        bonusPercentage: tier.bonus * 100,
    };
};

/**
 * Create a Stripe Checkout Session for ZNS Token Pre-Sale
 * @param {Object} params
 * @param {number} params.amount - Amount in USD
 * @param {string} params.email - Optional customer email
 * @param {string} params.zelfName - Required Zelf Name (tag) for token delivery
 * @param {string} params.solanaAddress - Optional Solana address for token delivery
 * @returns {Promise<Object>} The created session URL and ID
 */
const createStripeSession = async ({ amount, email, zelfName, solanaAddress }) => {
    try {
        const frontendUrl = config.landingUrl;

        // Calculate tokens server-side for security
        const { totalTokens, bonusPercentage } = calculateTokens(amount);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "ZNS Token Pre-Sale",
                            description: `${totalTokens.toLocaleString()} ZNS Tokens (${bonusPercentage > 0 ? bonusPercentage + "% Bonus Included" : "Base Allocation"})`,
                            images: ["https://zelf.world/assets/images/zns-token.png"],
                        },
                        unit_amount: Math.round(amount * 100), // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${frontendUrl}/presale/success?session_id={CHECKOUT_SESSION_ID}&method=stripe`,
            cancel_url: `${frontendUrl}/presale/checkout?canceled=true&method=stripe`,
            customer_email: email,
            metadata: {
                type: "zns_presale",
                tokens: totalTokens.toString(),
                bonus: bonusPercentage.toString(),
                zelfName: zelfName || "",
                solanaAddress: solanaAddress || "",
            },
        });

        return {
            url: session.url,
            sessionId: session.id,
            calculated: {
                amount,
                tokens: totalTokens,
                bonus: bonusPercentage,
            },
        };
    } catch (error) {
        console.error("Error creating Stripe session:", error);
        throw error;
    }
};

/**
 * Create a Coinbase Commerce Charge for ZNS Token Pre-Sale
 * @param {Object} params
 * @param {number} params.amount - Amount in USD
 * @param {string} params.email - Optional customer email
 * @param {string} params.zelfName - Required Zelf Name (tag) for token delivery
 * @param {string} params.solanaAddress - Optional Solana address for token delivery
 * @returns {Promise<Object>} The created charge URL and code
 */
const createCoinbaseSession = async ({ amount, email, zelfName, solanaAddress }) => {
    try {
        const frontendUrl = config.landingUrl;

        // Calculate tokens server-side for security
        const { totalTokens, bonusPercentage } = calculateTokens(amount);

        // price reduction to cents when it comes to development
        //  const isDevMode = config.solana.devModeTokens === true || config.solana.devModeTokens === "true";
        // so 50 usd becomes 50 cents
        const price = config.coinbase.devMode ? (amount / 100).toString() : amount.toString();

        const chargeData = {
            name: "ZNS Token Pre-Sale",
            description: `${totalTokens.toLocaleString()} ZNS Tokens (${bonusPercentage > 0 ? bonusPercentage + "% Bonus Included" : "Base Allocation"})`,
            pricing_type: "fixed_price",
            local_price: {
                amount: price.toString(),
                currency: "USD",
            },
            metadata: {
                type: "zns_presale",
                tokens: totalTokens.toString(),
                bonus: bonusPercentage.toString(),
                email: email || "",
                zelfName: zelfName || "",
                solanaAddress: solanaAddress || "",
            },
            redirect_url: `${frontendUrl}/presale/success`,
            cancel_url: `${frontendUrl}/presale/checkout?canceled=true`,
        };

        const charge = await createCoinbaseCharge(chargeData);

        return {
            url: charge.hosted_url,
            charge,
            sessionId: charge.id, // Using id as session ID
            calculated: {
                amount,
                tokens: totalTokens,
                bonus: bonusPercentage,
            },
        };
    } catch (error) {
        console.error("Error creating Coinbase charge:", error);
        throw error;
    }
};

/**
 * Check Coinbase payment status by charge ID
 * @param {string} chargeId - The Coinbase charge ID
 * @returns {Promise<Object>} - Payment status with confirmed flag
 */
const checkCoinbasePaymentStatus = async (chargeId) => {
    try {
        if (!chargeId) {
            const error = new Error("charge_id_required");
            error.status = 400;
            throw error;
        }

        const charge = await getCoinbaseCharge(chargeId);

        if (!charge) {
            const error = new Error("coinbase_charge_not_found");
            error.status = 404;
            throw error;
        }

        const timeline = charge.timeline || [];
        let confirmed = false;
        let status = "PENDING";

        // Check timeline for completion status
        for (const event of timeline) {
            if (event.status === "COMPLETED") {
                confirmed = true;
                status = "COMPLETED";
                break;
            } else if (event.status === "EXPIRED") {
                status = "EXPIRED";
            } else if (event.status === "CANCELED") {
                status = "CANCELED";
            }
        }

        // Allow force approval in dev mode
        if (config.coinbase.forceApproval) {
            confirmed = true;
            status = "COMPLETED";
        }

        return {
            chargeId: charge.id,
            code: charge.code,
            confirmed,
            status,
            hostedUrl: charge.hosted_url,
            expiresAt: charge.expires_at,
            metadata: charge.metadata,
            timeline,
        };
    } catch (error) {
        console.error("Error checking Coinbase payment status:", error);
        throw error;
    }
};

/**
 * Helper to fetch content from IPFS URL
 */
const _loadIPFSJSON = async (ipfsUrl) => {
    try {
        const gatewayUrl = ipfsUrl.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
        const response = await axios.get(gatewayUrl);
        return response.data;
    } catch (error) {
        console.error("Error loading JSON from IPFS:", error.message);
        return null; // Return null if fetch fails
    }
};

/**
 * Get Payment/Session Details and Confirm Transaction
 * @param {string} sessionIdOrCode
 * @returns {Promise<Object>}
 */
/**
 * Check if a receipt exists in IPFS
 */
const _checkIPFSRecord = async (sessionId) => {
    const records = await IPFS.get({ key: "presaleSessionId", value: sessionId });

    return records && records.length > 0 ? records[0] : null;
};

/**
 * Verify payment status with Stripe or Coinbase
 */
const _verifyWithProvider = async (sessionIdOrCode) => {
    let details = {};
    let isPaid = false;

    if (sessionIdOrCode.startsWith("cs_")) {
        // Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionIdOrCode);
        isPaid = session.payment_status === "paid";

        details = {
            method: "stripe",
            status: session.payment_status,
            amount: session.amount_total / 100,
            email: session.customer_details?.email || session.customer_email,
            metadata: session.metadata,
            currency: session.currency,
        };
    } else {
        // Coinbase
        const charge = await getCoinbaseCharge(sessionIdOrCode);
        const isConfirmed = charge.timeline.some((t) => t.status === "COMPLETED" || t.status === "RESOLVED");
        isPaid = isConfirmed;

        details = {
            method: "coinbase",
            status: isConfirmed ? "paid" : "pending",
            amount: parseFloat(charge.pricing.local.amount),
            email: charge.metadata?.email,
            metadata: charge.metadata,
            currency: charge.pricing.local.currency,
        };
    }

    return { isPaid, details };
};

/**
 * Attempt to release tokens if address is available
 */
const _releasePendingTokens = async (amount, address) => {
    if (!address) return { released: false, signature: "" };

    try {
        const signature = await ZNSTokenModule.giveTokensAfterPurchase(amount, address);

        return { released: true, signature };
    } catch (err) {
        console.error("Failed to release tokens:", err);
        return { released: false, signature: "" };
    }
};

/**
 * Save or update receipt in IPFS
 */
const _saveReceiptToIPFS = async (existingRecord, data) => {
    const { sessionId, details, totalTokens, bonusPercentage, released, address, signature, zelfName } = data;

    const receiptData = {
        sessionId: sessionId,
        date: new Date().toISOString(),
        email: details.email,
        amountUSD: details.amount,
        method: details.method,
        zelfName: zelfName || "",
        tokens: {
            total: totalTokens,
            bonusPercentage: bonusPercentage,
        },
        paymentDetails: details,
        release: {
            released: released,
            address: address,
            signature: signature,
            date: released ? new Date().toISOString() : null,
        },
    };

    const ipfsMetadata = {
        type: "presale_receipt",
        presaleSessionId: sessionId,
        presaleEmail: details.email || "",
        presaleZelfName: zelfName || "",
        presaleSolanaAddress: address || "",
        // Group everything else into a JSON string to save metadata slots
        paymentDetails: JSON.stringify({
            amountUSD: details.amount,
            totalTokens: totalTokens,
            bonusPercentage: bonusPercentage,
            tokensReleased: released,
            transactionSignature: signature || "",
        }),
    };

    const base64Data = Buffer.from(JSON.stringify(receiptData)).toString("base64");
    const fileName = `presale_receipt_${sessionId}.json`;

    if (existingRecord) {
        // Only update if released status changed to true (check both new JSON format and old string format)
        let alreadyReleased = false;

        const keyvalues = existingRecord.publicData || {};

        if (keyvalues.paymentDetails) {
            try {
                const details = JSON.parse(keyvalues.paymentDetails);
                alreadyReleased = details.tokensReleased === true;
            } catch (e) {}
        } else {
            alreadyReleased = keyvalues.tokensReleased === "true";
        }

        if (released && !alreadyReleased) {
            await IPFS.unPinFiles([existingRecord.ipfs_pin_hash]);
            await IPFS.insert(
                {
                    base64: base64Data,
                    name: fileName,
                    metadata: ipfsMetadata,
                    pinIt: true,
                },
                { pro: true },
            );
        }
    } else {
        // Insert new record
        await IPFS.insert(
            {
                base64: base64Data,
                name: fileName,
                metadata: ipfsMetadata,
                pinIt: true,
            },
            { pro: true },
        );
    }

    return receiptData;
};

/**
 * Get Payment/Session Details and Confirm Transaction
 * @param {string} sessionIdOrCode
 * @returns {Promise<Object>}
 */
/**
 * Format details from an existing IPFS record
 */
const _formatDetailsFromRecord = (existingRecord) => {
    // Already recorded, likely paid
    const publicData = existingRecord.publicData || {};

    // Parse partial details from JSON string if available
    let details = {};
    if (publicData.paymentDetails) {
        try {
            details = JSON.parse(publicData.paymentDetails);
        } catch (e) {
            console.error("Error parsing paymentDetails JSON", e);
        }
    }

    return {
        method: publicData.method || "unknown",
        status: "paid",
        amount: parseFloat(details.amountUSD || publicData.amountUSD || "0"),
        email: publicData.presaleEmail || publicData.email,
        metadata: {
            tokens: details.totalTokens?.toString() || publicData.totalTokens,
            solanaAddress: publicData.presaleSolanaAddress || details.solanaAddress || publicData.solanaAddress,
            bonus: details.bonusPercentage?.toString() || publicData.bonusPercentage,
            tokensReleased: details.tokensReleased === true || publicData.tokensReleased === "true",
            transactionSignature: details.transactionSignature || publicData.transactionSignature,
            zelfName: publicData.presaleZelfName || publicData.zelfName || "",
        },
        currency: "USD",
    };
};

/**
 * Process a paid transaction: Release tokens and store receipt
 */
const _processPayment = async (sessionIdOrCode, details, isPaid, existingRecord) => {
    if (!isPaid) return details;

    const totalTokens = parseFloat(details.metadata?.tokens || "0");
    const bonusPercentage = parseFloat(details.metadata?.bonus || "0");

    // Prefer address from metadata (provider) or existing record
    const solanaAddress = details.metadata?.solanaAddress || details.metadata?.address;

    // Get zelfName from metadata (passed during session creation)
    const zelfName = details.metadata?.zelfName || "";

    // Attempt Release
    const releaseResult = await _releasePendingTokens(totalTokens, solanaAddress);

    // Save/Update IPFS
    const receipt = await _saveReceiptToIPFS(existingRecord, {
        sessionId: sessionIdOrCode,
        details: details,
        totalTokens: totalTokens,
        bonusPercentage: bonusPercentage,
        released: releaseResult.released,
        address: solanaAddress,
        signature: releaseResult.signature,
        zelfName: zelfName,
    });

    return {
        method: details.method,
        status: "paid",
        amount: details.amount,
        email: details.email,
        zelfName: zelfName,
        metadata: {
            tokens: totalTokens.toString(),
            bonus: bonusPercentage.toString(),
            released: releaseResult.released,
            solanaAddress: solanaAddress,
            transactionSignature: releaseResult.signature,
            zelfName: zelfName,
        },
        currency: "USD",
        receipt: receipt,
    };
};

const PresaleLock = require("../models/presale-lock.model");

/**
 * Acquire distributed lock for session
 */
const _acquireSessionLock = async (sessionId) => {
    try {
        await PresaleLock.create({ sessionId });
        return true;
    } catch (e) {
        if (e.code === 11000) {
            // Duplicate key error = locked by another process
            const error = new Error("Processing payment, please wait...");
            error.status = 429;
            throw error;
        }
        console.error("Lock acquisition error:", e);
        throw e;
    }
};

/**
 * Release distributed lock for session
 */
const _releaseSessionLock = async (sessionId) => {
    try {
        await PresaleLock.deleteOne({ sessionId });
    } catch (e) {
        console.error("Error releasing lock:", e);
    }
};

/**
 * Get Payment/Session Details and Confirm Transaction
 * @param {string} sessionIdOrCode
 * @returns {Promise<Object>}
 */
const getPaymentDetails = async (sessionIdOrCode) => {
    let lockAcquired = false;

    lockAcquired = await _acquireSessionLock(sessionIdOrCode);

    try {
        // 1. Check IPFS first
        const existingRecord = await _checkIPFSRecord(sessionIdOrCode);

        let details = {};
        let isPaid = false;

        // 2. Determine status and details
        if (existingRecord) {
            details = _formatDetailsFromRecord(existingRecord);
            isPaid = true;

            const publicData = existingRecord.publicData || {};
            // If tokens already released, return immediately
            // Check details.metadata.tokensReleased since it handles the JSON parsing
            if (details.metadata?.tokensReleased === true || publicData.tokensReleased === "true") {
                return {
                    ...details,
                    ipfsHash: existingRecord.ipfs_pin_hash,
                };
            }
        } else {
            // Verify with provider
            const verification = await _verifyWithProvider(sessionIdOrCode);
            isPaid = verification.isPaid;
            details = verification.details;
        }

        // 3. Process if paid (Release tokens + Store Receipt)
        return await _processPayment(sessionIdOrCode, details, isPaid, existingRecord);
    } catch (error) {
        console.error("Error fetching payment details:", error);
        throw error;
    } finally {
        if (lockAcquired) {
            await _releaseSessionLock(sessionIdOrCode);
        }
    }
};

module.exports = {
    createStripeSession,
    createCoinbaseSession,
    checkCoinbasePaymentStatus,
    calculateTokens,
    sendReceiptEmail,
    getPaymentDetails,
};
