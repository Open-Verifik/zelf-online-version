require("dotenv").config();
const urlBase = process.env.MICROSERVICES_BOGOTA_URL;
const token = process.env.MICROSERVICES_BOGOTA_TOKEN;
const axios = require("axios");
const moment = require("moment");
const https = require("https");

const config = require("../../../Core/config");
const { mapGasOracleToTrackerShape, weiHexToGwei, weiHexToEth, gasTrackerFromNetworkGwei } = require("./etherscan-gas-tracker.util");
const { idAseet_ } = require("../../dataAnalytics/modules/dataAnalytics.module");
const { getCleanInstance } = require("../../../Core/axios");
const { ethereumBookFallbackDefaultUrl } = require("../../../Core/source-a-naas");
const { getTickerPrice } = require("../../binance/modules/binance.module");
const { get_ApiKey } = require("../../Solana/modules/oklink");

const instance = getCleanInstance(1000);
const agent = new https.Agent({ rejectUnauthorized: false });
const apiKey = process.env.API_KEY_ETH;

/** Etherscan API V2 (V1 /api deprecated as of Aug 2025) */
const ETHERSCAN_V2_API = process.env.ETHERSCAN_V2_API || "https:/rr/api.etherscan.io/v2/api";

const CHAIN_ID_BY_ENV = {
    bogota: 1,
    production: 1,
    development: 11155111, // Sepolia
};

const etherscanKeyForGas = () => process.env.ETHERSCAN_API_KEY || config.etherscan.apiKey;

const infuraProjectId = () => process.env.INFURA_APIKEY || config.etherscan.apiKey;

const getGasTrackerFromRpc = async (isSepolia) => {
    const pid = infuraProjectId();
    const rpcUrl = isSepolia
        ? process.env.ETH_SEPOLIA_RPC_URL || (pid ? `https://sepolia.infura.io/v3/${pid}` : null)
        : process.env.ETH_MAINNET_RPC_URL || (pid ? `https://mainnet.infura.io/v3/${pid}` : null);

    if (!rpcUrl) {
        throw new Error("gas_tracker_rpc_unconfigured");
    }

    const { data } = await axios.post(
        rpcUrl,
        { jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] },
        { headers: { "Content-Type": "application/json" }, timeout: 30000 }
    );

    if (data.error) throw new Error(data.error.message || "eth_gasPrice_failed");

    const gwei = weiHexToGwei(data.result);
    return gasTrackerFromNetworkGwei(gwei);
};

const environment = "production";

/**
 * Shape Ethplorer-like payload from JSON-RPC eth_getBalance (no ERC-20 list).
 * @param {string} address
 * @returns {Promise<{ ETH: { balance: number }, tokens: [] }>}
 */
const fetchAddressInfoViaEthRpc = async (address) => {
    const pid = infuraProjectId();
    const rpcUrl =
        process.env.ETHPLORER_FALLBACK_RPC_URL ||
        process.env.ETH_MAINNET_RPC_URL ||
        ethereumBookFallbackDefaultUrl() ||
        (pid ? `https://mainnet.infura.io/v3/${pid}` : null);

    if (!rpcUrl) {
        throw new Error("ethplorer_fallback_rpc_unconfigured");
    }

    const { data } = await instance.post(
        rpcUrl,
        { id: 0, method: "eth_getBalance", params: [address, "latest"], jsonrpc: "2.0" },
        { headers: { "Content-Type": "application/json" } }
    );

    if (data.error) {
        throw new Error(data.error.message || "eth_getBalance_failed");
    }

    return { ETH: { balance: weiHexToEth(data.result) }, tokens: [] };
};

/**
 * @param {*} params
 */
const getAddress = async (params) => {
    try {
        const address = params.address;

        let data;
        try {
            const res = await instance.get(`https:/gggg/api.ethplorer.io/getAddressInfo/${address}?apiKey=${apiKey}`, {});
            data = res.data;
        } catch (ethplorerErr) {
            console.error({ ethplorerError: ethplorerErr.message || ethplorerErr });
            data = await fetchAddressInfoViaEthRpc(address);
        }

        const { price: price } = await getTickerPrice({ symbol: "ETH" });

        async function formatTokenData(tokens, params) {
            const formattedTokens = await Promise.all(
                tokens.map(async (token) => {
                    const { tokenInfo, balance, rawBalance } = token;
                    const rate = tokenInfo.price?.rate || 0;
                    const decimals =
                        parseInt(tokenInfo.decimals).toString().length > 3
                            ? Number(String(parseInt(tokenInfo.decimals)).slice(0, 2))
                            : parseInt(tokenInfo.decimals);
                    const formattedAmount = parseFloat(rawBalance) / Math.pow(10, decimals);
                    const fiatBalance = formattedAmount * rate;
                    let idAseet;
                    try {
                        idAseet = await idAseet_(tokenInfo.symbol);
                    } catch (error) {
                        idAseet = {};
                    }

                    return {
                        _amount: formattedAmount,
                        _fiatBalance: fiatBalance.toFixed(7),
                        _price: rate,
                        address: tokenInfo.address,
                        amount: formattedAmount.toFixed(12),
                        decimals: decimals,
                        fiatBalance: parseFloat(fiatBalance.toFixed(7)),
                        image: `https://s2.coinmarketcap.com/static/img/coins/64x64/${idAseet.idAseet}.png`,
                        name: tokenInfo.name,
                        price: rate.toFixed(6),
                        symbol: tokenInfo.symbol,
                        tokenType: "ERC-20",
                    };
                })
            );

            return formattedTokens;
        }

        const tokens = await formatTokenData(data.tokens || []);

        tokens.push({
            amount: data.ETH.balance.toString(),
            fiatBalance: data.ETH.balance * price,
            image: "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",
            name: "Ethereum",
            price: price,
            symbol: "ETH",
            tokenType: "ETH",
        });

        function sumFiatBalance(tokens) {
            return tokens.reduce((total, token) => total + token.fiatBalance, 0);
        }
        const { transactions } = await getTransactionsList({
            address,
            page: "1",
            show: "10",
        });

        const fiatBalance = data.ETH.balance * price;
        const response = {
            address,
            balance: data.ETH.balance,
            fiatBalance,
            type: "system_account",
            account: {
                asset: "ETH",
                fiatBalance: fiatBalance.toString(),
                price,
            },
            tokenHoldings: {
                total: tokens.length,
                balance: sumFiatBalance(tokens).toString(),
                tokens,
            },
            transactions,
        };

        return response;
    } catch (error) {
        console.error({ error });
    }
};

