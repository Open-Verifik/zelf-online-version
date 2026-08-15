# ZelfID

Online product API for names (`/api/zelf-ids`). JWT required (protected registry).

Encrypt/decrypt/preview always use **ZelfEncrypt v4** (`ZELF_PROOF_V4_URL`, default `https://v4.zelf.world`, path `/zelf-v4`). JSON field names stay `tagName` / `tagObject` so existing clients can retarget from `/api/tags` with little churn.

v4 proofs from that host stay **unsigned** so Android/iOS can encrypt/decrypt offline. Face PKI: `GET https://v4.zelf.world/root-certificate`. Do not embed `ISSUERS_PUBLIC_KEY` on ZNS or Zelf ID APKs. `https://v3.zelf.world` / 3.1.6 (Tags, ZNS) stays unsigned.

`POST /lease-offline` is **not** on this path. Legacy offline lease stays on `/api/tags/lease-offline` (Tags, `/zelf`).

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
| POST | `/lease` | `tagName`, `domain`, `faceBase64`, `type` (`create`\|`import`), `os` |
| POST | `/lease-recovery` | `zelfProof`, `tagName`, `domain`, `faceBase64`, `password`, `os` |
| DELETE | `/delete` | `tagName`, `domain`, `faceBase64` |
| POST | `/preview-zelfproof` | `zelfProof`, `os` |
| POST | `/preview-zelf-id-qr` | `zelfProofQRCode`, `os` |
| POST | `/decrypt` | `tagName`, `domain`, `faceBase64`, `os` |
| POST | `/revenue-cat` | RevenueCat `event` object |
| POST | `/purchase-rewards` | — |
| POST | `/referral-rewards` | — |

`os`: `DESKTOP` | `ANDROID` | `IOS`. New leases stamp `origin: "online"` and `zelfEncryptVersion: "4"`.

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
