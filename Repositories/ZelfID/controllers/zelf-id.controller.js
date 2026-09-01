const Module = require("../modules/zelf-id.module");
const RevenueCatModule = require("../../Tags/modules/revenue-cat.module");
const { updateOldTagObject } = require("../../Tags/modules/my-tags.module");
const ZelfIdRecoveryModule = require("../modules/zelf-id-recovery.module");
const TagsSearchModule = require("../../Tags/modules/tags-search.module");
const { getAllSupportedDomains } = require("../../Tags/modules/domain-registry.module");
const { errorHandler } = require("../../../Core/http-handler");
const configuration = require("../../../Core/config");
const ZelfProofModule = require("../../ZelfProof/modules/zelf-proof.module");
const TagWalletBalancesModule = require("../../Tags/modules/tag-wallet-balances.module");
const MyZelfIdModule = require("../modules/my-zelf-id.module");
const ZelfIdsOfflineModule = require("../modules/zelf-ids-offline.module");

/**
 * Keep full pin name (e.g. user.zelfpay) for IPFS lookup; middleware only supplies registry TLD + local name.
 * @param {string|undefined} rawTagName - tagName from query/body
 * @param {string|null|undefined} extractedName
 * @param {string|null|undefined} extractedDomain - registry domain (zelf, bdag, …)
 */
const resolveFullTagNameForRequest = (rawTagName, extractedName, extractedDomain) => {
    const raw = rawTagName != null && rawTagName !== "" ? String(rawTagName).trim() : "";
    if (raw.includes(".")) {
        return raw.toLowerCase();
    }
    if (extractedName != null && extractedName !== "" && extractedDomain) {
        return `${extractedName}.${extractedDomain}`.toLowerCase();
    }
    return raw.toLowerCase();
};

/**
 * Handle old tag object updates
 * @param {Object} data - Search result data
 * @param {string} domain - Domain name
 * @returns {Object} - Updated data
 */
const handleOldTagUpdate = async (data, domain = "zelf") => {
    if (data && data.ipfs?.length) {
        const tagObject = data.ipfs[0];

        if (!tagObject.publicData.registeredAt) {
            const updatedTagObject = await updateOldTagObject(tagObject, domain);
            data.ipfs[0] = updatedTagObject;
        }
    }

    return data;
};