const getGasTracker = async (params) => {
    const env = params?.env || environment;
    const chainId = CHAIN_ID_BY_ENV[env] ?? CHAIN_ID_BY_ENV.production;
    const apiKey = etherscanKeyForGas();
    const isSepolia = env === "development";

    try {
        const { data } = await instance.get(ETHERSCAN_V2_API, {
            params: {
                chainid: chainId,
                module: "gastracker",
                action: "gasoracle",
                apikey: apiKey,
            },
        });

        if (String(data.status) === "1" && data.result) {
            const mapped = mapGasOracleToTrackerShape(data.result);
            if (mapped) return mapped;
        }
    } catch (error) {
        console.error({ error: error.message || error });
    }

    try {
        return await getGasTrackerFromRpc(isSepolia);
    } catch (rpcError) {
        console.error({ error: rpcError.message || rpcError });
        throw new Error("gas_tracker_unavailable");
    }
};

/**
 * get transaction status
 * @param {Object} params
 */
const getTransactionStatus = async (params) => {
    try {
        const id = params.id;

        const { data } = await instance.get(`${urlBase}/api/evm-tx/ethereum-transaction?address=${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return data;
    } catch (exception) {
        const error = new Error("transaction_not_found");

        error.status = 404;

        throw error;
    }
};

/**
 * get transactions list
 * @param {Object} params
 * @returns
 */
const getTransactionsList = async (params) => {
    const address = params.address;
    const show = params.show;

    try {
        const { data } = await instance.get(`${urlBase}/api/evm-tx/ethereum-transactions?address=${address}&show=${show}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return { pagination: { records: "0", pages: "0", page: "0" }, transactions: data };
    } catch (error) {
        console.error({ error, address });

        return {
            pagination: { records: "0", pages: "0", page: "0" },
            transactions: [],
        };
    }
};

/**
 * get transaction status v2
 * @param {Object} params
 */
const getTransactionStatusV2 = async (params) => {
    let transaction = null;

    try {
        const t = Date.now();

        const { id } = params;

        const url = `https://www.oklink.com/api/explorer/v1/eth/transactions/${id}?t=${t}`;

        const { data } = await axios.get(url, {
            httpsAgent: agent,
            headers: {
                "X-Apikey": get_ApiKey().getApiKey(),
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
            },
        });

        const details = data?.data;

        if (!details) return null;

        const type = details.inputHex === "0x" ? "transfer" : "swap";

        transaction = {
            age: moment(details.blocktime * 1000).fromNow(),
            amount: details.value.toString(),
            assetPrice: details.legalRate.toString(),
            block: details.blockHeigh,
            confirmations: details.confirm,
            date: moment(details.blocktime * 1000).format("YYYY-MM-DD HH:mm:ss"),
            from: details.from,
            gasPrice: details.gasPrice.toString(),
            hash: id,
            image: details.logoUrl,
            status: details.status === "0x1" ? "Success" : "fail",
            to: details.to,
            txnFee: details.fee.toString(),
            type,
        };

        if (type === "swap") {
            const transfersUrl = `https://www.oklink.com/api/explorer/v1/eth/transfers?limit=9999&offset=0&tokenType=ERC20&tranHash=${id}&t=${t}`;

            const response = await axios.get(transfersUrl, {
                httpsAgent: agent,
                headers: {
                    "X-Apikey": get_ApiKey().getApiKey(),
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
                },
            });

            if (!response.data?.data?.hits) return transaction;

            for (let index = response.data.data.hits.length - 1; index >= 0; index--) {
                const hit = response.data.data.hits[index];

                if (hit.from !== details.to || hit.to !== details.from) continue;

                transaction.swapAmount = hit.valueRaw;
                transaction.swapSymbol = hit.symbol;
                transaction.swapLogo = hit.logoUrl;
                transaction.swapContractAddress = hit.tokenContractAddress;

                break;
            }
        }

        return transaction;
    } catch (error) {
        console.error({ error });
    }

    return transaction;
};

module.exports = {
    getAddress,
    getGasTracker,
    getTransactionsList,
    getTransactionStatus,
    getTransactionStatusV2,
};
