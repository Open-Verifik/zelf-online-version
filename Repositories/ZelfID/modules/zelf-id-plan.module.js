/**
 * Zelf ID v4 plan stamps and unpaid reservation rules.
 * Prices come from the domain license (`tags.payment.pricingTable` via
 * `domainConfig.getPrice`). Do not hardcode dollar amounts here.
 *
 * 1–5 characters: unlimited only. 6–27: free, or a yearly paid choice of
 * premium or unlimited. `.hold` is only for unpaid short names. An expired
 * year reads as `plan: free`.
 */
const moment = require("moment");

const ZELF_ID_RESERVATION_HOURS = 5;
const SHORT_NAME_MAX = 5;
const LONG_NAME_MAX = 27;

/**
 * Bare local name (before TLD), without a trailing `.hold`.
 * @param {string} [tagName]
 * @returns {string}
 */
const getBareName = (tagName = "") =>
    String(tagName || "")
        .trim()
        .replace(/\.hold$/i, "")
        .split(".")[0];

/**
 * Unpaid reservation pin: `alice.zelf.hold`, never `alice.hold`.
 * @param {string} [tagName]
 * @param {string} [domain]
 * @param {string} [holdSuffix]
 * @returns {string}
 */
const getReservationPinName = (tagName, domain = "zelf", holdSuffix = ".hold") => {
    const bare = getBareName(tagName);
    const tld = String(domain || "zelf")
        .trim()
        .replace(/^\./, "")
        .replace(/\.hold$/i, "");
    const suffix = String(holdSuffix || ".hold").startsWith(".") ? holdSuffix : `.${holdSuffix}`;

    return `${bare}.${tld}${suffix}`;
};

/**
 * @param {string} [tagName]
 * @returns {number}
 */
const getBareNameLength = (tagName) => getBareName(tagName).length;

/**
 * `.hold` reservations are only for short names that still owe unlimited.
 * @param {string} [tagName]
 * @returns {boolean}
 */
const requiresHoldReservation = (tagName) => {
    const length = getBareNameLength(tagName);
    return length > 0 && length <= SHORT_NAME_MAX;
};

/**
 * Plans a name may use. Short names cannot be premium or lease-only free.
 * @param {string} [tagName]
 * @returns {Array<"free"|"premium"|"unlimited">}
 */
const allowedPlansForName = (tagName) => {
    const length = getBareNameLength(tagName);
    if (length > 0 && length <= SHORT_NAME_MAX) return ["unlimited"];
    if (length >= 6 && length <= LONG_NAME_MAX) return ["free", "premium", "unlimited"];
    return [];
};

/**
 * Paid-plan stamp. Short names cannot be premium. Long names pick premium or unlimited.
 * @param {Object|string} [tagNameOrParams]
 * @param {string} [tagNameOrParams.tagName]
 * @param {string} [tagNameOrParams.requestedPlan]
 * @returns {"premium"|"unlimited"}
 */
const resolvePaidPlan = (tagNameOrParams, requestedPlan) => {
    const tagName = typeof tagNameOrParams === "string" ? tagNameOrParams : tagNameOrParams?.tagName;
    const plan = typeof tagNameOrParams === "string" ? requestedPlan : tagNameOrParams?.requestedPlan;

    if (requiresHoldReservation(tagName)) return "unlimited";
    if (plan === "unlimited") return "unlimited";
    return "premium";
};

/**
 * License quote plus the plan this name is allowed to take.
 * Dollar amounts come from `domainConfig.getPrice` (license pricing table).
 * @param {Object} [params]
 * @param {string} [params.tagName]
 * @param {string|number} [params.duration]
 * @param {string} [params.referralTagName]
 * @param {Object} params.domainConfig
 * @param {string} [params.requestedPlan]
 * @returns {Object}
 */
const getZelfIdPrice = ({ tagName, duration = "1", referralTagName = "", domainConfig, requestedPlan } = {}) => {
    if (typeof domainConfig?.getPrice !== "function") {
        throw new Error("409:license_price_required");
    }

    const quote = domainConfig.getPrice(tagName, duration, referralTagName);
    const allowedPlans = allowedPlansForName(tagName);
    const plan = requiresHoldReservation(tagName)
        ? "unlimited"
        : requestedPlan === "premium" || requestedPlan === "unlimited"
          ? requestedPlan
          : "free";

    return {
        ...quote,
        plan,
        allowedPlans,
    };
};

/**
 * Plan at lease time. Long names start `free` unless they pay later.
 * Short names that confirm immediately (`$0` after referral) still get `unlimited`.
 * @param {Object} params
 * @param {string} [params.tagName]
 * @returns {"free"|"unlimited"}
 */
