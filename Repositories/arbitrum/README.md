# Arbitrum One Blockchain Integration

This repository contains the backend integration for the Arbitrum One blockchain, providing comprehensive scraping and API functionality for Arbitrum addresses, transactions, and token data.

## Features

- ✅ **Address Balance Tracking** - Get native ETH balances on Arbitrum One
- ✅ **ERC20 Token Support** - Track all ERC20 tokens on Arbitrum One
- ✅ **Transaction History** - Complete transaction listing with pagination
- ✅ **Transaction Details** - Detailed transaction information
- ✅ **Gas Tracker** - Real-time gas price monitoring
- ✅ **EVM Compatibility** - Full Ethereum Virtual Machine support
- ✅ **Price Integration** - Real-time ETH price from Binance
- ✅ **Token Metadata** - Complete token information with icons
- ✅ **OKLink API Integration** - Primary data source for comprehensive blockchain data

## API Endpoints

### Address Information
```
GET /api/arbitrum/address/:address
```
Returns comprehensive address information including:
- Native ETH balance
- Token holdings
- Recent transactions
- Total fiat value

### Transaction History
```
GET /api/arbitrum/address/:address/transactions?page=0&show=25
```
Returns paginated transaction history for an address.

### Token Holdings
```
GET /api/arbitrum/address/:address/tokens
```
Returns all ERC20 token holdings for an address.

### Transaction Details
```
GET /api/arbitrum/address/:address/transaction/:id
```
Returns detailed information about a specific transaction.

### Portfolio Summary
```
GET /api/arbitrum/address/:address/portfolio
```
Returns comprehensive portfolio summary with total value and token breakdown.

### Gas Tracker
```
GET /api/arbitrum/gas-tracker
POST /api/arbitrum/gas-tracker
```
Returns current gas prices and transaction cost estimates.

## Data Sources

### Primary Sources
- **Arbitrum RPC** (`https://arb1.arbitrum.io/rpc`) - Native ETH balance and gas prices
- **OKLink API** - Transaction history and ERC20 token data (primary source)
- **Arbiscan** (`https://arbiscan.io`) - Fallback transaction details

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
- Used for all Arbitrum One transactions

## Common Tokens Supported

The integration includes support for popular Arbitrum One tokens:
- **USDC** - USD Coin
- **USDT** - Tether USD
- **WETH** - Wrapped Ether
- **ARB** - Arbitrum Token
- **GMX** - GMX Token
- **MAGIC** - Magic Token
- **LINK** - Chainlink Token
- **UNI** - Uniswap Token
- **DAI** - Dai Stablecoin
- **FRAX** - Frax Stablecoin

## Architecture

### Standardized Chain Formatter
The integration uses the standardized chain formatter to ensure consistent response format across all blockchain integrations.

### Error Handling
Comprehensive error handling with multiple fallback mechanisms:
1. Primary: OKLink API
2. Fallback: Arbiscan API
3. Final fallback: RPC calls

### Timeout Management
- Overall API timeout: 8 seconds
- Transaction fetch timeout: 6 seconds
- Individual API call timeouts: 5-10 seconds

## Implementation Notes

### OKLink API Integration
- Uses the same OKLink API key configuration as other blockchain integrations
- Follows the exact same pattern as Base integration for consistency
- Includes proper error handling and fallback mechanisms

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

## Testing

To test the integration, you can use the following test addresses:
- **Test Address**: `0x0000000000000000000000000000000000000000`
- **Real Address Example**: Any valid Arbitrum One address

### Example API Calls
```bash
# Get address information
GET /api/arbitrum/address/0xYourArbitrumAddress

# Get transaction history
GET /api/arbitrum/address/0xYourArbitrumAddress/transactions?page=0&show=10

# Get portfolio summary
GET /api/arbitrum/address/0xYourArbitrumAddress/portfolio
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