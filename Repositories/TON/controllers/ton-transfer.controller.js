const Module = require("../modules/ton-transfer.module");
const { errorHandler } = require("../../../Core/http-handler");

const sendTransfer = async (ctx) => {
	try {
		const { mnemonic, toAddress, amountTon, comment } = ctx.request.body;
		const data = await Module.sendNativeTransfer({ mnemonic, toAddress, amountTon, comment });
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

const sendJetton = async (ctx) => {
	try {
		const { mnemonic, toAddress, jettonMaster, amount, decimals } = ctx.request.body;
		const data = await Module.sendJettonTransfer({ mnemonic, toAddress, jettonMaster, amount, decimals });
		ctx.body = data;
	} catch (error) {
		const _exception = errorHandler(error);
		ctx.status = _exception.status || 500;
		ctx.body = { code: _exception.code, message: _exception.message };
	}
};

module.exports = {
	sendTransfer,
	sendJetton,
};
