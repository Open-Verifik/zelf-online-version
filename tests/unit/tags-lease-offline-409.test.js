// lease-offline errors that retrying can't fix must answer 409, not 500: the apps retry
// on anything but 409 (App Store iOS 2.20.6 retried ~20 times in 4 minutes).
jest.mock("../../Repositories/Tags/config/supported-domains", () => ({
    getDomainConfig: () => ({ getTagKey: () => "zelfName", getPrice: () => ({ price: 0 }) }),
}));
jest.mock("../../Repositories/Tags/modules/tag-availability", () => ({ assertTagAvailable: jest.fn() }), { virtual: true });
jest.mock("../../Repositories/Tags/modules/tags.module", () => ({
    _findDuplicatedTag: jest.fn(),
    _validateReferral: jest.fn(),
    previewZelfProof: jest.fn(async () => ({ preview: { publicData: { domain: "zelf" }, passwordLayer: "NoPassword" } })),
    searchTag: jest.fn(async () => ({ tagObject: null })),
}));
jest.mock("../../Repositories/Tags/modules/tags-parts.module", () => ({
    decryptParams: jest.fn(async () => ({ password: "" })),
    getTagNameFromPublicData: jest.fn(),
}));
jest.mock("../../Repositories/ZelfProof/modules/zelf-proof.module", () => ({ decrypt: jest.fn() }));
jest.mock("../../Repositories/Tags/modules/address-sync-ownership.util", () => ({ verifyAddressSyncOwnership: jest.fn() }), { virtual: true });
jest.mock("../../Repositories/Tags/modules/tags-ipfs.module", () => ({}));
jest.mock("../../Repositories/Tags/modules/tags-arweave.module", () => ({}));
jest.mock("../../Repositories/Tags/modules/tags-registration.module", () => ({}), { virtual: true });
jest.mock("../../Repositories/Tags/modules/qr-zelfproof-extractor.module", () => ({
    extractZelfProofFromQR: jest.fn(),
    generateQRFromZelfProof: jest.fn(async () => "qr"),
}));
jest.mock("../../Repositories/Tags/modules/tags-addresses.module", () => ({
    resolveEncryptVersion: jest.fn(),
    stampExtraParamsVersion: jest.fn((x) => x),
}), { virtual: true });

const TagsPartsModule = require("../../Repositories/Tags/modules/tags-parts.module");
const TagsModule = require("../../Repositories/Tags/modules/tags.module");
const { errorHandler } = require("../../Core/http-handler");
const { leaseOfflineTag } = require("../../Repositories/Tags/modules/tags-offline.module");

const params = { tagName: "qa95", domain: "zelf", zelfProof: "proof", duration: "1" };

const statusOf = async (promise) => {
    try {
        await promise;
    } catch (error) {
        return { status: errorHandler(error).status, message: error.message };
    }
    throw new Error("expected a rejection");
};

describe("leaseOfflineTag conflicts", () => {
    beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    it("answers 409 when the zelfProof belongs to another name", async () => {
        TagsPartsModule.getTagNameFromPublicData.mockReturnValue("other.zelf");
        await expect(statusOf(leaseOfflineTag(params, {}))).resolves.toEqual({ status: 409, message: "tag_does_not_match_in_zelfProof" });
    });

    it("answers 409 when the zelfProof has no name", async () => {
        TagsPartsModule.getTagNameFromPublicData.mockReturnValue("");
        await expect(statusOf(leaseOfflineTag(params, {}))).resolves.toEqual({ status: 409, message: "tag_not_found_in_zelfProof" });
    });

    it("answers 409 when the name is already registered", async () => {
        TagsPartsModule.getTagNameFromPublicData.mockReturnValue("qa95.zelf");
        TagsModule.searchTag.mockResolvedValueOnce({ tagObject: { publicData: {} } });
        await expect(statusOf(leaseOfflineTag(params, {}))).resolves.toEqual({ status: 409, message: "tag_purchased_already" });
    });
});
