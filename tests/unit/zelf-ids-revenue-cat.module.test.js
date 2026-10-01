jest.mock("../../Repositories/Tags/config/supported-domains", () => ({
    getDomainConfig: jest.fn(() => ({ getTagKey: () => "tagName" })),
}));

jest.mock("../../Repositories/ZelfID/modules/zelf-id.module", () => ({
    searchTag: jest.fn(),
}));

jest.mock("../../Repositories/ZelfID/modules/my-zelf-id.module", () => ({
    addDurationToTag: jest.fn(),
}));

jest.mock("../../Repositories/Tags/modules/tag-smart-contract-payment.module", () => ({
    throwPaymentConfirmationTagNotFound: jest.fn(() => {
        throw new Error("404:tag_not_found");
    }),
}));

const ZelfIdModule = require("../../Repositories/ZelfID/modules/zelf-id.module");
const { addDurationToTag } = require("../../Repositories/ZelfID/modules/my-zelf-id.module");
const {
    parseZelfIdProductId,
    productCoversNameLength,
    resolveNameFromAttributes,
    inspectRevenueCatEvent,
    alreadyAppliedToRecord,
    confirmRevenueCatPurchase,
} = require("../../Repositories/ZelfID/modules/zelf-ids-revenue-cat.module");

const OWNER = "0xAbC0000000000000000000000000000000000001";
const PURCHASED_AT_MS = Date.parse("2026-09-29T21:01:00Z");

const rcEvent = (overrides = {}, attributes = {}) => ({
    type: "NON_RENEWING_PURCHASE",
    id: "evt_1",
    app_id: "app_1",
    product_id: "zelf_name_service_char_6_to_15_years_1",
    period_type: "NORMAL",
    transaction_id: "GPA.1",
    environment: "PRODUCTION",
    currency: "USD",
    price: 24,
    purchased_at_ms: PURCHASED_AT_MS,
    subscriber_attributes: {
        zelfName: { value: "alicebob.zelf", updated_at_ms: PURCHASED_AT_MS },
        ethAddress: { value: OWNER, updated_at_ms: PURCHASED_AT_MS },
        duration: { value: "1", updated_at_ms: PURCHASED_AT_MS },
        ...Object.fromEntries(Object.entries(attributes).map(([k, v]) => [k, { value: v, updated_at_ms: PURCHASED_AT_MS }])),
    },
    ...overrides,
});

describe("parseZelfIdProductId", () => {
    test("reads Google Play, App Store and package ids from the live offering", () => {
        expect(parseZelfIdProductId("zelf_name_service_char_6_to_15_years_3")).toEqual({ minLength: 6, maxLength: 15, duration: "3" });
        expect(parseZelfIdProductId("zelf_name_service_char_1_years_2")).toEqual({ minLength: 1, maxLength: 1, duration: "2" });
        expect(parseZelfIdProductId("zns_char_27_years_1")).toEqual({ minLength: 27, maxLength: 27, duration: "1" });
        expect(parseZelfIdProductId("zns_6_to_15_char_1_year")).toEqual({ minLength: 6, maxLength: 15, duration: "1" });
        expect(parseZelfIdProductId("zns_4_char_lifetime_year")).toEqual({ minLength: 4, maxLength: 4, duration: "lifetime" });
        expect(parseZelfIdProductId("zelf_name_service_char_5_years_1:base-plan")).toEqual({ minLength: 5, maxLength: 5, duration: "1" });
    });

    test("rejects Zelf Keys subscriptions and out-of-range terms", () => {
        expect(parseZelfIdProductId("zelf_keys_plan_pro")).toBeNull();
        expect(parseZelfIdProductId("zns_char_6_years_6")).toBeNull();
        expect(parseZelfIdProductId("zns_char_28_years_1")).toBeNull();
        expect(parseZelfIdProductId("")).toBeNull();
    });
});

describe("productCoversNameLength", () => {
    test("a product for N+ characters pays for names of N or more characters only", () => {
        const sixToFifteen = parseZelfIdProductId("zns_char_6_to_15_years_1");
        expect(productCoversNameLength(sixToFifteen, 6)).toBe(true);
        expect(productCoversNameLength(sixToFifteen, 20)).toBe(true);
        expect(productCoversNameLength(sixToFifteen, 5)).toBe(false);
        expect(productCoversNameLength(parseZelfIdProductId("zns_char_27_years_1"), 1)).toBe(false);
        expect(productCoversNameLength(parseZelfIdProductId("zns_char_1_years_1"), 1)).toBe(true);
    });
});

describe("resolveNameFromAttributes", () => {
    test("splits zelfName and strips a reservation suffix", () => {
        expect(resolveNameFromAttributes({ zelfName: "ABC.zelf.hold" })).toEqual({ tagName: "abc", domain: "zelf" });
        expect(resolveNameFromAttributes({ zelfName: "alice.bdag" })).toEqual({ tagName: "alice", domain: "bdag" });
        expect(resolveNameFromAttributes({ tagName: "alice", domain: "zelf" })).toEqual({ tagName: "alice", domain: "zelf" });
    });
});

