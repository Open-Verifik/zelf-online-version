const TagsMiddleware = require("../../Tags/middlewares/tags.middleware");

module.exports = {
    getValidation: TagsMiddleware.getValidation,
    searchByDomainValidation: TagsMiddleware.searchByDomainValidation,
    leaseValidation: TagsMiddleware.leaseValidation,
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
};
