const RpcLog = require("../../Repositories/RPC/models/rpc-log.model");

describe("rpc-log.model", () => {
    it("uses collection RPCLogs", () => {
        expect(RpcLog.collection.collectionName).toBe("RPCLogs");
    });

    it("sets TTL on expiresAt for 7 days", () => {
        const expiresPath = RpcLog.schema.path("expiresAt");
        expect(expiresPath.options.expires).toBe(7 * 24 * 60 * 60);
    });

    it("defines audit fields", () => {
        expect(RpcLog.schema.path("chain")).toBeDefined();
        expect(RpcLog.schema.path("chainId")).toBeDefined();
        expect(RpcLog.schema.path("method")).toBeDefined();
        expect(RpcLog.schema.path("success")).toBeDefined();
    });
});