describe("inspectRevenueCatEvent", () => {
    test("derives the term from the product, not from the duration attribute", () => {
        const inspected = inspectRevenueCatEvent(rcEvent({}, { duration: "5" }));
        expect(inspected).toMatchObject({ ok: true, tagName: "alicebob", domain: "zelf", duration: "1", plan: "premium", price: 24 });
    });

    test("short names are stamped unlimited", () => {
        const inspected = inspectRevenueCatEvent(
            rcEvent({ product_id: "zns_char_3_years_1" }, { zelfName: "abc.zelf" })
        );
        expect(inspected).toMatchObject({ ok: true, tagName: "abc", plan: "unlimited", duration: "1" });
    });

    test("skips events that are not Zelf ID purchases", () => {
        expect(inspectRevenueCatEvent(rcEvent({ type: "INITIAL_PURCHASE" })).reason).toBe("ignored_event_type");
        expect(inspectRevenueCatEvent(rcEvent({ product_id: "zelf_keys_plan" })).reason).toBe("not_zelf_id_product");
    });

    test("sandbox purchases are not credited unless allowed", () => {
        expect(inspectRevenueCatEvent(rcEvent({ environment: "SANDBOX" })).reason).toBe("sandbox_event");
        expect(inspectRevenueCatEvent(rcEvent({ environment: "SANDBOX" }), { allowSandbox: true }).ok).toBe(true);
    });

    test("a cheap long-name product cannot pay for a short name", () => {
        const inspected = inspectRevenueCatEvent(rcEvent({ product_id: "zelf_name_service_char_27_years_1" }, { zelfName: "a.zelf" }));
        expect(inspected).toMatchObject({ ok: false, reason: "product_does_not_cover_name" });
    });

    test("requires the name and owner attributes", () => {
        const noName = rcEvent();
        delete noName.subscriber_attributes.zelfName;
        expect(inspectRevenueCatEvent(noName).reason).toBe("zelf_name_missing");

        const noOwner = rcEvent();
        delete noOwner.subscriber_attributes.ethAddress;
        expect(inspectRevenueCatEvent(noOwner).reason).toBe("eth_address_missing");
    });
});

describe("alreadyAppliedToRecord", () => {
    test("matches a stored event id or a rewrite after the purchase time", () => {
        const inspected = { eventId: "evt_1", purchasedAtMs: PURCHASED_AT_MS };
        expect(alreadyAppliedToRecord({ eventID: "evt_1" }, inspected)).toBe(true);
        expect(alreadyAppliedToRecord({ renewedAt: "2026-09-30 10:00:00" }, inspected)).toBe(true);
        expect(alreadyAppliedToRecord({ registeredAt: "2026-09-01 10:00:00" }, inspected)).toBe(false);
        expect(alreadyAppliedToRecord({}, { eventId: "", purchasedAtMs: null })).toBe(false);
        // A different stored event id means another purchase wrote the record: apply this one.
        expect(alreadyAppliedToRecord({ eventID: "evt_0", renewedAt: "2026-09-30 10:00:00" }, inspected)).toBe(false);
    });
});

describe("confirmRevenueCatPurchase", () => {
    beforeEach(() => {
        ZelfIdModule.searchTag.mockReset();
        addDurationToTag.mockReset();
    });

    test("extends the Zelf ID with the product term and v4 plan", async () => {
        ZelfIdModule.searchTag.mockResolvedValue({
            available: false,
            tagObject: {
                publicData: {
                    tagName: "alicebob.zelf",
                    ethAddress: OWNER.toLowerCase(),
                    registeredAt: "2026-09-01 10:00:00",
                    plan: "free",
                },
            },
        });
        addDurationToTag.mockResolvedValue({ expiresAt: "2027-09-29 21:01:00" });

        const result = await confirmRevenueCatPurchase(rcEvent({ product_id: "zelf_name_service_char_6_to_15_years_3" }));

        expect(result).toMatchObject({ status: "success", action: "zelf_id_lease_extended", duration: "3", plan: "premium" });
        expect(addDurationToTag).toHaveBeenCalledWith(
            expect.objectContaining({ tagName: "alicebob", domain: "zelf", duration: 3, plan: "premium", price: 24, eventID: "evt_1" }),
            expect.any(Object)
        );
    });

    test("refuses when the RevenueCat owner is not the name owner", async () => {
        ZelfIdModule.searchTag.mockResolvedValue({
            available: false,
            tagObject: { publicData: { tagName: "alicebob.zelf", ethAddress: "0xdead" } },
        });

        await expect(confirmRevenueCatPurchase(rcEvent())).rejects.toThrow("409:zelfProof_does_not_match");
        expect(addDurationToTag).not.toHaveBeenCalled();
    });

    test("does not extend twice on a retried delivery", async () => {
        ZelfIdModule.searchTag.mockResolvedValue({
            available: false,
            tagObject: { publicData: { tagName: "alicebob.zelf", ethAddress: OWNER, renewedAt: "2026-09-29 22:00:00" } },
        });

        const result = await confirmRevenueCatPurchase(rcEvent());

        expect(result).toMatchObject({ action: "already_extended", cache: true });
        expect(addDurationToTag).not.toHaveBeenCalled();
    });

    test("404 when the name is not leased", async () => {
        ZelfIdModule.searchTag.mockResolvedValue({ available: true });

        await expect(confirmRevenueCatPurchase(rcEvent())).rejects.toThrow("404:tag_not_found");
    });

    test("skips non Zelf ID events without touching the registry", async () => {
        const result = await confirmRevenueCatPurchase(rcEvent({ type: "RENEWAL", product_id: "zelf_keys_plan" }));

        expect(result).toEqual({ status: "skipped", reason: "ignored_event_type", confirmed: false });
        expect(ZelfIdModule.searchTag).not.toHaveBeenCalled();
    });

    test("rejects a product that does not cover the name length", async () => {
        await expect(
            confirmRevenueCatPurchase(rcEvent({ product_id: "zns_char_27_years_1" }, { zelfName: "ab.zelf" }))
        ).rejects.toThrow("409:product_does_not_cover_name");
        expect(ZelfIdModule.searchTag).not.toHaveBeenCalled();
    });
});
