// Live Zelf ID payment quotes and unpaid confirmation.
// Face: Core/assets/selfie_girl.jpg. Hits /api/zelf-ids (v4), not /api/my-tags.
const request = require("supertest");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const moment = require("moment");
require("dotenv").config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const ORIGIN = "https://test.example.com";
const ZELF_IDS_PATH = "/api/zelf-ids";
const TEST_DOMAIN = "zelf";
const TEST_PASSWORD = "testpassword123";
const selfieImagePath = path.resolve(__dirname, "../../Core/assets/selfie_girl.jpg");
const faceBase64 = fs.readFileSync(selfieImagePath, "base64");

const uniqueTagName = () => `zid${Math.floor(Math.random() * 100000).toString().padStart(5, "0")}`;
const shortUniqueTagName = () => `z${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

describe("Zelf IDs payment API", () => {
	jest.setTimeout(180000);

	let authToken;
	let reservedName;
	let paymentQuote;

	beforeAll(async () => {
		expect(fs.existsSync(selfieImagePath)).toBe(true);
		expect(faceBase64.length).toBeGreaterThan(1000);

		const sessionResponse = await request(API_BASE_URL)
			.post("/api/sessions")
			.set("Origin", ORIGIN)
			.send({
				identifier: `zelfids_pay_${Date.now()}_${Math.random().toString(36).substring(7)}`,
				type: "createWallet",
				isWebExtension: false,
			})
			.expect(200);

		authToken = sessionResponse.body.data.token;
		expect(authToken).toBeDefined();
	});

	afterAll(async () => {
		if (!reservedName || !authToken) return;
		await request(API_BASE_URL)
			.delete(`${ZELF_IDS_PATH}/delete`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				tagName: reservedName,
				domain: TEST_DOMAIN,
				faceBase64,
				password: TEST_PASSWORD,
			});
	});

	it("POST /zelf-ids/lease — selfie face creates a 5-hour paid reservation", async () => {
		reservedName = shortUniqueTagName();

		const leaseResponse = await request(API_BASE_URL)
			.post(`${ZELF_IDS_PATH}/lease`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				tagName: reservedName,
				domain: TEST_DOMAIN,
				faceBase64,
				password: TEST_PASSWORD,
				type: "create",
				os: "DESKTOP",
				removePGP: true,
			});

		expect(leaseResponse.status).toBe(200);
		const publicData = leaseResponse.body.data.tagObject.publicData;
		expect(publicData.type).toBe("hold");
		expect(Number(publicData.v)).toBe(4);
		expect(publicData.origin).toBe("online");
		expect(leaseResponse.body.data.walrus).toBeFalsy();

		const hoursUntilExpiry = moment(publicData.expiresAt).diff(moment(), "hour", true);
		expect(hoursUntilExpiry).toBeGreaterThan(4);
		expect(hoursUntilExpiry).toBeLessThanOrEqual(5.1);
	});

	it("GET /zelf-ids/payment-options — 401 without auth", async () => {
		const response = await request(API_BASE_URL)
			.get(`${ZELF_IDS_PATH}/payment-options`)
			.set("Origin", ORIGIN)
			.query({ tagName: reservedName, domain: TEST_DOMAIN, duration: "1" });

		expect(response.status).toBe(401);
	});

	it("GET /zelf-ids/payment-options — 409 without tagName/duration", async () => {
		const response = await request(API_BASE_URL)
			.get(`${ZELF_IDS_PATH}/payment-options`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`);

		expect(response.status).toBe(409);
		expect(response.body).toHaveProperty("validationError");
	});

	it("GET /zelf-ids/payment-options — 404 when the name is not leased", async () => {
		const response = await request(API_BASE_URL)
			.get(`${ZELF_IDS_PATH}/payment-options`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.query({ tagName: uniqueTagName(), domain: TEST_DOMAIN, duration: "1" });

		expect(response.status).toBe(404);
	});

	it("GET /zelf-ids/payment-options — returns unique addresses, prices, and a JWT", async () => {
		const response = await request(API_BASE_URL)
			.get(`${ZELF_IDS_PATH}/payment-options`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.query({ tagName: reservedName, domain: TEST_DOMAIN, duration: "1" });

		expect(response.status).toBe(200);
		paymentQuote = response.body.data;
		expect(paymentQuote.tagName).toBe(`${reservedName}.${TEST_DOMAIN}`);
		expect(paymentQuote.tagPayName).toBe(`${reservedName}.${TEST_DOMAIN}pay`);
		expect(paymentQuote.duration).toBe(1);
		expect(paymentQuote.paymentAddress).toEqual(
			expect.objectContaining({
				btcAddress: expect.any(String),
				solanaAddress: expect.any(String),
			})
		);
		expect(paymentQuote.prices).toEqual(expect.any(Object));
		expect(typeof paymentQuote.signedDataPrice).toBe("string");

		const decoded = jwt.decode(paymentQuote.signedDataPrice);
		expect(decoded.tagName).toBe(paymentQuote.tagName);
		expect(decoded.tagPayName).toBe(paymentQuote.tagPayName);
		expect(decoded.duration).toBe(1);
	});

	it("POST /zelf-ids/payment-confirmation — 409 without token", async () => {
		const response = await request(API_BASE_URL)
			.post(`${ZELF_IDS_PATH}/payment-confirmation`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.send({ tagName: reservedName, domain: TEST_DOMAIN, network: "ETH" });

		expect(response.status).toBe(409);
		expect(response.body).toHaveProperty("validationError");
	});

	it("POST /zelf-ids/payment-confirmation — 401 without auth", async () => {
		const response = await request(API_BASE_URL)
			.post(`${ZELF_IDS_PATH}/payment-confirmation`)
			.set("Origin", ORIGIN)
			.send({
				tagName: reservedName,
				domain: TEST_DOMAIN,
				network: "ETH",
				token: paymentQuote.signedDataPrice,
			});

		expect(response.status).toBe(401);
	});

	it("POST /zelf-ids/payment-confirmation — AVAX is rejected for the unique-address path", async () => {
		const response = await request(API_BASE_URL)
			.post(`${ZELF_IDS_PATH}/payment-confirmation`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				tagName: reservedName,
				domain: TEST_DOMAIN,
				network: "AVAX",
				token: paymentQuote.signedDataPrice,
			});

		expect(response.status).toBe(409);
		expect(`${response.body.code || ""} ${response.body.message || ""}`).toMatch(/avax_use_smart_contract_confirmation/i);
	});

	it("POST /zelf-ids/payment-confirmation — unpaid unique address stays unconfirmed", async () => {
		const response = await request(API_BASE_URL)
			.post(`${ZELF_IDS_PATH}/payment-confirmation`)
			.set("Origin", ORIGIN)
			.set("Authorization", `Bearer ${authToken}`)
			.send({
				tagName: reservedName,
				domain: TEST_DOMAIN,
				network: "ETH",
				token: paymentQuote.signedDataPrice,
			});

		expect(response.status).toBe(200);
		expect(response.body.data.confirmed).toBe(false);
	});
});
