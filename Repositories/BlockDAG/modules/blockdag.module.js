const axios = require("axios");
const moment = require("moment");
const https = require("https");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const config = require("../../../Core/config");

// Create axios instance with timeout and better error handling
const agent = new https.Agent({
    rejectUnauthorized: false,
});

const instance = axios.create({
    timeout: 10000,
    httpsAgent: agent,
});

// Generate random user agent
const generateRandomUserAgent = () => {
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
};

// BlockDAG RPC endpoint
const BLOCKDAG_RPC = config.blockdag?.rpcUrl || "https://rpc.bdagscan.com";
const NOWNODES_BLOCKDAG_RPC = "https://bdag.nownodes.io";
const BLOCKDAG_TESTNET_RPC = "https://testnet-rpc.blockdag.network"; // Keep for reference if needed
const BLOCKDAG_EXPLORER = "https://bdagscan.com";
const apiForAddressBalance = "https://api.bdagscan.com/v1/api/transaction/getAddressInfo?address=";

// https://api.bdagscan.com/v1/api/transaction/getAddressInfo?address=0x1BC125bC681685f216935798453F70fb423eB392

// sample response for the apiForAddressBalance
/**
	 * {
    "data": {
        "firstTransaction": {
            "txnHash": "0xd21b0a14cca435a4348f719f417835b6d2c4461f21209125fd916f3230bfcf93",
            "timestamp": "1770919479"
        },
        "lastTransaction": {
            "txnHash": "0xd21b0a14cca435a4348f719f417835b6d2c4461f21209125fd916f3230bfcf93",
            "timestamp": "1770919479"
        },
        "balance": 100
    },
    "status": 200
}
	 */

const apiForAddressTransactions = "https://api.bdagscan.com/v1/api/transaction/getTransactionByAddress";
//?address=0x...&limit=10&page=1&export=false <-- those are the query parameters

const apiForTransactionDetails = "https://api.bdagscan.com/v1/api/transaction/getTransactionDetails?txnHash=";

// sample response for the apiForAddressTransactions
/**
 * {
    "data": [
        {
            "id": 86423,
            "status": "success",
            "txnHash": "0x1c78e9bac582c9b841532a5f4191ca261b351898b2a644d0dfb3aa4e14e83bfd",
            "blockId": "e0706793-294d-4f64-967f-459043f63a60",
            "from": "0x410344ab6f949cD9F9013c52d1E59932f0f08967",
            "to": "0x787389C8ec43D94362648310316F4348A4dE8C83",
            "value": "20",
            "txnFee": "0.000000021000147",
            "txnGasPrice": "0.000000000001000007",
            "gasUsed": "21000",
            "method": "transfer",
            "logMetaData": null,
            "contractAddress": "",
            "timestamp": "1763642207",
            "createdAt": "2025-11-20T12:37:10.981Z",
            "updatedAt": "2025-11-20T12:37:10.981Z",
            "block": {
                "blockNumber": "31770339"
            }
        },
        {
            "id": 86414,
            "status": "success",
            "txnHash": "0x15e6abb31019ea785c25130165febc349544a7642b33eeaa98565d546cf7bcb7",
            "blockId": "91c99ea5-148b-4f33-adca-bf58bdd1d0e1",
            "from": "0x002aF85c8865DE4604dF07a1105EfEF2b8e0dE05",
            "to": "0x787389C8ec43D94362648310316F4348A4dE8C83",
            "value": "10",
            "txnFee": "0.000000021000147",
            "txnGasPrice": "0.000000000001000007",
            "gasUsed": "21000",
            "method": "transfer",
            "logMetaData": null,
            "contractAddress": "",
            "timestamp": "1763642026",
            "createdAt": "2025-11-20T12:34:48.863Z",
            "updatedAt": "2025-11-20T12:34:48.863Z",
            "block": {
                "blockNumber": "31768963"
            }
        },
        {
            "id": 86413,
            "status": "success",
            "txnHash": "0x58718723453c3959f530e5b4e2c080721f73827700bd6e4938563a61531e818f",
            "blockId": "a6c2cd0a-d0a3-4f93-b3c4-17a4cb48cd28",
            "from": "0x410344ab6f949cD9F9013c52d1E59932f0f08967",
            "to": "0x787389C8ec43D94362648310316F4348A4dE8C83",
            "value": "10",
            "txnFee": "0.000000021000147",
            "txnGasPrice": "0.000000000001000007",
            "gasUsed": "21000",
            "method": "transfer",
            "logMetaData": null,
            "contractAddress": "",
            "timestamp": "1763642016",
            "createdAt": "2025-11-20T12:34:42.605Z",
            "updatedAt": "2025-11-20T12:34:42.605Z",
            "block": {
                "blockNumber": "31768881"
            }
        }
    ],
    "status": 200
}
 */

