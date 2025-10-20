# BlockDAG Integration

This repository contains the BlockDAG blockchain integration for the Zelf platform.

## Overview

BlockDAG is an EVM-compatible blockchain. This integration allows users to:
- Check wallet balances
- View token holdings
- Fetch transaction history
- Get transaction details
- Track gas prices
- View portfolio summaries

## RPC Configuration

- **RPC URL**: `http://13.234.176.105:18545`
- **Chain ID**: `1043`
- **Currency Symbol**: `BDAG`
- **Explorer**: `https://primordial.bdagscan.com`

## File Structure

```
BlockDAG/
├── controllers/
│   └── blockdag.controller.js    # Request handlers for all endpoints
├── middlewares/
│   └── blockdag.middleware.js    # Validation middleware
├── modules/
│   └── blockdag.module.js        # Core business logic and RPC calls
├── routes/
│   └── blockdag.routes.js        # API route definitions
├── utils/                         # Utility functions (reserved for future use)
└── data/                          # Static data (reserved for future use)
```

## API Endpoints

All endpoints require JWT authentication via `SessionMiddleware.validateJWT`.

### 1. Get Address Information
```
GET /api/blockdag/address/:address
```
Returns comprehensive address information including balance, tokens, and recent transactions.

**Example Response:**
```json
{
  "address": "0x...",
  "balance": "100.5",
  "fiatBalance": 100.5,
  "totalPortfolioValue": 150.75,
  "price": "0.001",
  "type": "system_account",
  "account": {
    "asset": "BDAG",
    "fiatBalance": "100.5",
    "price": "0.001"
  },
  "tokenHoldings": {
    "total": 5,
    "balance": "150.75",
    "tokens": [...]
  },
  "transactions": [...]
}
```

### 2. Get Transactions
```
GET /api/blockdag/address/:address/transactions?page=0&show=20
```
Returns paginated transaction list for an address.

### 3. Get Tokens
```
GET /api/blockdag/address/:address/tokens
```
Returns ERC20 token holdings for an address.

### 4. Get Transaction Status
```
GET /api/blockdag/address/:address/transaction/:id
```
Returns detailed information about a specific transaction.

**Example Response:**
```json
{
  "blockNumber": 12345,
  "confirmations": "1",
  "from": "0x...",
  "to": "0x...",
  "value": "10.5",
  "gas": "21000",
  "gasPrice": "1000000000",
  "gasUsed": "21000",
  "nonce": "5",
  "input": "0x",
  "hash": "0x...",
  "status": "success",
  "transactionIndex": "0"
}
```

### 5. Get Portfolio Summary
```
GET /api/blockdag/address/:address/portfolio
```
Returns portfolio summary including total value, token count, and transaction count.

### 6. Get Gas Tracker
```
GET /api/blockdag/gas-tracker
POST /api/blockdag/gas-tracker
```
Returns current gas prices for different transaction speeds.

**Example Response:**
```json
{
  "SafeLow": 8,
  "Standard": 10,
  "Fast": 12,
  "Fastest": 15,
  "safeLowWait": "1-2",
  "standardWait": "1",
  "fastWait": "1",
  "fastestWait": "1"
}
```

## RPC Methods Used

The integration uses the following JSON-RPC methods:

1. **eth_getBalance** - Get native BDAG balance
2. **eth_blockNumber** - Get latest block number
3. **eth_getTransactionCount** - Get transaction count (nonce)
4. **eth_getTransactionByHash** - Get transaction details
5. **eth_getTransactionReceipt** - Get transaction receipt and status
6. **eth_gasPrice** - Get current gas price
7. **eth_call** - Execute smart contract calls (for token balances)

## Implementation Details

### Balance Queries
- Uses `eth_getBalance` RPC method to fetch native BDAG balance
- Converts from Wei (10^18) to BDAG
- Calculates fiat value using BDAG price from Binance

### Transaction Queries
- Uses `eth_getTransactionCount` to get total transaction count
- Uses `eth_getTransactionByHash` for specific transaction details
- Uses `eth_getTransactionReceipt` for transaction status and gas used

### Token Queries
- Currently returns empty array (placeholder)
- Can be expanded with ERC20 token detection
- Would use `eth_call` with balanceOf function

### Gas Tracker
- Uses `eth_gasPrice` to get current gas price
- Calculates different speed tiers (SafeLow, Standard, Fast, Fastest)
- Provides multipliers: 0.8x, 1x, 1.2x, 1.5x respectively

## Error Handling

All functions include comprehensive error handling:
- Timeout protection (8 seconds for address queries, 6 seconds for transactions)
- Graceful fallbacks when API calls fail
- Detailed error logging
- User-friendly error messages

## Future Enhancements

1. **Explorer Integration**: Integrate with BlockDAG explorer API for detailed transaction history
2. **Token Detection**: Add automatic ERC20 token detection and balance fetching
3. **Price Feeds**: Add proper BDAG price feed when listed on exchanges
4. **Caching**: Implement Redis caching for frequently accessed data
5. **WebSocket Support**: Add real-time updates for transactions and balances
6. **NFT Support**: Add NFT detection and metadata fetching

## Testing

To test the integration:

```bash
# Start the server
npm start

# Test balance endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:PORT/api/blockdag/address/0xYOUR_ADDRESS

# Test transaction endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:PORT/api/blockdag/address/0xYOUR_ADDRESS/transactions?page=0&show=10
```

## Dependencies

- `axios` - HTTP client for RPC calls
- `moment` - Date formatting
- `joi` - Request validation
- `https` - HTTPS agent configuration

## Notes

- BlockDAG is EVM-compatible, so it uses Ethereum JSON-RPC standards
- The RPC endpoint requires HTTP connection (not HTTPS)
- BDAG price defaults to $0.001 if not available on exchanges
- Transaction history may be limited until explorer API integration is complete

## Maintenance

This integration should be maintained by:
1. Monitoring RPC endpoint availability
2. Updating BDAG price feed when listed on exchanges
3. Expanding token detection as BlockDAG ecosystem grows
4. Adding new features as BlockDAG protocol evolves

## Contact

For issues or questions about this integration, please contact the Zelf development team.

