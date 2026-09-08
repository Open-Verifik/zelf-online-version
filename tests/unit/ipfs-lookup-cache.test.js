const IpfsLookupCache = require("../../Core/ipfs-lookup-cache");

describe("ipfs-lookup-cache", () => {
	beforeEach(() => {
		IpfsLookupCache.flush();
	});

	afterEach(() => {
		IpfsLookupCache.flush();
	});

	it("returns a cached hit without calling the loader again", async () => {
		let calls = 0;
		const loader = async () => {
			calls += 1;
			return { id: "client-1" };
		};

		const first = await IpfsLookupCache.getOrLoad("client:email:a@b.com", loader);
		const second = await IpfsLookupCache.getOrLoad("client:email:a@b.com", loader);

		expect(first).toEqual({ id: "client-1" });
		expect(second).toEqual({ id: "client-1" });
		expect(calls).toBe(1);
	});

	it("coalesces in-flight loaders for the same key", async () => {
		let calls = 0;
		const loader = () =>
			new Promise((resolve) => {
				setTimeout(() => {
					calls += 1;
					resolve({ id: "shared" });
				}, 20);
			});

		const [first, second] = await Promise.all([
			IpfsLookupCache.getOrLoad("myLicense:a@b.com:json", loader),
			IpfsLookupCache.getOrLoad("myLicense:a@b.com:json", loader),
		]);

		expect(first).toEqual({ id: "shared" });
		expect(second).toEqual({ id: "shared" });
		expect(calls).toBe(1);
	});

	it("does not cache null or empty arrays", async () => {
		let nullCalls = 0;
		let emptyCalls = 0;

		await IpfsLookupCache.getOrLoad("client:email:missing@b.com", async () => {
			nullCalls += 1;
			return null;
		});
		await IpfsLookupCache.getOrLoad("client:email:missing@b.com", async () => {
			nullCalls += 1;
			return null;
		});

		await IpfsLookupCache.getOrLoad("subscription:sui", async () => {
			emptyCalls += 1;
			return [];
		});
		await IpfsLookupCache.getOrLoad("subscription:sui", async () => {
			emptyCalls += 1;
			return [];
		});

		expect(nullCalls).toBe(2);
		expect(emptyCalls).toBe(2);
		expect(IpfsLookupCache.peek("client:email:missing@b.com")).toBeUndefined();
		expect(IpfsLookupCache.peek("subscription:sui")).toBeUndefined();
	});

	it("set stores a value that peek and getOrLoad can read", async () => {
		const stored = { myLicense: { domainConfig: { name: "zelf" } } };

		IpfsLookupCache.set(IpfsLookupCache.keys.myLicense("miguel@sui.com", true), stored);

		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.myLicense("miguel@sui.com", true))).toEqual(stored);

		let calls = 0;
		const cached = await IpfsLookupCache.getOrLoad(IpfsLookupCache.keys.myLicense("miguel@sui.com", true), async () => {
			calls += 1;
			return { missed: true };
		});

		expect(cached).toEqual(stored);
		expect(calls).toBe(0);
	});

	it("invalidateLicense clears myLicense and licenseDomain keys", async () => {
		IpfsLookupCache.set(IpfsLookupCache.keys.myLicense("miguel@sui.com", true), { json: true });
		IpfsLookupCache.set(IpfsLookupCache.keys.licenseDomain("zelf"), { domainConfig: { name: "zelf" } });
		IpfsLookupCache.set(IpfsLookupCache.keys.subscription("zelf"), { domain: "zelf" });

		IpfsLookupCache.invalidateLicense({ emails: ["miguel@sui.com"], domains: ["zelf"] });

		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.myLicense("miguel@sui.com", true))).toBeUndefined();
		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.licenseDomain("zelf"))).toBeUndefined();
		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.subscription("zelf"))).toBeUndefined();
	});

	it("deletes keys by prefix and leaves others intact", async () => {
		await IpfsLookupCache.getOrLoad(IpfsLookupCache.keys.myLicense("miguel@sui.com", true), async () => ({ json: true }));
		await IpfsLookupCache.getOrLoad(IpfsLookupCache.keys.myLicense("miguel@sui.com", false), async () => ({ json: false }));
		await IpfsLookupCache.getOrLoad(IpfsLookupCache.keys.subscription("sui"), async () => ({ domain: "sui" }));

		const removed = IpfsLookupCache.delByPrefix(IpfsLookupCache.keys.myLicensePrefix("miguel@sui.com"));

		expect(removed).toBe(2);
		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.myLicense("miguel@sui.com", true))).toBeUndefined();
		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.myLicense("miguel@sui.com", false))).toBeUndefined();
		expect(IpfsLookupCache.peek(IpfsLookupCache.keys.subscription("sui"))).toEqual({ domain: "sui" });
	});

	it("does not cache loader errors", async () => {
		let calls = 0;

		await expect(
			IpfsLookupCache.getOrLoad("client:email:err@b.com", async () => {
				calls += 1;
				throw new Error("404:client_not_found");
			})
		).rejects.toThrow("404:client_not_found");

		await expect(
			IpfsLookupCache.getOrLoad("client:email:err@b.com", async () => {
				calls += 1;
				return { id: "recovered" };
			})
		).resolves.toEqual({ id: "recovered" });

		expect(calls).toBe(2);
	});
});
