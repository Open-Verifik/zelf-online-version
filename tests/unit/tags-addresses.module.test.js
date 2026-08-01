const {
    PINATA_KEYVALUE_MAX_LENGTH,
    ADDRESS_CHUNK_KEYS,
    TOP_LEVEL_ADDRESS_FIELDS,
    SHORT_STORAGE_TO_APP,
    buildAddressBundle,
    buildTopLevelAddressKeyvalues,
    serializeAddressBundleToPinataKeyvalues,
    buildAddressKeyvalues,
    mergeAddressKeyvaluesIntoPublicData,
    getAllChainAddresses,
} = require("../../Repositories/Tags/modules/tags-addresses.module");

const sampleAddresses = {
    ethAddress: "0xeth00000000000000000000000000000000000001",
    solanaAddress: "SoLanA111111111111111111111111111111111111",
    btcAddress: "bc1qbtc000000000000000000000000000000000001",
    arweaveAddress: "ArWeAvE000000000000000000000000000000000001",
    suiAddress: "0xsui0000000000000000000000000000000000000001",
    xlmAddress: "GXLM000000000000000000000000000000000000001",
    tonAddress: "EQBHyu-oZVDHRYQ1-rKlGqpHy5yAqanPBirEQNMNOmfHLotW",
    aptosAddress: "0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf",
};

