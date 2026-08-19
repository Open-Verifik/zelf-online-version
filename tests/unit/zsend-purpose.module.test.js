const {
	CIPHER_ALGORITHMS,
	CONTENT_KEY_MAX_BYTES,
	CONTENT_KEY_MIN_BYTES,
	DEFAULT_CIPHER_ALGORITHM,
	DEFAULT_EXPIRES_IN_HOURS,
	ENVELOPE_KINDS,
	KIND_PURPOSE_SCOPE,
	MAX_EXPIRES_IN_HOURS,
	base64ByteLength,
	certificateFingerprint,
	isPemCertificate,
	normalizeDomain,
	normalizeKind,
	normalizeTagName,
	parsePurposeId,
	purposeIdFor,
	resolveExpiresAt,
	sha256OfBase64,
} = require("../../Repositories/ZSend/modules/zsend-purpose.module");

const { fail, SUPPORTED_STATUSES } = require("../../Repositories/ZSend/modules/zsend-errors.module");

const samplePem = "-----BEGIN CERTIFICATE-----\nMIIBaGVsbG8gd29ybGQ=\n-----END CERTIFICATE-----\n";

describe("zsend-purpose.module", () => {
	describe("normalizeTagName", () => {
		test("appends the domain when omitted", () => {
			expect(normalizeTagName("alice", "zelf")).toBe("alice.zelf");
		});

		test("leaves an already-qualified name alone", () => {
			expect(normalizeTagName("alice.zelf", "zelf")).toBe("alice.zelf");
		});

		test("lowercases and trims", () => {
			expect(normalizeTagName("  Alice.ZELF  ", "zelf")).toBe("alice.zelf");
		});

		test("defaults the domain to zelf", () => {
			expect(normalizeTagName("alice")).toBe("alice.zelf");
		});

		test("supports other domains", () => {
			expect(normalizeTagName("alice", "avax")).toBe("alice.avax");
		});

		test("rejects an empty name with 409", () => {
			expect(() => normalizeTagName("", "zelf")).toThrow("409:missing_tagName");
		});
	});

	describe("normalizeDomain", () => {
		test("defaults to zelf and lowercases", () => {
			expect(normalizeDomain()).toBe("zelf");
			expect(normalizeDomain("AVAX")).toBe("avax");
		});
	});

	describe("normalizeKind", () => {
		test("defaults to file", () => {
			expect(normalizeKind()).toBe("file");
		});

		test("accepts every declared kind", () => {
			ENVELOPE_KINDS.forEach((kind) => expect(normalizeKind(kind)).toBe(kind));
		});

		test("rejects an unknown kind with 409", () => {
			expect(() => normalizeKind("video")).toThrow("409:unsupported_kind");
		});
	});

	describe("purposeIdFor", () => {
		test("scopes file transfers to zsend", () => {
			expect(purposeIdFor("alice", { domain: "zelf" })).toBe("zsend:alice.zelf");
		});

		test("scopes messages to zmail so a zSend cert cannot open mail", () => {
			expect(purposeIdFor("alice", { kind: "message" })).toBe("zmail:alice.zelf");
			expect(purposeIdFor("alice", { kind: "message" })).not.toBe(purposeIdFor("alice", { kind: "file" }));
		});

		test("is stable regardless of input casing or suffix", () => {
			expect(purposeIdFor("Alice.ZELF")).toBe(purposeIdFor("alice"));
		});

		test("covers every kind in the scope map", () => {
			ENVELOPE_KINDS.forEach((kind) => {
				expect(purposeIdFor("alice", { kind })).toBe(`${KIND_PURPOSE_SCOPE[kind]}:alice.zelf`);
			});
		});
	});

	describe("parsePurposeId", () => {
		test("round-trips every kind", () => {
			ENVELOPE_KINDS.forEach((kind) => {
				expect(parsePurposeId(purposeIdFor("alice", { kind }))).toEqual({
					kind,
					scope: KIND_PURPOSE_SCOPE[kind],
					tagName: "alice.zelf",
				});
			});
		});

		test("returns null for a non-zSend purpose id", () => {
			expect(parsePurposeId("login:www.example.com")).toBeNull();
		});

		test("returns null for malformed input", () => {
			expect(parsePurposeId("zsend")).toBeNull();
			expect(parsePurposeId("zsend:")).toBeNull();
			expect(parsePurposeId("")).toBeNull();
			expect(parsePurposeId(undefined)).toBeNull();
		});
	});

	describe("certificateFingerprint", () => {
		test("ignores PEM line wrapping and trailing whitespace", () => {
			const unwrapped = "-----BEGIN CERTIFICATE-----MIIBaGVsbG8gd29ybGQ=-----END CERTIFICATE-----";

			expect(certificateFingerprint(unwrapped)).toBe(certificateFingerprint(samplePem));
		});

		test("is a lowercase sha-256 hex digest", () => {
			expect(certificateFingerprint(samplePem)).toMatch(/^[0-9a-f]{64}$/);
		});

		test("differs for different certificates", () => {
			const other = "-----BEGIN CERTIFICATE-----MIIBZ29vZGJ5ZQ==-----END CERTIFICATE-----";

			expect(certificateFingerprint(other)).not.toBe(certificateFingerprint(samplePem));
		});

		test("rejects an empty body with 409", () => {
			expect(() => certificateFingerprint("-----BEGIN CERTIFICATE-----\n-----END CERTIFICATE-----")).toThrow("409:invalid_certificate");
		});
	});

	describe("isPemCertificate", () => {
		test("accepts a PEM and rejects anything else", () => {
			expect(isPemCertificate(samplePem)).toBe(true);
			expect(isPemCertificate("not a pem")).toBe(false);
			expect(isPemCertificate(undefined)).toBe(false);
		});
	});

	describe("base64ByteLength", () => {
		test("measures an AES-256 content key at the minimum accepted size", () => {
			expect(base64ByteLength(Buffer.alloc(32).toString("base64"))).toBe(CONTENT_KEY_MIN_BYTES);
		});

		test("stays within the ZelfEncrypt v4 encrypt window", () => {
			expect(CONTENT_KEY_MIN_BYTES).toBe(32);
			expect(CONTENT_KEY_MAX_BYTES).toBe(512);
			expect(base64ByteLength(Buffer.alloc(512).toString("base64"))).toBe(CONTENT_KEY_MAX_BYTES);
		});

		test("returns 0 for empty input", () => {
			expect(base64ByteLength("")).toBe(0);
			expect(base64ByteLength(undefined)).toBe(0);
		});
	});

	describe("sha256OfBase64", () => {
		test("returns a base64 digest of the decoded bytes", () => {
			// SHA-256 of the single byte 0x00.
			expect(sha256OfBase64(Buffer.from([0]).toString("base64"))).toBe("bjQLnP+zepicpUTmu3gKLHiQHT+zNzh2hRGjBhevoB0=");
		});

		test("ignores whitespace in the input", () => {
			const payload = Buffer.from("zsend").toString("base64");

			expect(sha256OfBase64(`  ${payload}\n`)).toBe(sha256OfBase64(payload));
		});
	});

	describe("resolveExpiresAt", () => {
		test("defaults to the free-tier window", () => {
			const hours = (resolveExpiresAt().getTime() - Date.now()) / 3600000;

			expect(Math.round(hours)).toBe(DEFAULT_EXPIRES_IN_HOURS);
		});

		test("caps an oversized request", () => {
			const hours = (resolveExpiresAt(999999).getTime() - Date.now()) / 3600000;

			expect(Math.round(hours)).toBe(MAX_EXPIRES_IN_HOURS);
		});

		test("honours a shorter request", () => {
			const hours = (resolveExpiresAt(6).getTime() - Date.now()) / 3600000;

			expect(Math.round(hours)).toBe(6);
		});

		test("falls back to the default for junk input", () => {
			[0, -5, "abc", null].forEach((value) => {
				const hours = (resolveExpiresAt(value).getTime() - Date.now()) / 3600000;

				expect(Math.round(hours)).toBe(DEFAULT_EXPIRES_IN_HOURS);
			});
		});
	});

	describe("cipher constants", () => {
		test("only AEAD algorithms are allowed", () => {
			expect(CIPHER_ALGORITHMS).toEqual(["AES-GCM-256"]);
			expect(CIPHER_ALGORITHMS).toContain(DEFAULT_CIPHER_ALGORITHM);
		});
	});
});

describe("zsend-errors.module", () => {
	test("builds a status-prefixed message the shared handler can parse", () => {
		expect(() => fail(404, "envelope_not_found")).toThrow("404:envelope_not_found");
	});

	test("sets status on the error", () => {
		try {
			fail(403, "only_sender_can_revoke");
		} catch (error) {
			expect(error.status).toBe(403);
		}
	});

	test("strips colons so errorHandler can split the message into exactly two parts", () => {
		try {
			fail(409, "unsupported:kind:video");
		} catch (error) {
			expect(error.message).toBe("409:unsupported_kind_video");
			expect(error.message.split(":")).toHaveLength(2);
		}
	});

	test("downgrades a status the shared handler cannot map", () => {
		// Core/http-handler has no 410 case, so 410 would surface as a 500 anyway.
		expect(SUPPORTED_STATUSES).not.toContain(410);

		try {
			fail(410, "envelope_gone");
		} catch (error) {
			expect(error.status).toBe(500);
		}
	});
});
