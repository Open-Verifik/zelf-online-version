const {
    normalizePreparedTransaction,
    normalizeSignature,
    verifyPreparedTransaction,
} = require("../../Repositories/Canton/modules/canton-transfer.module");

const TEST_PARTY = "alice::12201acb807c49aceaeb68b1d89bb3bea95fe740b4b0a6cca428e6a351c2450540f4";
const OTHER_PARTY = "bob::1220447e99360f4e11caf7be818b96ead2a23c593eb927f792ae5f0a0bc15b264783";

const buildPreparedTransaction = async (partyId = TEST_PARTY) => {
    const { PreparedTransaction } = require("@canton-network/core-ledger-proto");
    const { hashPreparedTransaction } = require("@canton-network/core-tx-visualizer");
    const transaction = PreparedTransaction.create({
        transaction: { version: "1", roots: [], nodes: [], nodeSeeds: [] },
        metadata: {
            submitterInfo: { actAs: [partyId], commandId: "zelf-test" },
            synchronizerId: "zelf-test-sync",
            mediatorGroup: 0,
            transactionUuid: "zelf-test-transaction",
            preparationTime: 1n,
            inputContracts: [],
        },
    });
    const preparedTransaction = Buffer.from(PreparedTransaction.toBinary(transaction)).toString("base64");
    const preparedTransactionHash = await hashPreparedTransaction(preparedTransaction, "base64");

    return {
        preparedTransaction,
        preparedTransactionHash,
        hashingSchemeVersion: "HASHING_SCHEME_VERSION_V2",
    };
};

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

    it("recomputes the prepared transaction hash and validates the signing party", async () => {
        const prepared = await buildPreparedTransaction();

        await expect(verifyPreparedTransaction(prepared, TEST_PARTY)).resolves.toEqual(prepared);
    });

    it("rejects a modified hash and a party that is not authorized by actAs", async () => {
        const prepared = await buildPreparedTransaction();

        await expect(
            verifyPreparedTransaction({ ...prepared, preparedTransactionHash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" }, TEST_PARTY)
        ).rejects.toThrow(/hash_mismatch/);
        await expect(verifyPreparedTransaction(prepared, OTHER_PARTY)).rejects.toThrow(/party_mismatch/);
    });
});