// Helper function to get address balance and details from API
const getAddressBalanceFromAPI = async (address) => {
    try {
        const response = await instance.get(`${apiForAddressBalance}${address}`, {
            headers: {
                "Content-Type": "application/json",
                authority: "api.bdagscan.com",
                "User-Agent": generateRandomUserAgent(),
            },
        });

        if (response.data && response.data.status === 200 && response.data.data) {
            const { balance, firstTransaction, lastTransaction } = response.data.data;
            return {
                balance: balance !== undefined && balance !== null ? balance.toString() : "0",
                firstTransaction,
                lastTransaction,
            };
        }
        throw new Error("Invalid API response");
    } catch (error) {
        console.error("BlockDAG API balance fetch failed:", error.message);
        throw error;
    }
};

// Helper function to get address transactions from API
const getAddressTransactionsFromAPI = async (address, page = 1, limit = 20, exportData = false) => {
    try {
        const response = await instance.get(apiForAddressTransactions, {
            params: {
                address: address,
                page: page,
                limit: limit,
                export: exportData,
            },
            headers: {
                "Content-Type": "application/json",
                authority: "api.bdagscan.com",
                "User-Agent": generateRandomUserAgent(),
            },
        });

        if (response.data && response.data.status === 200 && response.data.data) {
            return response.data.data;
        }
        throw new Error("Invalid API response");
    } catch (error) {
        console.error("BlockDAG API transactions fetch failed:", error.message);
        throw error;
    }
};

// Helper function to get transaction details from API
const getTransactionFromAPI = async (txnHash) => {
    try {
        const response = await instance.get(`${apiForTransactionDetails}${txnHash}`, {
            headers: {
                "Content-Type": "application/json",
                authority: "api.bdagscan.com",
                "User-Agent": generateRandomUserAgent(),
            },
        });

        if (response.data && response.data.status === 200 && response.data.data) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error("BlockDAG API transaction detail fetch failed:", error.message);
        return null;
    }
};

/**
 * Transform API transaction format to expected format
 * @param {Object} tx - Transaction from API
 * @param {string} address - Address to determine transaction direction
 * @returns {Object} Transformed transaction
 */
const transformApiTransaction = (tx, address) => {
    const isOutgoing = tx.from && tx.from.toLowerCase() === address.toLowerCase();
    const traffic = isOutgoing ? "OUT" : "IN";
    const method = tx.method || (tx.contractAddress && tx.contractAddress !== "" ? "Contract" : "Transfer");

    // Parse timestamp
    let date = "N/A";
    let age = "N/A";
    if (tx.timestamp) {
        const timestamp = typeof tx.timestamp === "string" ? parseInt(tx.timestamp, 10) : tx.timestamp;
        date = moment.unix(timestamp).format("YYYY-MM-DD HH:mm:ss");
        age = moment.unix(timestamp).fromNow();
    }

    return {
        hash: tx.txnHash || "0x" + "0".repeat(64),
        method: method,
        block: tx.block?.blockNumber || "N/A",
        age: age,
        date: date,
        from: tx.from || address,
        traffic: traffic,
        to: tx.to || address,
        fiatAmount: "0.00",
        amount: tx.value || "0",
        asset: "BDAG",
        txnFee: tx.txnFee || "0",
        note: tx.note || "",
        status: tx.status || "success",
    };
};

/**
 * Centralized RPC request handler with NowNodes support and fallback
 * @param {string} method - RPC method
 * @param {Array} params - RPC parameters
 * @returns {Promise<Object>} RPC response data
 */
const requestRPC = async (method, params = []) => {
    const nowNodesAPIKey = config.blockdag?.nowNodesAPIKey;

    if (nowNodesAPIKey) {
        try {
            const response = await instance.post(
                NOWNODES_BLOCKDAG_RPC,
                {
                    jsonrpc: "2.0",
                    method,
                    params,
                    id: 1,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": nowNodesAPIKey,
                    },
                }
            );
            if (response.data && !response.data.error) {
                return response.data;
            }
            if (response.data?.error) {
                console.warn(`NowNodes RPC error for ${method}:`, response.data.error.message);
            }
        } catch (error) {
            console.warn(`NowNodes RPC connection failed for ${method}:`, error.message);
        }
    }

    // Fallback to default RPC
    const response = await instance.post(
        BLOCKDAG_RPC,
        {
            jsonrpc: "2.0",
            method,
            params,
            id: 1,
        },
        {
            headers: { "Content-Type": "application/json" },
        }
    );
    return response.data;
};

