const bip39 = require("bip39");
const { derivePath } = require("ed25519-hd-key");
const { keyPairFromSeed } = require("@ton/crypto");
const { WalletContractV5R1, internal, Address, toNano, beginCell } = require("@ton/ton");
const { tonCenterPost } = require("./ton-api.client");
const { resolveJettonWalletAddress } = require("./ton-jetton.util");

const deriveKeyPairFromMnemonic = async (mnemonic) => {
	const seed = await bip39.mnemonicToSeed(String(mnemonic || "").trim());
	const derived = derivePath("m/44'/607'/0'", seed.toString("hex")).key;
	return keyPairFromSeed(derived.slice(0, 32));
};

const getSeqno = async (address) => {
	const info = await tonCenterPost("getWalletInformation", { address });
	return Number(info?.seqno ?? 0);
};

/**
 * Build, sign, and broadcast a native TON transfer from mnemonic (mobile may call via secure channel).
 * For tag payments and sends initiated from authenticated sessions.
 */
const sendNativeTransfer = async ({ mnemonic, toAddress, amountTon, comment }) => {
	const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
	const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
	const seqno = await getSeqno(wallet.address.toString());

	const messages = [
		internal({
			to: Address.parse(toAddress),
			value: toNano(String(amountTon)),
			bounce: false,
			body: comment ? beginCell().storeUint(0, 32).storeStringTail(String(comment)).endCell() : undefined,
		}),
	];

	const transfer = wallet.createTransfer({
		seqno,
		secretKey: keyPair.secretKey,
		messages,
	});

	const boc = transfer.toBoc().toString("base64");
	const result = await tonCenterPost("sendBoc", { boc });
	return {
		success: true,
		txHash: result?.hash || result?.transaction?.hash?.hash || null,
		boc,
		from: wallet.address.toString({ bounceable: true, urlSafe: true }),
	};
};

/**
 * Jetton (TEP-74) transfer via wallet v5 outbound message.
 */
const sendJettonTransfer = async ({ mnemonic, toAddress, jettonMaster, amount, decimals = 6 }) => {
	const keyPair = await deriveKeyPairFromMnemonic(mnemonic);
	const wallet = WalletContractV5R1.create({ workchain: 0, publicKey: keyPair.publicKey });
	const seqno = await getSeqno(wallet.address.toString());
	const fromFriendly = wallet.address.toString({ bounceable: true, urlSafe: true });

	const senderJettonWallet = await resolveJettonWalletAddress(fromFriendly, jettonMaster);
	const recipientJettonWallet = await resolveJettonWalletAddress(toAddress, jettonMaster);

	const scale = 10n ** BigInt(decimals);
	const jettonAmount = BigInt(Math.floor(Number(amount) * Number(scale)));

	const jettonTransferBody = beginCell()
		.storeUint(0x0f8a7ea5, 32)
		.storeUint(0n, 64)
		.storeCoins(jettonAmount)
		.storeAddress(Address.parse(recipientJettonWallet))
		.storeAddress(wallet.address)
		.storeBit(0)
		.storeCoins(toNano("0.05"))
		.storeBit(0)
		.endCell();

	const messages = [
		internal({
			to: Address.parse(senderJettonWallet),
			value: toNano("0.1"),
			bounce: true,
			body: jettonTransferBody,
		}),
	];

	const transfer = wallet.createTransfer({
		seqno,
		secretKey: keyPair.secretKey,
		messages,
	});

	const boc = transfer.toBoc().toString("base64");
	const result = await tonCenterPost("sendBoc", { boc });
	return {
		success: true,
		txHash: result?.hash || null,
		boc,
		from: wallet.address.toString({ bounceable: true, urlSafe: true }),
		jettonMaster,
	};
};

module.exports = {
	sendNativeTransfer,
	sendJettonTransfer,
	getSeqno,
	deriveKeyPairFromMnemonic,
};
