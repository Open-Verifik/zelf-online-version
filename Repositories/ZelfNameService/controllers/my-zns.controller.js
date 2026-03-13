const Module = require("../modules/my-zns.module");
const { errorHandler } = require("../../../Core/http-handler");

const transferZelfName = async (ctx) => {
	try {
		const data = await Module.transferMyZelfName(
			{
				...ctx.request.body,
				zelfName: `${ctx.request.body.zelfName}`.toLowerCase(),
			},
			ctx.state.user
		);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const renewZelfName = async (ctx) => {
	try {
		const data = await Module.renewMyZelfName(ctx.request.body, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

const howToRenewZelfName = async (ctx) => {
	try {
		const data = await Module.howToRenewMyZelfName(ctx.request.query, ctx.state.user);

		ctx.body = { data };
	} catch (error) {
		const _exception = errorHandler(error, ctx);

		ctx.status = _exception.status;

		ctx.body = { message: _exception.message, code: _exception.code };
	}
};

module.exports = {
	transferZelfName,
	renewZelfName,
	howToRenewZelfName,
};
