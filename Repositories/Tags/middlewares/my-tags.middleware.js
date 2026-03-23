const { string, validate, boolean, number, stringEnum } = require("../../../Core/JoiUtils");
const Session = require("../../Session/models/session.model");
const moment = require("moment");
const { extractDomainAndName, validateDomainAndName } = require("./tags.middleware");
const jwt = require("jsonwebtoken");
const config = require("../../../Core/config");
const TagsPaymentModule = require("../modules/tags-payment.module");

const TAG_PAY_REDUCED_FEE_HEADER = "x-zelf-tag-pay-reduced-fee";

const schemas = {
    transfer: {
        tagName: string().required(),
        domain: string(),
        faceBase64: string().required(),
        password: string().required(),
    },
    paymentConfirmation: {
        tagName: string().required(),
        domain: string(),
        network: stringEnum(["coinbase", "CB", "ETH", "SOL", "BTC", "AVAX"]).required(),
        token: string().required(),
    },
    smartContractPaymentConfirmation: {
        tagName: string().required(),
        domain: string(),
        network: stringEnum(["AVAX_SC"]).required(),
        token: string().required(),
        txHash: string().required(),
    },
    paymentOptions: {
        tagName: string().required(),
        domain: string(),
        duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
    },
    receiptEmail: {
        tagName: string().required(),
        domain: string(),
        network: stringEnum(["coinbase", "CB", "ETH", "SOL", "BTC", "AVAX"]).required(),
        email: string().email().required(),
        token: string().required(),
    },
    referrals: {
        tagName: string().required(),
        domain: string().required(),
    },
    claimReferral: {
        tagName: string().required(),
        domain: string().required(),
        friendTagName: string().required(),
        friendDomain: string().required(),
        rewardType: string(),
    },
    extendLicenseForOwner: {
        tagName: string().required(),
        domain: string().required(),
        duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
        faceBase64: string().required(),
        password: string(),
    },
};

/**
 * Transfer Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const transferValidation = async (ctx, next) => {
    const valid = validate(schemas.transfer, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain } = ctx.request.body;

    // Validate domain and tag name
    const { domain: extractedDomain, name } = extractDomainAndName(tagName, domain);

    const domainValidation = await validateDomainAndName(extractedDomain, name);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    // Add extracted domain and name to context
    ctx.state.extractedDomain = extractedDomain;
    ctx.state.extractedName = name;

    await next();
};

/**
 * Payment Options Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const paymentOptionsValidation = async (ctx, next) => {
    const valid = validate(schemas.paymentOptions, ctx.request.query);

    if (valid.error) {
        ctx.status = 409;

        ctx.body = { validationError: valid.error.message };

        return;
    }

    const { tagName, domain } = ctx.request.query;

    const domainValidation = await validateDomainAndName(domain, tagName);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    await next();
};

/**
 * Honor `X-Zelf-Tag-Pay-Reduced-Fee` only when the server opts in; strip the header otherwise so it cannot be abused downstream.
 * Sets `ctx.state.reducedFeeRequested` for the payment-options handler.
 */
const paymentOptionsReducedFeeGate = async (ctx, next) => {
    const raw = String(ctx.get(TAG_PAY_REDUCED_FEE_HEADER) || "").toLowerCase();
    const headerWantsReduced = raw === "1" || raw === "true" || raw === "yes";
    const honored = TagsPaymentModule.isTagPayReducedFeeClientHeaderHonored();

    ctx.state.reducedFeeRequested = Boolean(headerWantsReduced && honored);

    if (headerWantsReduced && !honored) {
        delete ctx.request.headers[TAG_PAY_REDUCED_FEE_HEADER];
        if (ctx.req?.headers) {
            delete ctx.req.headers[TAG_PAY_REDUCED_FEE_HEADER];
        }
    }

    await next();
};

