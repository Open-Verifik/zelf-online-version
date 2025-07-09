# Walrus Module for Zelf

This module provides integration with the Walrus decentralized storage network for storing zelfName QR codes with metadata.

## Overview

The Walrus module replicates the functionality of the Arweave module, providing:
- Storage of zelfName QR code images as blobs on Walrus
- Metadata handling for zelfProof, password flags, and public data
- URL generation for accessing stored files
- File size validation (100KB limit)

## Installation

1. Install dependencies:
```bash
cd zelf-online-version/Repositories/Walrus
npm install
```

2. Set up environment variables in your `.env` file:
```env
# Walrus Configuration
WALRUS_NETWORK=testnet
WALRUS_PRIVATE_KEY=your_private_key_here
WALRUS_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
WALRUS_DEFAULT_EPOCHS=5
WALRUS_MAX_FILE_SIZE=102400
```

## Usage

### Import the module

```javascript
const WalrusModule = require('./Repositories/Walrus/modules/walrus.module');
```

### Store a zelfName QR Code

```javascript
const result = await WalrusModule.zelfNameRegistration(qrCodeBase64, {
  zelfProof: "encrypted_proof_data",
  hasPassword: "true",
  publicData: {
    ethAddress: "0x123...",
    solanaAddress: "ABC123...",
    btcAddress: "bc1...",
    zelfName: "example.zelf"
  }
});

console.log(result);
// {
//   blobId: "blob_id_here",
//   url: "https://walrus-testnet.mystenlabs.com/blob_id_here",
//   explorerUrl: "https://walruscan.com/testnet/blob/blob_id_here",
//   metadata: { ... },
//   epochs: 5,
//   network: "testnet"
// }
```

### Retrieve a stored file

```javascript
const base64Image = await WalrusModule.walrusIDToBase64(blobId);
```

### Search functionality

```javascript
const results = await WalrusModule.search({
  key: "zelfName",
  value: "example.zelf"
});
// Note: Search functionality is not yet implemented
```

## Configuration

The module uses the following configuration from `Core/config.js`:

- `walrus.network`: Network to use (testnet/mainnet)
- `walrus.privateKey`: Private key for signing transactions
- `walrus.suiRpcUrl`: Sui RPC endpoint URL
- `walrus.defaultEpochs`: Default storage duration in epochs
- `walrus.maxFileSize`: Maximum file size in bytes

## Key Features

1. **Decentralized Storage**: Files are stored on Walrus network with high availability
2. **Metadata Handling**: Supports all metadata fields from the original Arweave implementation
3. **Cost-Effective**: Uses WAL tokens for storage fees with configurable epochs
4. **Fault Tolerance**: Built-in error handling and retry mechanisms
5. **File Size Validation**: Prevents uploading files larger than 100KB

## Technical Details

- Uses Sui blockchain for coordination and metadata
- Stores files as blobs on Walrus storage nodes
- Requires WAL tokens for storage fees
- Each epoch on testnet lasts ~2 days
- Files are stored for specified number of epochs

## Future Enhancements

- [ ] Implement search functionality through Sui blockchain queries
- [ ] Add support for custom smart contracts for metadata storage
- [ ] Implement file deletion functionality
- [ ] Add batch upload support
- [ ] Create publisher/aggregator service integration

## Dependencies

- `@mysten/walrus`: Walrus SDK for blob storage
- `@mysten/sui`: Sui blockchain SDK
- `axios`: HTTP client for API calls

## Notes

- This module is currently configured for Walrus testnet
- Make sure to fund your wallet with both SUI and WAL tokens
- File size limit is set to 100KB to match Arweave implementation
- Search functionality is a placeholder and needs implementation 