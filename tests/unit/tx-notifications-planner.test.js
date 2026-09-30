/**
 * Who gets which push (Zelf #566 §4): registration-time rule, 24 h cap,
 * zero/dust filter, per-device dedupe and flood control. Pure logic.
 */
const { minTimestampFor, passesValueFilter, planDeliveries } = require("../../Repositories/TxNotifications/modules/delivery-planner");
const { compareDecimal, displayAmount, formatUnits, parseUnits } = require("../../Repositories/TxNotifications/modules/amount.util");

const NOW = Date.parse("2026-09-30T15:00:00.000Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const SOL_KEY = "solana:5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9";
const ETH_KEY = "ethereum:0x28c6c06298d514db089934071355e5743bf21d60";
const BSC_KEY = "bsc:0x28c6c06298d514db089934071355e5743bf21d60";

const transfer = (overrides = {}) => ({
    network: "solana",
    hash: `sig-${Math.random().toString(36).slice(2)}`,
    amount: "1.5",
    asset: "SOL",
    from: "9G9mRm2U4ycEfJCkuMvQSYLXiQNekUnFKsbAorK7S36u",
    timestampMs: NOW - 2 * MINUTE,
    native: true,
    ...overrides,
});

const device = (addresses, overrides = {}) => ({
    _id: `device-${Math.random().toString(36).slice(2)}`,
    pushSubscriptionId: `sub-${Math.random().toString(36).slice(2)}`,
    language: "es",
    addresses,
    ...overrides,
});

describe("tx-notifications planner: registration time and 24 h", () => {
    it("a transfer from before the device registered the address is never pushed (seeding)", () => {
        const d = device([{ key: SOL_KEY, since: new Date(NOW - 5 * MINUTE) }]);
        const before = transfer({ timestampMs: NOW - 6 * MINUTE });
        const after = transfer({ timestampMs: NOW - 4 * MINUTE });

        const [plan] = planDeliveries({ transfersByKey: new Map([[SOL_KEY, [before, after]]]), devices: [d], now: NOW });
        expect(plan.individual.map((t) => t.hash)).toEqual([after.hash]);
    });

    it("two devices on one account each use their own registration time", () => {
        const early = device([{ key: SOL_KEY, since: new Date(NOW - HOUR) }]);
        const late = device([{ key: SOL_KEY, since: new Date(NOW - MINUTE) }]);
        const t = transfer({ timestampMs: NOW - 10 * MINUTE });

        const plans = planDeliveries({ transfersByKey: new Map([[SOL_KEY, [t]]]), devices: [early, late], now: NOW });
        expect(plans.map((p) => p.device)).toEqual([early]);
    });

    it("anything older than 24 h is dropped even for an old registration", () => {
        const d = device([{ key: SOL_KEY, since: new Date(NOW - 10 * 24 * HOUR) }]);
        const old = transfer({ timestampMs: NOW - 24 * HOUR - 1 });
        const fresh = transfer({ timestampMs: NOW - 23 * HOUR });

        const [plan] = planDeliveries({ transfersByKey: new Map([[SOL_KEY, [old, fresh]]]), devices: [d], now: NOW });
        expect(plan.individual.map((t) => t.hash)).toEqual([fresh.hash]);
    });

    it("the adapter lookback starts at the oldest registration, never more than 24 h back", () => {
        const devices = [device([{ key: SOL_KEY, since: new Date(NOW - 5 * MINUTE) }]), device([{ key: SOL_KEY, since: new Date(NOW - 2 * MINUTE) }])];
        expect(minTimestampFor(SOL_KEY, devices, NOW)).toBe(NOW - 5 * MINUTE);
        expect(minTimestampFor(SOL_KEY, [device([{ key: SOL_KEY, since: new Date(NOW - 72 * HOUR) }])], NOW)).toBe(NOW - 24 * HOUR);
        expect(minTimestampFor(ETH_KEY, devices, NOW)).toBe(NOW);
    });
});

describe("tx-notifications planner: value filter", () => {
    it("drops zero and negative amounts", () => {
        expect(passesValueFilter(transfer({ amount: "0" }))).toBe(false);
        expect(passesValueFilter(transfer({ amount: "0.000" }))).toBe(false);
        expect(passesValueFilter(transfer({ amount: "-1" }))).toBe(false);
    });

    it("drops native dust below the per-network line and token dust below 0.000001", () => {
        expect(passesValueFilter(transfer({ amount: "0.000001" }))).toBe(false); // 1000 lamports
        expect(passesValueFilter(transfer({ amount: "0.00001" }))).toBe(true);
        expect(passesValueFilter(transfer({ network: "ton", asset: "TON", amount: "0.0001" }))).toBe(false);
        expect(passesValueFilter(transfer({ network: "bitcoin", asset: "BTC", amount: "0.00000545" }))).toBe(false);
        expect(passesValueFilter(transfer({ network: "bitcoin", asset: "BTC", amount: "0.00000546" }))).toBe(true);
        expect(passesValueFilter(transfer({ asset: "USDC", native: false, amount: "0.0000009" }))).toBe(false);
        expect(passesValueFilter(transfer({ asset: "USDC", native: false, amount: "0.01" }))).toBe(true);
    });

    it("keeps transfers whose amount is unknown (Stellar merge)", () => {
        expect(passesValueFilter(transfer({ network: "stellar", asset: "XLM", amount: null }))).toBe(true);
    });
});

describe("tx-notifications planner: dedupe and flood control", () => {
    it("one transfer is pushed once per device even if two of its addresses saw it", () => {
        const d = device([
            { key: SOL_KEY, since: new Date(NOW - HOUR) },
            { key: "solana:other", since: new Date(NOW - HOUR) },
        ]);
        const t = transfer();
        const [plan] = planDeliveries({ transfersByKey: new Map([[SOL_KEY, [t]], ["solana:other", [{ ...t }]]]), devices: [d], now: NOW });
        expect(plan.individual).toHaveLength(1);
        expect(plan.summarized).toHaveLength(0);
    });

    it("the same hash on two networks is two transfers", () => {
        const d = device([
            { key: ETH_KEY, since: new Date(NOW - HOUR) },
            { key: BSC_KEY, since: new Date(NOW - HOUR) },
        ]);
        const eth = transfer({ network: "ethereum", asset: "ETH", hash: "0xabc", amount: "1" });
        const bsc = transfer({ network: "bsc", asset: "BNB", hash: "0xabc", amount: "1" });
        const [plan] = planDeliveries({ transfersByKey: new Map([[ETH_KEY, [eth]], [BSC_KEY, [bsc]]]), devices: [d], now: NOW });
        expect(plan.individual).toHaveLength(2);
    });

    it("at most 3 individual pushes per cycle (oldest first), the rest in one summary", () => {
        const d = device([
            { key: SOL_KEY, since: new Date(NOW - HOUR) },
            { key: ETH_KEY, since: new Date(NOW - HOUR) },
        ]);
        const sol = [1, 2, 3, 4].map((i) => transfer({ hash: `s${i}`, timestampMs: NOW - (10 - i) * MINUTE }));
        const eth = [5, 6].map((i) => transfer({ network: "ethereum", asset: "ETH", hash: `e${i}`, timestampMs: NOW - (10 - i) * MINUTE, amount: "1" }));

        const [plan] = planDeliveries({ transfersByKey: new Map([[SOL_KEY, sol], [ETH_KEY, eth]]), devices: [d], now: NOW, maxIndividual: 3 });
        expect(plan.individual.map((t) => t.hash)).toEqual(["s1", "s2", "s3"]);
        expect(plan.summarized.map((t) => t.hash)).toEqual(["s4", "e5", "e6"]);
    });

    it("devices with nothing new get no plan", () => {
        const d = device([{ key: ETH_KEY, since: new Date(NOW - HOUR) }]);
        expect(planDeliveries({ transfersByKey: new Map([[SOL_KEY, [transfer()]]]), devices: [d], now: NOW })).toEqual([]);
    });
});

describe("tx-notifications amounts", () => {
    it("formats raw units exactly, without float rounding", () => {
        expect(formatUnits("1500000", 6)).toBe("1.5");
        expect(formatUnits("1000000000000000000", 18)).toBe("1");
        expect(formatUnits("550416999999999972474880000", 21)).toBe("550416.99999999997247488");
        expect(formatUnits("0x10de17989", 6)).toBe("4527.847817");
        expect(formatUnits(1, 9)).toBe("0.000000001");
        expect(formatUnits(0n, 8)).toBe("0");
    });

    it("parses and compares decimal strings", () => {
        expect(parseUnits("1.5", 6)).toBe(1500000n);
        expect(parseUnits("0.1234567", 6)).toBe(123456n);
        expect(compareDecimal("0.00001", "0.000010")).toBe(0);
        expect(compareDecimal("10", "9.99999")).toBe(1);
    });

    it("shortens for display to 8 decimals but never down to zero", () => {
        expect(displayAmount("550416.99999999997247488")).toBe("550416.99999999");
        expect(displayAmount("1.844217")).toBe("1.844217");
        expect(displayAmount("0.000000001")).toBe("0.000000001");
        expect(displayAmount("12.50000000")).toBe("12.5");
        expect(displayAmount("abc")).toBeNull();
    });
});
