const TagAddressIndex = require("../../Repositories/Tags/modules/tag-address-index.module");
const { expandPackedAddresses } = require("../../Repositories/Tags/modules/tags-addresses.module");

// qa99.zelf as stored on Arweave: TON only exists inside the packed `addresses2` tag (#540).
const QA99_TON_EQ = "EQDSMp6iTSQkQYqi9TfHLyYa-EwGdD1MH-4AQliWeII0V_8K";
const qa99ArweavePublicData = () => ({
    zelfName: "qa99.zelf",
    domain: "zelf",
    ethAddress: "0xB8aB5d8c0a32410653C98adE00E0a202fdCe2117",
    solanaAddress: "E5zQvcpuRdtcwZfRxBKHLgnUQRf6wCsYBf75Lix5upEG",
    addresses: JSON.stringify({
        btc: "bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl",
        sui: "0x31c683e390b7ac0abb32c49c895f65f8c31995069ad96837260d4325191d5890",
        xlm: "GDBZ3T3IS5KQA2BE7AYDNIAKQIKH23CJT7AUGTWMSE2YEWE5EO3JRDQX",
    }),
    addresses2: JSON.stringify({
        dot: "13QEUFdyedm9SUt15yZCCJ3mejjSRqkTrh2okWZYhd388bni",
        ksm: "EyYzEinRDWbkbgvu3KEx6acwi22YD1WEa94ysr9dLE6hEAG",
        ton: QA99_TON_EQ,
    }),
});

const nonBounceable = (eq) => require("@ton/core").Address.parse(eq).toString({ bounceable: false, urlSafe: true });
const raw = (eq) => require("@ton/core").Address.parse(eq).toRawString();

