const { Interface } = require("ethers");

const PAID_EVENT_IFACE = new Interface([
    "event Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)",
]);

/**
 * Many JSON-RPC providers reject `eth_getLogs` when (toBlock - fromBlock) exceeds ~10,000 blocks
 * (e.g. `-32614: eth_getLogs is limited to a 10,000 range`). Scan in chunks newest-first.
 */
const MAX_GET_LOGS_BLOCK_SPAN = 9500;

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
    const minBlock = Math.max(0, currentBlock - lookbackBlocks);

    const paidTopic = PAID_EVENT_IFACE.getEvent("Paid").topicHash;

    let chunkEnd = currentBlock;
    while (chunkEnd >= minBlock) {
        const chunkStart = Math.max(minBlock, chunkEnd - MAX_GET_LOGS_BLOCK_SPAN + 1);

        const logs = await provider.getLogs({
            address: contractAddress,
            topics: [paidTopic, paymentId],
            fromBlock: chunkStart,
            toBlock: chunkEnd,
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

        chunkEnd = chunkStart - 1;
    }

    return { found: false };
}

module.exports = {
    PAID_EVENT_IFACE,
    findPaidEventByPaymentId,
};
