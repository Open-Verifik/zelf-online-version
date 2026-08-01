const { getCleanInstance } = require("../../../Core/axios");

const instance = getCleanInstance(15000);
const CACHE_TTL_MS = 30000;
let cachedPrice = "0";
let cachedAt = 0;

const getAptUsdPrice = async () => {
    if (cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) return cachedPrice;

    try {
        const { data } = await instance.get("https://api.binance.com/api/v3/ticker/price?symbol=APTUSDT");
        if (data?.price && Number(data.price) > 0) {
            cachedPrice = String(data.price);
            cachedAt = Date.now();
            return cachedPrice;
        }
    } catch (error) {
        console.error("Aptos Binance price:", error.message);
    }

    try {
        const { data } = await instance.get("https://api.coingecko.com/api/v3/simple/price?ids=aptos&vs_currencies=usd");
        if (data?.aptos?.usd && Number(data.aptos.usd) > 0) {
            cachedPrice = String(data.aptos.usd);
            cachedAt = Date.now();
            return cachedPrice;
        }
    } catch (error) {
        console.error("Aptos CoinGecko price:", error.message);
    }

    return cachedPrice;
};

const getAssetUsdPrice = (symbol, aptPrice) => {
    const normalized = String(symbol || "").toUpperCase();
    if (normalized === "APT") return String(aptPrice || "0");
    if (["USDC", "USDT", "DAI"].includes(normalized)) return "1";
    return "0";
};

module.exports = {
    getAptUsdPrice,
    getAssetUsdPrice,
};
