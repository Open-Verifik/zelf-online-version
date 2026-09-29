jest.mock("../../Repositories/Tags/modules/tags-payment.module", () => ({
    isTagPayReducedFeeClientHeaderHonored: jest.fn(() => false),
}));

jest.mock("../../Repositories/Tags/middlewares/tags.middleware", () => ({
    extractDomainAndName: jest.fn(),
    validateDomainAndName: jest.fn(),
}));

const { validateDomainAndName } = require("../../Repositories/Tags/middlewares/tags.middleware");
const Middleware = require("../../Repositories/Tags/middlewares/my-tags.middleware");

const createCtx = (body) => ({
    request: { body },
    status: 200,
    body: null,
});

describe("my-tags.middleware JWT validation", () => {
    beforeEach(() => {
        validateDomainAndName.mockResolvedValue({ valid: true });
    });

    it("returns 409 invalid_token for malformed JWT in paymentConfirmationValidation", async () => {
        const ctx = createCtx({
            tagName: "testtag",
            domain: "zelf",
            network: "ETH",
            token: "ETH",
        });
        const next = jest.fn();

        await Middleware.paymentConfirmationValidation(ctx, next);

        expect(ctx.status).toBe(409);
        expect(ctx.body).toEqual({ validationError: "invalid_token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 409 invalid_token for malformed JWT in receiptEmailValidation", async () => {
        const ctx = createCtx({
            tagName: "testtag",
            domain: "zelf",
            network: "ETH",
            email: "test@example.com",
            token: "ETH",
        });
        const next = jest.fn();

        await Middleware.receiptEmailValidation(ctx, next);

        expect(ctx.status).toBe(409);
        expect(ctx.body).toEqual({ validationError: "invalid_token" });
        expect(next).not.toHaveBeenCalled();
    });

    it("returns 409 for missing required fields in paymentConfirmationValidation", async () => {
        const ctx = createCtx({ tagName: "testtag" });
        const next = jest.fn();

        await Middleware.paymentConfirmationValidation(ctx, next);

        expect(ctx.status).toBe(409);
        expect(ctx.body.validationError).toBeDefined();
        expect(next).not.toHaveBeenCalled();
    });
});
