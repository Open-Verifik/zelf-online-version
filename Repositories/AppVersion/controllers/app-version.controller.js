const Module = require("../modules/app-version.module");
const { errorHandler } = require("../../../Core/http-handler");

const getVersion = async (ctx) => {
    try {
        const data = Module.getVersionCheck(ctx.query);
        ctx.body = { data };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

module.exports = {
    getVersion,
};
