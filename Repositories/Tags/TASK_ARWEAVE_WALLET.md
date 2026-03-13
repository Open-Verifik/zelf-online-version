# Feature: Add Arweave Wallet Generation to Tags Module

## Overview

We need to extend our wallet generation capabilities to include Arweave. Currently, the system generates Ethereum, Bitcoin, Solana, and SUI wallets from a single 12-word mnemonic phrase. The goal is to derive an Arweave wallet (Public Address and Private Key) from this same mnemonic, allowing us to store the Arweave address in the ZelfProof public data.

## Requirements

### 1. Arweave Key Generation

-   **Input**: The same 12-word BIP39 mnemonic phrase used for other wallets.
-   **Output**:
    -   Arweave Public Address.
    -   Arweave Private Key (JWK format or whatever is standard for Arweave interaction).
-   **Constraint**: The generation must be deterministic based on the mnemonic.

### 2. Update `tags.module.js`

-   Modify `_createWalletsFromPhrase` function to include Arweave generation.
-   Ensure the returned object includes the Arweave wallet data.

### 3. Update Data Storage (`leaseTag`)

-   In the `leaseTag` function, extract the Arweave address.
-   Add the `arweaveAddress` to the `publicData` object so it is included in the ZelfProof.
-   Ensure the private key is handled securely (encrypted/stored) if required by the flow, similar to how SOL/ETH keys are handled.

## Technical Implementation Details

-   **File**: `modules/tags.module.js`
-   **Function**: `_createWalletsFromPhrase`

```javascript
// Current structure
const { eth, btc, solana, sui, zkProof, mnemonic } = await _createWalletsFromPhrase({ ... });

// Desired structure
const { eth, btc, solana, sui, arweave, zkProof, mnemonic } = await _createWalletsFromPhrase({ ... });
```

### Potential Dependencies

-   Look into libraries like `arweave-mnemonic-keys` or `bip39` + `arweave` to facilitate the key derivation.

## Acceptance Criteria

-   [x] Passing a 12-word mnemonic generates a valid Arweave address.
-   [x] The generated Arweave address is successfully added to the `publicData` of a leased tag.
-   [x] The process is deterministic (same mnemonic always = same Arweave address).
