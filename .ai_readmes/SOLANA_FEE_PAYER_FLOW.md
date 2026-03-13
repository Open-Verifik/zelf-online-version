# Solana Fee Payer Payment Flow

## Overview

This implementation allows users to pay with ZNS tokens **without needing SOL for gas fees**. The backend (service) pays all transaction fees using the **fee payer pattern**.

## How It Works

### Flow Diagram

```
User                    Frontend                Backend                 Solana
 |                         |                        |                      |
 |-- Click "Pay" --------->|                        |                      |
 |                         |-- Create TX ---------->|                      |
 |                         |                        |-- Build TX --------->|
 |                         |<-- Unsigned TX --------|                      |
 |<-- Sign Request --------|                        |                      |
 |-- Sign with Wallet ---->|                        |                      |
 |                         |-- Submit Signed TX --->|                      |
 |                         |                        |-- Add Fee Payer ---->|
 |                         |                        |-- Submit TX -------->|
 |                         |                        |<-- TX Hash ----------|
 |                         |<-- TX Hash ------------|                      |
 |<-- Payment Success -----|                        |                      |
 |                         |                        |                      |
 |-- Retry API with TX --->|-- API + Headers ------>|                      |
 |                         |                        |-- Verify Payment --->|
 |                         |                        |<-- Verified ---------|
 |                         |<-- Encrypted Data -----|                      |
```

## API Endpoints

### 1. Create Payment Transaction

**Endpoint**: `POST /api/solana/payment/create`

**Request**:

```json
{
	"userWallet": "4ir59MN1KqPnpRsxgu93uwsGiMNGnEfEPDk1Y85aCqs",
	"amount": 0.1
}
```

**Response**:

```json
{
	"success": true,
	"transaction": "base64_encoded_transaction",
	"message": "Transaction created. Please sign with your wallet.",
	"details": {
		"amount": 0.1,
		"token": "ZNS",
		"from": "4ir59MN1KqPnpRsxgu93uwsGiMNGnEfEPDk1Y85aCqs",
		"to": "ServiceWalletAddress",
		"feePaidBy": "service"
	}
}
```

### 2. Submit Signed Transaction

**Endpoint**: `POST /api/solana/payment/submit`

**Request**:

```json
{
	"signedTransaction": "base64_encoded_signed_transaction"
}
```

**Response**:

```json
{
	"success": true,
	"transactionHash": "5j7s8K9mN2pQ3rT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3",
	"message": "Payment successful! Use this transaction hash for your API request.",
	"explorerUrl": "https://solscan.io/tx/5j7s8K9mN2pQ3rT4uV5wX6yZ7aB8cD9eF0gH1iJ2kL3"
}
```

### 3. Get Service Wallet

**Endpoint**: `GET /api/solana/payment/service-wallet`

**Response**:

```json
{
	"success": true,
	"serviceWallet": "ServiceWalletPublicKey",
	"token": "ZNS",
	"tokenMint": "GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx"
}
```

## Frontend Integration

### Step 1: Request Payment Transaction

```typescript
const response = await fetch("/api/solana/payment/create", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		userWallet: walletAddress,
		amount: 0.1,
	}),
});

const { transaction } = await response.json();
```

### Step 2: Sign Transaction with Phantom/Solflare

```typescript
// Deserialize transaction
const transactionBuffer = Buffer.from(transaction, "base64");
const tx = Transaction.from(transactionBuffer);

// Sign with wallet (Phantom, Solflare, etc.)
const signedTx = await window.solana.signTransaction(tx);

// Serialize signed transaction
const signedTransactionBase64 = signedTx.serialize().toString("base64");
```

### Step 3: Submit Signed Transaction

```typescript
const submitResponse = await fetch("/api/solana/payment/submit", {
	method: "POST",
	headers: {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		signedTransaction: signedTransactionBase64,
	}),
});

const { transactionHash } = await submitResponse.json();
```

### Step 4: Use Transaction Hash for HTTP 402 Payment

```typescript
const apiResponse = await fetch('/api/zelf-proof/encrypt', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-payment-chain': 'solana',
    'x-payment-tx': transactionHash,
    'x-wallet-address': walletAddress,
    'x-payment-proof': 'signed_proof'
  },
  body: JSON.stringify({
    publicData: {...},
    faceBase64: '...',
    os: 'DESKTOP'
  })
});
```

## Environment Variables

Add to your `.env` file:

```bash
# Solana Configuration
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_SERVICE_WALLET_PRIVATE_KEY=your_base58_private_key_here

# For devnet testing
# SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com
```

## Required NPM Packages

```bash
npm install @solana/web3.js @solana/spl-token bs58
```

## Security Features

1. **Fee Payer Pattern**: Service pays gas, user only signs
2. **JWT Authentication**: All endpoints require valid JWT
3. **Transaction Verification**: Backend verifies transaction before submission
4. **Replay Protection**: Transaction hash tracked in payment middleware
5. **Confirmation Waiting**: Waits for blockchain confirmation before returning

## Benefits

✅ **No SOL Required**: Users don't need SOL for gas fees
✅ **Better UX**: Users only need ZNS tokens
✅ **Cost Effective**: Gas fees are minimal (~0.000005 SOL per transaction)
✅ **Secure**: User signs transaction, backend controls submission
✅ **Transparent**: Full transaction hash returned for verification

## Testing

### 1. Test on Devnet First

```bash
# Use devnet RPC
SOLANA_RPC_ENDPOINT=https://api.devnet.solana.com

# Get devnet SOL for service wallet
solana airdrop 1 <SERVICE_WALLET_ADDRESS> --url devnet
```

### 2. Test Payment Flow

1. Create transaction
2. Sign with wallet
3. Submit transaction
4. Verify transaction hash on Solscan
5. Use hash for HTTP 402 payment

### 3. Monitor Gas Costs

```javascript
// Check service wallet balance
const balance = await connection.getBalance(serviceWallet.publicKey);
console.log(`Service wallet balance: ${balance / 1_000_000_000} SOL`);
```

## Cost Analysis

**Per Transaction**:

-   Gas fee: ~0.000005 SOL (~$0.0001)
-   Very affordable for micro-payments

**Monthly Estimate** (1000 transactions):

-   Gas fees: 0.005 SOL (~$0.10)
-   Negligible cost for the service

## Next Steps

1. ✅ Backend endpoints created
2. ⏳ Frontend integration (ZelfProofs component)
3. ⏳ Wallet connection (Phantom/Solflare)
4. ⏳ Testing on devnet
5. ⏳ Production deployment

## Support

For issues or questions:

-   Check Solana docs: https://docs.solana.com
-   Solscan explorer: https://solscan.io
-   SPL Token docs: https://spl.solana.com/token
