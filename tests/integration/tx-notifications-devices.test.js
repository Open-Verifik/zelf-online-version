/**
 * Zelf #566 — device registration against a real MongoDB, through the real
 * route → middleware → controller → module → model stack mounted behind koa-jwt
 * exactly like server.js does (including its 401 rewrite middleware).
 *
 * Needs a MongoDB; set TX_NOTIFICATIONS_TEST_MONGO_URI (defaults to the local
 * zelf_testing server). Each run uses its own database and drops it at the end.
 *
 *   TX_NOTIFICATIONS_TEST_MONGO_URI=mongodb://127.0.0.1:27017 npm run test:tx-notifications
 */
const crypto = require("crypto");
const Koa = require("koa");
const Router = require("@koa/router");
const jwt = require("koa-jwt");
const jsonwebtoken = require("jsonwebtoken");
const mongoose = require("mongoose");
const request = require("supertest");
const { koaBody } = require("koa-body");
const { Wallet } = require("ethers");

const Device = require("../../Repositories/TxNotifications/models/tx-notification-device.model");
const Cursor = require("../../Repositories/TxNotifications/models/tx-watch-cursor.model");
const PushLog = require("../../Repositories/TxNotifications/models/tx-push-log.model");
const Lease = require("../../Repositories/TxNotifications/models/tx-watcher-lease.model");
const { TxWatcher } = require("../../Repositories/TxNotifications/watcher/tx-watcher");
const { buildRegistrationMessage } = require("../../Repositories/TxNotifications/modules/registration-signature.util");

const JWT_SECRET = "tx-notifications-integration-secret";
/** Server URI without a database name; the test creates and drops its own database. */
const MONGO_BASE = (process.env.TX_NOTIFICATIONS_TEST_MONGO_URI || "mongodb://127.0.0.1:27017").replace(/\/+$/, "");
const DB_NAME = `zelf_testing_tx_push_${Date.now()}`;

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const silentLog = { info: () => {}, warn: () => {}, error: () => {} };

/** Same shape as server.js: body parser, 401 rewrite, koa-jwt, protected routes. */
const buildApp = () => {
    const app = new Koa();
    app.use(koaBody({ parsedMethods: ["POST", "PUT", "PATCH", "DELETE"], jsonLimit: "1mb" }));
    app.use((ctx, next) =>
        next().catch((err) => {
            if (err.status === 401) {
                ctx.status = 401;
                ctx.body = { error: "Protected resource, use Authorization header to get access" };
            } else throw err;
        })
    );
    app.use(jwt({ secret: JWT_SECRET }));
    const router = new Router();
    require("../../Repositories/TxNotifications/routes/tx-notifications.routes")(router);
    app.use(router.routes());
    return app.callback();
};

