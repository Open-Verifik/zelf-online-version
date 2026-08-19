const config = require("../../../Core/config");
const { array, boolean, number, object, string, validate } = require("../../../Core/JoiUtils");
const { normalizePartyId } = require("../modules/canton-format.util");

const schemas = {
    status: {
        probe: boolean().optional(),
    },
    transactions: {
        afterOffset: number().integer().min(0).optional(),
        beforeOffset: number().integer().min(0).optional(),
    },
    prepareTransfer: {
        sender: string().max(512).required(),
        recipient: string().max(512).required(),
        amountCc: string().max(64).required(),
        instrumentId: string().max(128).optional(),
        memo: string().max(256).allow("").optional(),
        inputUtxos: array().items(string().max(512)).max(100).optional(),
    },
    submitTransfer: {
        partyId: string().max(512).required(),
        preparedTransaction: object({
            preparedTransaction: string().max(5_000_000).required(),
            preparedTransactionHash: string().max(512).required(),
        })
            .unknown(true)
            .required(),
        signature: string().max(1024).required(),
    },
};

const validateRequest = (schema, source) => async (ctx, next) => {
    const valid = validate(schema, ctx.request[source]);
    if (valid.error) {
        ctx.status = 409;
        ctx.body = { validationError: valid.error.message };
        return;
    }
    await next();
};

const validatePartyParam = async (ctx, next) => {
    try {
        ctx.request.params.id = normalizePartyId(ctx.request.params.id);
    } catch (error) {
        ctx.status = error.status || 400;
        ctx.body = { code: error.message, message: error.message.replace(/_/g, " ") };
        return;
    }
    await next();
};

const authorizeParty = (source) => async (ctx, next) => {
    let partyId;

    try {
        partyId = normalizePartyId(source === "params" ? ctx.request.params.id : ctx.request.body[source]);
    } catch (error) {
        ctx.status = error.status || 400;
        ctx.body = { code: error.message, message: error.message.replace(/_/g, " ") };
        return;
    }

    const allowUnboundDevelopment = config.env !== "production" && config.canton.allowUnboundParties;
    const allowedParties = Array.isArray(config.canton.allowedParties) ? config.canton.allowedParties : [];

    if (config.env === "production") {
        ctx.status = 503;
        ctx.body = {
            code: "canton_party_ownership_mapping_required",
            message: "Canton production access requires a durable Zelf ID/session to party ownership mapping",
        };
        return;
    }

    if (!allowUnboundDevelopment && !allowedParties.includes(partyId)) {
        ctx.status = 403;
        ctx.body = {
            code: "canton_party_not_authorized",
            message: "Canton party is not authorized for this backend session",
        };
        return;
    }

    await next();
};

module.exports = {
    authorizeParty,
    validatePartyParam,
    validatePrepareTransfer: validateRequest(schemas.prepareTransfer, "body"),
    validateStatus: validateRequest(schemas.status, "query"),
    validateSubmitTransfer: validateRequest(schemas.submitTransfer, "body"),
    validateTransactions: validateRequest(schemas.transactions, "query"),
};