const resolveZelfIdPlan = ({ tagName }) => (requiresHoldReservation(tagName) ? "unlimited" : "free");

/**
 * Confirm plan when the license quote is already `$0` (100% referral / leftover).
 * Short names → unlimited. Long names → premium. Price above 0 returns undefined
 * so the caller can hold (short) or confirm as free (long).
 * @param {Object} [params]
 * @param {string} [params.tagName]
 * @param {number|string} [params.price]
 * @returns {"premium"|"unlimited"|undefined}
 */
const resolveComplimentaryPlan = ({ tagName, price } = {}) => {
    if (Number(price) !== 0) return undefined;
    if (requiresHoldReservation(tagName)) return "unlimited";
    const length = getBareNameLength(tagName);
    if (length >= 6 && length <= LONG_NAME_MAX) return "premium";
    return undefined;
};

/**
 * Plan after a successful payment. Short → unlimited. Long → requested premium or unlimited.
 * @param {Object} [params]
 * @param {string} [params.tagName]
 * @param {string} [params.requestedPlan]
 * @returns {"premium"|"unlimited"}
 */
const resolveUpgradePlan = ({ tagName, requestedPlan } = {}) => resolvePaidPlan({ tagName, requestedPlan });

/**
 * Stored plan after `expiresAt`. Expired mainnet is still the name, but `free`.
 * @param {Object} [publicData]
 * @returns {"free"|"premium"|"unlimited"|undefined}
 */
const effectivePlan = (publicData = {}) => {
    if (publicData.type === "mainnet" && isExpiresAtPassed(publicData)) return "free";

    const tagName = publicData.tagName || publicData.zelfName;
    if (requiresHoldReservation(tagName) && publicData.plan === "premium") return "unlimited";

    if (publicData.plan === "free" || publicData.plan === "premium" || publicData.plan === "unlimited") {
        return publicData.plan;
    }
    return publicData.plan;
};

/**
 * @param {Object} [publicData]
 * @returns {boolean}
 */
const isUnpaidReservation = (publicData = {}) => publicData.type === "hold" || publicData.type === "reserved";

/**
 * @param {Object} [publicData]
 * @returns {boolean}
 */
const isExpiresAtPassed = (publicData = {}) => {
    if (!publicData.expiresAt) return false;

    return moment(publicData.expiresAt, "YYYY-MM-DD HH:mm:ss", true).isValid()
        ? moment(publicData.expiresAt, "YYYY-MM-DD HH:mm:ss").isBefore(moment())
        : moment(publicData.expiresAt).isBefore(moment());
};

const isReservationExpired = (publicData = {}) => isExpiresAtPassed(publicData);

/**
 * Unpaid hold/reserved whose reservation window has passed.
 * Paid mainnet records (free/premium/unlimited) are never expired reservations.
 * @param {Object} [publicData]
 * @returns {boolean}
 */
const isUnpaidExpiredReservation = (publicData = {}) => {
    if (publicData.type === "mainnet") return false;
    if (publicData.plan === "free" || publicData.plan === "premium" || publicData.plan === "unlimited") return false;

    return isUnpaidReservation(publicData) && isReservationExpired(publicData);
};

/**
 * Payment-confirmation stamp for a v4 hold → one-year mainnet plan.
 * Legacy v3 records get no plan.
 * @param {Object} params
 * @param {string} [params.tagName]
 * @param {number} [params.encryptVersion]
 * @param {boolean} [params.isHold]
 * @param {number} [params.durationYears]
 * @returns {{ plan?: "premium"|"unlimited", expiresAt?: string }}
 */
const resolveV4PaymentStamp = ({ tagName, encryptVersion, durationYears = 1, requestedPlan } = {}) => {
    if (Number(encryptVersion) !== 4) return {};

    return {
        plan: resolveUpgradePlan({ tagName, requestedPlan }),
        expiresAt: moment()
            .add(Number(durationYears) || 1, "year")
            .format("YYYY-MM-DD HH:mm:ss"),
    };
};

module.exports = {
    ZELF_ID_RESERVATION_HOURS,
    SHORT_NAME_MAX,
    LONG_NAME_MAX,
    getBareName,
    getBareNameLength,
    getReservationPinName,
    requiresHoldReservation,
    allowedPlansForName,
    resolvePaidPlan,
    getZelfIdPrice,
    resolveZelfIdPlan,
    resolveComplimentaryPlan,
    resolveUpgradePlan,
    effectivePlan,
    isUnpaidReservation,
    isExpiresAtPassed,
    isReservationExpired,
    isUnpaidExpiredReservation,
    resolveV4PaymentStamp,
};
