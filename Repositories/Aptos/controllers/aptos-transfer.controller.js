const Module = require("../modules/aptos-transfer.module");
const { errorHandler } = require("../../../Core/http-handler");

const estimate = async (ctx) => {
    try {
        const { fromAddress, toAddress, amountApt } = ctx.request.body;
        ctx.body = { data: await Module.estimateTransfer({ fromAddress, toAddress, amountApt }) };
    } catch (error) {
        const exception = errorHandler(error);
        ctx.status = exception.status || 500;
        ctx.body = { code: exception.code, message: exception.message };
    }
};

const send = async (ctx) => {
    try {
        const { mnemonic, toAddress, amountApt, waitForConfirmation } = ctx.request.body;
        ctx.body = { data: await Module.sendTransfer({ mnemonic, toAddress, amountApt, waitForConfirmation }) };
    } catch (error) {
        const exception = errorHandler(error);
        ctx.status = exception.status || 500;
        ctx.body = { code: exception.code, message: exception.message };
    }
};

module.exports = {
    estimate,
    send,
};
