/**
 * RPC proxy: POST /api/rpc/sui — standard JSON-RPC (no JWT); IP-based RPCCaller limits.
 * Prerequisites: API running (e.g. PORT=3003 npm start), MongoDB, Sui upstream reachable (default mainnet fullnode or SUI_RPC_URL).
 */
const path = require("path");
const request = require("supertest");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), override: false });

const apiBaseUrl = () =>
    process.env.API_INTEGRATION_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3003}`;

describe("Sui RPC (live server, no JWT)", () => {
    it("POST /api/rpc/sui proxies sui_getChainIdentifier (JSON-RPC body)", async () => {
        const res = await request(apiBaseUrl())
            .post("/api/rpc/sui")
            .set("Origin", "https://test.example.com")
            .send({
                jsonrpc: "2.0",
                id: 1,
                method: "sui_getChainIdentifier",
                params: [],
            });

        expect(res.status).toBe(200);
        expect(res.body.jsonrpc).toBe("2.0");
        expect(res.body.id).toBe(1);
        expect(res.body.error).toBeUndefined();
        expect(typeof res.body.result).toBe("string");
        expect(res.body.result.length).toBeGreaterThan(0);
    }, 45000);
});
