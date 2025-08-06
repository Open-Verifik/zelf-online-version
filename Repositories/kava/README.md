# Kava Blockchain Integration

This repository contains the backend integration for the Kava blockchain, providing comprehensive scraping and API functionality for Kava addresses, transactions, and token data.

## Features

- ✅ **Address Balance Tracking** - Get native KAVA and EVM balances
- ✅ **ERC20 Token Support** - Track all ERC20 tokens on Kava EVM
- ✅ **Transaction History** - Complete transaction listing with pagination
- ✅ **Transaction Details** - Detailed transaction information
- ✅ **Gas Tracker** - Real-time gas price monitoring
- ✅ **Dual Address Support** - Both Cosmos (kava1...) and EVM (0x...) addresses
- ✅ **Price Integration** - Real-time KAVA price from Binance
- ✅ **Token Metadata** - Complete token information with icons

## API Endpoints

### Address Information
```
GET /api/kava/address/:id
```
Returns comprehensive address information including:
- Native KAVA balance
- EVM balance
- Token holdings
- Recent transactions
- Total fiat value

### Transaction History
```
GET /api/kava/address/:id/transactions?page=0&show=25
```
Returns paginated transaction history for an address.

### Transaction Details
```
GET /api/kava/transaction/:id
```
Returns detailed information about a specific transaction.

### Gas Tracker
```
GET /api/kava/gas-tracker
```
Returns current gas prices and transaction cost estimates.

## Data Sources

### Primary Sources
- **Kava API** (`https://api.kava.io`) - Native KAVA balance and Cosmos data
- **Kava EVM RPC** (`https://evm.kava.io`) - EVM balance and gas prices
- **OKLink API** - Transaction history and ERC20 token data
- **KavaScan** (`https://kavascan.com`) - Fallback transaction details

### Price Data
- **Binance API** - Real-time KAVA price
- **CoinMarketCap** - Token metadata and icons

## Address Formats Supported

### Cosmos Address
```
kava1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- 44 characters long
- Starts with "kava1"
- Used for native KAVA transactions

### EVM Address
```
0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6
```
- Standard Ethereum address format
- Used for EVM transactions and ERC20 tokens

## Installation

1. Ensure all dependencies are installed:
```bash
npm install axios moment cheerio web3-validator
```

2. Set up environment variables:
```bash
# OKLink API key for transaction data
OKLINK_API_KEY=your_oklink_api_key

# Binance API for price data
BINANCE_API_KEY=your_binance_api_key
```

3. Register the routes in your main server file:
```javascript
const kavaRoutes = require('./Repositories/kava/routes/kava-scrapping.route');
kavaRoutes(server);
```

## Usage Example

```javascript
const KavaModule = require('./Repositories/kava/modules/kava-scrapping.module');

// Get address information
const addressData = await KavaModule.getAddress({ 
    address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6" 
});

// Get transaction history
const transactions = await KavaModule.getTransactionsList({
    address: "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
    page: "0",
    show: "25"
});

// Get gas tracker
const gasTracker = await KavaModule.getGasTracker({});
```

## Testing

Run the test script to verify the integration:
```bash
node Repositories/kava/test-kava-integration.js
```

## Response Format

### Address Response
```json
{
  "address": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "balance": "1.234567",
  "evmBalance": "0.123456",
  "fiatBalance": 123.45,
  "type": "system_account",
  "account": {
    "asset": "KAVA",
    "fiatBalance": "123.45",
    "price": 0.389
  },
  "tokenHoldings": {
    "total": 5,
    "balance": "45.67",
    "tokens": [...]
  },
  "transactions": [...]
}
```

### Transaction Response
```json
{
  "age": "2 hours ago",
  "amount": "0.123456",
  "asset": "KAVA",
  "block": "16501617",
  "date": "2024-01-15T10:30:00Z",
  "from": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "hash": "0xaa76bc...cf72b479",
  "method": "Transfer",
  "to": "0x06Da82...5112626D",
  "traffic": "OUT",
  "txnFee": "0.001603"
}
```

## Error Handling

The module includes comprehensive error handling:
- Invalid address format validation
- API rate limiting protection
- Network timeout handling
- Graceful fallbacks for failed requests

## Rate Limits

- OKLink API: 10 requests per second
- Kava API: No strict limits
- KavaScan: Respectful scraping with delays

## Contributing

1. Follow the existing code patterns
2. Add proper error handling
3. Include JSDoc comments
4. Test with real Kava addresses
5. Update this README for any new features

## License

This integration follows the same license as the main project. 