describe("tx-notifications devices (MongoDB)", () => {
    const wallet = Wallet.createRandom();
    const token = jsonwebtoken.sign({ identifier: "tx-push-test", tagName: "qa99.zelf" }, JWT_SECRET, { expiresIn: "1h" });
    const pushSubscriptionId = crypto.randomUUID();
    let app;

    const body = async ({ issuedAt = new Date().toISOString(), addresses, signer = wallet, ...rest } = {}) => {
        const payload = {
            pushSubscriptionId,
            platform: "android",
            language: "es",
            appVersion: "3.19.23",
            tagName: "qa99.zelf",
            addresses: addresses || {
                ethereum: wallet.address,
                solana: "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
                ton: "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N",
                polkadot: "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5",
            },
            issuedAt,
            ...rest,
        };
        payload.signature = await signer.signMessage(buildRegistrationMessage(payload));
        return payload;
    };

    const register = (payload) =>
        request(app).post("/api/tx-notifications/devices").set("Authorization", `Bearer ${token}`).send(payload);

    const unregister = (secret) => {
        const call = request(app).delete(`/api/tx-notifications/devices/${pushSubscriptionId}`).set("Authorization", `Bearer ${token}`);
        return secret === undefined ? call : call.set("X-Device-Secret", secret);
    };

    beforeAll(async () => {
        await mongoose.connect(`${MONGO_BASE}/${DB_NAME}`, { serverSelectionTimeoutMS: 5000 });
        await Promise.all([Device.syncIndexes(), Cursor.syncIndexes(), PushLog.syncIndexes(), Lease.syncIndexes()]);
        app = buildApp();
    });

    afterAll(async () => {
        if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    let firstSecret;
    let firstRegistration;

    it("requires the session JWT", async () => {
        const res = await request(app).post("/api/tx-notifications/devices").send(await body());
        expect(res.status).toBe(401);
    });

    it("registers: returns deviceId, a 32-byte secret and the watched networks; stores only the secret hash", async () => {
        firstRegistration = await body();
        const res = await register(firstRegistration);

        expect(res.status).toBe(200);
        expect(res.body.data.deviceId).toMatch(/^[0-9a-f]{24}$/);
        expect(res.body.data.deviceSecret).toMatch(/^[0-9a-f]{64}$/);
        expect(res.body.data.watching).toEqual(["ethereum", "solana", "ton"]);
        firstSecret = res.body.data.deviceSecret;

        const device = await Device.findOne({ pushSubscriptionId }).lean();
        expect(device.secretHash).toBe(sha256(firstSecret));
        expect(JSON.stringify(device)).not.toContain(firstSecret);
        expect(device.ownerEth).toBe(wallet.address.toLowerCase());
        expect(device.language).toBe("es");
        expect(device.addresses.map((a) => a.network)).toEqual(["ethereum", "polkadot", "solana", "ton"]);
        expect(device.watchKeys).toEqual([
            `ethereum:${wallet.address.toLowerCase()}`,
            "solana:5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9",
            "ton:0:83dfd552e63729b472fcbcc8c45ebcc6691702558b68ec7527e1ba403a0f31a8",
        ]);
        expect(device.expiresAt.getTime()).toBeGreaterThan(Date.now() + 59 * 24 * 3600 * 1000);

        const cursors = await Cursor.find({}).sort({ key: 1 }).lean();
        expect(cursors.map((c) => c.key)).toEqual(device.watchKeys.slice().sort());
        expect(cursors.every((c) => c.seededAt === null && c.nextCheckAt.getTime() <= Date.now())).toBe(true);
    });

    it("rejects a replay of an accepted request (401 stale_request)", async () => {
        const res = await register(firstRegistration);
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "stale_request", message: "issuedAt must be newer than the current registration" });
    });

    it("re-registering replaces the addresses, rotates the secret and keeps the registration time of kept accounts", async () => {
        const before = await Device.findOne({ pushSubscriptionId }).lean();
        const ethSince = before.addresses.find((a) => a.network === "ethereum").since.getTime();

        const res = await register(
            await body({
                issuedAt: new Date(Date.now() + 1000).toISOString(),
                addresses: { ethereum: wallet.address, bitcoin: "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h" },
            })
        );

        expect(res.status).toBe(200);
        expect(res.body.data.watching).toEqual(["bitcoin", "ethereum"]);
        expect(res.body.data.deviceId).toBe(String(before._id));
        expect(res.body.data.deviceSecret).not.toBe(firstSecret);

        const after = await Device.findOne({ pushSubscriptionId }).lean();
        expect(after.addresses.map((a) => a.network)).toEqual(["bitcoin", "ethereum"]);
        expect(after.addresses.find((a) => a.network === "ethereum").since.getTime()).toBe(ethSince);
        expect(after.addresses.find((a) => a.network === "bitcoin").since.getTime()).toBeGreaterThan(ethSince);
        expect(after.secretHash).toBe(sha256(res.body.data.deviceSecret));
        expect(await Device.countDocuments({ pushSubscriptionId })).toBe(1);
        expect(await Cursor.countDocuments({ key: "bitcoin:bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h" })).toBe(1);

        // the rotated-out secret no longer works
        const stale = await unregister(firstSecret);
        expect(stale.status).toBe(401);
        expect(stale.body.error).toBe("invalid_secret");
        firstSecret = res.body.data.deviceSecret;
    });

    it("401 invalid_signature reaches the client as the contract body (not the generic JWT message)", async () => {
        const res = await register(await body({ signer: Wallet.createRandom(), issuedAt: new Date(Date.now() + 2000).toISOString() }));
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "invalid_signature", message: "signature does not match addresses.ethereum" });
    });

    it("401 stale_request when issuedAt is more than 10 minutes off", async () => {
        const res = await register(await body({ issuedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString() }));
        expect(res.status).toBe(401);
        expect(res.body.error).toBe("stale_request");
    });

    it("400 invalid_request for an address that is not valid for its network (after the signature check)", async () => {
        const res = await register(
            await body({ issuedAt: new Date(Date.now() + 3000).toISOString(), addresses: { ethereum: wallet.address, sui: "0x1234" } })
        );
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "invalid_request", message: "addresses.sui is not a valid sui address" });
    });

    it("unregister needs X-Device-Secret, removes the device once, then answers removed: false", async () => {
        expect((await unregister()).status).toBe(401);
        expect((await unregister("00".repeat(32))).body.error).toBe("invalid_secret");

        const removed = await unregister(firstSecret);
        expect(removed.status).toBe(200);
        expect(removed.body).toEqual({ data: { removed: true } });
        expect(await Device.countDocuments({ pushSubscriptionId })).toBe(0);

        const again = await unregister(firstSecret);
        expect(again.status).toBe(200);
        expect(again.body).toEqual({ data: { removed: false } });
    });

    it("only one watcher holds the lease; the other idles until it is released", async () => {
        const first = new TxWatcher({ holder: "watcher-a", dryRun: true, log: silentLog });
        const second = new TxWatcher({ holder: "watcher-b", dryRun: true, log: silentLog });

        expect(await first.acquireLease()).toBe(true);
        expect(await second.acquireLease()).toBe(false);
        expect(await first.acquireLease()).toBe(true); // renewal
        await first.releaseLease();
        expect(await second.acquireLease()).toBe(true);
        expect(await first.acquireLease()).toBe(false);
        await second.releaseLease();
    });

    it("dispatch claims each transfer once per device: a second pass sends nothing (dry run, no OneSignal call)", async () => {
        const watcher = new TxWatcher({ holder: "watcher-dispatch", dryRun: true, log: silentLog });
        const device = { _id: new mongoose.Types.ObjectId(), pushSubscriptionId: crypto.randomUUID(), language: "en", addresses: [] };
        const now = Date.now();
        const transfers = [1, 2, 3, 4, 5].map((i) => ({
            network: "solana",
            hash: `sig-${i}`,
            amount: "1",
            asset: "SOL",
            from: "9G9mRm2U4ycEfJCkuMvQSYLXiQNekUnFKsbAorK7S36u",
            timestampMs: now - i * 1000,
            native: true,
        }));
        const plans = [{ device, individual: transfers.slice(0, 3), summarized: transfers.slice(3) }];

        const first = await watcher.dispatch(plans);
        expect(first).toEqual({ dry_run: 4 }); // 3 individual + 1 summary

        const rows = await PushLog.find({ pushSubscriptionId: device.pushSubscriptionId }).lean();
        expect(rows.filter((r) => r.kind === "individual").map((r) => r.status)).toEqual(["dry_run", "dry_run", "dry_run"]);
        expect(rows.filter((r) => r.kind === "summarized")).toHaveLength(2);
        const summary = rows.find((r) => r.kind === "summary");
        expect(summary.payload.contents.en).toBe("You received 2 new transactions");
        expect(JSON.stringify(rows)).not.toContain("9G9mRm2U4ycEfJCkuMvQSYLXiQNekUnFKsbAorK7S36u");

        const second = await watcher.dispatch(plans);
        expect(second).toEqual({});
        expect(await PushLog.countDocuments({ pushSubscriptionId: device.pushSubscriptionId })).toBe(rows.length);
    });
});
