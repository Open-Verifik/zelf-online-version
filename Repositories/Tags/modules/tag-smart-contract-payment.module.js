const config = require("../../../Core/config");
const NodeCache = require("node-cache");
const { getAddress } = require("ethers");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const { searchTag } = require("./tags.module");
const { getDomainConfig } = require("../config/supported-domains");
const { normalizeTagPayTxHash, verifyAvalancheZelfTagPayTx } = require("./avalanche-tag-pay-verify.module");

const scPayTxCache = new NodeCache({ stdTTL: 172800, maxKeys: 50000, useClones: false });

const throwPaymentConfirmationTagNotFound = (tagName, domain) => {
    const fullTag = `${tagName}.${domain}`;
    console.warn("[payment_confirmation] tag_not_found", { tagName, domain, fullTag });
    const err = new Error("404:tag_not_found");
    err.clientCode = "tag_not_found";
    err.clientMessage = "Tag not found or not indexed";
    throw err;
};

/** Years to add for renewal; align with extend-license style lifetime handling. */
function scLicenseExtensionYears(durationRaw) {
    if (durationRaw === "lifetime" || durationRaw === 999 || durationRaw === "999") return 100;
    const n = Number(durationRaw);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Same expiry math as tags-payment `buildMetadata` extraParams.expiresAt. */
function computeScLicenseExtension(currentExpiresAt, durationRaw) {
    const years = scLicenseExtensionYears(durationRaw);
    const previousExpiresAt = currentExpiresAt;
    const newExpiresAt = moment(currentExpiresAt).add(years, "year").format("YYYY-MM-DD HH:mm:ss");

    return { previousExpiresAt, newExpiresAt };
}

// --- JWT `smartContractAVAX`: native AVAX vs USDC (ZelfAvalanchePay) ---

/** True when JWT carries a positive native wei amount for `pay(...)`. */
function smartContractAvaxHasValidNativeWei(sc) {
    if (sc?.expectedWei == null || String(sc.expectedWei).trim() === "") return false;
    try {
        return BigInt(sc.expectedWei) > 0n;
    } catch {
        return false;
    }
}

/** True when JWT carries USDC token + positive atomic amount for `payUsdc(...)`. */
function smartContractAvaxHasValidUsdcPayload(sc) {
    if (!sc?.usdc?.tokenAddress) return false;
    if (sc.usdc.expectedAmount == null || String(sc.usdc.expectedAmount).trim() === "") return false;
    try {
        return BigInt(sc.usdc.expectedAmount) > 0n;
    } catch {
        return false;
    }
}

/**
 * @param {object | undefined} sc - tokenDecoded.smartContractAVAX
 * @returns {{ hasNativeWei: boolean, hasUsdcPayload: boolean }}
 */
function assertSmartContractAvaxPresent(sc) {
    const hasNativeWei = smartContractAvaxHasValidNativeWei(sc);
    const hasUsdcPayload = smartContractAvaxHasValidUsdcPayload(sc);

    if (!sc?.paymentId || sc?.chainId == null || (!hasNativeWei && !hasUsdcPayload)) {
        throw new Error("409:smart_contract_avax_not_in_token");
    }

    return { hasNativeWei, hasUsdcPayload };
}

// --- Orchestration helpers ---

function decodeTagPayToken(tagName, domain, token) {
    const tokenDecoded = jwt.verify(token, config.JWT_SECRET);
    const domainConfig = getDomainConfig(domain);

    if (!tokenDecoded?.tagName || !tokenDecoded?.tagPayName) throw new Error("401:tag_not_authenticated");
    if (tokenDecoded.tagName !== `${tagName}.${domain}`) throw new Error("403:tag_not_owned");

    return { tokenDecoded, domainConfig };
}

/**
 * @returns {{ expectedContract: string, normalizedHash: string }}
 */
function resolveAvalancheContractAndTxHash(sc, txHash) {
    if (!config.avalanche.tagPayContractAddress) throw new Error("500:tag_pay_contract_not_configured");

    const expectedContract = getAddress(config.avalanche.tagPayContractAddress);

    if (Number(sc.chainId) !== Number(config.avalanche.chainId)) throw new Error("409:chain_id_mismatch");

    const normalizedHash = normalizeTagPayTxHash(txHash);
    if (!normalizedHash) throw new Error("409:invalid_tx_hash");

    return { expectedContract, normalizedHash };
}

function scPayCacheKey(normalizedHash) {
    return `scpay_tx_${normalizedHash}`;
}

function readScPayCache(cacheKey, sc, tagNameFull) {
    const cached = scPayTxCache.get(cacheKey);
    if (cached && cached.paymentId === sc.paymentId && cached.tagName === tagNameFull) return cached.body;
    return null;
}

function writeScPayCache(cacheKey, sc, tagNameFull, body) {
    scPayTxCache.set(cacheKey, { paymentId: sc.paymentId, tagName: tagNameFull, body });
}

function renewalShortCircuitFlags(tagObject, tokenDecoded) {
    const initiatedAt = tokenDecoded.initiatedAt ? moment.unix(tokenDecoded.initiatedAt) : null;
    const renewedAtCondition = Boolean(
        tagObject.publicData.renewedAt && initiatedAt && moment(tagObject.publicData.renewedAt).isAfter(initiatedAt),
    );
    const registeredAtCondition = Boolean(
        tokenDecoded.initiatedAt && moment(tagObject.publicData.registeredAt).isAfter(initiatedAt),
    );
    return { renewedAtCondition, registeredAtCondition };
}

function buildSmartContractPaymentConfirmation({ payMode, eventAmount, amountReceivedHuman, normalizedHash }) {
    return {
        confirmed: true,
        amountReceived: amountReceivedHuman,
        amountWei: eventAmount.toString(),
        payAsset: payMode,
        txHash: normalizedHash,
        checkedFactor: "smart_contract_event",
    };
}

async function verifyAvalancheChainOrFail({
    normalizedHash,
    expectedContract,
    sc,
    hasNativeWei,
    hasUsdcPayload,
    tokenDecoded,
}) {
    const rpcUrl = config.avalanche.rpcUrl;
    if (!rpcUrl) throw new Error("500:avalanche_rpc_not_configured");

    const confirmations = config.avalanche.tagPayConfirmations || 1;

    return verifyAvalancheZelfTagPayTx({
        normalizedHash,
        expectedContract,
        chainId: config.avalanche.chainId,
        rpcUrl,
        confirmations,
        sc,
        hasNativeWei,
        hasUsdcPayload,
        tagNameFull: tokenDecoded.tagName,
        prices: tokenDecoded.prices,
        tagPayUsdcAddress: config.avalanche.tagPayUsdcAddress,
    });
}

async function extendTagAfterSmartContractPay({ domainConfig, domain, tokenDecoded, amountToPay, tagObject }) {
    const { addDurationToTag } = require("./my-tags.module");

    await addDurationToTag(
        {
            tagName: tagObject.publicData[domainConfig.getTagKey()].split(".")[0],
            price: amountToPay,
            domain,
            duration: tokenDecoded.duration || 1,
            domainConfig,
        },
        tagObject,
    );
}

/**
 * Avalanche C-Chain smart-contract payment (ZelfAvalanchePay). Verifies tx vs JWT, extends tag when confirmed.
 * Future: branch on tokenDecoded.smartContractBSC (or similar) for additional chains.
 */
const verifySmartContractPayment = async (tagName, domain, token, txHash) => {
    const { tokenDecoded, domainConfig } = decodeTagPayToken(tagName, domain, token);

    const sc = tokenDecoded.smartContractAVAX;

    const { hasNativeWei, hasUsdcPayload } = assertSmartContractAvaxPresent(sc);

    const { expectedContract, normalizedHash } = resolveAvalancheContractAndTxHash(sc, txHash);
    const cacheKey = scPayCacheKey(normalizedHash);

    const cachedBody = readScPayCache(cacheKey, sc, tokenDecoded.tagName);
    if (cachedBody) return cachedBody;

    const tagData = await searchTag({ tagName, domain }, {});
    if (tagData.available) throwPaymentConfirmationTagNotFound(tagName, domain);

    const tagObject = tagData.tagObject;
    const { renewedAtCondition, registeredAtCondition } = renewalShortCircuitFlags(tagObject, tokenDecoded);

    const onChain = await verifyAvalancheChainOrFail({
        normalizedHash,
        expectedContract,
        sc,
        hasNativeWei,
        hasUsdcPayload,
        tokenDecoded,
    });

    if (!onChain.ok) return onChain.body;

    const { payMode, eventAmount, amountReceivedHuman, amountToPay } = onChain;
    const paymentConfirmation = buildSmartContractPaymentConfirmation({
        payMode,
        eventAmount,
        amountReceivedHuman,
        normalizedHash,
    });

    if (renewedAtCondition || registeredAtCondition) {
        const result = {
            cache: true,
            confirmed: true,
            amountReceived: String(amountReceivedHuman),
            paymentConfirmation,
            publicData: tagObject.publicData,
            reward: "pending_to_code",
            licenseExtension: null,
        };
        writeScPayCache(cacheKey, sc, tokenDecoded.tagName, result);
        return result;
    }

    const licenseExtension = computeScLicenseExtension(tagObject.publicData.expiresAt, tokenDecoded.duration);

    await extendTagAfterSmartContractPay({ domainConfig, domain, tokenDecoded, amountToPay, tagObject });

    const result = {
        tagObject,
        confirmed: true,
        amountReceived: String(amountReceivedHuman),
        paymentConfirmation,
        licenseExtension,
    };

    writeScPayCache(cacheKey, sc, tokenDecoded.tagName, result);

    return result;
};

module.exports = {
    verifySmartContractPayment,
    throwPaymentConfirmationTagNotFound,
};