/**
 * Transform RPC transaction format to expected format
 * @param {Object} tx - Transaction from RPC
 * @param {string} address - Address to determine transaction direction
 * @returns {Object} Transformed transaction
 */
const transformRpcTransaction = (tx, address) => {
    // Parse transaction data
    const value = tx.value ? (parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(6) : "0";
    const gasPrice = tx.gasPrice ? parseInt(tx.gasPrice, 16) : 0;
    const gasUsed = tx.gasUsed ? parseInt(tx.gasUsed, 16) : 0;
    const txnFee = (gasPrice * gasUsed) / Math.pow(10, 18);

    // Determine transaction type/direction
    const isOutgoing = tx.from && tx.from.toLowerCase() === address.toLowerCase();
    const traffic = isOutgoing ? "OUT" : "IN";
    const method = tx.input && tx.input !== "0x" && tx.input.length > 10 ? "Contract" : "Transfer";

    // Get block timestamp if available
    let date = "N/A";
    let age = "N/A";
    if (tx.timestamp) {
        const timestamp = typeof tx.timestamp === "string" ? parseInt(tx.timestamp, 16) : tx.timestamp;
        date = moment.unix(timestamp).format("YYYY-MM-DD HH:mm:ss");
        age = moment.unix(timestamp).fromNow();
    } else if (tx.blockNumber) {
        // If we have block number but no timestamp, we can't calculate age accurately
        date = "N/A";
        age = "N/A";
    }

    return {
        hash: tx.hash || tx.transactionHash || "0x" + "0".repeat(64),
        method: method,
        block: tx.blockNumber ? (typeof tx.blockNumber === "string" ? parseInt(tx.blockNumber, 16) : tx.blockNumber).toString() : "N/A",
        age: age,
        date: date,
        from: tx.from || address,
        traffic: traffic,
        to: tx.to || address,
        fiatAmount: "0.00",
        amount: value,
        asset: "BDAG",
        txnFee: txnFee.toFixed(6),
        note: tx.note || "",
    };
};

/**
 * Fetch transactions from RPC endpoint
 * @param {string} address - Address to fetch transactions for
 * @returns {Array} Array of raw RPC transactions
 */
const fetchTransactionsFromRPC = async (address) => {
    let response = null;
    try {
        response = await requestRPC("getAddressTxs", [address]);
    } catch (testnetError) {
        console.log("NowNodes or primary RPC failed, trying fallback logic if any:", testnetError.message);
        // The requestRPC already handled the fallback to BLOCKDAG_RPC.
        // If we reach here, it means both failed or returned an error.
        throw testnetError;
    }

    if (!response || response.error) {
        const errorCode = response?.error?.code;
        if (errorCode === -32601) {
            console.log(`BlockDAG RPC: getAddressTxs method not available. Returning empty transactions.`);
        } else {
            console.error("RPC error:", response?.data?.error || "Unknown error");
        }
        throw new Error(response?.data?.error?.message || "RPC request failed");
    }

    return response.data.result || [];
};

// Helper function to get latest block number
const getLatestBlock = async () => {
    try {
        const data = await requestRPC("eth_blockNumber");
        return parseInt(data.result, 16);
    } catch (error) {
        console.error("BlockDAG getLatestBlock error:", error.message);
        return 0;
    }
};

/**
 * Fetch BDAG balance with API fallback to RPC
 * @param {string} address - Address to fetch balance for
 * @returns {Promise<Object>} Object containing balance and transaction stats
 */
const fetchBdagBalance = async (address) => {
    try {
        const response = await getAddressBalanceFromAPI(address);

        return response;
    } catch (apiError) {
        console.log("BlockDAG API balance fetch failed, trying RPC:", apiError.message);
        try {
            const data = await requestRPC("eth_getBalance", [address, "latest"]);
            const balance = data.result ? (parseInt(data.result, 16) / Math.pow(10, 18)).toString() : "0";
            return {
                balance,
                firstTransaction: null,
                lastTransaction: null,
            };
        } catch (error) {
            console.error("BlockDAG RPC balance fetch failed:", error.message);
            return {
                balance: "0",
                firstTransaction: null,
                lastTransaction: null,
            };
        }
    }
};

/**
 * Fetch BDAG price from API
 * @returns {Promise<string>} Price as string
 */
const fetchBDAGPrice = async () => {
    try {
        const response = await axios.get("https://api.blockdagnetwork.io/api/v2/base/public/current_price", {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": generateRandomUserAgent(),
            },
            httpsAgent: agent,
            timeout: 5000,
        });

        if (response.data && response.data.price) {
            return response.data.price.toString();
        }

        return "0.05"; // Default fallback if API structure changes
    } catch (error) {
        console.log("BlockDAG price fetch failed, using default:", error.message);
        return "0.05"; // Placeholder price
    }
};

