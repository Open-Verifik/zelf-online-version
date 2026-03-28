const config = require("../../../Core/config");

const Controller = require("../controllers/tags.controller");

const Middleware = require("../middlewares/tags.middleware");

const base = "/tags";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // domain helper routes
    server.get(`${PATH}/domains`, Controller.getDomains);

    server.get(`${PATH}/domains/:domain`, Controller.getDomain);

    server.get(`${PATH}/search`, Middleware.getValidation, Controller.searchTag); // [x]

    server.get(`${PATH}/search-by-domain`, Middleware.searchByDomainValidation, Controller.searchTagsByDomain); // [x]

    server.get(`${PATH}/preview`, Middleware.previewValidation, Controller.previewTag); // [x]

    server.get(`${PATH}/wallet-balances`, Middleware.walletBalancesValidation, Controller.getWalletBalances);

    server.post(`${PATH}/lease`, Middleware.leaseValidation, Controller.leaseTag); // [x]

    server.post(`${PATH}/lease-recovery`, Middleware.leaseRecoveryValidation, Controller.leaseRecovery); // [x]

    server.post(`${PATH}/lease-offline`, Middleware.leaseOfflineValidation, Controller.leaseOfflineTag); // [x]

    server.delete(`${PATH}/delete`, Middleware.deleteTagValidation, Controller.deleteTag); // [x]

    server.post(`${PATH}/preview-zelfproof`, Middleware.previewZelfProofValidation, Controller.previewZelfProof); // [x]

    server.post(`${PATH}/preview-zelf-id-qr`, Middleware.previewZelfIdQrValidation, Controller.previewZelfIdQr); // [x]

    server.post(`${PATH}/decrypt`, Middleware.decryptValidation, Controller.decryptTag); // [x]

    server.post(`${PATH}/revenue-cat`, Middleware.revenueCatWebhookValidation, Controller.revenueCatWebhook);

    server.post(`${PATH}/purchase-rewards`, Middleware.referralRewardsValidation, Controller.purchaseRewards);

    server.post(`${PATH}/referral-rewards`, Middleware.referralRewardsValidation, Controller.referralRewards);
};


