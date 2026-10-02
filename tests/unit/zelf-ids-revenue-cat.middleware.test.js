jest.mock("../../Repositories/Tags/middlewares/tags.middleware", () => ({}));
jest.mock("../../Repositories/Tags/middlewares/my-tags.middleware", () => ({}));
jest.mock("../../Repositories/ZelfID/modules/zelf-ids-payment.module", () => ({
    isTagPayReducedFeeClientHeaderHonored: jest.fn(() => false),
}));

const config = require("../../Core/config");
const { revenueCatWebhookValidation } = require("../../Repositories/ZelfID/middlewares/zelf-id.middleware");

const event = {
    type: "NON_RENEWING_PURCHASE",
    id: "evt_1",
    product_id: "zns_char_6_to_15_years_1",
    transaction_id: "2000000000000001",
    environment: "PRODUCTION",
    price: 24,
    subscriber_attributes: {},
};

const createCtx = (body, user) => ({ request: { body }, state: { user }, status: 200, body: null });

describe("zelf-ids revenueCatWebhookValidation", () => {
    const original = { env: config.env, revenueCat: config.revenueCat };

    afterEach(() => {
        config.env = original.env;
        config.revenueCat = original.revenueCat;
    });

    test("production rejects a plain session token", async () => {
        config.env = "production";
        config.revenueCat = { allowedEmail: "revenuecat@zelf.world" };
        const ctx = createCtx({ event }, { session: "abc" });
        const next = jest.fn();

        await revenueCatWebhookValidation(ctx, next);

        expect(ctx.status).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("production rejects when the allowed email is not configured", async () => {
        config.env = "production";
        config.revenueCat = { allowedEmail: undefined };
        const ctx = createCtx({ event }, { clientId: "c1", email: undefined });
        const next = jest.fn();

        await revenueCatWebhookValidation(ctx, next);

        expect(ctx.status).toBe(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("production accepts the RevenueCat client and a full event with extra fields", async () => {
        config.env = "production";
        config.revenueCat = { allowedEmail: "revenuecat@zelf.world" };
        const ctx = createCtx({ event: { ...event, store: "PLAY_STORE", app_user_id: "$RCAnonymousID:x" } }, { clientId: "c1", email: "revenuecat@zelf.world" });
        const next = jest.fn();

        await revenueCatWebhookValidation(ctx, next);

        expect(next).toHaveBeenCalled();
    });

    test("an invalid event stops with 409 and does not reach the controller", async () => {
        config.env = "development";
        const ctx = createCtx({ event: { type: "NON_RENEWING_PURCHASE" } }, {});
        const next = jest.fn();

        await revenueCatWebhookValidation(ctx, next);

        expect(ctx.status).toBe(409);
        expect(next).not.toHaveBeenCalled();
    });
});
