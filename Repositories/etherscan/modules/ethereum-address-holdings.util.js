const { formatEther } = require("ethers");

const config = require("../../../Core/config");
const { getCleanInstance } = require("../../../Core/axios");
const { idAseet_ } = require("../../dataAnalytics/modules/dataAnalytics.module");
const {
    rpcRequest,
    fetchTokenMetadata,
    parseHexBalance,
    formatTokenBalance,
} = require("../../Alchemy/modules/alchemy.module");

const ethplorerInstance = getCleanInstance(10000);
const apiKeyEth = process.env.API_KEY_ETH;

const ETH_NATIVE_LOGO =
    "https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png";

const getAddressOverviewLimits = () => ({
    maxTokens: Number(config.etherscan?.addressMaxTokens) || 150,
    minFiatUsd: Number(config.etherscan?.addressMinFiatUsd) ?? 0.01,
    cmcConcurrency: Number(config.etherscan?.addressCmcConcurrency) || 5,
    metadataConcurrency: Number(config.etherscan?.addressMetadataConcurrency) || 5,
});

const mapWithConcurrency = async (items, concurrency, mapper) => {
    const results = [];
    const limit = Math.max(1, concurrency);

    for (let index = 0; index < items.length; index += limit) {
        const batch = items.slice(index, index + limit);
        const batchResults = await Promise.all(batch.map(mapper));
        results.push(...batchResults);
    }

    return results;
};

const normalizeDecimals = (decimals) => {
    const parsed = parseInt(decimals, 10);
    if (!Number.isFinite(parsed)) return 18;

    const asString = parsed.toString();
    return asString.length > 3 ? Number(asString.slice(0, 2)) : parsed;
};

const buildCmcImageUrl = (idAseet) =>
    idAseet ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${idAseet}.png` : "";

const formatErc20HoldingRow = ({
    address,
    amount,
    decimals,
    fiatBalance,
    image,
    name,
    price,
    symbol,
}) => {
    const formattedAmount = Number(amount) || 0;
    const rate = Number(price) || 0;
    const fiat = Number.isFinite(fiatBalance) ? fiatBalance : formattedAmount * rate;

    return {
        _amount: formattedAmount,
        _fiatBalance: fiat.toFixed(7),
        _price: rate,
        address,
        amount: formattedAmount.toFixed(12),
        decimals: normalizeDecimals(decimals),
        fiatBalance: parseFloat(fiat.toFixed(7)),
        image: image || "",
        name: name || symbol || "Unknown Token",
        price: rate.toFixed(6),
        symbol: symbol || "UNKNOWN",
        tokenType: "ERC-20",
    };
};

const buildEthplorerMaps = (tokens = []) => {
    const priceByContract = new Map();
    const metaByContract = new Map();

    for (const token of tokens) {
        const contract = token?.tokenInfo?.address?.toLowerCase();
        if (!contract) continue;

        priceByContract.set(contract, token.tokenInfo?.price?.rate || 0);
        metaByContract.set(contract, {
            decimals: normalizeDecimals(token.tokenInfo?.decimals),
            name: token.tokenInfo?.name,
            symbol: token.tokenInfo?.symbol,
        });
    }

    return { metaByContract, priceByContract };
};

const fetchEthplorerAddressInfo = async (address) => {
    const { data } = await ethplorerInstance.get(
        `https://api.ethplorer.io/getAddressInfo/${address}?apiKey=${apiKeyEth}`
    );
    return data;
};

const fetchEthplorerPriceMaps = async (address) => {
    try {
        const data = await fetchEthplorerAddressInfo(address);
        const maps = buildEthplorerMaps(data?.tokens || []);
        return {
            ethBalance: data?.ETH?.balance ?? 0,
            ...maps,
        };
    } catch (error) {
        return {
            ethBalance: null,
            metaByContract: new Map(),
            priceByContract: new Map(),
        };
    }
};

const scoreAlchemyToken = (tokenBalance, priceByContract, metaByContract) => {
    const contract = String(tokenBalance.contractAddress || "").toLowerCase();
    const meta = metaByContract.get(contract);
    const decimals = meta?.decimals ?? 18;
    const amount = parseFloat(formatTokenBalance(tokenBalance.tokenBalance, decimals));
    const rate = priceByContract.get(contract) || 0;
    const fiatBalance = amount * rate;

    return {
        amount,
        contractAddress: tokenBalance.contractAddress,
        decimals,
        fiatBalance,
        meta,
        rate,
        rawBalance: tokenBalance.tokenBalance,
        sortValue: rate > 0 ? fiatBalance : amount,
    };
};

const isDustHolding = (row, minFiatUsd) => {
    if (!row || row.amount <= 0) return true;
    if (row.rate > 0) return row.fiatBalance < minFiatUsd;
    return false;
};

