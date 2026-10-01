/**
 * Reward and RevenueCat routes shared by /api/tags and /api/zelf-ids.
 *
 * Those routes called RevenueCatModule.purchaseRewards / referralRewards / revenueCatWebhook,
 * which never existed (a port of the ZNS controller, whose handlers call
 * ZNSTokenModule.releasePurchaseRewards / releaseReferralRewards), so they always failed.
 * - purchase-rewards: wired to the Tags purchase reward release it was meant to call.
 * - referral-rewards: answers 410. Referral rewards are paid per referral by
 *   POST /api/my-tags/referrals/claim from the same collection; the old batch (5% of grouped
 *   prices) would pay a second time for what the claims pay.
 * - /api/tags/revenue-cat: answers 410. Zelf IDs are extended by POST /api/zelf-ids/revenue-cat.
 */
const TagsTokenModule = require("../modules/tags-token.module");
const { errorHandler } = require("../../../Core/http-handler");

const REFERRAL_CLAIM_ROUTE = "POST /api/my-tags/referrals/claim";
const ZELF_IDS_REVENUE_CAT_ROUTE = "POST /api/zelf-ids/revenue-cat";

const _gone = (ctx, code, message, replacement) => {
    ctx.status = 410;
    ctx.body = { code, message, replacement };
};

/**
 * Releases the oldest pending Tags purchase reward (super admin, checked by the route middleware).
 * 200 with the record, 202 while its transfer is not confirmed yet, { nothingToProcess: true }
 * when there is none.
 */
const purchaseRewards = async (ctx) => {
    try {
        const data = await TagsTokenModule.releasePurchaseRewards();

        if (data?.pending) ctx.status = 202;

        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status;

        ctx.body = { message: _exception.message, code: _exception.code };
    }
};

const referralRewardsRetired = async (ctx) => {
    _gone(ctx, "referral_rewards_batch_retired", "Referral rewards are claimed per referral.", REFERRAL_CLAIM_ROUTE);
};

const tagsRevenueCatRetired = async (ctx) => {
    _gone(ctx, "revenue_cat_route_moved", "RevenueCat purchases are confirmed by the Zelf ID route.", ZELF_IDS_REVENUE_CAT_ROUTE);
};

module.exports = {
    purchaseRewards,
    referralRewardsRetired,
    tagsRevenueCatRetired,
    REFERRAL_CLAIM_ROUTE,
    ZELF_IDS_REVENUE_CAT_ROUTE,
};
