const Middleware = require("../../Repositories/BlockDAG/middlewares/blockdag-nft.middleware");

const createCtx = (body) => ({
    request: { body },
    status: 200,
    body: null,
});

describe("blockdag-nft.middleware", () => {
    it("rejects mint requests without a signature", async () => {
        const ctx = createCtx({
            collectionAddress: "0x1111111111111111111111111111111111111111",
            recipientAddress: "0x2222222222222222222222222222222222222222",
            tokenURI: "ipfs://token",
            owner: "0x3333333333333333333333333333333333333333",
            walletType: "external",
            message: "signed-message",
        });
        const next = jest.fn();

        await Middleware.mintNFTValidation(ctx, next);

        expect(ctx.status).toBe(400);
        expect(next).not.toHaveBeenCalled();
        expect(ctx.body.error).toMatch(/signature/i);
    });

    it("accepts signed mint requests", async () => {
        const ctx = createCtx({
            collectionAddress: "0x1111111111111111111111111111111111111111",
            recipientAddress: "0x2222222222222222222222222222222222222222",
            tokenURI: "ipfs://token",
            owner: "0x3333333333333333333333333333333333333333",
            walletType: "external",
            signature: "0xsignature",
            message: "signed-message",
        });
        const next = jest.fn();

        await Middleware.mintNFTValidation(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("rejects token updates without auth", async () => {
        const ctx = createCtx({
            tokenId: "1",
            txHash: "0xtx",
            owner: "0x3333333333333333333333333333333333333333",
            walletType: "external",
            message: "signed-message",
        });
        const next = jest.fn();

        await Middleware.updateTokenIdValidation(ctx, next);

        expect(ctx.status).toBe(400);
        expect(next).not.toHaveBeenCalled();
        expect(ctx.body.error).toMatch(/signature/i);
    });

    it("accepts signed token updates", async () => {
        const ctx = createCtx({
            tokenId: "1",
            txHash: "0xtx",
            owner: "0x3333333333333333333333333333333333333333",
            walletType: "external",
            signature: "0xsignature",
            message: "signed-message",
        });
        const next = jest.fn();

        await Middleware.updateTokenIdValidation(ctx, next);

        expect(next).toHaveBeenCalledTimes(1);
    });
});
