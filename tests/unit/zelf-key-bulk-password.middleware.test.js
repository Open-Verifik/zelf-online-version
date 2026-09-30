const Middleware = require("../../Repositories/ZelfKeys/middlewares/zelf-key.middleware");

describe("ZelfKeys bulk password middleware", () => {
    const basePayload = {
        faceBase64: "face-data",
        masterPassword: "master-secret",
        passwords: [
            {
                website: "https://example.com",
                username: "user@example.com",
                password: "secret123",
            },
        ],
    };

    it("accepts a valid bulk password payload", async () => {
        const ctx = { request: { body: basePayload } };
        let nextCalled = false;

        await Middleware.storePasswordsBulkValidation(ctx, async () => {
            nextCalled = true;
        });

        expect(nextCalled).toBe(true);
        expect(ctx.status).toBeUndefined();
    });

    it("rejects an empty passwords array", async () => {
        const ctx = {
            request: {
                body: {
                    ...basePayload,
                    passwords: [],
                },
            },
        };

        await Middleware.storePasswordsBulkValidation(ctx, async () => {});

        expect(ctx.status).toBe(409);
        expect(ctx.body.validationError).toMatch(/passwords/i);
    });

    it("rejects payloads missing faceBase64", async () => {
        const ctx = {
            request: {
                body: {
                    masterPassword: "master-secret",
                    passwords: basePayload.passwords,
                },
            },
        };

        await Middleware.storePasswordsBulkValidation(ctx, async () => {});

        expect(ctx.status).toBe(409);
        expect(ctx.body.validationError).toMatch(/faceBase64/i);
    });

    it(`rejects more than ${Middleware.BULK_PASSWORDS_MAX} passwords`, async () => {
        const passwords = Array.from({ length: Middleware.BULK_PASSWORDS_MAX + 1 }, (_, index) => ({
            website: `https://site-${index}.example`,
            username: `user${index}@example.com`,
            password: `secret-${index}`,
        }));

        const ctx = {
            request: {
                body: {
                    ...basePayload,
                    passwords,
                },
            },
        };

        await Middleware.storePasswordsBulkValidation(ctx, async () => {});

        expect(ctx.status).toBe(409);
        expect(ctx.body.validationError).toMatch(/100/i);
    });
});
