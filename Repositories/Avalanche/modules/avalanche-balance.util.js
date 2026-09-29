const { formatUnits } = require('ethers');

const mapRouteScanHolding = (token) => {
    if (!/^\d+$/.test(String(token.tokenQuantity)) || !Number.isInteger(token.tokenDecimals)) {
        throw new Error('invalid_avalanche_token_balance');
    }
    const amount = formatUnits(token.tokenQuantity, token.tokenDecimals);
    return { address: token.tokenAddress, amount, decimals: token.tokenDecimals,
        fiatBalance: Number(token.tokenValueInUsd || 0), price: String(token.tokenPrice || '0'),
        name: token.tokenName || token.tokenSymbol || token.tokenAddress,
        symbol: token.tokenSymbol, tokenType: 'ERC-20' };
};
module.exports = { mapRouteScanHolding };
