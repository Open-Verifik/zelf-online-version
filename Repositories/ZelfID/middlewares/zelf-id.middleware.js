const { string, validate, stringEnum } = require("../../../Core/JoiUtils");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const config = require("../../../Core/config");
const TagsMiddleware = require("../../Tags/middlewares/tags.middleware");
const ZelfIdsPaymentModule = require("../modules/zelf-ids-payment.module");

const TAG_PAY_REDUCED_FEE_HEADER = "x-zelf-tag-pay-reduced-fee";

const leaseOfflineSchema = {
    tagName: string().required(),
    domain: string().required(),
    zelfProof: string(),
    zelfProofQRCode: string(),
    referralTagName: string(),
    duration: string(),
};

const leaseOfflineValidation = async (ctx, next) => {
    const valid = validate(leaseOfflineSchema, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain, zelfProof, zelfProofQRCode } = ctx.request.body;

    if (!zelfProof && !zelfProofQRCode) {
        ctx.status = 409;
        ctx.body = { validationError: "missing zelfProof" };
        return;
    }

    const { domain: extractedDomain, name } = TagsMiddleware.extractDomainAndName(tagName, domain);
    const domainValidation = await TagsMiddleware.validateDomainAndName(extractedDomain, name);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    ctx.state.extractedDomain = extractedDomain;
    ctx.state.extractedName = name;

    await next();
};

const paymentSchemas = {
    paymentConfirmation: {
        tagName: string().required(),
        domain: string(),
        network: stringEnum(["ETH", "SOL", "BTC", "AVAX", "BNB", "POL", "BASE", "BDAG"]).required(),
        token: string().required(),
    },
    paymentOptions: {
        tagName: string().required(),
        domain: string(),
        duration: stringEnum(["1", "2", "3", "4", "5", "lifetime"]).required(),
        plan: stringEnum(["premium", "unlimited"]).optional(),
    },
};

const paymentOptionsValidation = async (ctx, next) => {
    const valid = validate(paymentSchemas.paymentOptions, ctx.request.query);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain } = ctx.request.query;
    const domainValidation = await TagsMiddleware.validateDomainAndName(domain, tagName);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    await next();
};

const paymentOptionsReducedFeeGate = async (ctx, next) => {
    const raw = String(ctx.get(TAG_PAY_REDUCED_FEE_HEADER) || "").toLowerCase();
    const headerWantsReduced = raw === "1" || raw === "true" || raw === "yes";
    const honored = ZelfIdsPaymentModule.isTagPayReducedFeeClientHeaderHonored();

    ctx.state.reducedFeeRequested = Boolean(headerWantsReduced && honored);

    await next();
};

const paymentConfirmationValidation = async (ctx, next) => {
    const valid = validate(paymentSchemas.paymentConfirmation, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    const { tagName, domain, token, network } = ctx.request.body;
    const domainValidation = await TagsMiddleware.validateDomainAndName(domain, tagName);

    if (!domainValidation.valid) {
        ctx.status = 409;
        ctx.body = { validationError: domainValidation.error };
        return;
    }

    const tokenDecoded = jwt.verify(token, config.JWT_SECRET);

    if (!tokenDecoded) {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_token" };
        return;
    }

    if (tokenDecoded.ttl < moment().unix()) {
        ctx.status = 409;
        ctx.body = { validationError: "token_expired" };
        return;
    }

    if (!tokenDecoded.prices[network]) {
        ctx.status = 409;
        ctx.body = { validationError: "invalid_network" };
        return;
    }

    await next();
};

module.exports = {
    getValidation: TagsMiddleware.getValidation,
    searchByDomainValidation: TagsMiddleware.searchByDomainValidation,
    leaseValidation: TagsMiddleware.leaseValidation,
    leaseOfflineValidation,
    leaseRecoveryValidation: TagsMiddleware.leaseRecoveryValidation,
    deleteTagValidation: TagsMiddleware.deleteTagValidation,
    previewValidation: TagsMiddleware.previewValidation,
    previewZelfProofValidation: TagsMiddleware.previewZelfProofValidation,
    previewZelfIdQrValidation: TagsMiddleware.previewZelfIdQrValidation,
    decryptValidation: TagsMiddleware.decryptValidation,
    revenueCatWebhookValidation: TagsMiddleware.revenueCatWebhookValidation,
    referralRewardsValidation: TagsMiddleware.referralRewardsValidation,
    purchaseRewardsValidation: TagsMiddleware.purchaseRewardsValidation,
    walletBalancesValidation: TagsMiddleware.walletBalancesValidation,
    extractDomainAndName: TagsMiddleware.extractDomainAndName,
    validateDomainAndName: TagsMiddleware.validateDomainAndName,
    paymentOptionsValidation,
    paymentOptionsReducedFeeGate,
    paymentConfirmationValidation,
};
