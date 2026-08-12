const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

/**
 * Exercises the sharp pipelines used in Client/Staff (resize+jpeg)
 * and Tags QR/zelfproof helpers (ensureAlpha+raw).
 */
describe("sharp image pipelines (0.35.x)", () => {
	let samplePng;
	let faceBuffer;

	beforeAll(async () => {
		samplePng = await sharp({
			create: {
				width: 1200,
				height: 900,
				channels: 3,
				background: { r: 32, g: 96, b: 180 },
			},
		})
			.png()
			.toBuffer();

		const facePath = path.join(__dirname, "../../config/0012589021.json");
		if (fs.existsSync(facePath)) {
			const faceJson = JSON.parse(fs.readFileSync(facePath, "utf8"));
			if (faceJson.faceBase64) {
				const raw = String(faceJson.faceBase64).replace(/^data:image\/\w+;base64,/, "");
				faceBuffer = Buffer.from(raw, "base64");
			}
		}
	});

	it("loads sharp and reports a modern version", () => {
		expect(sharp.versions).toBeDefined();
		expect(sharp.versions.sharp).toMatch(/^0\.35\./);
	});

	it("compresses like Client/Staff profile photo path (resize + jpeg)", async () => {
		const compressed = await sharp(samplePng)
			.resize(800, 800, {
				fit: "inside",
				withoutEnlargement: true,
			})
			.jpeg({
				quality: 85,
				progressive: true,
			})
			.toBuffer();

		const meta = await sharp(compressed).metadata();
		expect(meta.format).toBe("jpeg");
		expect(meta.width).toBeLessThanOrEqual(800);
		expect(meta.height).toBeLessThanOrEqual(800);
		expect(compressed.length).toBeGreaterThan(500);
		expect(compressed.length).toBeLessThan(samplePng.length);
	});

	it("decodes to raw RGBA like QR/zelfproof helpers", async () => {
		const { data, info } = await sharp(samplePng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

		expect(info.width).toBe(1200);
		expect(info.height).toBe(900);
		expect(info.channels).toBe(4);
		expect(data.length).toBe(1200 * 900 * 4);
		expect(data).toBeInstanceOf(Buffer);
	});

	it("handles the repo face sample through both pipelines when present", async () => {
		if (!faceBuffer?.length) {
			console.warn("Skipping face sample assertions — config/0012589021.json faceBase64 missing");
			return;
		}

		const jpeg = await sharp(faceBuffer)
			.resize(800, 800, { fit: "inside", withoutEnlargement: true })
			.jpeg({ quality: 85, progressive: true })
			.toBuffer();
		const jpegMeta = await sharp(jpeg).metadata();
		expect(jpegMeta.format).toBe("jpeg");
		expect(jpegMeta.width).toBeLessThanOrEqual(800);

		const { data, info } = await sharp(faceBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		expect(info.channels).toBe(4);
		expect(data.length).toBe(info.width * info.height * 4);
	});
});
