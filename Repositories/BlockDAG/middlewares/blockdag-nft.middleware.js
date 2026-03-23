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
        // Collection Meta
        category: Joi.string().optional(),
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
        description: Joi.string().max(5000).optional().allow(""),
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
        // NFT Meta
        category: Joi.string().optional(),
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
        signature: Joi.string().required(),
        message: Joi.string().required(),
    });

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const updateTokenIdValidation = async (ctx, next) => {
    const schema = Joi.object({
        tokenId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        txHash: Joi.string().optional().allow(""),
        owner: Joi.string().required(),
        walletType: Joi.string().valid("zelf", "external").required(),
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        signature: Joi.string().required(),
        message: Joi.string().required(),
    });

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const deleteCollectionValidation = async (ctx, next) => {
    const schema = Joi.object({
        walletType: Joi.string().valid("zelf", "external").required(),
        owner: Joi.string().required(),
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        signature: Joi.string().required(),
        message: Joi.string().required(),
    });

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const deleteItemValidation = async (ctx, next) => {
    const schema = Joi.object({
        walletType: Joi.string().valid("zelf", "external").required(),
        owner: Joi.string().required(),
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        signature: Joi.string().required(),
        message: Joi.string().required(),
    });

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const updateCollectionValidation = async (ctx, next) => {
    const schema = Joi.object({
        coverImage: Joi.string().optional().allow(""),
        avatarImage: Joi.string().optional().allow(""),
        name: Joi.string().optional().allow(""),
        walletType: Joi.string().valid("zelf", "external").required(),
        owner: Joi.string().required(),
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        signature: Joi.string().optional(),
        message: Joi.string().optional(),
    }).or("coverImage", "avatarImage", "name");

    const { error } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }
    await next();
};

const updateItemMetadataValidation = async (ctx, next) => {
    const traitSchema = Joi.object({
        trait_type: Joi.string().allow(""),
        traitType: Joi.string().allow(""),
        value: Joi.string().allow(""),
    }).unknown(true);

    const schema = Joi.object({
        name: Joi.string().max(256).optional().allow(""),
        description: Joi.string().max(5000).optional().allow(""),
        attributes: Joi.array().items(traitSchema).optional(),
        walletType: Joi.string().valid("zelf", "external").required(),
        owner: Joi.string().required(),
        proof: Joi.string().optional(),
        faceBase64: Joi.string().optional(),
        password: Joi.string().optional(),
        signature: Joi.string().required(),
        message: Joi.string().required(),
    })
        .or("name", "description", "attributes")
        .unknown(false);

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
    updateTokenIdValidation,
    deleteCollectionValidation,
    deleteItemValidation,
    updateCollectionValidation,
    updateItemMetadataValidation,
};