/**
 * Fetch tokens for an address
 * @param {string} address - Address to fetch tokens for
 * @returns {Promise<Object>} Object with tokens array and totalFiatBalance
 */
const fetchAddressTokens = async (address) => {
    try {
        const tokensData = await getTokens({ address }, { show: "100" });
        return {
            tokens: tokensData.tokens || [],
            totalFiatBalance: tokensData.totalFiatBalance || 0,
        };
    } catch (error) {
        console.error("BlockDAG tokens fetch failed:", error.message);
        return {
            tokens: [],
            totalFiatBalance: 0,
        };
    }
};

/**
 * Create native BDAG token object
 * @param {string} address - Wallet address
 * @param {string} balance - BDAG balance
 * @param {string} price - BDAG price
 * @param {number} fiatBalance - Fiat balance value
 * @returns {Object} Native BDAG token object
 */
const createNativeBdagToken = (address, balance, price, fiatBalance) => {
    return {
        tokenType: "BDAG",
        fiatBalance: fiatBalance,
        symbol: "BDAG",
        name: "BlockDAG",
        price: price,
        amount: balance,
        image: "https://arweave.net/C3UN6v_nJT81_3dhsIw5dGP0kjPTfUu6LSDqRwmW0OQ",
        address: address,
        decimals: 18,
    };
};

/**
 * Create error transaction object
 * @param {string} address - Wallet address
 * @param {string} errorMessage - Error message
 * @returns {Object} Error transaction object
 */
const createErrorTransaction = (address, errorMessage) => {
    return [
        {
            hash: "0x" + "0".repeat(64),
            method: "Error",
            block: "N/A",
            age: "N/A",
            date: "N/A",
            from: address,
            traffic: "ERROR",
            to: address,
            fiatAmount: "0.00",
            amount: "0",
            asset: "BDAG",
            txnFee: "0",
            note: `Transaction fetch failed: ${errorMessage}`,
        },
    ];
};

/**
 * Fetch transactions for an address with timeout
 * @param {string} address - Address to fetch transactions for
 * @returns {Promise<Array>} Array of transactions
 */
const fetchAddressTransactions = async (address) => {
    try {
        const transactionTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Transaction fetch timeout")), 6000);
        });

        const transactionDataPromise = getTransactionsList({
            address,
            page: "0",
            show: "20",
        });

        const transactionsData = await Promise.race([transactionDataPromise, transactionTimeoutPromise]);
        return transactionsData.transactions || [];
    } catch (error) {
        console.error("Transaction fetch failed:", error.message);
        return createErrorTransaction(address, error.message);
    }
};

/**
 * Build address response object
 * @param {string} address - Wallet address
 * @param {string} balance - BDAG balance
 * @param {string} price - BDAG price
 * @param {number} fiatBalance - Fiat balance
 * @param {Array} tokens - Array of tokens
 * @param {Array} transactions - Array of transactions
 * @param {number} totalFiatBalance - Total fiat balance from tokens
 * @returns {Object} Complete address response object
 */
const buildAddressResponse = (
    address,
    balance,
    price,
    fiatBalance,
    tokens,
    transactions,
    totalFiatBalance,
    firstTransaction = null,
    lastTransaction = null
) => {
    const totalPortfolioValue = fiatBalance + totalFiatBalance;

    return {
        address,
        balance,
        fiatBalance,
        totalPortfolioValue,
        price,
        type: "system_account",
        firstTransaction,
        lastTransaction,
        account: {
            asset: "BDAG",
            fiatBalance: fiatBalance.toString(),
            price,
        },
        tokenHoldings: {
            total: tokens.length,
            balance: (fiatBalance + totalFiatBalance).toString(),
            tokens,
        },
        transactions,
    };
};

