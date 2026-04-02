const { Interface, getAddress } = require("ethers");

const PAID_EVENT_IFACE = new Interface([
    "event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)",
]);

/**
 * Fallback when getTransactionReceipt returns null: scan contract event logs
 * for a Paid event matching the JWT paymentId.
 *
 * @param {import("ethers").JsonRpcProvider} provider
 * @param {string} contractAddress - checksummed contract address
 * @param {string} paymentId - bytes32 paymentId from the JWT smartContract* slice
 * @param {string} tagNameFull - e.g. "name.zelf"
 * @param {number} [lookbackBlocks=50000]
 * @returns {Promise<{ found: true, eventAmount: bigint, eventPaymentId: string, eventTagFull: string, blockNumber: number, transactionHash: string } | { found: false }>}
 */
async function findPaidEventByPaymentId(provider, contractAddress, paymentId, tagNameFull, lookbackBlocks = 50000) {
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - lookbackBlocks);

    const paidTopic = PAID_EVENT_IFACE.getEvent("Paid").topicHash;

    const logs = await provider.getLogs({
        address: contractAddress,
        topics: [paidTopic, paymentId],
        fromBlock,
        toBlock: "latest",
    });

    for (const log of logs) {
        try {
            const parsed = PAID_EVENT_IFACE.parseLog({ topics: [...log.topics], data: log.data });
            if (parsed?.name !== "Paid") continue;
            if (parsed.args.tagFull !== tagNameFull) continue;

            return {
                found: true,
                eventAmount: parsed.args.amount,
                eventPaymentId: parsed.args.paymentId,
                eventTagFull: parsed.args.tagFull,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
            };
        } catch {
            /* not parseable as Paid */
        }
    }

    return { found: false };
}

module.exports = {
    PAID_EVENT_IFACE,
    findPaidEventByPaymentId,
};
