# Tron Blockchain Integration

This repository contains the backend integration for the Tron blockchain, providing comprehensive scraping and API functionality for Tron addresses, transactions, and token data.

## Features

- ✅ **Address Balance Tracking** - Get native TRX balances
- ✅ **TRC20 Token Support** - Track all TRC20 tokens on Tron
- ✅ **Transaction History** - Complete transaction listing with pagination
- ✅ **Transaction Details** - Detailed transaction information
- ✅ **Energy & Bandwidth Tracker** - Monitor Tron's unique resource system
- ✅ **Price Integration** - Real-time TRX price from Binance
- ✅ **Token Metadata** - Complete token information with icons
- ✅ **OKLink API Integration** - Primary data source for comprehensive blockchain data
- ✅ **Tron-Specific Features** - Energy, bandwidth, and freeze mechanisms

## API Endpoints

### Address Information
```
GET /api/tron/address/:address
```
Returns comprehensive address information including:
- Native TRX balance
- TRC20 token holdings
- Recent transactions
- Total fiat value

### Transaction History
```
GET /api/tron/address/:address/transactions?page=0&show=25
```
Returns paginated transaction history for an address.

### Token Holdings
```
GET /api/tron/address/:address/tokens
```
Returns all TRC20 token holdings for an address.

### Transaction Details
```
GET /api/tron/address/:address/transaction/:id
```
Returns detailed information about a specific transaction.

### Portfolio Summary
```
GET /api/tron/address/:address/portfolio
```
Returns comprehensive portfolio summary with total value and token breakdown.

### Energy & Bandwidth Tracker
```
GET /api/tron/energy-tracker
POST /api/tron/energy-tracker
```
Returns current energy and bandwidth costs, freeze requirements, and recommendations.

## Data Sources

### Primary Sources
- **Tron Grid API** (`https://api.trongrid.io`) - Native TRX balance and account data
- **OKLink API** - Transaction history and TRC20 token data (primary source)
- **TronScan API** (`https://apilist.tronscanapi.com`) - Fallback transaction details

### Price Data
- **Binance API** - Real-time TRX and token prices
- **CoinMarketCap** - Token metadata and icons

## Address Format Supported

### Tron Address
```
TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH
```
- 34 characters long
- Starts with "T"
- Base58 encoded format
- Used for all Tron transactions

## Common Tokens Supported

The integration includes support for popular Tron tokens:
- **USDT** - Tether USD (most popular stablecoin on Tron)
- **USDC** - USD Coin
- **USDJ** - JUST USD (Tron native stablecoin)
- **BTT** - BitTorrent Token
- **WIN** - WINk Token
- **SUN** - SUN Token
- **JST** - JUST Token
- **NFT** - APENFT Token
- **WTRX** - Wrapped TRX
- **TUSD** - TrueUSD

## Architecture

### Standardized Chain Formatter
The integration uses the standardized chain formatter to ensure consistent response format across all blockchain integrations.

### Error Handling
Comprehensive error handling with multiple fallback mechanisms:
1. Primary: OKLink API
2. Fallback: TronScan API
3. Final fallback: Tron Grid API calls

### Timeout Management
- Overall API timeout: 8 seconds
- Transaction fetch timeout: 6 seconds
- Individual API call timeouts: 5-10 seconds

## Implementation Notes

### OKLink API Integration
- Uses the same OKLink API key configuration as other blockchain integrations
- Follows the exact same pattern as other integrations for consistency
- Includes proper error handling and fallback mechanisms

### Tron-Specific Features

#### Energy and Bandwidth System
Tron uses a unique resource system instead of traditional gas:
- **Energy**: Required for smart contract execution
- **Bandwidth**: Required for transaction processing
- **Freeze Mechanism**: Users can freeze TRX to obtain these resources

#### Transaction Costs
- Basic TRX transfers: Free (using daily bandwidth allowance)
- Smart contract calls: Require energy
- Token transfers: May require energy depending on contract

### Performance Optimization
- Parallel API calls where possible
- Controlled timeouts to prevent hanging
- Efficient token balance retrieval
- Multiple fallback APIs for reliability

### Security Features
- Input validation for Tron address format (Base58)
- JWT authentication for all endpoints
- Rate limiting through session middleware
- Secure API key management

## Tron-Specific Advantages

### Low Transaction Costs
- Free basic transactions with bandwidth allowance
- Very low energy costs for smart contracts
- No gas fee volatility like Ethereum

### High Throughput
- ~2000 transactions per second
- 3-second block confirmation time
- Excellent for DeFi and DApp usage

### Energy Efficiency
- Delegated Proof of Stake consensus
- Environmentally friendly compared to PoW chains
- Efficient resource allocation system

## Testing

To test the integration, you can use the following test addresses:
- **Test Address**: `TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH` (Example Tron address)
- **USDT Contract**: `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`

### Example API Calls
```bash
# Get address information
GET /api/tron/address/TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH

# Get transaction history
GET /api/tron/address/TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH/transactions?page=0&show=10

# Get portfolio summary
GET /api/tron/address/TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH/portfolio
```

## Error Responses

The API returns standardized error responses:
```json
{
  "error": "Error message description"
}
```

Common error scenarios:
- Invalid address format (must be Base58 starting with 'T')
- API timeout
- Network connectivity issues
- Rate limiting

## Energy & Bandwidth Guide

### Resource Requirements
- **TRX Transfer**: ~268 bandwidth (free with daily allowance)
- **TRC20 Transfer**: ~345 bandwidth + ~14,000 energy
- **Smart Contract Call**: Varies by complexity

### Freeze Recommendations
- **Light Usage**: 100 TRX frozen
- **Regular Usage**: 1,000 TRX frozen
- **Heavy Usage**: 10,000+ TRX frozen

### Cost Calculation
- **Energy Price**: ~420 SUN per unit
- **Bandwidth Price**: ~1,000 SUN per unit
- **1 TRX** = 1,000,000 SUN

## Dependencies

- axios: HTTP client for API calls
- moment: Date/time formatting
- joi: Input validation
- standardized-chain-formatter: Response formatting
- oklink module: API key management

## Comparison with Other Blockchains

| Feature | Tron | Ethereum | BSC | Polygon |
|---------|------|----------|-----|---------|
| **Transaction Cost** | Very Low/Free | High | Low | Very Low |
| **Speed** | Fast (~3s) | Slow (~15s) | Fast (~3s) | Fast (~2s) |
| **Throughput** | 2000 TPS | 15 TPS | 100 TPS | 65000 TPS |
| **Resource Model** | Energy/Bandwidth | Gas | Gas | Gas |
| **Stablecoin Adoption** | Very High (USDT) | High | Medium | Medium |

## DeFi Ecosystem

### Major DApps
- **JustSwap**: DEX and DeFi protocol
- **SUN.io**: Comprehensive DeFi platform
- **WINk**: Gaming and betting platform
- **APENFT**: NFT marketplace

### Stablecoin Dominance
- Tron hosts the largest amount of USDT in circulation
- Major choice for stablecoin transfers due to low fees
- High liquidity and adoption in Asian markets

## Future Enhancements

- Support for Tron's upcoming privacy features
- Integration with DeFi protocol APIs
- Enhanced energy/bandwidth optimization
- Cross-chain bridge integration