/**
 * Get comprehensive address information for BlockDAG
 * @param {Object} query - Query parameters containing address
 * @returns {Object} Address data with balance, tokens, and transactions
 */
const getAddress = async (query) => {
    try {
        const { address } = query;

        // Add overall timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("BlockDAG API timeout after 30 seconds")), 30000);
        });

        const dataPromise = (async () => {
            // Fetch balance first (API call)
            const bdagData = await fetchBdagBalance(address);

            // Fetch price and tokens in parallel
            const [bdagPrice, tokensData] = await Promise.all([fetchBDAGPrice(), fetchAddressTokens(address)]);

            const bdagBalance = bdagData.balance;

            // Calculate fiat balance
            const fiatBalance = parseFloat(bdagBalance) * parseFloat(bdagPrice);

            // Add native BDAG token to tokens array
            const tokens = [...tokensData.tokens];
            const nativeBdagToken = createNativeBdagToken(address, bdagBalance, bdagPrice, fiatBalance);
            tokens.unshift(nativeBdagToken);

            // Fetch transactions
            const transactions = await fetchAddressTransactions(address);

            // Build and return response
            return buildAddressResponse(
                address,
                bdagBalance,
                bdagPrice,
                fiatBalance,
                tokens,
                transactions,
                tokensData.totalFiatBalance,
                bdagData.firstTransaction,
                bdagData.lastTransaction
            );
        })();

        return await Promise.race([dataPromise, timeoutPromise]);
    } catch (error) {
        console.error("BlockDAG getAddress error:", error.message || "Unknown error");
        return {
            error: "Failed to fetch address data",
            message: error.message,
        };
    }
};

/**
 * Get ERC20 tokens for a BlockDAG address
 * @param {Object} params - Parameters containing address
 * @param {Object} query - Query parameters for pagination
 * @returns {Object} Token holdings data
 */
const getTokens = async (params, query) => {
    try {
        const { address } = params;

        // Try to get common/popular BlockDAG tokens via RPC
        const commonTokens = require("../data/common-tokens.json");

        if (commonTokens.length === 0) {
            // No common tokens configured yet
            return {
                balance: "0",
                total: 0,
                totalFiatBalance: 0,
                tokens: [],
            };
        }

        const tokens = [];
        let totalFiatBalance = 0;

        for (const token of commonTokens) {
            try {
                // Get token balance using ERC20 balanceOf function via RPC
                const data = await requestRPC("eth_call", [
                    {
                        to: token.contractAddress,
                        data: "0x70a08231" + "000000000000000000000000" + address.slice(2), // balanceOf(address)
                    },
                    "latest",
                ]);

                if (data.result && data.result !== "0x" && data.result !== "0x0") {
                    const balance = parseInt(data.result, 16);
                    if (balance > 0) {
                        const amount = balance / Math.pow(10, token.decimals);
                        const price = token.price || "0";
                        const fiatBalance = amount * parseFloat(price);

                        tokens.push({
                            address: token.contractAddress,
                            symbol: token.symbol,
                            name: token.name,
                            decimals: token.decimals,
                            amount: amount.toString(),
                            price: price,
                            fiatBalance: fiatBalance,
                            image: token.image || "https://arweave.net/C3UN6v_nJT81_3dhsIw5dGP0kjPTfUu6LSDqRwmW0OQ",
                            tokenType: "ERC20",
                            owner: address,
                            contractAddress: token.contractAddress,
                            rawAmount: balance.toString(),
                        });

                        totalFiatBalance += fiatBalance;
                    }
                }
            } catch (tokenError) {
                console.log(`Error fetching token ${token.symbol}:`, tokenError.message);
                // Continue with next token if one fails
                continue;
            }
        }

        return {
            balance: totalFiatBalance.toFixed(2),
            total: tokens.length,
            totalFiatBalance: totalFiatBalance,
            tokens: tokens,
        };
    } catch (error) {
        console.error("Error getting BlockDAG tokens:", error.message || "Unknown error");
        return {
            balance: "0",
            total: 0,
            totalFiatBalance: 0,
            tokens: [],
        };
    }
};

/**
 * Get transaction list for a BlockDAG address
 * @param {Object} query - Query parameters containing address, page, and show
 * @returns {Array} Array of transactions
 */
