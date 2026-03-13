# OP Mainnet (Optimism) Blockchain Integration

This repository contains the backend integration for the OP Mainnet (Optimism) blockchain, providing comprehensive scraping and API functionality for Optimism addresses, transactions, and token data.

## Features

- ✅ **Address Balance Tracking** - Get native ETH balances on OP Mainnet
- ✅ **ERC20 Token Support** - Track all ERC20 tokens on OP Mainnet
- ✅ **Transaction History** - Complete transaction listing with pagination
- ✅ **Transaction Details** - Detailed transaction information
- ✅ **Gas Tracker** - Real-time gas price monitoring (extremely low on Optimism!)
- ✅ **EVM Compatibility** - Full Ethereum Virtual Machine support
- ✅ **Price Integration** - Real-time ETH price from Binance
- ✅ **Token Metadata** - Complete token information with icons
- ✅ **OKLink API Integration** - Primary data source for comprehensive blockchain data
- ✅ **Layer 2 Optimization** - Optimized for Optimism's fast and cheap transactions

## API Endpoints

### Address Information
```
GET /api/optimism/address/:address
```
Returns comprehensive address information including:
- Native ETH balance
- Token holdings
- Recent transactions
- Total fiat value

### Transaction History
```
GET /api/optimism/address/:address/transactions?page=0&show=25
```
Returns paginated transaction history for an address.

### Token Holdings
```
GET /api/optimism/address/:address/tokens
```
Returns all ERC20 token holdings for an address.

### Transaction Details
```
GET /api/optimism/address/:address/transaction/:id
```
Returns detailed information about a specific transaction.

### Portfolio Summary
```
GET /api/optimism/address/:address/portfolio
```
Returns comprehensive portfolio summary with total value and token breakdown.

### Gas Tracker
```
GET /api/optimism/gas-tracker
POST /api/optimism/gas-tracker
```
Returns current gas prices and transaction cost estimates (very low on Optimism).

## Data Sources

### Primary Sources
- **Optimism RPC** (`https://mainnet.optimism.io`) - Native ETH balance and gas prices
- **OKLink API** - Transaction history and ERC20 token data (primary source)
- **Optimism Etherscan** (`https://api-optimistic.etherscan.io`) - Fallback transaction details

### Price Data
- **Binance API** - Real-time ETH and token prices
- **CoinMarketCap** - Token metadata and icons

## Address Format Supported

### EVM Address
```
0x2B4C76d0dc16BE1C31D4C1DC53bF9B45987Fc75c
```
- 42 characters long
- Starts with "0x"
- Used for all OP Mainnet transactions
- Same format as Ethereum mainnet

## Common Tokens Supported

The integration includes support for popular OP Mainnet tokens:
- **USDC** - USD Coin
- **USDT** - Tether USD
- **WETH** - Wrapped Ether
- **OP** - Optimism Token
- **SNX** - Synthetix Network Token
- **LINK** - Chainlink Token
- **UNI** - Uniswap Token
- **AAVE** - Aave Token
- **DAI** - Dai Stablecoin
- **LUSD** - Liquity USD
- **sUSD** - Synthetic USD

## Architecture

### Standardized Chain Formatter
The integration uses the standardized chain formatter to ensure consistent response format across all blockchain integrations.

### Error Handling
Comprehensive error handling with multiple fallback mechanisms:
1. Primary: OKLink API
2. Fallback: Optimism Etherscan API
3. Final fallback: RPC calls

### Timeout Management
- Overall API timeout: 8 seconds
- Transaction fetch timeout: 6 seconds
- Individual API call timeouts: 5-10 seconds

## Implementation Notes

### OKLink API Integration
- Uses the same OKLink API key configuration as other blockchain integrations
- Follows the exact same pattern as Base and Arbitrum integrations for consistency
- Includes proper error handling and fallback mechanisms

### Layer 2 Optimizations
- Takes advantage of Optimism's low gas fees
- Optimized for high transaction throughput
- Efficient batch processing where applicable

### Performance Optimization
- Parallel API calls where possible
- Controlled timeouts to prevent hanging
- Efficient token balance retrieval
- Cached price data when available

### Security Features
- Input validation for all address formats
- JWT authentication for all endpoints
- Rate limiting through session middleware
- Secure API key management

## Optimism-Specific Features

### Low Gas Costs
- Gas prices are typically 10-100x lower than Ethereum mainnet
- Faster transaction confirmation times
- Better user experience for frequent transactions

### DeFi Ecosystem
- Strong DeFi presence with protocols like Synthetix, Uniswap V3, Aave
- Native OP token for governance
- Growing ecosystem of Layer 2 specific applications

## Testing

To test the integration, you can use the following test addresses:
- **Test Address**: `0x0000000000000000000000000000000000000000`
- **Real Address Example**: Any valid OP Mainnet address

### Example API Calls
```bash
# Get address information
GET /api/optimism/address/0xYourOptimismAddress

# Get transaction history
GET /api/optimism/address/0xYourOptimismAddress/transactions?page=0&show=10

# Get portfolio summary
GET /api/optimism/address/0xYourOptimismAddress/portfolio
```

## Error Responses

The API returns standardized error responses:
```json
{
  "error": "Error message description"
}
```

Common error scenarios:
- Invalid address format
- API timeout
- Network connectivity issues
- Rate limiting

## Dependencies

- axios: HTTP client for API calls
- moment: Date/time formatting
- joi: Input validation
- standardized-chain-formatter: Response formatting
- oklink module: API key management

## Comparison with Other L2s

| Feature | OP Mainnet | Arbitrum One | Polygon |
|---------|------------|--------------|---------|
| **Gas Costs** | Very Low | Low | Medium |
| **Speed** | Fast (~2s) | Fast (~1s) | Fast (~2s) |
| **EVM Compatibility** | 100% | 99%+ | 100% |
| **TVL** | High | Very High | High |
| **Ecosystem** | Growing | Mature | Mature |

## Future Enhancements

- Support for Optimism's fault proofs
- Integration with Optimism's sequencer
- Support for cross-chain transactions
- Enhanced DeFi protocol integrations