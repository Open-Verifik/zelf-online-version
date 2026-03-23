# ZelfAvalanchePay

Forwards **native AVAX** (`pay`) or **USDC** (`payUsdc` + `transferFrom`) to the Zelf treasury and emits `Paid` for backend confirmation.

## Treasury (production)

`0x6d1e134efb40f25f4Fb4A63AAD0415b8C466a690`

## USDC token addresses

- **Avalanche C-Chain mainnet (43114):** Circle native USDC `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (set `AVALANCHE_TAG_PAY_USDC_ADDRESS` if you use a different USDC).
- **Fuji (43113):** Use your test USDC; deploy script defaults to a common Fuji USDC — verify on [Snowtrace](https://testnet.snowtrace.io).

Constructor: `constructor(address _treasury, address _usdc)` — both addresses required (non-zero).

## Compile

With Foundry:

```bash
cd contracts/avalanche
forge build --contracts ZelfAvalanchePay.sol
```

Or [Remix](https://remix.ethereum.org): paste `ZelfAvalanchePay.sol`, compile with 0.8.20+, deploy with treasury + USDC token address.

Or from repo root:

```bash
node checkoutContracts/scripts/deploy-zelf-avalanche-pay.js
```

(`DRY_RUN=1` compiles only.)

## Deploy

Pass **treasury** and **USDC** token address. Example (Foundry `cast`):

**Avalanche C-Chain mainnet (43114)**

```bash
export TREASURY=0x6d1e134efb40f25f4Fb4A63AAD0415b8C466a690
export USDC=0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E
cast send --rpc-url https://api.avax.network/ext/bc/C/rpc --private-key $DEPLOYER_KEY \
  --create "$(forge inspect ZelfAvalanchePay bytecode)" \
  "constructor(address,address)" $TREASURY $USDC
```

Set backend env after deploy:

- `AVALANCHE_RPC_URL` — e.g. `https://api.avax.network/ext/bc/C/rpc`
- `AVALANCHE_CHAIN_ID` — `43114` (or `43113` for Fuji)
- `AVALANCHE_TAG_PAY_CONTRACT_ADDRESS` — deployed `ZelfAvalanchePay` address
- `AVALANCHE_TAG_PAY_USDC_ADDRESS` — same USDC address passed to the constructor (required for JWT `usdc` branch in payment-options)

Treasury must accept both AVAX and USDC (EOA or contract that handles ERC-20).

## Event

`Paid(bytes32 indexed paymentId, address indexed payer, uint256 amount, string tagFull)`

- After `pay`: `amount` is **wei** (18 decimals).
- After `payUsdc`: `amount` is **USDC base units** (6 decimals).

Backend classifies native vs USDC from the transaction calldata / `msg.value`, not from client hints.
