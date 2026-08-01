# Aptos (APT) backend

Shared Aptos contract for the Web Extension, Android and iOS. It follows the same backend layering and deployment model used by TON, but uses the official Aptos TypeScript SDK and the official Fullnode/Indexer APIs.

## Network and credentials

The default configuration is Aptos mainnet. The official Fullnode and Indexer permit anonymous requests, but those requests have substantially lower limits. A local smoke test can run without credentials; **request a private Geomi/Aptos server API key before production QA or load testing** so fungible assets and complete activity history are reliable.

```env
APTOS_NETWORK=mainnet
APTOS_FULLNODE_URL=https://api.mainnet.aptoslabs.com/v1
APTOS_INDEXER_URL=https://api.mainnet.aptoslabs.com/v1/graphql
APTOS_API_KEY=your-geomi-server-key
# APTOS_TIMEOUT_MS=30000
# APTOS_MAX_GAS_AMOUNT=200000
```

- `APTOS_API_KEY` is technically optional and is sent as a Bearer token by the official SDK. It is operationally required for this production backend: anonymous traffic can hit the shared per-IP compute limit during ordinary dashboard testing. Create a **server** key using the [Geomi API-key guide](https://geomi.dev/docs/api-keys) and keep it in backend secrets; do not embed it in Android, iOS or the extension.
- A provider such as QuickNode can also be configured through its complete authenticated Fullnode/Indexer URLs. No private key or service wallet is required for dashboard, history, gas estimation or user transfers.
- When switching `APTOS_NETWORK` to `testnet` or `devnet`, update both URLs too, or omit the URL overrides so the SDK selects the official endpoints for that network.
- Unlike a tag-payment integration, this scope does not deploy a Move contract and does not require an Aptos service wallet.

## Canonical derivation

All clients must derive the legacy Ed25519 account at the Ledger-compatible BIP44 path:

```text
m/44'/637'/0'/0'/0'
```

Shared verification vector:

```text
mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about
address:  0xeb663b681209e7087d681c5d3eed12aaa8e1915e7c87794542c3f96e94b3d3bf
pubkey:   0xa686f0309ab80312979606cfccc10ea2740147ae6888351488d11c46f08fbf60
scheme:   Ed25519
```

`aptosAddress` is persisted in the Zelf ID `publicData` address bundle. New leases and recovery derive it immediately; opening an older Zelf ID backfills and republishes it through the existing synchronization flow.

## Protected API

All endpoints require the existing session JWT.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/aptos/address/:address` | Dashboard: native APT balance, fungible assets, USD value and 10 recent activities |
| `GET` | `/api/aptos/address/:address/tokens?page=0&show=10` | Paginated fungible-asset holdings |
| `GET` | `/api/aptos/address/:address/transactions?page=0&show=10` | Paginated fungible-asset activity history |
| `GET` | `/api/aptos/transaction/:hash` | Transaction state/detail |
| `POST` | `/api/aptos/transfer/estimate` | Simulate a native APT transfer without a mnemonic or signature |
| `POST` | `/api/aptos/transfer/send` | Compatibility flow that derives, signs and broadcasts through the authenticated backend |

### Gas estimate

Request:

```json
{
  "fromAddress": "0x...",
  "toAddress": "0x...",
  "amountApt": "0.25"
}
```

Response fields include `amountOctas`, `gasUsed`, `gasUnitPriceOctas`, `estimatedFeeOctas`, `estimatedFeeApt`, `maxGasAmount`, `maxFeeOctas`, `maxFeeApt`, `success` and `vmStatus`. Amounts are decimal strings; the backend never uses floating-point arithmetic for APT-to-octa conversion.

### Send

Request:

```json
{
  "mnemonic": "encrypted/secure-channel value resolved by the calling client flow",
  "toAddress": "0x...",
  "amountApt": "0.25",
  "waitForConfirmation": false
}
```

The endpoint simulates before signing. It never returns a private key, mnemonic or signed bytes. With `waitForConfirmation: false` it returns `status: "pending"` and `txHash`; clients poll the transaction-detail endpoint. With `true`, it waits for Fullnode confirmation within `APTOS_TIMEOUT_MS`.

## Signing responsibility

- **Web Extension:** derive and sign locally with the official SDK/Ledger. Use the backend for dashboard, history, transaction detail and gas estimation. The extension must never send its mnemonic to this endpoint.
- **Android/iOS:** local signing is preferred. The protected `/transfer/send` route exists for compatibility with the current secure backend-signing flow used by TON. If used, the mnemonic must travel only through the established authenticated/encrypted session flow and must never be logged or persisted.
- **Backend:** owns canonical validation, simulation, read aggregation and optional compatibility broadcasting. It does not custody user keys.

## Assets and fiat values

The Aptos Indexer supplies account fungible-asset balances and metadata. Native APT price uses Binance `APTUSDT` with CoinGecko as fallback; USDC, USDT and DAI use a USD price of `1`. Unknown assets remain visible with price and fiat value `0` rather than being silently discarded. If the Indexer is temporarily rate-limited, the backend falls back to Fullnode native balance and sender-account transactions; those responses are partial until Indexer access recovers.

## Verification and deployment

```bash
nvm use 24
npm install
npm run test:aptos
```

The live suite verifies the official Aptos testnet ledger/gas endpoints without a key, reads a real mainnet account through the shared modules and simulates (but does not submit) a native transfer.

Deployment follows the normal backend image rollout used by TON:

1. Create a private Geomi server API key and add it with the Aptos environment variables to the target service. No database migration is required.
2. Build/install dependencies with Node 24 so `@aptos-labs/ts-sdk@6.3.1` is present. Version 6.3.1 is pinned because it supports this CommonJS backend; SDK 7 is ESM-only.
3. Deploy the backend and smoke-test the dashboard, transaction history, transaction detail and estimate endpoints with a session JWT.
4. Monitor Fullnode/Indexer `429` responses and Geomi usage. Managed provider URLs remain an alternative if the hosted limits are not sufficient.
5. Test broadcasting on testnet with a dedicated funded QA account before allowing a client to enable mainnet send.
