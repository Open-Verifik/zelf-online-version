const { JsonRpcProvider, Interface, getAddress } = require("ethers");

const PAID_EVENT_IFACE = new Interface([
    "event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)",
]);

const TAG_PAY_TX_IFACE = new Interface([
    "function pay(bytes32 paymentId, string tagFull) payable",
    "function payUsdc(bytes32 paymentId, string tagFull, uint256 amount)",
    "function payUsdt(bytes32 paymentId, string tagFull, uint256 amount)",
]);

/**
 * @param {string | undefined | null} txHash
 * @returns {string | null} lower-case 0x + 64 hex or null
 */
function normalizeTagPayTxHash(txHash) {
    if (!txHash || typeof txHash !== "string") return null;
    const h = txHash.trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(h)) return null;
    return h.toLowerCase();
}

function failBody(reason) {
    return { confirmed: false, amountReceived: "0", paymentConfirmation: { reason } };
}

/**
 * @param {import("ethers").TransactionResponse} tx
 * @returns {"NATIVE" | "USDC" | "USDT" | null}
 */
function classifyBscTagPayMode(tx) {
    try {
        const decoded = TAG_PAY_TX_IFACE.parseTransaction({ data: tx.data });
        if (decoded.name === "pay" && tx.value > 0n) return "NATIVE";
        if (decoded.name === "payUsdc" && tx.value === 0n) return "USDC";
        if (decoded.name === "payUsdt" && tx.value === 0n) return "USDT";
    } catch {
        /* not our calldata */
    }
    return null;
}

/**
 * BSC: verify ZelfBscPay tx receipt + Paid event vs JWT smartContractBSC slice.
 * @param {object} params
 * @param {string} params.normalizedHash
 * @param {string} params.expectedContract
 * @param {number} params.chainId
 * @param {string} params.rpcUrl
 * @param {number} params.confirmations
 * @param {object} params.sc - tokenDecoded.smartContractBSC
 * @param {boolean} params.hasNativeWei
 * @param {boolean} params.hasUsdcPayload
 * @param {boolean} params.hasUsdtPayload
 * @param {string} params.tagNameFull
 * @param {object} [params.prices]
 * @param {string} [params.tagPayUsdcAddress]
 * @param {string} [params.tagPayUsdtAddress]
 */
async function verifyBscZelfTagPayTx({
    normalizedHash,
    expectedContract,
    chainId,
    rpcUrl,
    confirmations,
    sc,
    hasNativeWei,
    hasUsdcPayload,
    hasUsdtPayload,
    tagNameFull,
    prices,
    tagPayUsdcAddress,
    tagPayUsdtAddress,
}) {
    const provider = new JsonRpcProvider(rpcUrl, chainId);
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== Number(chainId)) {
        throw new Error("409:provider_chain_mismatch");
    }

    const receipt = await provider.getTransactionReceipt(normalizedHash);

    if (!receipt || Number(receipt.status) !== 1) {
        return { ok: false, body: failBody("receipt_missing_or_failed") };
    }

    const currentBlock = await provider.getBlockNumber();

    if (currentBlock - Number(receipt.blockNumber) + 1 < confirmations) {
        return { ok: false, body: failBody("insufficient_confirmations") };
    }

    if (!receipt.to || getAddress(receipt.to) !== expectedContract) {
        return { ok: false, body: failBody("wrong_contract") };
    }

    const tx = await provider.getTransaction(normalizedHash);

    if (!tx || !tx.to || getAddress(tx.to) !== expectedContract) {
        return { ok: false, body: failBody("tx_missing_or_wrong_contract") };
    }

    const payMode = classifyBscTagPayMode(tx);

    if (!payMode) {
        return { ok: false, body: failBody("unknown_tag_pay_function") };
    }

    if (payMode === "NATIVE" && !hasNativeWei) {
        return { ok: false, body: failBody("native_not_in_token") };
    }

    if (payMode === "USDC" && !hasUsdcPayload) {
        return { ok: false, body: failBody("usdc_not_in_token") };
    }

    if (payMode === "USDT" && !hasUsdtPayload) {
        return { ok: false, body: failBody("usdt_not_in_token") };
    }

    const usdcCfg = (tagPayUsdcAddress || "").trim();
    if (payMode === "USDC" && usdcCfg) {
        try {
            if (getAddress(sc.usdc.tokenAddress) !== getAddress(usdcCfg)) {
                return { ok: false, body: failBody("usdc_token_mismatch") };
            }
        } catch {
            return { ok: false, body: failBody("usdc_token_invalid") };
        }
    }

    const usdtCfg = (tagPayUsdtAddress || "").trim();
    if (payMode === "USDT" && usdtCfg) {
        try {
            if (getAddress(sc.usdt.tokenAddress) !== getAddress(usdtCfg)) {
                return { ok: false, body: failBody("usdt_token_mismatch") };
            }
        } catch {
            return { ok: false, body: failBody("usdt_token_invalid") };
        }
    }

    let paidLog = null;

    for (const log of receipt.logs) {
        if (!log.address || getAddress(log.address) !== expectedContract) continue;

        try {
            const parsed = PAID_EVENT_IFACE.parseLog({ topics: [...log.topics], data: log.data });
            if (parsed?.name === "Paid") paidLog = parsed;
        } catch {
            /* not Paid */
        }
    }

    if (!paidLog) {
        return { ok: false, body: failBody("paid_event_not_found") };
    }

    const args = paidLog.args;
    const eventPaymentId = args.paymentId;
    const eventAmount = args.amount;
    const eventTagFull = args.tagFull;

    const jwtPaymentId = sc.paymentId;

    if (typeof jwtPaymentId !== "string" || eventPaymentId.toLowerCase() !== jwtPaymentId.toLowerCase()) {
        return { ok: false, body: failBody("payment_id_mismatch") };
    }

    if (eventTagFull !== tagNameFull) {
        return { ok: false, body: failBody("tag_mismatch") };
    }

    let amountToPay;
    let expectedAtomic;
    let amountReceivedHuman;

    if (payMode === "NATIVE") {
        amountToPay = prices?.BNB?.amountToSend;
        if (amountToPay == null) throw new Error("409:bnb_price_missing");
        expectedAtomic = BigInt(sc.expectedWei);
        amountReceivedHuman = Number(eventAmount) / 1e18;
    } else if (payMode === "USDC") {
        amountToPay = prices?.BSC_USDC?.amountToSend;
        if (amountToPay == null) throw new Error("409:bsc_usdc_price_missing");
        expectedAtomic = BigInt(sc.usdc.expectedAmount);
        const dec = Number(sc.usdc.decimals);
        amountReceivedHuman = Number(eventAmount) / 10 ** dec;
    } else {
        amountToPay = prices?.BSC_USDT?.amountToSend;
        if (amountToPay == null) throw new Error("409:bsc_usdt_price_missing");
        expectedAtomic = BigInt(sc.usdt.expectedAmount);
        const dec = Number(sc.usdt.decimals);
        amountReceivedHuman = Number(eventAmount) / 10 ** dec;
    }

    if (eventAmount < expectedAtomic) {
        return { ok: false, body: failBody("amount_below_expected") };
    }

    return {
        ok: true,
        payMode,
        eventAmount,
        amountReceivedHuman,
        normalizedHash,
        amountToPay,
    };
}

module.exports = {
    verifyBscZelfTagPayTx,
};
