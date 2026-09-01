# ZelfID

Online product API for names. Public host is **`https://v4.zelf.world`** (`GET https://v4.zelf.world/api/zelf-ids/search`). JWT required (protected registry). Do not call this product on `https://v3.zelf.world`.

Encrypt/decrypt/preview always use **ZelfEncrypt v4** (`ZELF_PROOF_V4_URL`, default `https://v4.zelf.world`, path `/zelf-v4`). JSON field names stay `tagName` / `tagObject` so existing clients can retarget from `/api/tags` with little churn.

v4 proofs from that host stay **unsigned** so Android/iOS can encrypt/decrypt offline. Face PKI: `GET https://v4.zelf.world/root-certificate`. Do not embed `ISSUERS_PUBLIC_KEY` on ZNS or Zelf ID APKs. `https://v3.zelf.world` / 3.1.6 (Tags, ZNS) stays unsigned.

`POST /lease-offline` pins an existing v4 proof (string and/or QR). Preview is **`previewHumanAuthn`** (Human Authn / `/zelf-v4`). Tags offline lease stays on `/api/tags/lease-offline`.

Names of 6–27 characters lease as `free` (no `.hold`) and can later buy a yearly **premium** or **unlimited** plan via `GET /payment-options?plan=` then `POST /payment-confirmation` — not `/api/my-tags`. Names of 5 characters or fewer are **unlimited only**; the yearly price comes from the domain license pricing table. A `$0` referral is a complimentary year of unlimited. Unpaid short names use a **5-hour** `name.domain.hold` pin. When a year ends, the name stays and the plan reads as `free`. See public docs: [Migration v4 changelog](https://docs.zelf.world/docs/changelog/2026-08-31-zelf-id-migration-v4) and [Unit tests](https://docs.zelf.world/docs/api/zelf-ids/unit-tests).

Registered in `Routes/protected-repositories.js`.

## Endpoints

| Method | Path | Inbound (required) |
|--------|------|-------------------|
| GET | `/domains` | — |
| GET | `/domains/:domain` | path `domain` |
| GET | `/search` | `tagName`, `domain`; optional `os`, `environment`, `type`, `duration`, `key`, `value` |
| GET | `/search-by-domain` | `domain`, `storage` (`IPFS`\|`Arweave`\|`Walrus`); optional `name` |
| GET | `/preview` | `tagName`, `domain`, `os` |
| GET | `/wallet-balances` | optional address query fields |
| GET | `/payment-options` | `tagName`, `domain`, `duration` |
| POST | `/payment-confirmation` | `tagName`, `network`, `token`; optional `domain` |
| POST | `/lease` | `tagName`, `domain`, `faceBase64`, `type` (`create`\|`import`), `os` |
| POST | `/lease-offline` | `tagName`, `domain`, plus `zelfProof` and/or `zelfProofQRCode` |
| POST | `/lease-recovery` | `zelfProof`, `tagName`, `domain`, `faceBase64`, `password`, `os` |
| DELETE | `/delete` | `tagName`, `domain`, `faceBase64` |
| POST | `/preview-zelfproof` | `zelfProof`, `os` |
| POST | `/preview-zelf-id-qr` | `zelfProofQRCode`, `os` |
| POST | `/decrypt` | `tagName`, `domain`, `faceBase64`, `os` |
| POST | `/revenue-cat` | RevenueCat `event` object |
| POST | `/purchase-rewards` | — |
| POST | `/referral-rewards` | — |

`os`: `DESKTOP` | `ANDROID` | `IOS`. New leases stamp `origin: "online"` and short `v: 4`. Short unpaid holds last 5 hours; longer names lease as `free` and upgrade on payment.

## Example — POST `/api/zelf-ids/lease`

```json
{
  "tagName": "alice",
  "domain": "zelf",
  "faceBase64": "<session-encrypted or raw if removePGP>",
  "type": "create",
  "os": "DESKTOP",
  "password": "optional unless securityType is withoutPassword",
  "addServerPassword": false,
  "removePGP": true
}
```
