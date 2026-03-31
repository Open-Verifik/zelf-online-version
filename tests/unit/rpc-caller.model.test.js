const RpcCaller = require("../../Repositories/RPCCaller/models/rpc-caller.model");

describe("rpc-caller.model", () => {
    it("uses collection RPCCallers", () => {
        expect(RpcCaller.collection.collectionName).toBe("RPCCallers");
    });

    it("defines ip and request tracking fields", () => {
        expect(RpcCaller.schema.path("ip")).toBeDefined();
        expect(RpcCaller.schema.path("requestCount")).toBeDefined();
        expect(RpcCaller.schema.path("banned")).toBeDefined();
    });
});
