const Joi = require("joi");

const createCollectionValidation = async (ctx, next) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        symbol: Joi.string().required(),
        description: Joi.string().optional().allow(""),
        coverImage: Joi.string().optional(),
        avatarImage: Joi.string().optional(),
        contractAddress: Joi.string().required(),
        owner: Joi.string().required(),
        maxSupply: Joi.number().optional(),
        royaltyBps: Joi.number().optional(),
        chainId: Joi.number().optional(),
        createdAt: Joi.string().optional(),
        walletType: Joi.string().valid("zelf", "external").required(),
        // Zelf Auth
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        // External Auth
        signature: Joi.string().optional(),
        message: Joi.string().optional(),
    }).unknown(true);

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const createNFTValidation = async (ctx, next) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().optional().allow(""),
        image: Joi.string().required(),
        attributes: Joi.array().items(Joi.object()).optional(),
        collectionAddress: Joi.string().optional(), // Can be null if standalone or if we assume collection-less
        owner: Joi.string().required(),
        walletType: Joi.string().valid("zelf", "external").required(),
        // Zelf Auth
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        // External Auth
        signature: Joi.string().optional(),
        message: Joi.string().optional(),
    });

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const mintNFTValidation = async (ctx, next) => {
    const schema = Joi.object({
        collectionAddress: Joi.string().required(),
        recipientAddress: Joi.string().required(),
        tokenURI: Joi.string().required(),
        owner: Joi.string().required(),
        walletType: Joi.string().valid("zelf", "external").required(),
        // Zelf Auth
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        // External Auth
        signature: Joi.string().optional(),
        message: Joi.string().optional(),
    });

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

module.exports = {
    createCollectionValidation,
    createNFTValidation,
    mintNFTValidation,
};