/**
 * Payment Confirmation Validation - Multi-domain support
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const paymentConfirmationValidation = async (ctx, next) => {
    const valid = validate(schemas.paymentConfirmation, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain, token, network } = ctx.request.body;

    const domainValidation = await validateDomainAndName(domain, tagName);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    // now also validate the token is valid that we encrypted with jwt
    const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

    if (!tokenDecoded) {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_token" };
        return;
    }

    // now validate tokenDecoded.ttl is still valid
    // TEMPORARY: Simulate 2 hours in the future for testing
    //.add(2, "hours")
    const now = moment().unix();

    if (tokenDecoded.ttl < now) {
        ctx.status = 409;
        ctx.body = { validationError: "token_expired" };
        return;
    }

    // now validate the network and coin
    if (!tokenDecoded.prices[network] && network !== "coinbase" && network !== "CB") {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_network" };
        return;
    }

    await next();
};

const smartContractPaymentConfirmationValidation = async (ctx, next) => {
    const valid = validate(schemas.smartContractPaymentConfirmation, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain, token } = ctx.request.body;

    const domainValidation = await validateDomainAndName(domain, tagName);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    let tokenDecoded;

    try {
        tokenDecoded = jwt.verify(token, config.JWT_SECRET);
    } catch {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_token" };
        return;
    }

    if (!tokenDecoded) {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_token" };
        return;
    }

    const now = moment().unix();

    if (tokenDecoded.ttl < now) {
        ctx.status = 409;
        ctx.body = { validationError: "token_expired" };
        return;
    }

    const scA = tokenDecoded.smartContractAVAX;
    const hasNative =
        scA?.expectedWei != null &&
        String(scA.expectedWei).trim() !== "" &&
        (() => {
            try {
                return BigInt(scA.expectedWei) > 0n;
            } catch {
                return false;
            }
        })();
    const hasUsdc =
        scA?.usdc?.expectedAmount != null &&
        String(scA.usdc.expectedAmount).trim() !== "" &&
        scA?.usdc?.tokenAddress &&
        (() => {
            try {
                return BigInt(scA.usdc.expectedAmount) > 0n;
            } catch {
                return false;
            }
        })();

    if (!scA?.paymentId || (!hasNative && !hasUsdc)) {
        ctx.status = 409;
        ctx.body = { validationError: "smart_contract_avax_not_in_token" };
        return;
    }

    await next();
};

const receiptEmailValidation = async (ctx, next) => {
    const { network, token } = ctx.request.body;

    const valid = validate(schemas.receiptEmail, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    // now also validate the token is valid that we encrypted with jwt
    const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

    if (!tokenDecoded) {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_token" };
        return;
    }

    // now validate the network and coin
    if (!tokenDecoded.prices[network] && network !== "coinbase" && network !== "CB") {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_network" };
        return;
    }

    await next();
};

const referralsValidation = async (ctx, next) => {
    const valid = validate(schemas.referrals, ctx.request.query);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    await next();
};

const claimReferralValidation = async (ctx, next) => {
    const valid = validate(schemas.claimReferral, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    await next();
};

/**
 * Extend License For Owner Validation
 * @param {*} ctx - Koa context
 * @param {*} next - Next middleware
 */
const extendLicenseForOwnerValidation = async (ctx, next) => {
    // If duration comes as a number, convert it to string to avoid Joi validation errors
    if (typeof ctx.request.body?.duration === "number") {
        ctx.request.body.duration = String(ctx.request.body.duration);
    }

    const valid = validate(schemas.extendLicenseForOwner, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain } = ctx.request.body;

    const domainValidation = await validateDomainAndName(domain, tagName);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    await next();
};

module.exports = {
    transferValidation,
    paymentOptionsValidation,
    paymentOptionsReducedFeeGate,
    paymentConfirmationValidation,
    smartContractPaymentConfirmationValidation,
    receiptEmailValidation,
    referralsValidation,
    claimReferralValidation,
    extendLicenseForOwnerValidation,
};
