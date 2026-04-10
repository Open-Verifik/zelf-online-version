const { validate, string, stringEnum } = require("../../../Core/JoiUtils");

const querySchema = {
    platform: stringEnum(["ios", "android"]).required(),
    current: string().optional().allow(""),
};

const versionQueryValidation = async (ctx, next) => {
    const valid = validate(querySchema, ctx.query);

    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }

    await next();
};

module.exports = {
    versionQueryValidation,
};