const getEthereumPortfolioViaAlchemy = async (address) => {
    const { maxTokens, minFiatUsd, metadataConcurrency } = getAddressOverviewLimits();

    const [nativeBalanceHex, tokenBalancesResult, ethplorerMaps] = await Promise.all([
        rpcRequest("ethereum", "eth_getBalance", [address, "latest"]),
        rpcRequest("ethereum", "alchemy_getTokenBalances", [address, "erc20"]),
        fetchEthplorerPriceMaps(address),
    ]);

    const nativeEthBalance = parseFloat(formatEther(nativeBalanceHex || "0x0"));
    const nonZeroBalances = (tokenBalancesResult?.tokenBalances || []).filter(
        (token) => parseHexBalance(token.tokenBalance) > 0n
    );

    const scored = nonZeroBalances
        .map((token) => scoreAlchemyToken(token, ethplorerMaps.priceByContract, ethplorerMaps.metaByContract))
        .filter((row) => !isDustHolding(row, minFiatUsd))
        .sort((left, right) => right.sortValue - left.sortValue);

    const topRows = scored.slice(0, maxTokens);
    const totalTokenCount = nonZeroBalances.length;

    const tokens = await mapWithConcurrency(topRows, metadataConcurrency, async (row) => {
        let symbol = row.meta?.symbol;
        let name = row.meta?.name;
        let decimals = row.decimals;
        let logo = null;

        if (!symbol || !name) {
            const metadata = await fetchTokenMetadata("ethereum", row.contractAddress);
            symbol = symbol || metadata?.symbol;
            name = name || metadata?.name;
            decimals = metadata?.decimals ?? decimals;
            logo = metadata?.logo || null;
        }

        return formatErc20HoldingRow({
            address: row.contractAddress,
            amount: row.amount,
            decimals,
            fiatBalance: row.fiatBalance,
            image: logo,
            name,
            price: row.rate,
            symbol,
        });
    });

    return {
        nativeEthBalance,
        tokens,
        totalTokenCount,
    };
};

const formatEthplorerTokensHardened = async (inputTokens = []) => {
    const { maxTokens, minFiatUsd, cmcConcurrency } = getAddressOverviewLimits();

    const prepared = (inputTokens || [])
        .map((token) => {
            const { tokenInfo, rawBalance } = token;
            if (!tokenInfo) return null;

            const decimals = normalizeDecimals(tokenInfo.decimals);
            const rate = tokenInfo.price?.rate || 0;
            const formattedAmount = parseFloat(rawBalance) / Math.pow(10, decimals);
            const fiatBalance = formattedAmount * rate;

            return {
                address: tokenInfo.address,
                decimals,
                fiatBalance,
                formattedAmount,
                name: tokenInfo.name,
                rate,
                symbol: tokenInfo.symbol,
            };
        })
        .filter((row) => row && row.formattedAmount > 0)
        .filter((row) => row.rate <= 0 || row.fiatBalance >= minFiatUsd)
        .sort((left, right) => {
            const leftValue = left.rate > 0 ? left.fiatBalance : left.formattedAmount;
            const rightValue = right.rate > 0 ? right.fiatBalance : right.formattedAmount;
            return rightValue - leftValue;
        });

    const totalTokenCount = prepared.length;
    const topRows = prepared.slice(0, maxTokens);
    const symbolImageCache = new Map();

    const formattedTokens = await mapWithConcurrency(topRows, cmcConcurrency, async (row) => {
        let image = "";
        if (row.symbol) {
            if (!symbolImageCache.has(row.symbol)) {
                try {
                    const idAseet = await idAseet_(row.symbol);
                    symbolImageCache.set(row.symbol, buildCmcImageUrl(idAseet?.idAseet));
                } catch (_) {
                    symbolImageCache.set(row.symbol, "");
                }
            }
            image = symbolImageCache.get(row.symbol) || "";
        }

        return formatErc20HoldingRow({
            address: row.address,
            amount: row.formattedAmount,
            decimals: row.decimals,
            fiatBalance: row.fiatBalance,
            image,
            name: row.name,
            price: row.rate,
            symbol: row.symbol,
        });
    });

    return { tokens: formattedTokens, totalTokenCount };
};

const getEthereumPortfolioViaEthplorer = async (address) => {
    const data = await fetchEthplorerAddressInfo(address);
    const { tokens, totalTokenCount } = await formatEthplorerTokensHardened(data?.tokens || []);

    return {
        nativeEthBalance: data?.ETH?.balance ?? 0,
        tokens,
        totalTokenCount,
    };
};

const buildNativeEthHoldingRow = (nativeEthBalance, ethPrice) => ({
    amount: nativeEthBalance.toString(),
    fiatBalance: nativeEthBalance * ethPrice,
    image: ETH_NATIVE_LOGO,
    name: "Ethereum",
    price: ethPrice,
    symbol: "ETH",
    tokenType: "ETH",
});

const sumFiatBalance = (tokens) => tokens.reduce((total, token) => total + (token.fiatBalance || 0), 0);

const isAlchemyEthereumConfigured = () => Boolean(config.alchemy?.networks?.ethereum);

module.exports = {
    buildNativeEthHoldingRow,
    formatEthplorerTokensHardened,
    getEthereumPortfolioViaAlchemy,
    getEthereumPortfolioViaEthplorer,
    isAlchemyEthereumConfigured,
    sumFiatBalance,
};