const getTransactionsList = async (query) => {
    try {
        const { address, page = "0", show = "100" } = query;
        const pageNum = parseInt(page, 10);
        const showNum = parseInt(show, 10);

        // Try API first, fallback to RPC
        let transactionsData = [];
        let totalRecords = 0;

        try {
            // API uses 1-based pagination, so add 1 to pageNum
            const apiPage = pageNum + 1;
            const apiTransactions = await getAddressTransactionsFromAPI(address, apiPage, showNum);
            transactionsData = apiTransactions.map((tx) => transformApiTransaction(tx, address));
            totalRecords = apiTransactions.length;
        } catch (apiError) {
            console.log("BlockDAG API transactions fetch failed, trying RPC:", apiError.message);

            try {
                const rpcTransactions = await fetchTransactionsFromRPC(address);
                totalRecords = rpcTransactions.length;

                // Apply pagination
                const startIndex = pageNum * showNum;
                const endIndex = startIndex + showNum;
                const paginatedTransactions = rpcTransactions.slice(startIndex, endIndex);

                transactionsData = paginatedTransactions.map((tx) => transformRpcTransaction(tx, address));
            } catch (rpcError) {
                console.error("BlockDAG RPC transactions fetch failed:", rpcError.message);
                return {
                    pagination: {
                        records: "0",
                        pages: "0",
                        page: page,
                    },
                    transactions: [],
                };
            }
        }

        const totalPages = Math.ceil(totalRecords / showNum);

        return {
            pagination: {
                records: totalRecords.toString(),
                pages: totalPages.toString(),
                page: page,
            },
            transactions: transactionsData,
        };
    } catch (error) {
        console.error("Error getting BlockDAG transactions:", error.message || "Unknown error");
        return { pagination: { records: "0", pages: "0", page: "0" }, transactions: [] };
    }
};

/**
 * Get transaction status/details for a BlockDAG transaction
 * @param {Object} params - Parameters containing transaction ID
 * @returns {Object} Transaction details
 */
const getTransactionStatus = async (params) => {
    try {
        const { id, address } = params;

        // Try API first
        const apiTx = await getTransactionFromAPI(id);

        if (apiTx) {
            return {
                blockNumber: apiTx.block?.blockNumber ? parseInt(apiTx.block?.blockNumber) : "N/A",
                confirmations: apiTx.status === "success" ? "1" : "0",
                from: apiTx.from,
                to: apiTx.to,
                traffic: `${address}`.length > 20 ? (apiTx.to === address ? "IN" : "OUT") : undefined,
                value: apiTx.value ? parseFloat(apiTx.value).toFixed(6) : "0",
                gas: "21000", // Default or parsed if available
                gasPrice: apiTx.txnGasPrice ? Math.floor(parseFloat(apiTx.txnGasPrice) * 1e18) : "0",
                gasUsed: apiTx.gasUsed ? parseInt(apiTx.gasUsed) : "0",
                nonce: "0", // Not usually provided in this API response
                input: "0x", // Not usually provided in this API response
                hash: apiTx.txnHash,
                status: apiTx.status === "success" ? "success" : apiTx.status === "failed" ? "failed" : "pending",
                transactionIndex: "0",
            };
        }

        // Fallback to RPC
        console.log("Transaction not found in API, falling back to RPC...");

        // Get transaction details via RPC
        const data = await requestRPC("eth_getTransactionByHash", [id]);

        // If transaction not found, it might be dropped or never existed
        if (!data.result || data.result === null) {
            return {
                error: "Transaction not found",
                status: "dropped",
                hash: id,
            };
        }

        const tx = response.data.result;

        // Get transaction receipt for status
        let receipt = null;
        try {
            const data = await requestRPC("eth_getTransactionReceipt", [id]);
            receipt = data.result;
        } catch (receiptError) {
            console.log("Receipt fetch failed:", receiptError.message);
        }

        // Determine transaction status
        let status = "pending";
        if (receipt) {
            // If receipt exists, check status field
            if (receipt.status === "0x1" || receipt.status === 1) {
                status = "success";
            } else if (receipt.status === "0x0" || receipt.status === 0) {
                status = "failed";
            } else {
                status = "pending";
            }
        } else if (tx.blockNumber) {
            // Transaction is in a block but no receipt yet (shouldn't happen normally)
            // Check if transaction is in a block - if yes, assume success for now
            // But ideally we should have a receipt
            status = "pending";
        } else {
            // Transaction exists but not in a block - check if it's been pending too long
            // For now, mark as pending
            status = "pending";
        }

        return {
            blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : "N/A",
            confirmations: receipt ? "1" : "0",
            from: tx.from,
            to: tx.to,
            value: tx.value ? (parseInt(tx.value, 16) / Math.pow(10, 18)).toFixed(6) : "0",
            gas: tx.gas ? parseInt(tx.gas, 16) : "0",
            gasPrice: tx.gasPrice ? parseInt(tx.gasPrice, 16) : "0",
            gasUsed: receipt && receipt.gasUsed ? parseInt(receipt.gasUsed, 16) : "0",
            nonce: tx.nonce ? parseInt(tx.nonce, 16) : "0",
            input: tx.input || "0x",
            hash: tx.hash,
            status: status,
            transactionIndex: tx.transactionIndex ? parseInt(tx.transactionIndex, 16) : "0",
        };
    } catch (error) {
        console.error("Error getting BlockDAG transaction status:", error.message || "Unknown error");
        return { error: "Failed to fetch transaction status", status: "error" };
    }
};

