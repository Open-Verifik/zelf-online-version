# Canton Network backend foundation

This repository contains an initial, non-custodial backend foundation for Canton Network / Canton Coin (CC). It follows the existing Zelf repository pattern and is intended to support Web Extension, Android, and iOS while the final validator, party lifecycle, ownership, and signing architecture is reviewed.

This is not a production-complete integration. Canton is private and party-scoped: a validator stores only the data visible to its hosted parties. The backend therefore cannot query arbitrary public addresses as it can on Aptos, TON, or EVM chains.

## Implemented foundation

- Official `@canton-network/wallet-sdk` integration.
- OAuth2 client-credentials, LocalNet self-signed, and static-token configuration modes.
- Sanitized readiness endpoint that never returns credentials.
- Authorized party holdings and Token Standard balance normalization.
- Authorized party transaction history and transaction detail normalization.
- Non-custodial two-step transfer flow:
  1. the backend uses the hosted party's private ledger state to prepare a transfer;
  2. the client validates and signs the prepared transaction hash;
  3. the backend submits the signed transaction.
- Temporary non-production QA party allowlist to avoid leaking one user's private Canton data to another authenticated user.
- Exact decimal handling without JavaScript floating-point arithmetic.

The backend never accepts a mnemonic or private signing key in these endpoints.

## Protected endpoints

All routes require the normal Zelf session JWT.

- `GET /api/canton/status`
- `GET /api/canton/status?probe=true`
- `GET /api/canton/address/:partyId`
- `GET /api/canton/address/:partyId/tokens`
- `GET /api/canton/address/:partyId/transactions?afterOffset=&beforeOffset=`
- `GET /api/canton/address/:partyId/transactions/:updateId`
- `POST /api/canton/transfer/prepare`
- `POST /api/canton/transfer/submit`

The `probe=true` status call verifies Ledger API connectivity and authentication while returning only the ledger end and the count of accessible parties.

### Prepare transfer

```json
{
  "sender": "alice::1220...",
  "recipient": "bob::1220...",
  "amountCc": "1.25",
  "instrumentId": "Amulet",
  "memo": "Zelf transfer"
}
```

The response contains the Wallet SDK prepare response and `preparedTransactionHash`. The client must independently validate the prepared transaction and sign that hash with the external party's Ed25519 key.

### Submit transfer

```json
{
  "partyId": "alice::1220...",
  "preparedTransaction": {
    "preparedTransaction": "...",
    "preparedTransactionHash": "..."
  },
  "signature": "..."
}
```

Canton Coin preparation references time-bound ledger state. Signing and submission should happen promptly. Long approval workflows need an explicit command-delegation design.

## Required deployment configuration

At minimum, the backend needs:

- a self-hosted validator/participant or a Canton node-as-a-service provider;
- the validator's JSON Ledger API URL;
- the Canton Coin Token Standard registry URL, commonly the validator scan-proxy endpoint;
- machine-to-machine OAuth configuration and client credentials for hosted environments;
- a QA party allowlist until durable Zelf ID/session ownership is implemented.

See `.env.example` for all `CANTON_*` variables. Never place OAuth secrets, static tokens, mnemonics, or signing keys in GitHub comments.

## Decisions still required before production

Miguel/backend review is required for:

1. validator/provider and first target environment (LocalNet, DevNet, TestNet, or MainNet);
2. external-party onboarding, recovery, multi-hosting, and persistence;
3. the durable mapping and authorization check between a Zelf ID/session and a Canton party;
4. whether signing occurs exclusively on device or through an approved custody/signing provider;
5. one-step transfer preapprovals versus the standard two-step accept/reject workflow;
6. command delegation for signing or approval processes that can exceed the Canton Coin preparation window;
7. operational handling for traffic, limits, monitoring, and disaster recovery.

Until those decisions are complete, keep `CANTON_ALLOW_UNBOUND_PARTIES=false`. `self_signed` authentication is rejected automatically in production, and party-scoped production routes remain closed until a durable Zelf ID/session ownership check replaces the QA allowlist.

## Verification

```bash
npm run test:canton
```

The unit portion uses real deterministic data and no mocks. The live suite runs only when `CANTON_LIVE_TEST_PARTY_ID` and the required `CANTON_*` validator settings are present; otherwise it is skipped rather than simulating a validator.

## Official references

- https://docs.canton.network/sdks-tools/sdks/wallet-sdk/quickstart
- https://docs.canton.network/overview/learn/architecture
- https://github.com/canton-network/wallet
- https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md
