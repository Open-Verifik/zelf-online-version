const Module = require("../../Repositories/RPC/modules/rpc.module");

describe("rpc.module", () => {
    it("lists configured chains", () => {
        const chains = Module.getChains();

        expect(Array.isArray(chains)).toBe(true);
        expect(chains.some((chain) => chain.chain === "ethereum" && chain.chainId === 1)).toBe(true);
    });

    it("rejects blocked subscription methods", async () => {
        await expect(
            Module.forwardRequest({
                chain: "ethereum",
                method: "eth_subscribe",
                params: ["newHeads"],
            })
        ).rejects.toMatchObject({
            status: 403,
        });
    });

    it("rejects unknown chains", async () => {
        await expect(
            Module.forwardRequest({
                chain: "unknown-chain",
                method: "eth_blockNumber",
                params: [],
            })
        ).rejects.toMatchObject({
            status: 400,
        });
    });
});
