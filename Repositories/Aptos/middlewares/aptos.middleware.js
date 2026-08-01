const { boolean, showRecords, string, validate } = require("../../../Core/JoiUtils");

const schemas = {
    addressTransactions: {
        page: string().required(),
        show: showRecords().required(),
    },
    estimateTransfer: {
        amountApt: string().max(64).required(),
        fromAddress: string().max(128).required(),
        toAddress: string().max(128).required(),
    },
    sendTransfer: {
        amountApt: string().max(64).required(),
        mnemonic: string().max(512).required(),
        toAddress: string().max(128).required(),
        waitForConfirmation: boolean().optional(),
    },
};

const validateRequest = (schema, source) => async (ctx, next) => {
    const valid = validate(schema, ctx.request[source]);
    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }
    await next();
};

const validateAddressTransactions = validateRequest(schemas.addressTransactions, "query");
const validateEstimateTransfer = validateRequest(schemas.estimateTransfer, "body");
const validateSendTransfer = validateRequest(schemas.sendTransfer, "body");

module.exports = {
    validateAddressTransactions,
    validateEstimateTransfer,
    validateSendTransfer,
};