/**
 * Get portfolio summary for a BlockDAG address
 * @param {Object} params - Parameters containing address
 * @returns {Object} Portfolio summary data
 */
const getPortfolioSummary = async (params) => {
    try {
        const { address } = params;

        // Get BDAG balance and price
        let bdagBalance = "0";
        let bdagPrice = "0.005"; // Default placeholder
        try {
            const data = await requestRPC("eth_getBalance", [address, "latest"]);
            bdagBalance = data.result ? (parseInt(data.result, 16) / Math.pow(10, 18)).toString() : "0";

            try {
                const priceData = await getTickerPrice({ symbol: "BDAG" });

                bdagPrice = priceData.price || "0.005";
            } catch (priceError) {
                console.log("Price fetch failed, using default");
            }
        } catch (error) {
            console.error("Portfolio summary BDAG data fetch failed:", error.message);
        }

        // Get all tokens
        const tokensData = await getTokens({ address }, { show: "100" });
        const tokens = tokensData.tokens || [];
        const totalTokenValue = tokensData.totalFiatBalance || 0;

        // Calculate total portfolio value
        const bdagValue = parseFloat(bdagBalance) * parseFloat(bdagPrice);
        const totalPortfolioValue = bdagValue + totalTokenValue;

        // Get transaction count
        let transactionCount = 0;
        try {
            const data = await requestRPC("eth_getTransactionCount", [address, "latest"]);
            transactionCount = data.result ? parseInt(data.result, 16) : 0;
        } catch (error) {
            console.error("Transaction count fetch failed:", error.message);
        }

        return {
            address,
            totalPortfolioValue: totalPortfolioValue.toFixed(2),
            bdagBalance: parseFloat(bdagBalance).toFixed(8),
            bdagValue: bdagValue.toFixed(2),
            bdagPrice: bdagPrice,
            tokenCount: tokens.length,
            totalTokenValue: totalTokenValue.toFixed(2),
            transactionCount,
            tokens,
            lastUpdated: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Error getting BlockDAG portfolio summary:", error.message || "Unknown error");
        return { error: "Failed to fetch portfolio summary" };
    }
};

/**
 * Get gas tracker information for BlockDAG
 * @param {Object} query - Query parameters
 * @returns {Object} Gas tracker data
 */
const getGasTracker = async (query) => {
    try {
        // Get gas price from RPC
        const data = await requestRPC("eth_gasPrice");

        const gasPrice = data.result ? parseInt(data.result, 16) / Math.pow(10, 9) : 0;

        return {
            SafeLow: Math.floor(gasPrice * 0.8),
            Standard: Math.floor(gasPrice),
            Fast: Math.floor(gasPrice * 1.2),
            Fastest: Math.floor(gasPrice * 1.5),
            safeLowWait: "1-2",
            standardWait: "1",
            fastWait: "1",
            fastestWait: "1",
        };
    } catch (error) {
        console.error("Error getting BlockDAG gas tracker:", error.message || "Unknown error");
        return { error: "Failed to fetch gas tracker data" };
    }
};

module.exports = {
    getAddress,
    getTokens,
    getTransactionsList,
    getTransactionStatus,
    getGasTracker,
    getPortfolioSummary,
    getLatestBlock,
    fetchBDAGPrice,
};
