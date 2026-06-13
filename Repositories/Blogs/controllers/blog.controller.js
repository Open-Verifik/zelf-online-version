const Module = require("../modules/blog.module");

const get = async (ctx) => {
    try {
        const data = await Module.get(ctx.request.query, ctx.state.user);
        ctx.body = { data };
    } catch (error) {
        console.error({ error });
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const show = async (ctx) => {
    try {
        const query = {
            ...ctx.request.params,
            ...ctx.request.query,
        };
        const data = await Module.show(query, ctx.state.user);
        ctx.body = { data };
    } catch (error) {
        console.error(error);
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const create = async (ctx) => {
    try {
        const data = await Module.create(ctx.request.body, ctx.state.user);
        ctx.body = { data };
    } catch (error) {
        console.error(error);
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const update = async (ctx) => {
    try {
        const body = {
            ...ctx.request.body,
            id: ctx.request.params.id,
        };
        const data = await Module.update(body, ctx.state.user);
        ctx.body = { data };
    } catch (error) {
        console.error(error);
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

const destroy = async (ctx) => {
    try {
        const data = await Module.destroy(ctx.request.params, ctx.state.user);
        ctx.body = { data };
    } catch (error) {
        console.error(error);
        ctx.status = error.status || 500;
        ctx.body = { error: error.message };
    }
};

module.exports = {
    get,
    show,
    create,
    update,
    destroy,
};
