const { Cell, WalletContractV5R1, internal, loadMessage, toNano } = require("@ton/ton");
const {
	buildExternalTransferBoc,
	deriveKeyPairFromMnemonic,
} = require("../../Repositories/TON/modules/ton-transfer.module");

describe("TON transfer message", () => {
	it("wraps the signed wallet request in an external message for Toncenter", async () => {
		const keyPair = await deriveKeyPairFromMnemonic(
			"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
		);
		const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
		const transfer = wallet.createTransfer({
			seqno: 0,
			secretKey: keyPair.secretKey,
			messages: [
				internal({
					to: wallet.address,
					value: toNano("0.01"),
					bounce: false,
				}),
			],
		});

		const boc = buildExternalTransferBoc(wallet, transfer, "active");
		const message = loadMessage(Cell.fromBoc(Buffer.from(boc, "base64"))[0].beginParse());

		expect(message.info.type).toBe("external-in");
		expect(message.info.dest.equals(wallet.address)).toBe(true);
		expect(message.body.equals(transfer)).toBe(true);
		expect(message.init).toBeNull();
	});

	it("includes the wallet state init when the account is not active", async () => {
		const keyPair = await deriveKeyPairFromMnemonic(
			"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
		);
		const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
		const transfer = wallet.createTransfer({ seqno: 0, secretKey: keyPair.secretKey, messages: [] });

		const boc = buildExternalTransferBoc(wallet, transfer, "uninitialized");
		const message = loadMessage(Cell.fromBoc(Buffer.from(boc, "base64"))[0].beginParse());

		expect(message.init.code.equals(wallet.init.code)).toBe(true);
		expect(message.init.data.equals(wallet.init.data)).toBe(true);
	});
});