const searchTag = async (ctx) => {
    try {
        const { extractedDomain, extractedName } = ctx.state;

        const requestData = {
            ...ctx.request.query,
            tagName: resolveFullTagNameForRequest(ctx.request.query.tagName, extractedName, extractedDomain),
            domain: extractedDomain || ctx.request.query.domain,
            environment: ctx.request.query.environment,
            type: ctx.request.query.type || "both",
        };

        let data = await Module.searchTag(requestData, ctx.state.user);

        if (data.tagObject?.publicData && !data.tagObject.publicData.hasPassword && data.tagObject.zelfProof) {
            const previewData = await ZelfProofModule.preview(
                {
                    zelfProof: data.tagObject.zelfProof,
                    stack: "v4",
                },
                ctx.state.user,
            );

            data.preview = previewData;

            if (data.preview) data.tagObject.publicData.hasPassword = `${Boolean(data.preview.passwordLayer === "WithPassword")}`;
        }

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const searchTagsByDomain = async (ctx) => {
    try {
        const { domain, storage, limit, pageOffset, name } = ctx.request.query;

        let data = await TagsSearchModule.searchByDomain({ domain, storage, limit, pageOffset, name }, ctx.state.user);

        ctx.body = {
            data,
            limit,
            total: data.length,
        };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const leaseTag = async (ctx) => {
    try {
        const { extractedDomain, extractedName } = ctx.state;

        const requestData = {
            ...ctx.request.body,
            tagName: resolveFullTagNameForRequest(ctx.request.body.tagName, extractedName, extractedDomain),
            domain: extractedDomain,
        };

        const data = await Module.leaseTag(requestData, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const leaseOffline = async (ctx) => {
    try {
        const { extractedDomain, extractedName } = ctx.state;

        const requestData = {
            ...ctx.request.body,
            tagName: resolveFullTagNameForRequest(ctx.request.body.tagName, extractedName, extractedDomain),
            domain: extractedDomain,
        };

        const data = await ZelfIdsOfflineModule.leaseOffline(requestData, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const leaseRecovery = async (ctx) => {
    try {
        const { extractedDomain, extractedName } = ctx.state;

        const requestData = {
            ...ctx.request.body,
            tagName: resolveFullTagNameForRequest(ctx.request.body.tagName, extractedName, extractedDomain),
            domain: extractedDomain,
        };

        const data = await ZelfIdRecoveryModule.leaseRecovery(requestData, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const previewTag = async (ctx) => {
    try {
        const { extractedDomain, extractedName } = ctx.state;

        const rawTag = ctx.request.query.tagName ?? ctx.request.body.tagName;

        const requestData = {
            ...ctx.request.query,
            ...ctx.request.body,
            tagName: resolveFullTagNameForRequest(rawTag, extractedName, extractedDomain),
            domain: extractedDomain,
        };

        const data = await Module.previewTag(requestData, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const previewZelfProof = async (ctx) => {
    try {
        const data = await Module.previewZelfProof(ctx.request.body, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const previewZelfIdQr = async (ctx) => {
    try {
        const data = await Module.previewZelfIdQr(ctx.request.body, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const decryptTag = async (ctx) => {
    try {
        const { extractedDomain, extractedName } = ctx.state;

        const requestData = {
            ...ctx.request.body,
            tagName: resolveFullTagNameForRequest(ctx.request.body.tagName, extractedName, extractedDomain),
            domain: extractedDomain,
        };

        const data = await Module.decryptTag(requestData, ctx.state.user);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const revenueCatWebhook = async (ctx) => {
    try {
        const data = await RevenueCatModule.revenueCatWebhook(ctx.request.body);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const purchaseRewards = async (ctx) => {
    try {
        const data = await RevenueCatModule.purchaseRewards(ctx.request.body);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const referralRewards = async (ctx) => {
    try {
        const data = await RevenueCatModule.referralRewards(ctx.request.body);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const deleteTag = async (ctx) => {
    try {
        const { cid, faceBase64, password, tagName, domain } = ctx.request.body;

        const result = await Module.deleteTag({ cid, faceBase64, password, tagName, domain }, ctx.state.user);

        ctx.body = { data: result };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const getDomains = async (ctx, next) => {
    try {
        const {
            loadOfficialLicenses,
            parseIncludeThemeSettings,
            fetchAndMergeOfficialThemeSettings,
        } = require("../../License/modules/license.module");

        const rawLicenses = await loadOfficialLicenses();
        const includeTheme = parseIncludeThemeSettings(ctx.request.query.includeThemeSettings);

        let licenses = rawLicenses;
        if (includeTheme) {
            const list = Array.isArray(rawLicenses) ? rawLicenses : Object.values(rawLicenses || {});
            licenses = (
                await Promise.all(
                    list.map(async (lic) => {
                        if (!lic || !lic.name) return null;
                        const copy = JSON.parse(JSON.stringify(lic));
                        await fetchAndMergeOfficialThemeSettings(copy);
                        return copy;
                    }),
                )
            ).filter(Boolean);
        }

        const { includeNonPaid } = ctx.request.query;

        const domains = getAllSupportedDomains(
            licenses,
            includeNonPaid !== undefined ? !Boolean(includeNonPaid === "true") : configuration.env === "development" ? false : true,
        );

        ctx.body = { data: domains };
    } catch (error) {
        console.error("Error loading domains:", error);
        const domains = getAllSupportedDomains();
        ctx.body = { data: domains };
    }

    await next();
};

const getDomain = async (ctx, next) => {
    const { domain } = ctx.request.params;
    const {
        loadOfficialLicenses,
        parseIncludeThemeSettings,
        fetchAndMergeOfficialThemeSettings,
    } = require("../../License/modules/license.module");
    const { Domain } = require("../../Tags/modules/domain.class");

    const includeTheme = parseIncludeThemeSettings(ctx.request.query.includeThemeSettings);

    let domainConfig = null;

    if (includeTheme) {
        try {
            const raw = await loadOfficialLicenses();
            const list = Array.isArray(raw) ? raw : Object.values(raw || {});
            const lic = list.find((l) => l && l.name && String(l.name).toLowerCase() === domain.toLowerCase());
            if (lic) {
                const copy = JSON.parse(JSON.stringify(lic));
                await fetchAndMergeOfficialThemeSettings(copy);
                domainConfig = new Domain(copy);
            }
        } catch (err) {
            console.warn("[zelf-ids/domains/:domain] includeThemeSettings failed:", err.message);
        }
    }

    if (!domainConfig) {
        domainConfig = Module.getDomainConfig(domain);
    }

    if (!domainConfig) {
        ctx.status = 404;
        ctx.body = {
            code: "NotFound",
            message: "domain_not_found",
        };
        return;
    }

    ctx.body = { data: domainConfig };

    await next();
};

const getWalletBalances = async (ctx, next) => {
    try {
        const q = ctx.state.walletBalanceQuery || {};
        const data = await TagWalletBalancesModule.getTagWalletBalances({
            ethAddress: q.ethAddress,
            btcAddress: q.btcAddress,
            solanaAddress: q.solanaAddress,
        });
        ctx.body = { data };
    } catch (error) {
        console.error("getWalletBalances:", error);
        ctx.status = 500;
        ctx.body = { error: "wallet_balances_failed" };
        return;
    }

    await next();
};

const paymentOptions = async (ctx) => {
    try {
        const { tagName, domain, duration, plan } = ctx.request.query;
        const reducedFeeRequested = Boolean(ctx.state.reducedFeeRequested);
        const data = await MyZelfIdModule.getPaymentOptions(tagName, domain, duration, ctx.state.user, {
            reducedFeeRequested,
            requestedPlan: plan,
        });

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;
        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const paymentConfirmation = async (ctx) => {
    try {
        const { tagName, domain, network, token } = ctx.request.body;
        const data = await MyZelfIdModule.verifyPaymentConfirmation(tagName, domain, network, token);

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;
        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

module.exports = {
    searchTag,
    searchTagsByDomain,
    leaseTag,
    leaseOffline,
    leaseRecovery,
    previewTag,
    previewZelfProof,
    previewZelfIdQr,
    decryptTag,
    revenueCatWebhook,
    purchaseRewards,
    referralRewards,
    deleteTag,
    handleOldTagUpdate,
    getDomains,
    getDomain,
    getWalletBalances,
    paymentOptions,
    paymentConfirmation,
};
