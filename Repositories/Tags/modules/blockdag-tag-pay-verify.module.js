const { JsonRpcProvider, Interface, getAddress } = require("ethers");
const { PAID_EVENT_IFACE, findPaidEventByPaymentId } = require("./tag-pay-event-scan.util");

const TAG_PAY_TX_IFACE = new Interface(["function pay(bytes32 paymentId, string tagFull) payable"]);

function failBody(reason) {
    return { confirmed: false, amountReceived: "0", paymentConfirmation: { reason } };
}

/**
 * @param {import("ethers").TransactionResponse} tx
 * @returns {"NATIVE" | null}
 */
function classifyBlockdagTagPayMode(tx) {
    try {
        const decoded = TAG_PAY_TX_IFACE.parseTransaction({ data: tx.data });
        if (decoded.name === "pay" && tx.value > 0n) return "NATIVE";
    } catch {
        /* not our calldata */
    }
    return null;
}

/**
 * BlockDAG: verify ZelfBlockDagPay tx receipt + Paid event vs JWT smartContractBDAG slice (native BDAG only).
 */
async function verifyBlockdagZelfTagPayTx({
    normalizedHash,
    expectedContract,
    chainId,
    rpcUrl,
    confirmations,
    sc,
    hasNativeWei,
    tagNameFull,
    prices,
}) {
    const provider = new JsonRpcProvider(rpcUrl, chainId);
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== Number(chainId)) {
        throw new Error("409:provider_chain_mismatch");
    }

    const receipt = await provider.getTransactionReceipt(normalizedHash);

    if (!receipt || Number(receipt.status) !== 1) {
        const scan = await findPaidEventByPaymentId(provider, expectedContract, sc.paymentId, tagNameFull);
        if (!scan.found) {
            return { ok: false, body: failBody("receipt_missing_or_failed") };
        }

        const currentBlock = await provider.getBlockNumber();
        if (currentBlock - scan.blockNumber + 1 < confirmations) {
            return { ok: false, body: failBody("insufficient_confirmations") };
        }

        const amountToPay = prices?.BDAG?.amountToSend;
        if (amountToPay == null) throw new Error("409:bdag_price_missing");

        const expectedAtomic = BigInt(sc.expectedWei);
        if (scan.eventAmount < expectedAtomic) {
            return { ok: false, body: failBody("amount_below_expected") };
        }

        const amountReceivedHuman = Number(scan.eventAmount) / 1e18;
        return {
            ok: true,
            payMode: "NATIVE",
            eventAmount: scan.eventAmount,
            amountReceivedHuman,
            normalizedHash: scan.transactionHash,
            amountToPay,
        };
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

    const payMode = classifyBlockdagTagPayMode(tx);

    if (!payMode) {
        return { ok: false, body: failBody("unknown_tag_pay_function") };
    }

    if (payMode === "NATIVE" && !hasNativeWei) {
        return { ok: false, body: failBody("native_not_in_token") };
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

    const amountToPay = prices?.BDAG?.amountToSend;
    if (amountToPay == null) throw new Error("409:bdag_price_missing");

    const expectedAtomic = BigInt(sc.expectedWei);
    const amountReceivedHuman = Number(eventAmount) / 1e18;

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
    verifyBlockdagZelfTagPayTx,
};
