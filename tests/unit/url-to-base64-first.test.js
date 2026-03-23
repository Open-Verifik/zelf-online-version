const { urlToBase64First } = require("../../Repositories/Tags/modules/tags-parts.module");

describe("urlToBase64First", () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
		jest.restoreAllMocks();
	});

	it("returns null when all URLs fail", async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
		const out = await urlToBase64First(["https://a.example/x", "https://b.example/y"]);
		expect(out).toBeNull();
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it("uses second URL when first returns 404", async () => {
		const pngBody = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
		global.fetch = jest.fn((url) => {
			if (String(url).includes("arweave")) {
				return Promise.resolve({ ok: false, status: 404 });
			}
			return Promise.resolve({
				ok: true,
				status: 200,
				headers: { get: () => "image/png" },
				arrayBuffer: () => Promise.resolve(pngBody.buffer.slice(pngBody.byteOffset, pngBody.byteOffset + pngBody.byteLength)),
			});
		});
		const out = await urlToBase64First(["https://arweave.zelf.world/dead", "https://gateway.example/ipfs/QmGood"]);
		expect(out).toMatch(/^data:image\/png;base64,/);
		expect(global.fetch).toHaveBeenCalledTimes(2);
	});

	it("skips duplicate URLs", async () => {
		global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
		await urlToBase64First(["https://same/x", "https://same/x", "https://same/x"]);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});
});
