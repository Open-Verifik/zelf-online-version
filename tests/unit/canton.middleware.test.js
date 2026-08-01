const config = require("../../Core/config");
const Middleware = require("../../Repositories/Canton/middlewares/canton.middleware");

const ALICE = "alice::12201acb807c49aceaeb68b1d89bb3bea95fe740b4b0a6cca428e6a351c2450540f4";
const BOB = "bob::1220447e99360f4e11caf7be818b96ead2a23c593eb927f792ae5f0a0bc15b264783";

describe("Canton party authorization", () => {
    const originalEnv = config.env;
    const originalAllowedParties = config.canton.allowedParties;
    const originalAllowUnboundParties = config.canton.allowUnboundParties;

    afterEach(() => {
        config.env = originalEnv;
        config.canton.allowedParties = originalAllowedParties;
        config.canton.allowUnboundParties = originalAllowUnboundParties;
    });

    it("allows only QA allowlisted parties in non-production environments", async () => {
        config.env = "development";
        config.canton.allowedParties = [ALICE];
        config.canton.allowUnboundParties = false;
        const allowedContext = { request: { params: { id: ALICE } } };
        const deniedContext = { request: { params: { id: BOB } } };
        let nextCalls = 0;

        await Middleware.authorizeParty("params")(allowedContext, async () => {
            nextCalls += 1;
        });
        await Middleware.authorizeParty("params")(deniedContext, async () => {
            nextCalls += 1;
        });

        expect(nextCalls).toBe(1);
        expect(deniedContext.status).toBe(403);
        expect(deniedContext.body.code).toBe("canton_party_not_authorized");
    });

    it("keeps party-scoped routes closed in production until ownership is durable", async () => {
        config.env = "production";
        config.canton.allowedParties = [ALICE];
        config.canton.allowUnboundParties = true;
        const context = { request: { body: { sender: ALICE } } };
        let nextCalls = 0;

        await Middleware.authorizeParty("sender")(context, async () => {
            nextCalls += 1;
        });

        expect(nextCalls).toBe(0);
        expect(context.status).toBe(503);
        expect(context.body.code).toBe("canton_party_ownership_mapping_required");
    });

    it("rejects malformed party identifiers before authorization", async () => {
        config.env = "development";
        const context = { request: { body: { partyId: "0x1234" } } };

        await Middleware.authorizeParty("partyId")(context, async () => {});

        expect(context.status).toBe(400);
        expect(context.body.code).toBe("canton_party_id_invalid");
    });
});
