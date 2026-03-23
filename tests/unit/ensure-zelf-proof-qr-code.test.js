jest.mock("../../Repositories/Tags/modules/tags.module", () => ({
	searchTag: jest.fn(),
}));

jest.mock("../../Repositories/Tags/modules/tags-parts.module", () => {
	const actual = jest.requireActual("../../Repositories/Tags/modules/tags-parts.module");
	return {
		...actual,
		urlToBase64First: jest.fn(),
	};
});

const TagsPartsModule = require("../../Repositories/Tags/modules/tags-parts.module");
const { ensureZelfProofQRCode } = require("../../Repositories/Tags/modules/tags-payment.module");

describe("ensureZelfProofQRCode", () => {
	beforeEach(() => {
		TagsPartsModule.urlToBase64First.mockReset();
	});

	it("fills zelfProofQRCode from gateway chain when urls succeed", async () => {
		const tinyPng =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
		TagsPartsModule.urlToBase64First.mockResolvedValue(`data:image/png;base64,${tinyPng}`);
		const tagObject = {
			url: "https://arweave.zelf.world/missing",
			ipfsContentUrl: "https://pinata/ipfs/QmX",
		};
		await ensureZelfProofQRCode(tagObject);
		expect(TagsPartsModule.urlToBase64First).toHaveBeenCalledWith([tagObject.url, tagObject.ipfsContentUrl]);
		expect(tagObject.zelfProofQRCode).toBe(`data:image/png;base64,${tinyPng}`);
	});

	it("throws zelf_proof_qr_unavailable when URLs and zelfProof are missing", async () => {
		TagsPartsModule.urlToBase64First.mockResolvedValue(null);
		const tagObject = { url: "https://arweave.zelf.world/missing", publicData: {} };
		await expect(ensureZelfProofQRCode(tagObject)).rejects.toMatchObject({ message: "zelf_proof_qr_unavailable" });
	});
});
