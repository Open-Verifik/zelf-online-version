const { string, validate, boolean, array, any } = require("../../../Core/JoiUtils");

const schemas = {
    create: {
        slug: string().required(),
        title: string().required(),
        description: any(),
        author: any(),
        date: any(),
        markdownContent: string().required(),
        coverImage: any(),
        tags: array(),
        published: boolean(),
    },
    sendTest: {
        email: string().required(),
    },
};

const createValidation = async (ctx, next) => {
    const valid = validate(schemas.create, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    await next();
};

const sendTestValidation = async (ctx, next) => {
    const valid = validate(schemas.sendTest, ctx.request.body);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    await next();
};

module.exports = {
    createValidation,
    sendTestValidation,
};
