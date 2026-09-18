const TagsSearchModule = require("../../Repositories/Tags/modules/tags-search.module");
const TagsIPFSModule = require("../../Repositories/Tags/modules/tags-ipfs.module");
const TagsArweaveModule = require("../../Repositories/Tags/modules/tags-arweave.module");
const TagsPartsModule = require("../../Repositories/Tags/modules/tags-parts.module");

describe("tags-search.module - timeouts and early IPFS resolution", () => {
    const mockDomainConfig = {
        name: "zelf",
        getTagKey: () => "tagName",
        getPrice: () => ({ price: 10 }),
        tags: {
            storage: {
                ipfsEnabled: true,
                arweaveEnabled: true,
                keyPrefix: "tagName",
            },
        },
    };

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it("returns IPFS results without waiting for slow Arweave when IPFS succeeds", async () => {
        const ipfsResult = [
            {
                id: "ipfs-123",
                name: "testuser.zelf",
                url: "https://ipfs.zelf.world/ipfs/QmTest",
                publicData: { tagName: "testuser.zelf", testKey: "testValue" },
            },
        ];

        // Fast IPFS response (50ms)
        jest.spyOn(TagsIPFSModule, "get").mockImplementation(async () => {
            await new Promise((r) => {
                const timer = setTimeout(r, 50);
                timer.unref();
            });
            return ipfsResult;
        });

        // Slow Arweave response (2000ms - simulating slow gateway)
        jest.spyOn(TagsArweaveModule, "searchByStorageKey").mockImplementation(async () => {
            await new Promise((r) => {
                const timer = setTimeout(r, 2000);
                timer.unref();
            });
            return [
                {
                    id: "ar-123",
                    url: "https://arweave.net/tx123",
                    publicData: { tagName: "testuser.zelf" },
                },
            ];
        });

        jest.spyOn(TagsPartsModule, "urlToBase64First").mockResolvedValue("data:image/png;base64,mockqr");

        const start = Date.now();
        const result = await TagsSearchModule.searchTag({
            tagName: "testuser.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            environment: "all",
            type: "both",
        });
        const elapsed = Date.now() - start;

        // Must finish well before the 3000ms Arweave delay
        expect(elapsed).toBeLessThan(1500);
        expect(result.available).toBe(false);
        expect(result.ipfs).toHaveLength(1);
        expect(result.tagObject).toBeDefined();
        expect(result.tagObject.ipfsId).toBe("ipfs-123");
    });

    it("does not break the call when Arweave times out or errors", async () => {
        const ipfsResult = [
            {
                id: "ipfs-456",
                name: "errortest.zelf",
                url: "https://ipfs.zelf.world/ipfs/QmTest2",
                publicData: { tagName: "errortest.zelf" },
            },
        ];

        jest.spyOn(TagsIPFSModule, "get").mockResolvedValue(ipfsResult);
        jest.spyOn(TagsArweaveModule, "searchByStorageKey").mockRejectedValue(new Error("Arweave network failure"));
        jest.spyOn(TagsPartsModule, "urlToBase64First").mockResolvedValue("data:image/png;base64,mockqr");

        const result = await TagsSearchModule.searchTag({
            tagName: "errortest.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            environment: "all",
            type: "both",
        });

        expect(result.available).toBe(false);
        expect(result.ipfs).toHaveLength(1);
        expect(result.arweave).toEqual([]);
        expect(result.tagObject.ipfsId).toBe("ipfs-456");
    });

    it("returns Arweave results if IPFS returns empty and Arweave has the tag", async () => {
        jest.spyOn(TagsIPFSModule, "get").mockResolvedValue([]);
        jest.spyOn(TagsArweaveModule, "searchByStorageKey").mockResolvedValue([
            {
                id: "ar-789",
                url: "https://arweave.net/tx789",
                publicData: { tagName: "arweavetag.zelf" },
            },
        ]);
        jest.spyOn(TagsPartsModule, "urlToBase64First").mockResolvedValue("data:image/png;base64,mockqr");

        const result = await TagsSearchModule.searchTag({
            tagName: "arweavetag.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            environment: "all",
            type: "both",
        });

        expect(result.available).toBe(false);
        expect(result.arweave).toHaveLength(1);
        expect(result.tagObject.id).toBe("ar-789");
    });

    it("marks available=true when neither IPFS nor Arweave finds the tag and searches completed cleanly", async () => {
        jest.spyOn(TagsIPFSModule, "get").mockResolvedValue([]);
        jest.spyOn(TagsArweaveModule, "searchByStorageKey").mockResolvedValue([]);

        const result = await TagsSearchModule.searchTag({
            tagName: "availabletag.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            environment: "all",
            type: "both",
        });

        expect(result.available).toBe(true);
        expect(result.searchIncomplete).toBeUndefined();
        expect(result.price).toBeDefined();
    });

    it("marks available=false and searchIncomplete=true when IPFS search fails or times out (issue #528)", async () => {
        // IPFS search fails (e.g. Pinata timeout or network error)
        jest.spyOn(TagsIPFSModule, "get").mockRejectedValue(new Error("SEARCH_TIMEOUT"));
        jest.spyOn(TagsArweaveModule, "searchByStorageKey").mockResolvedValue([]);

        const result = await TagsSearchModule.searchTag({
            tagName: "timeouttag.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            environment: "all",
            type: "both",
        });

        // Must NEVER report available=true if IPFS failed to respond!
        expect(result.available).toBe(false);
        expect(result.searchIncomplete).toBe(true);
    });

    it("marks available=false and searchIncomplete=true when Arweave search fails and IPFS found nothing", async () => {
        jest.spyOn(TagsIPFSModule, "get").mockResolvedValue([]);
        jest.spyOn(TagsArweaveModule, "searchByStorageKey").mockRejectedValue(new Error("SEARCH_TIMEOUT"));

        const result = await TagsSearchModule.searchTag({
            tagName: "arweavetimeout.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            environment: "all",
            type: "both",
        });

        // Must not report available=true if Arweave search failed to verify existence
        expect(result.available).toBe(false);
        expect(result.searchIncomplete).toBe(true);
    });

    it("queries .hold and mainnet in parallel without switch fallthrough in searchIPFS", async () => {
        const getSpy = jest.spyOn(TagsIPFSModule, "get").mockResolvedValue([]);

        await TagsSearchModule.searchIPFS({
            tagName: "myname.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            type: "hold",
        });

        // hold type should only call once for .hold
        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy.mock.calls[0][0].tagName).toBe("myname.zelf.hold");

        getSpy.mockClear();

        await TagsSearchModule.searchIPFS({
            tagName: "myname.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            type: "mainnet",
        });

        // mainnet type should only call once for mainnet
        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy.mock.calls[0][0].tagName).toBe("myname.zelf");

        getSpy.mockClear();

        await TagsSearchModule.searchIPFS({
            tagName: "myname.zelf",
            domain: "zelf",
            domainConfig: mockDomainConfig,
            type: "both",
        });

        // both type calls twice in parallel (one for mainnet, one for hold)
        expect(getSpy).toHaveBeenCalledTimes(2);
        const calledNames = getSpy.mock.calls.map((c) => c[0].tagName);
        expect(calledNames).toContain("myname.zelf");
        expect(calledNames).toContain("myname.zelf.hold");
    });
});
