const Module = require("../modules/article.module");
const { errorHandler } = require("../../../Core/http-handler");

const create = async (ctx) => {
    try {
        const data = await Module.create(ctx.request.body);

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

const getAll = async (ctx) => {
    try {
        const data = await Module.getAll(ctx.query);

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

const getBySlug = async (ctx) => {
    try {
        const data = await Module.getBySlug(ctx.params.slug);

        if (!data) {
            ctx.status = 404;
            ctx.body = { error: "Article not found" };
            return;
        }

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

const sendTest = async (ctx) => {
    try {
        const { email } = ctx.request.body;
        const { slug } = ctx.params;

        const result = await Module.sendToSubscriber(slug, email);

        ctx.body = { data: result };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

const sendToAll = async (ctx) => {
    try {
        const { slug } = ctx.params;

        const result = await Module.sendToAll(slug);

        ctx.body = { data: result };
    } catch (error) {
        const _exception = errorHandler(error, ctx);

        ctx.status = _exception.status || 500;

        ctx.body = {
            code: _exception.code,
            message: _exception.message,
        };
    }
};

const trackOpen = async (ctx) => {
    try {
        const { articleId, subscriberEmail } = ctx.params;

        await Module.trackOpen(articleId, decodeURIComponent(subscriberEmail));

        // Return a 1x1 transparent GIF
        const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

        ctx.type = "image/gif";
        ctx.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        ctx.set("Pragma", "no-cache");
        ctx.set("Expires", "0");
        ctx.body = pixel;
    } catch (error) {
        errorHandler(error, ctx);
        // Still return the pixel even on error
        const pixel = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
        ctx.type = "image/gif";
        ctx.body = pixel;
    }
};

module.exports = {
    create,
    getAll,
    getBySlug,
    sendTest,
    sendToAll,
    trackOpen,
};
