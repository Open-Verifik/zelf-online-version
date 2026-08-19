const {
	AUTH_TAG_BITS,
	CIPHER_ALGORITHM,
	CONTENT_KEY_BYTES,
	IV_BYTES,
	assertCertificateMatchesPurpose,
	buildEnvelopeRequest,
	decryptPayload,
	encryptPayload,
	fromBase64,
	generateContentKey,
	sha256Base64,
	toBase64,
} = require("../../Repositories/ZSend/client/zsend-envelope.client");

const { CONTENT_KEY_MAX_BYTES, CONTENT_KEY_MIN_BYTES, purposeIdFor } = require("../../Repositories/ZSend/modules/zsend-purpose.module");

const textBytes = (value) => new Uint8Array(Buffer.from(value, "utf8"));
const bytesToText = (bytes) => Buffer.from(bytes).toString("utf8");

describe("zsend-envelope.client", () => {
	describe("generateContentKey", () => {
		test("produces a 32-byte AES-256 key", () => {
			const key = generateContentKey();

			expect(key).toBeInstanceOf(Uint8Array);
			expect(key.byteLength).toBe(CONTENT_KEY_BYTES);
			expect(CONTENT_KEY_BYTES).toBe(32);
		});

		test("fits the window ZelfEncrypt v4 encrypt accepts", () => {
			expect(CONTENT_KEY_BYTES).toBeGreaterThanOrEqual(CONTENT_KEY_MIN_BYTES);
			expect(CONTENT_KEY_BYTES).toBeLessThanOrEqual(CONTENT_KEY_MAX_BYTES);
		});

		test("is fresh per call, so one recovered key cannot open past envelopes", () => {
			const keys = new Set(Array.from({ length: 25 }, () => toBase64(generateContentKey())));

			expect(keys.size).toBe(25);
		});
	});

	describe("encryptPayload", () => {
		test("returns AEAD parameters the envelope schema accepts", async () => {
			const { cipherBase64, cipher } = await encryptPayload(textBytes("zsend payload"), generateContentKey());

			expect(cipherBase64).toEqual(expect.any(String));
			expect(cipher.algorithm).toBe(CIPHER_ALGORITHM);
			expect(cipher.authTag).toBeNull();
			expect(fromBase64(cipher.iv).byteLength).toBe(IV_BYTES);
			expect(cipher.byteLength).toBe(fromBase64(cipherBase64).byteLength);
		});

		test("appends a 128-bit GCM tag to the ciphertext", async () => {
			const plaintext = textBytes("exactly sixteen!");
			const { cipher } = await encryptPayload(plaintext, generateContentKey());

			expect(cipher.byteLength).toBe(plaintext.byteLength + AUTH_TAG_BITS / 8);
		});

		test("uses a fresh nonce per call for the same key", async () => {
			const key = generateContentKey();
			const payload = textBytes("same payload");

			const first = await encryptPayload(payload, key);
			const second = await encryptPayload(payload, key);

			expect(first.cipher.iv).not.toBe(second.cipher.iv);
			expect(first.cipherBase64).not.toBe(second.cipherBase64);
		});

		test("records the sha-256 the sender signs", async () => {
			const { cipherBase64, cipher } = await encryptPayload(textBytes("signed payload"), generateContentKey());

			expect(cipher.sha256).toBe(await sha256Base64(fromBase64(cipherBase64)));
		});
	});

	describe("round trip", () => {
		test("recovers the original bytes", async () => {
			const contentKey = generateContentKey();
			const original = "the face is the only thing that opens this";

			const { cipherBase64, cipher } = await encryptPayload(textBytes(original), contentKey);
			const opened = await decryptPayload({ cipherBase64, cipher, contentKey });

			expect(bytesToText(opened)).toBe(original);
		});

		test("handles binary payloads and an empty payload", async () => {
			const contentKey = generateContentKey();

			for (const payload of [new Uint8Array([0, 1, 2, 255, 128]), new Uint8Array(0), new Uint8Array(100000).fill(7)]) {
				const { cipherBase64, cipher } = await encryptPayload(payload, contentKey);
				const opened = await decryptPayload({ cipherBase64, cipher, contentKey });

				expect(Array.from(opened)).toEqual(Array.from(payload));
			}
		});

		test("supports a separated auth tag", async () => {
			const contentKey = generateContentKey();
			const original = "separated tag client";

			const { cipherBase64, cipher } = await encryptPayload(textBytes(original), contentKey);

			// Split the inline tag off, mimicking an AEAD that returns it separately.
			const full = fromBase64(cipherBase64);
			const tagBytes = AUTH_TAG_BITS / 8;
			const body = full.slice(0, full.byteLength - tagBytes);
			const tag = full.slice(full.byteLength - tagBytes);

			const opened = await decryptPayload({
				cipherBase64: toBase64(body),
				cipher: { ...cipher, authTag: toBase64(tag) },
				contentKey,
			});

			expect(bytesToText(opened)).toBe(original);
		});
	});

	describe("tamper and wrong-key handling", () => {
		test("a different content key cannot open the payload", async () => {
			const { cipherBase64, cipher } = await encryptPayload(textBytes("secret"), generateContentKey());

			await expect(decryptPayload({ cipherBase64, cipher, contentKey: generateContentKey() })).rejects.toThrow();
		});

		test("altered ciphertext fails instead of decrypting to garbage", async () => {
			const contentKey = generateContentKey();
			const { cipherBase64, cipher } = await encryptPayload(textBytes("secret"), contentKey);

			const bytes = fromBase64(cipherBase64);
			bytes[0] ^= 0xff;

			await expect(decryptPayload({ cipherBase64: toBase64(bytes), cipher, contentKey })).rejects.toThrow();
		});

		test("a swapped nonce fails", async () => {
			const contentKey = generateContentKey();
			const { cipherBase64, cipher } = await encryptPayload(textBytes("secret"), contentKey);
			const other = await encryptPayload(textBytes("secret"), contentKey);

			await expect(decryptPayload({ cipherBase64, cipher: { ...cipher, iv: other.cipher.iv }, contentKey })).rejects.toThrow();
		});

		test("rejects an unsupported algorithm rather than guessing", async () => {
			const contentKey = generateContentKey();
			const { cipherBase64, cipher } = await encryptPayload(textBytes("secret"), contentKey);

			await expect(decryptPayload({ cipherBase64, cipher: { ...cipher, algorithm: "AES-CBC-256" }, contentKey })).rejects.toThrow(
				"zsend_unsupported_cipher_algorithm"
			);
		});
	});

	describe("assertCertificateMatchesPurpose", () => {
		const entry = { certificate: "-----BEGIN CERTIFICATE-----x-----END CERTIFICATE-----", purposeId: "zsend:alice.zelf", status: "active" };

		test("accepts the purpose id derived for that name", () => {
			expect(() => assertCertificateMatchesPurpose(entry, purposeIdFor("alice"))).not.toThrow();
		});

		test("rejects a certificate issued for a different purpose", () => {
			expect(() => assertCertificateMatchesPurpose(entry, purposeIdFor("alice", { kind: "message" }))).toThrow(
				"zsend_purpose_id_mismatch"
			);
		});

		test("rejects a certificate issued for a different name", () => {
			expect(() => assertCertificateMatchesPurpose(entry, purposeIdFor("bob"))).toThrow("zsend_purpose_id_mismatch");
		});

		test("rejects a revoked entry", () => {
			expect(() => assertCertificateMatchesPurpose({ ...entry, status: "revoked" }, "zsend:alice.zelf")).toThrow(
				"zsend_certificate_not_active"
			);
		});

		test("rejects a missing certificate", () => {
			expect(() => assertCertificateMatchesPurpose({ purposeId: "zsend:alice.zelf", status: "active" }, "zsend:alice.zelf")).toThrow(
				"zsend_certificate_missing"
			);
		});
	});

	describe("buildEnvelopeRequest", () => {
		test("carries only wrapped key material, never a raw key or plaintext", async () => {
			const { cipher } = await encryptPayload(textBytes("payload"), generateContentKey());

			const body = buildEnvelopeRequest({ toTagName: "alice.zelf", encryptedKey: "wrapped", cipher });

			expect(Object.keys(body).sort()).toEqual(["cipher", "encryptedKey", "toTagName"]);
			expect(JSON.stringify(body)).not.toContain("keyBase64");
		});

		test("passes through optional fields when set", async () => {
			const { cipher } = await encryptPayload(textBytes("payload"), generateContentKey());

			const body = buildEnvelopeRequest({
				toTagName: "alice.zelf",
				encryptedKey: "wrapped",
				cipher,
				kind: "message",
				filename: "note.json",
				mimeType: "application/json",
				expiresInHours: 24,
				senderProof: { signature: "sig", purposeId: "zsend:bob.zelf" },
			});

			expect(body).toMatchObject({
				kind: "message",
				filename: "note.json",
				mimeType: "application/json",
				expiresInHours: 24,
				senderProof: { signature: "sig" },
			});
		});

		test("omits optional fields that were not set", async () => {
			const { cipher } = await encryptPayload(textBytes("payload"), generateContentKey());

			const body = buildEnvelopeRequest({ toTagName: "alice.zelf", encryptedKey: "wrapped", cipher });

			expect(body).not.toHaveProperty("kind");
			expect(body).not.toHaveProperty("cipherBase64");
			expect(body).not.toHaveProperty("senderProof");
		});
	});
});