describe("tags-addresses.module", () => {
    describe("SHORT_STORAGE_TO_APP", () => {
        test("maps all chunk keys to app *Address names", () => {
            expect(SHORT_STORAGE_TO_APP).toEqual({
                btc: "btcAddress",
                arweave: "arweaveAddress",
                sui: "suiAddress",
                ton: "tonAddress",
                aptos: "aptosAddress",
                xlm: "xlmAddress",
                dot: "dotAddress",
                ksm: "ksmAddress",
            });
        });
    });

    describe("TOP_LEVEL_ADDRESS_FIELDS", () => {
        test("eth and solana stay searchable at the top level", () => {
            expect(TOP_LEVEL_ADDRESS_FIELDS).toEqual(["ethAddress", "solanaAddress"]);
        });
    });

    describe("buildAddressBundle", () => {
        test("excludes top-level fields and emits short chunk keys for folded chains", () => {
            const bundle = buildAddressBundle({
                ...sampleAddresses,
                dotAddress: "DOT000000000000000000000000000000000000001",
                ksmAddress: "KSM000000000000000000000000000000000000001",
                emptyAddress: "",
                irrelevant: "value",
            });

            expect(bundle.ethAddress).toBeUndefined();
            expect(bundle.solanaAddress).toBeUndefined();
            expect(bundle.btcAddress).toBeUndefined();
            expect(bundle.btc).toBe(sampleAddresses.btcAddress);
            expect(bundle.arweave).toBe(sampleAddresses.arweaveAddress);
            expect(bundle.sui).toBe(sampleAddresses.suiAddress);
            expect(bundle.xlm).toBe(sampleAddresses.xlmAddress);
            expect(bundle.ton).toBe(sampleAddresses.tonAddress);
            expect(bundle.aptos).toBe(sampleAddresses.aptosAddress);
            expect(bundle.dot).toBe("DOT000000000000000000000000000000000000001");
            expect(bundle.ksm).toBe("KSM000000000000000000000000000000000000001");
            expect(bundle.dotAddress).toBeUndefined();
            expect(bundle.ksmAddress).toBeUndefined();
            expect(bundle.tonAddress).toBeUndefined();
            expect(bundle.aptosAddress).toBeUndefined();
        });

        test("falls back to a short key on the source if the app key is missing", () => {
            expect(buildAddressBundle({ dot: "explicit-dot" }).dot).toBe("explicit-dot");
            expect(buildAddressBundle({ btc: "bc1-explicit" }).btc).toBe("bc1-explicit");
        });

        test("returns an empty object for invalid input", () => {
            expect(buildAddressBundle(null)).toEqual({});
            expect(buildAddressBundle(undefined)).toEqual({});
            expect(buildAddressBundle("string")).toEqual({});
        });
    });

    describe("buildTopLevelAddressKeyvalues", () => {
        test("returns only ethAddress and solanaAddress when set", () => {
            const result = buildTopLevelAddressKeyvalues({
                ...sampleAddresses,
                dotAddress: "DOT123",
            });

            expect(result).toEqual({
                ethAddress: sampleAddresses.ethAddress,
                solanaAddress: sampleAddresses.solanaAddress,
            });
        });

        test("omits empty fields", () => {
            const result = buildTopLevelAddressKeyvalues({ ethAddress: "" });
            expect(result).toEqual({});
        });
    });

    describe("serializeAddressBundleToPinataKeyvalues", () => {
        test("returns no chunks for an empty bundle", () => {
            expect(serializeAddressBundleToPinataKeyvalues({})).toEqual({});
        });

        test("packs a normal-sized bundle into a single chunk under 250 chars", () => {
            const bundle = buildAddressBundle({
                ...sampleAddresses,
                dotAddress: "DOT000000000000000000000000000000000000001",
                ksmAddress: "KSM000000000000000000000000000000000000001",
            });

            const kv = serializeAddressBundleToPinataKeyvalues(bundle);

            for (const value of Object.values(kv)) {
                expect(value.length).toBeLessThanOrEqual(PINATA_KEYVALUE_MAX_LENGTH);
            }
        });

        test("splits across additional chunks when one is not enough", () => {
            const longBundle = {
                btc: "x".repeat(200),
                arweave: "y".repeat(200),
                sui: "z".repeat(200),
            };

            const kv = serializeAddressBundleToPinataKeyvalues(longBundle);

            expect(Object.keys(kv).length).toBeGreaterThan(1);
            for (const [key, value] of Object.entries(kv)) {
                expect(ADDRESS_CHUNK_KEYS).toContain(key);
                expect(value.length).toBeLessThanOrEqual(PINATA_KEYVALUE_MAX_LENGTH);
            }
        });

        test("throws when a single field exceeds the per-keyvalue limit", () => {
            expect(() =>
                serializeAddressBundleToPinataKeyvalues({
                    btc: "x".repeat(PINATA_KEYVALUE_MAX_LENGTH + 1),
                })
            ).toThrow(/tags_addresses_field_too_long/);
        });

        test("throws when more than three chunks would be required", () => {
            const massive = {
                btc: "a".repeat(200),
                arweave: "b".repeat(200),
                sui: "c".repeat(200),
                xlm: "d".repeat(200),
                dot: "e".repeat(200),
                ksm: "f".repeat(200),
            };

            expect(() => serializeAddressBundleToPinataKeyvalues(massive)).toThrow(/tags_addresses_too_many_chunks/);
        });
    });

    describe("buildAddressKeyvalues", () => {
        test("emits eth/solana at the top level and short keys inside address chunks", () => {
            const source = {
                ...sampleAddresses,
                dotAddress: "DOT000000000000000000000000000000000000001",
                ksmAddress: "KSM000000000000000000000000000000000000001",
            };

            const kv = buildAddressKeyvalues(source);

            expect(kv.ethAddress).toBe(source.ethAddress);
            expect(kv.solanaAddress).toBe(source.solanaAddress);
            expect(kv.addresses).toBeDefined();

            const chunkBlob = ADDRESS_CHUNK_KEYS.map((key) => kv[key] || "").join("");

            expect(chunkBlob).not.toContain("ethAddress");
            expect(chunkBlob).not.toContain("solanaAddress");
            expect(chunkBlob).not.toContain("btcAddress");
            expect(chunkBlob).not.toContain("suiAddress");
            expect(chunkBlob).not.toContain("arweaveAddress");
            expect(chunkBlob).not.toContain("xlmAddress");
            expect(chunkBlob).toContain('"btc"');
            expect(chunkBlob).toContain('"arweave"');
            expect(chunkBlob).toContain('"sui"');
            expect(chunkBlob).toContain('"xlm"');
            expect(chunkBlob).toContain('"dot"');
            expect(chunkBlob).toContain('"ksm"');
            expect(chunkBlob).toContain('"ton"');
            expect(chunkBlob).toContain('"aptos"');
            expect(chunkBlob).not.toContain("tonAddress");
            expect(chunkBlob).not.toContain("aptosAddress");
        });

        test("round-trips back to canonical app field names on publicData", () => {
            const source = {
                ...sampleAddresses,
                dotAddress: "DOT000000000000000000000000000000000000001",
                ksmAddress: "KSM000000000000000000000000000000000000001",
            };

            const kv = buildAddressKeyvalues(source);
            const merged = mergeAddressKeyvaluesIntoPublicData({ ...kv });

            expect(merged.ethAddress).toBe(source.ethAddress);
            expect(merged.solanaAddress).toBe(source.solanaAddress);
            expect(merged.btcAddress).toBe(source.btcAddress);
            expect(merged.arweaveAddress).toBe(source.arweaveAddress);
            expect(merged.suiAddress).toBe(source.suiAddress);
            expect(merged.xlmAddress).toBe(source.xlmAddress);
            expect(merged.dotAddress).toBe(source.dotAddress);
            expect(merged.ksmAddress).toBe(source.ksmAddress);
            expect(merged.tonAddress).toBe(source.tonAddress);
            expect(merged.aptosAddress).toBe(source.aptosAddress);
            expect(merged.addresses).toBeUndefined();
            expect(merged.btc).toBeUndefined();
            expect(merged.dot).toBeUndefined();
            expect(merged.ksm).toBeUndefined();
            expect(merged.ton).toBeUndefined();
            expect(merged.aptos).toBeUndefined();
        });
    });

    describe("mergeAddressKeyvaluesIntoPublicData", () => {
        test("expands all short chunk keys back to *Address fields", () => {
            const publicData = {
                ethAddress: "0xeth",
                solanaAddress: "sol",
                addresses: JSON.stringify({
                    arweave: "AR123",
                    dot: "DOT123",
                    ksm: "KSM123",
                }),
            };

            mergeAddressKeyvaluesIntoPublicData(publicData);

            expect(publicData.ethAddress).toBe("0xeth");
            expect(publicData.solanaAddress).toBe("sol");
            expect(publicData.arweaveAddress).toBe("AR123");
            expect(publicData.dotAddress).toBe("DOT123");
            expect(publicData.ksmAddress).toBe("KSM123");
            expect(publicData.arweave).toBeUndefined();
            expect(publicData.dot).toBeUndefined();
            expect(publicData.ksm).toBeUndefined();
            expect(publicData.addresses).toBeUndefined();
        });

        test("merges addresses, addresses2 and addresses3 in order", () => {
            const publicData = {
                addresses: JSON.stringify({ btc: "bc1", sui: "0xsui" }),
                addresses2: JSON.stringify({ arweave: "AR", dot: "DOT" }),
                addresses3: JSON.stringify({ ksm: "KSM" }),
                otherField: "preserved",
            };

            mergeAddressKeyvaluesIntoPublicData(publicData);

            expect(publicData.btcAddress).toBe("bc1");
            expect(publicData.suiAddress).toBe("0xsui");
            expect(publicData.arweaveAddress).toBe("AR");
            expect(publicData.dotAddress).toBe("DOT");
            expect(publicData.ksmAddress).toBe("KSM");
            expect(publicData.addresses).toBeUndefined();
            expect(publicData.addresses2).toBeUndefined();
            expect(publicData.addresses3).toBeUndefined();
            expect(publicData.otherField).toBe("preserved");
        });

        test("legacy chunk JSON with full *Address keys still merges", () => {
            const publicData = {
                addresses: JSON.stringify({ btcAddress: "bc1legacy", suiAddress: "0xlegacy" }),
            };

            mergeAddressKeyvaluesIntoPublicData(publicData);

            expect(publicData.btcAddress).toBe("bc1legacy");
            expect(publicData.suiAddress).toBe("0xlegacy");
            expect(publicData.addresses).toBeUndefined();
        });

        test("ignores unparseable chunks instead of throwing", () => {
            const publicData = { addresses: "not-json", addresses2: undefined };

            expect(() => mergeAddressKeyvaluesIntoPublicData(publicData)).not.toThrow();
            expect(publicData.addresses).toBeUndefined();
        });

        test("returns input unchanged for invalid types", () => {
            expect(mergeAddressKeyvaluesIntoPublicData(null)).toBeNull();
            expect(mergeAddressKeyvaluesIntoPublicData("nope")).toBe("nope");
        });
    });

    describe("getAllChainAddresses", () => {
        test("returns canonical app field names for every chain", () => {
            const { btcAddress: _omitBtc, ...withoutBtc } = sampleAddresses;
            const result = getAllChainAddresses({
                ...withoutBtc,
                btc: "bc1-short",
                dot: "DOT123",
                ksmAddress: "KSM123",
            });

            expect(result.ethAddress).toBe(sampleAddresses.ethAddress);
            expect(result.solanaAddress).toBe(sampleAddresses.solanaAddress);
            expect(result.btcAddress).toBe("bc1-short");
            expect(result.arweaveAddress).toBe(sampleAddresses.arweaveAddress);
            expect(result.suiAddress).toBe(sampleAddresses.suiAddress);
            expect(result.xlmAddress).toBe(sampleAddresses.xlmAddress);
            expect(result.dotAddress).toBe("DOT123");
            expect(result.ksmAddress).toBe("KSM123");
            expect(result.aptosAddress).toBe(sampleAddresses.aptosAddress);
            expect(result.btc).toBeUndefined();
            expect(result.dot).toBeUndefined();
            expect(result.ksm).toBeUndefined();
        });

        test("does not include empty fields", () => {
            const result = getAllChainAddresses({ ethAddress: "" });
            expect(result).toEqual({});
        });
    });
});
