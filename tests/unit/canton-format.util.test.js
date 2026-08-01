const {
    atomicToDecimal,
    decimalToAtomic,
    normalizeCcAmount,
    normalizeHoldings,
    normalizePartyId,
    normalizeTransactions,
} = require("../../Repositories/Canton/modules/canton-format.util");

const ALICE = "alice::12201acb807c49aceaeb68b1d89bb3bea95fe740b4b0a6cca428e6a351c2450540f4";
const BOB = "bob::1220447e99360f4e11caf7be818b96ead2a23c593eb927f792ae5f0a0bc15b264783";
const ADMIN = "DSO::1220294d264ccf205000d72d9f0106e3a0e8ce8d34982d7f134c42d42d18750ccd36";

describe("Canton formatting", () => {
    it("validates documented Canton party identifiers", () => {
        expect(normalizePartyId(ALICE)).toBe(ALICE);
        expect(() => normalizePartyId("0x1234")).toThrow(/party_id_invalid/);
        expect(() => normalizePartyId("alice::invalid")).toThrow(/party_id_invalid/);
    });

    it("converts Canton decimal amounts exactly", () => {
        expect(decimalToAtomic("1.23456789")).toBe(12345678900n);
        expect(atomicToDecimal(12345678900n)).toBe("1.23456789");
        expect(normalizeCcAmount("0001.2500000000")).toBe("1.25");
        expect(() => normalizeCcAmount("0.00000000001")).toThrow(/amount_invalid/);
        expect(() => normalizeCcAmount("0", { allowZero: false })).toThrow(/greater_than_zero/);
    });

    it("groups unlocked and locked Token Standard holdings", () => {
        const holdings = [
            {
                contractId: "01",
                interfaceViewValue: {
                    amount: "12.5",
                    instrumentId: { id: "Amulet", admin: ADMIN },
                    lock: null,
                },
            },
            {
                contractId: "02",
                interfaceViewValue: {
                    amount: "2.25",
                    instrumentId: { id: "Amulet", admin: ADMIN },
                    lock: { expiresAt: "2030-01-01T00:00:00.000Z" },
                },
            },
        ];

        expect(normalizeHoldings(holdings, new Date("2026-01-01T00:00:00.000Z"))).toEqual([
            expect.objectContaining({
                symbol: "CC",
                balance: "14.75",
                availableBalance: "12.5",
                lockedBalance: "2.25",
                utxoCount: 2,
            }),
        ]);
    });

    it("normalizes party-scoped transfer history", () => {
        const result = normalizeTransactions(
            {
                nextOffset: 20,
                transactions: [
                    {
                        updateId: "update-1",
                        offset: 19,
                        recordTime: "2026-08-01T00:00:00Z",
                        synchronizerId: "global",
                        events: [
                            {
                                label: {
                                    type: "TransferOut",
                                    receiverAmounts: [{ receiver: BOB, amount: "3.5" }],
                                    burnAmount: "0",
                                    reason: "qa",
                                },
                            },
                        ],
                    },
                ],
            },
            ALICE
        );

        expect(result).toEqual({
            nextOffset: 20,
            transactions: [
                expect.objectContaining({
                    updateId: "update-1",
                    direction: "out",
                    from: ALICE,
                    to: BOB,
                    amount: "3.5",
                    memo: "qa",
                }),
            ],
        });
    });
});
