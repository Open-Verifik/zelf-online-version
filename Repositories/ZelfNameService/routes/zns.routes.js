const config = require("../../../Core/config");

const Controller = require("../controllers/zns.controller");

const Middleware = require("../middlewares/zns.middleware");

const base = "/zelf-name-service";

module.exports = (server) => {
	const PATH = config.basePath(base);

	server.get(`${PATH}/search`, Middleware.getValidation, Controller.searchZelfName);
	server.post(`${PATH}/search`, Middleware.getValidation, Controller.searchZelfName);

	server.get(`${PATH}/v2/search`, Middleware.getValidation, Controller.searchZelfName_v2);
	server.post(`${PATH}/v2/search`, Middleware.getValidation, Controller.searchZelfName_v2);

	server.post(`${PATH}/lease`, Middleware.leaseValidation, Controller.leaseZelfName);

	server.post(`${PATH}/v2/lease`, Middleware.leaseValidation, Controller.leaseZelfName_v2);

	server.post(`${PATH}/v2/lease-recovery`, Middleware.leaseRecoveryValidation, Controller.leaseRecovery);

	server.get(`${PATH}/zelfpay`, Middleware.zelfPayValidation, Controller.zelfPay);

	server.post(`${PATH}/lease-offline`, Middleware.leaseOfflineValidation, Controller.leaseOfflineZelfName);

	server.post(`${PATH}/v2/lease-offline`, Middleware.leaseOfflineValidation, Controller.leaseOfflineZelfName_v2);

	server.post(`${PATH}/lease-confirmation`, Middleware.leaseConfirmationValidation, Controller.leaseConfirmation);

	server.post(`${PATH}/v2/lease-confirmation`, Middleware.leaseConfirmationValidation, Controller.leaseConfirmation_v2);

	server.post(`${PATH}/preview`, Middleware.previewValidation, Controller.previewZelfName);

	server.post(`${PATH}/preview-zelfproof`, Middleware.previewZelfProofValidation, Controller.previewZelfProof);

	server.post(`${PATH}/decrypt`, Middleware.decryptValidation, Controller.decryptZelfName);

	server.post(`${PATH}/v2/decrypt`, Middleware.decryptValidation, Controller.decryptZelfName_v2);

	server.post(`${PATH}/revenue-cat`, Middleware.revenueCatWebhookValidation, Controller.revenueCatWebhook);

	server.post(`${PATH}/purchase-rewards`, Middleware.referralRewardsValidation, Controller.purchaseRewards);

	server.post(`${PATH}/referral-rewards`, Middleware.referralRewardsValidation, Controller.referralRewards);

	server.put(`${PATH}/:zelfName`, Middleware.updateValidation, Controller.update);
};
