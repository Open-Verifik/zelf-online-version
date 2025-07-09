# Walrus Module Setup Guide

This guide walks you through integrating the Walrus module into your existing Zelf application.

## Prerequisites

1. **Node.js** version 16 or higher
2. **npm** or **yarn** package manager
3. **Walrus Testnet** access and tokens
4. **Sui Testnet** access and tokens

## Step 1: Install Dependencies

From the project root directory:

```bash
cd zelf-online-version
npm install
```

If you encounter any issues, you can install the Walrus-specific dependencies separately:

```bash
npm install @mysten/walrus @mysten/sui.js
```

## Step 2: Environment Variables

Add the following environment variables to your `.env` file:

```env
# Walrus Configuration
WALRUS_NETWORK=testnet
WALRUS_PRIVATE_KEY=your_ed25519_private_key_hex
WALRUS_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
WALRUS_DEFAULT_EPOCHS=5
WALRUS_MAX_FILE_SIZE=102400

# Optional: Development settings
NODE_ENV=development
```

### How to get your private key:

1. **Generate a new keypair:**
   ```bash
   # Using Sui CLI
   sui keytool generate --key-scheme ed25519
   
   # Or using Node.js
   const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");
   const keypair = new Ed25519Keypair();
   console.log("Private key:", keypair.export().privateKey);
   ```

2. **Fund your wallet:**
   - Get SUI tokens from the [Sui Testnet Faucet](https://faucet.testnet.sui.io/)
   - Get WAL tokens from the [Walrus Testnet Faucet](https://walrus-testnet-faucet.mystenlabs.com/)

## Step 3: Integration with Existing Code

### Replace Arweave calls with Walrus

In your existing code where you call `ArweaveModule.zelfNameRegistration`, you can now also use:

```javascript
const WalrusModule = require('./Repositories/Walrus/modules/walrus.module');

// Instead of or in addition to:
// const arweaveRecord = await ArweaveModule.zelfNameRegistration(image, metadata);

// Use Walrus:
const walrusRecord = await WalrusModule.zelfNameRegistration(image, metadata);
```

### Example integration in ZNS modules

In `zelf-online-version/Repositories/ZelfNameService/modules/zns.module.js`:

```javascript
// Add this import at the top
const WalrusModule = require("../../Walrus/modules/walrus.module");

// In the _confirmFreeZelfName function, add:
zelfNameObject.walrus = await WalrusModule.zelfNameRegistration(zelfNameObject.image, {
    hasPassword: metadata.hasPassword,
    zelfProof: metadata.zelfProof,
    publicData: metadata,
});
```

## Step 4: Testing

### Test the module

```bash
cd zelf-online-version/Repositories/Walrus
node example.js
```

### Expected output:
```
🎯 Walrus Module Example
========================
🚀 Starting Walrus upload example...
📦 ZelfName Object: { ... }
✅ Upload successful!
📄 Result: {
  "blobId": "...",
  "url": "https://walrus-testnet.mystenlabs.com/...",
  "explorerUrl": "https://walruscan.com/testnet/blob/...",
  "metadata": { ... },
  "epochs": 5,
  "network": "testnet"
}
```

## Step 5: Production Deployment

### For production, update your environment variables:

```env
WALRUS_NETWORK=mainnet
WALRUS_PRIVATE_KEY=your_mainnet_private_key
WALRUS_SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
WALRUS_DEFAULT_EPOCHS=100
```

### Security considerations:

1. **Never commit private keys** to version control
2. **Use environment variables** for all sensitive configuration
3. **Rotate keys regularly** in production
4. **Monitor wallet balances** to ensure sufficient funds

## Step 6: Monitoring and Maintenance

### Monitoring wallet balance:

```javascript
const { SuiClient } = require("@mysten/sui.js/client");
const { Ed25519Keypair } = require("@mysten/sui.js/keypairs/ed25519");

async function checkBalance() {
    const client = new SuiClient({ url: getFullnodeUrl("testnet") });
    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(process.env.WALRUS_PRIVATE_KEY, "hex"));
    
    const balance = await client.getBalance({
        owner: keypair.toSuiAddress(),
        coinType: "0x2::sui::SUI"
    });
    
    console.log("SUI Balance:", balance.totalBalance);
}
```

### Setting up alerts:

1. **Low balance alerts** for SUI and WAL tokens
2. **Failed upload notifications**
3. **Epoch expiration warnings**

## Step 7: Gradual Migration

### Phase 1: Dual Storage
Store files on both Arweave and Walrus:

```javascript
const [arweaveRecord, walrusRecord] = await Promise.all([
    ArweaveModule.zelfNameRegistration(image, metadata),
    WalrusModule.zelfNameRegistration(image, metadata)
]);

// Store both records
zelfNameObject.arweave = arweaveRecord;
zelfNameObject.walrus = walrusRecord;
```

### Phase 2: Primary Walrus with Arweave Fallback
```javascript
let primaryRecord;
try {
    primaryRecord = await WalrusModule.zelfNameRegistration(image, metadata);
} catch (error) {
    console.warn("Walrus upload failed, falling back to Arweave:", error);
    primaryRecord = await ArweaveModule.zelfNameRegistration(image, metadata);
}
```

### Phase 3: Walrus Only
Remove Arweave calls once you're confident in the Walrus implementation.

## Troubleshooting

### Common Issues:

1. **"Insufficient funds" error:**
   - Check SUI balance for transaction fees
   - Check WAL balance for storage fees
   - Verify network (testnet vs mainnet)

2. **"Invalid private key" error:**
   - Ensure the private key is in hex format
   - Verify the key is for the correct network

3. **Network connectivity issues:**
   - Check RPC endpoint URL
   - Verify firewall settings
   - Try different RPC endpoints

4. **File size too large:**
   - Current limit is 100KB
   - Consider image compression
   - Split large files if necessary

### Debug mode:

Add debugging to your environment:

```env
DEBUG=walrus:*
NODE_ENV=development
```

## Support

For issues with:
- **Walrus protocol:** [Walrus Discord](https://discord.gg/walrus)
- **Sui blockchain:** [Sui Discord](https://discord.gg/sui)
- **This implementation:** Check the GitHub repository issues

## Next Steps

1. **Implement search functionality** using Sui blockchain queries
2. **Add metadata smart contracts** for better search capabilities
3. **Create publisher/aggregator services** for better performance
4. **Add batch upload support** for multiple files
5. **Implement file deletion** when supported by Walrus 