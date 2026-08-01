const {
    normalizePreparedTransaction,
    normalizeSignature,
} = require("../../Repositories/Canton/modules/canton-transfer.module");

describe("Canton external signing payloads", () => {
    it("normalizes a prepared transaction without discarding SDK metadata", () => {
        expect(
            normalizePreparedTransaction({
                preparedTransaction: "  transaction-payload  ",
                preparedTransactionHash: "  transaction-hash  ",
                hashingSchemeVersion: "HASHING_SCHEME_VERSION_V3",
            })
        ).toEqual({
            preparedTransaction: "transaction-payload",
            preparedTransactionHash: "transaction-hash",
            hashingSchemeVersion: "HASHING_SCHEME_VERSION_V3",
        });
    });

    it("rejects incomplete prepared transactions", () => {
        expect(() => normalizePreparedTransaction(null)).toThrow(/prepared_transaction_invalid/);
        expect(() => normalizePreparedTransaction({ preparedTransaction: "payload" })).toThrow(
            /prepared_transaction_invalid/
        );
    });

    it("accepts base64 and base64url signatures and rejects malformed input", () => {
        expect(normalizeSignature(" ZmFrZS1zaWduYXR1cmU= ")).toBe("ZmFrZS1zaWduYXR1cmU=");
        expect(normalizeSignature("fake_signature-value")).toBe("fake_signature-value");
        expect(() => normalizeSignature("not a signature!")).toThrow(/signature_invalid/);
    });
});
