const RpcCallerWindow = require("../../Repositories/RPCCaller/models/rpc-caller-window.model");

describe("rpc-caller-window.model", () => {
    it("uses collection RPCCallerWindows", () => {
        expect(RpcCallerWindow.collection.collectionName).toBe("RPCCallerWindows");
    });

    it("indexes ip and windowStart", () => {
        expect(RpcCallerWindow.schema.path("ip")).toBeDefined();
        expect(RpcCallerWindow.schema.path("windowStart")).toBeDefined();
        expect(RpcCallerWindow.schema.path("count")).toBeDefined();
    });
});
