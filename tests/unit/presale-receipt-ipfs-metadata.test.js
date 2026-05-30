const {
    PINATA_KEYVALUE_MAX_COUNT,
    PINATA_KEYVALUE_MAX_LENGTH,
    buildPresaleReceiptIpfsMetadata,
    parseReceiptSummary,
    validatePresaleReceiptMetadata,
} = require("../../Repositories/PreSale/modules/presale-receipt-ipfs-metadata.util");

describe("presale receipt IPFS metadata", () => {
    const sampleInput = {
        sessionId: "cs_test_abc123",
        details: { email: "buyer@example.com", amount: 500 },
        totalTokens: 11000,
        bonusPercentage: 10,
        released: true,
        address: "So11111111111111111111111111111111111111112",
        signature: "x".repeat(88),
        zelfName: "alice.zelf",
        licenseExtension: {
            extended: true,
            years: 2,
            expiresAt: "2028-05-30T00:00:00.000Z",
            tagName: "alice",
            domain: "zelf",
        },
    };

    it("builds 8 keys (under Pinata max of 9)", () => {
        const metadata = buildPresaleReceiptIpfsMetadata(sampleInput);
        expect(Object.keys(metadata).length).toBe(8);
        expect(Object.keys(metadata).length).toBeLessThanOrEqual(PINATA_KEYVALUE_MAX_COUNT);
        expect(Object.keys(metadata)).toEqual([
            "type",
            "presaleSessionId",
            "presaleEmail",
            "presaleZelfName",
            "presaleSolanaAddress",
            "tokensReleased",
            "licenseExtended",
            "receiptSummary",
        ]);
    });

    it("keeps every key and value under Pinata length limits", () => {
        const metadata = buildPresaleReceiptIpfsMetadata(sampleInput);
        expect(() => validatePresaleReceiptMetadata(metadata)).not.toThrow();

        for (const [key, value] of Object.entries(metadata)) {
            expect(key.length).toBeLessThan(PINATA_KEYVALUE_MAX_LENGTH);
            expect(String(value).length).toBeLessThan(PINATA_KEYVALUE_MAX_LENGTH);
        }
    });

    it("round-trips receiptSummary fields", () => {
        const metadata = buildPresaleReceiptIpfsMetadata(sampleInput);
        const parsed = parseReceiptSummary(metadata);

        expect(parsed.amountUSD).toBe(500);
        expect(parsed.totalTokens).toBe(11000);
        expect(parsed.bonusPercentage).toBe(10);
        expect(parsed.transactionSignature).toBe(sampleInput.signature);
        expect(parsed.licenseExtensionYears).toBe(2);
        expect(parsed.licenseExtensionExpiresAt).toBe("2028-05-30T00:00:00.000Z");
        expect(parsed.licenseExtensionTag).toBe("alice.zelf");
    });

    it("throws if someone tries to pin more than 9 keys", () => {
        const valid = buildPresaleReceiptIpfsMetadata(sampleInput);
        expect(Object.keys(valid).length).toBe(8);

        // Deliberately invalid: 10 keys, only to prove validatePresaleReceiptMetadata blocks it.
        const invalidOverflow = { ...valid, overflowA: "x", overflowB: "y" };
        expect(Object.keys(invalidOverflow).length).toBe(10);

        expect(() => validatePresaleReceiptMetadata(invalidOverflow)).toThrow("presale_receipt_metadata_too_many_keys");
    });
});
