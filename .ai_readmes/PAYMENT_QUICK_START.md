# HTTP 402 Payment System - Quick Start Guide

## 🚀 Getting Started with Solana (Already Configured!)

Since you already have the ZNS token on Solana, you can start with Solana payments immediately!

### Step 1: Install Dependencies

```bash
cd /Users/miguel/zelf
npm install @solana/web3.js ethers
```

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Solana Configuration (READY TO USE!)
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_SERVICE_WALLET=<YOUR_SOLANA_WALLET_ADDRESS>

# Avalanche (TODO: Deploy ZNS token first)
AVALANCHE_RPC_ENDPOINT=https://api.avax.network/ext/bc/C/rpc
AVALANCHE_ZNS_TOKEN=<DEPLOY_TOKEN_FIRST>
AVALANCHE_SERVICE_WALLET=<YOUR_AVALANCHE_WALLET>

# Base (TODO: Deploy ZNS token first)
BASE_RPC_ENDPOINT=https://mainnet.base.org
BASE_ZNS_TOKEN=<DEPLOY_TOKEN_FIRST>
BASE_SERVICE_WALLET=<YOUR_BASE_WALLET>
```

### Step 3: Test Solana Payment (Example)

```javascript
// Test file: test-solana-payment.js
const SolanaPayment = require("./Repositories/Solana/modules/payment-verification.module");

async function testSolanaPayment() {
	// Example transaction from a real ZNS transfer
	const result = await SolanaPayment.verifyPayment({
		txHash: "YOUR_TEST_TX_HASH",
		expectedAmount: 0.1,
		userWallet: "USER_WALLET_ADDRESS",
	});

	console.log("✅ Payment Valid:", result.valid);
	console.log("📊 Details:", JSON.stringify(result.details, null, 2));
}

testSolanaPayment().catch(console.error);
```

Run test:

```bash
node test-solana-payment.js
```

### Step 4: Make Your First Paid API Call

```bash
# 1. First request (will return 402)
curl -X POST http://localhost:3050/api/zelf-proof/encrypt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "publicData": {"test": "data"},
    "faceBase64": "...",
    "os": "DESKTOP"
  }'

# Response will show payment instructions

# 2. Send 0.1 ZNS tokens to service wallet on Solana
# Use Phantom, Solflare, or any Solana wallet

# 3. Retry with payment headers
curl -X POST http://localhost:3050/api/zelf-proof/encrypt \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "x-payment-chain: solana" \
  -H "x-payment-tx: YOUR_TRANSACTION_SIGNATURE" \
  -H "x-wallet-address: YOUR_SOLANA_WALLET" \
  -H "Content-Type: application/json" \
  -d '{
    "publicData": {"test": "data"},
    "faceBase64": "...",
    "os": "DESKTOP"
  }'
```

## 📋 Current Pricing

| Endpoint           | Cost     | Description  |
| ------------------ | -------- | ------------ |
| `/encrypt`         | 0.1 ZNS  | Encrypt data |
| `/encrypt-qr-code` | 0.15 ZNS | Encrypt + QR |
| `/decrypt`         | 0.05 ZNS | Decrypt data |
| `/preview`         | 0.01 ZNS | Preview only |

## 🔧 Customizing Prices

Edit `/Repositories/ZelfProof/middlewares/payment.middleware.js`:

```javascript
const PAYMENT_CONFIG = {
	"/api/zelf-proof/encrypt": {
		cost: 0.1, // Change this value
		chains: ["solana", "avalanche", "base"],
		description: "ZelfProof Encryption Service",
	},
	// ... other endpoints
};
```

## 🌐 Adding Avalanche & Base Support

### For Avalanche:

1. **Deploy ZNS Token to Avalanche C-Chain**

    - Use your existing ERC20 contract
    - Deploy to Avalanche mainnet
    - Note the contract address

2. **Update Configuration**

    ```bash
    AVALANCHE_ZNS_TOKEN=0xYOUR_TOKEN_ADDRESS
    AVALANCHE_SERVICE_WALLET=0xYOUR_WALLET
    ```

3. **Test**
    ```javascript
    const AvalanchePayment = require("./Repositories/Avalanche/modules/payment-verification.module");
    // Same test as Solana
    ```

### For Base:

1. **Deploy ZNS Token to Base**

    - Use your existing ERC20 contract
    - Deploy to Base mainnet
    - Note the contract address

2. **Update Configuration**

    ```bash
    BASE_ZNS_TOKEN=0xYOUR_TOKEN_ADDRESS
    BASE_SERVICE_WALLET=0xYOUR_WALLET
    ```

3. **Test**
    ```javascript
    const BasePayment = require("./Repositories/base/modules/payment-verification.module");
    // Same test as Solana
    ```

## 🎯 Next Steps

### Immediate (Solana Only):

-   [x] Payment middleware created
-   [x] Solana verification module created
-   [ ] Set `SOLANA_SERVICE_WALLET` in .env
-   [ ] Test with real transaction
-   [ ] Deploy to production

### Short Term (Add Avalanche):

-   [ ] Deploy ZNS to Avalanche
-   [ ] Update `AVALANCHE_ZNS_TOKEN`
-   [ ] Test Avalanche payments
-   [ ] Update frontend to support Avalanche

### Medium Term (Add Base):

-   [ ] Deploy ZNS to Base
-   [ ] Update `BASE_ZNS_TOKEN`
-   [ ] Test Base payments
-   [ ] Update frontend to support Base

### Long Term:

-   [ ] Add payment database table
-   [ ] Implement Redis caching
-   [ ] Build payment analytics dashboard
-   [ ] Add subscription bypass logic
-   [ ] Create frontend payment UI

## 🐛 Troubleshooting

### Payment Not Verified

1. Check transaction on Solscan/Snowtrace/Basescan
2. Verify sufficient confirmations
3. Ensure correct token (ZNS)
4. Verify recipient is service wallet
5. Check amount is >= required

### 402 Error Still Appearing

1. Verify headers are included
2. Check transaction hash is correct
3. Ensure chain name matches
4. Wait for confirmations

### Transaction Already Used

-   Each transaction can only be used once
-   Send a new payment for new request

## 📞 Support

-   **Documentation**: `/Users/miguel/zelf/HTTP_402_PAYMENT_ARCHITECTURE.md`
-   **ZNS Token (Solana)**: `GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx`
-   **Explorer**: https://solscan.io/token/GfF6PSkH8bKLkws5RMFdzgASwcVbgCfhhKfp8zeoFBkx

## 🎉 You're Ready!

The payment system is now integrated and ready to use with Solana. Once you deploy ZNS to Avalanche and Base, those chains will work automatically with the same architecture!
