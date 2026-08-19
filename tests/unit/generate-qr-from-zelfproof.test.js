const {
	errorCorrectionLevelForProofBytes,
	generateQRFromZelfProof,
	getOptimalQRSize,
	QR_BYTE_CAPACITY,
} = require("../../Repositories/Tags/modules/qr-zelfproof-extractor.module");

const proofOfBytes = (byteCount) => Buffer.alloc(byteCount, 7).toString("base64");

describe("errorCorrectionLevelForProofBytes", () => {
	it("keeps 3.1.6-sized proofs on H", () => {
		expect(errorCorrectionLevelForProofBytes(645)).toBe("H");
		expect(errorCorrectionLevelForProofBytes(QR_BYTE_CAPACITY.H)).toBe("H");
	});

	it("drops to Q for a default v4 proof (~1325 bytes)", () => {
		expect(errorCorrectionLevelForProofBytes(1325)).toBe("Q");
	});

	it("uses M then L as the proof grows, and null past version-40 L", () => {
		expect(errorCorrectionLevelForProofBytes(2000)).toBe("M");
		expect(errorCorrectionLevelForProofBytes(2800)).toBe("L");
		expect(errorCorrectionLevelForProofBytes(QR_BYTE_CAPACITY.L)).toBe("L");
		expect(errorCorrectionLevelForProofBytes(QR_BYTE_CAPACITY.L + 1)).toBeNull();
	});
});

describe("generateQRFromZelfProof", () => {
	it("returns a PNG for a 3.1.6-sized proof", async () => {
		const qr = await generateQRFromZelfProof(proofOfBytes(645));
		expect(qr).toMatch(/^data:image\/png;base64,/);
	});

	it("returns a PNG for a default v4-sized proof that cannot use H", async () => {
		const qr = await generateQRFromZelfProof(proofOfBytes(1325));
		expect(qr).toMatch(/^data:image\/png;base64,/);
	});

	it("still returns a PNG when the caller asks for H on a v4-sized proof", async () => {
		const qr = await generateQRFromZelfProof(proofOfBytes(1325), { errorCorrectionLevel: "H" });
		expect(qr).toMatch(/^data:image\/png;base64,/);
	});

	it("returns a PNG near the L ceiling and null past it", async () => {
		const atCeiling = await generateQRFromZelfProof(proofOfBytes(2900));
		expect(atCeiling).toMatch(/^data:image\/png;base64,/);

		const over = await generateQRFromZelfProof(proofOfBytes(3000));
		expect(over).toBeNull();
	});

	it("uses a larger canvas once the proof is past H capacity", () => {
		expect(getOptimalQRSize(645)).toBeLessThanOrEqual(640);
		expect(getOptimalQRSize(1325)).toBe(800);
		expect(getOptimalQRSize(1645)).toBe(800);
	});
});
