const config = require("../../../Core/config");

const Controller = require("../controllers/my-tags.controller");

const Middleware = require("../middlewares/my-tags.middleware");

const RbacMiddleware = require("../middlewares/rbac.middleware");

const base = "/my-tags";

module.exports = (server) => {
    const PATH = config.basePath(base);

    // transfer tag
    server.post(`${PATH}/transfer`, Middleware.transferValidation, Controller.transferTag);

    // payment options
    server.get(`${PATH}/payment-options`, Middleware.paymentOptionsValidation, Controller.paymentOptions);

    // payment confirmation
    server.post(`${PATH}/payment-confirmation`, Middleware.paymentConfirmationValidation, Controller.paymentConfirmation);

    // receipt email
    server.post(`${PATH}/email-receipt`, Middleware.receiptEmailValidation, Controller.receiptEmail);

    // my referrals
    server.get(`${PATH}/referrals`, Middleware.referralsValidation, Controller.referrals);

    server.post(`${PATH}/referrals/claim`, Middleware.claimReferralValidation, Controller.claimReferralReward);

    // owner license extension (free)
    server.post(`${PATH}/custom-extend`, Middleware.extendLicenseForOwnerValidation, RbacMiddleware.requireWrite, Controller.extendLicenseForOwner);
};