describe("tag-address-index", () => {
    it("stores one canonical value for every spelling of a TON account", () => {
        const expected = raw(QA99_TON_EQ);

        expect(TagAddressIndex.canonicalValue("tonAddress", QA99_TON_EQ)).toBe(expected);
        expect(TagAddressIndex.canonicalValue("tonAddress", nonBounceable(QA99_TON_EQ))).toBe(expected);
        expect(TagAddressIndex.canonicalValue("tonAddress", expected)).toBe(expected);
        expect(TagAddressIndex.canonicalValue("tonAddress", "not-a-ton-address")).toBeNull();
    });

    it("indexes packed-only fields of an Arweave record without touching the record", () => {
        const publicData = qa99ArweavePublicData();
        const entries = TagAddressIndex.entriesForRecord({ id: "arweave-tx", publicData });

        expect(entries).toEqual(
            expect.arrayContaining([
                { key: "tonAddress", value: raw(QA99_TON_EQ), tagName: "qa99.zelf" },
                { key: "dotAddress", value: "13QEUFdyedm9SUt15yZCCJ3mejjSRqkTrh2okWZYhd388bni", tagName: "qa99.zelf" },
                { key: "ksmAddress", value: "EyYzEinRDWbkbgvu3KEx6acwi22YD1WEa94ysr9dLE6hEAG", tagName: "qa99.zelf" },
                {
                    key: "suiAddress",
                    value: "0x31c683e390b7ac0abb32c49c895f65f8c31995069ad96837260d4325191d5890",
                    tagName: "qa99.zelf",
                },
            ])
        );
        // ethAddress / solanaAddress are standalone keyvalues: the regular search already finds them.
        expect(entries.map((entry) => entry.key)).not.toContain("ethAddress");
        expect(publicData.tonAddress).toBeUndefined();
    });

    it("maps a .hold copy to the same name so type=both verifies it", () => {
        const [entry] = TagAddressIndex.entriesForRecord({
            publicData: { tagName: "QA94.zelf.hold", addresses2: JSON.stringify({ ton: QA99_TON_EQ }) },
        });

        expect(entry.tagName).toBe("qa94.zelf");
    });

    it("confirms the address against the live record in any spelling and rejects others", () => {
        const publicData = qa99ArweavePublicData();

        expect(TagAddressIndex.recordHasAddress(publicData, "tonAddress", QA99_TON_EQ)).toBe(true);
        expect(TagAddressIndex.recordHasAddress(publicData, "tonAddress", nonBounceable(QA99_TON_EQ))).toBe(true);
        expect(TagAddressIndex.recordHasAddress(publicData, "tonAddress", raw(QA99_TON_EQ))).toBe(true);
        expect(TagAddressIndex.recordHasAddress(publicData, "polkadotAddress", "13QEUFdyedm9SUt15yZCCJ3mejjSRqkTrh2okWZYhd388bni")).toBe(
            true
        );
        // Another wallet's TON address must never resolve to qa99.
        expect(
            TagAddressIndex.recordHasAddress(publicData, "tonAddress", "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N")
        ).toBe(false);
        expect(TagAddressIndex.recordHasAddress({ zelfName: "qa99.zelf" }, "tonAddress", QA99_TON_EQ)).toBe(false);
    });

    it("only claims keys the regular search cannot reach", () => {
        expect(TagAddressIndex.supportsKey("tonAddress")).toBe(true);
        expect(TagAddressIndex.supportsKey("kusamaAddress")).toBe(true);
        expect(TagAddressIndex.supportsKey("ethAddress")).toBe(false);
        expect(TagAddressIndex.supportsKey("solanaAddress")).toBe(false);
    });

    it("restores addresses a metadata-only re-pin dropped, from the same wallet's older records", () => {
        // Newest qa99 Arweave record after the 2026-08-04 v3 re-pin: metadata only, no address.
        const repinned = { zelfName: "qa99.zelf", domain: "zelf", plan: "unlimited", v: 3 };
        const ipfsAfterRepin = { zelfName: "qa99.zelf", btcAddress: "bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl", v: 3 };
        const merged = { ...repinned, ...ipfsAfterRepin };

        TagAddressIndex.hydrateMissingAddresses(merged, [{ publicData: ipfsAfterRepin }, { publicData: repinned }, { publicData: qa99ArweavePublicData() }]);

        expect(merged.tonAddress).toBe(QA99_TON_EQ);
        expect(merged.dotAddress).toBe("13QEUFdyedm9SUt15yZCCJ3mejjSRqkTrh2okWZYhd388bni");
        expect(merged.solanaAddress).toBe("E5zQvcpuRdtcwZfRxBKHLgnUQRf6wCsYBf75Lix5upEG");
        expect(merged.btcAddress).toBe("bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl");
    });

    it("never gives a re-registered name the previous owner's addresses", () => {
        const newOwner = {
            zelfName: "qa99.zelf",
            ethAddress: "0x1111111111111111111111111111111111111111",
            solanaAddress: "So11111111111111111111111111111111111111112",
        };

        TagAddressIndex.hydrateMissingAddresses(newOwner, [{ publicData: qa99ArweavePublicData() }]);

        expect(newOwner.tonAddress).toBeUndefined();
        expect(newOwner.btcAddress).toBeUndefined();
    });

    it("keeps an explicit, newer address instead of an older one of the same wallet", () => {
        const repaired = { ...qa99ArweavePublicData(), addresses2: undefined, tonAddress: "EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N" };

        TagAddressIndex.hydrateMissingAddresses(repaired, [{ publicData: qa99ArweavePublicData() }]);

        expect(repaired.tonAddress).toBe("EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N");
        expect(repaired.dotAddress).toBe("13QEUFdyedm9SUt15yZCCJ3mejjSRqkTrh2okWZYhd388bni");
    });

    it("expands packed chunks for clients but keeps explicit fields and the chunks", () => {
        const publicData = { ...qa99ArweavePublicData(), tonAddress: "explicit-wins" };

        expandPackedAddresses(publicData);

        expect(publicData.tonAddress).toBe("explicit-wins");
        expect(publicData.dotAddress).toBe("13QEUFdyedm9SUt15yZCCJ3mejjSRqkTrh2okWZYhd388bni");
        expect(publicData.btcAddress).toBe("bc1qzsqe0vr9dqnmhnnsd05z3uhfj23z5d8ty4v4zl");
        expect(publicData.addresses2).toBeDefined();
    });
});
