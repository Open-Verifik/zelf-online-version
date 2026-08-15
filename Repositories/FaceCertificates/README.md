# Face Certificates

Face PKI on ZelfEncrypt **v4** (`https://v4.zelf.world`). Proofs stay unsigned. Pin the root with `GET /api/face-certificates/root-certificate` or `GET https://v4.zelf.world/root-certificate`.

Do not embed `ISSUERS_PUBLIC_KEY` on ZNS or Zelf ID APKs. Never ship PKI or issuer private keys.

| Path | Auth |
|------|------|
| `/api/face-certificates/*` | Unprotected. POSTs require payment (HTTP 402) or a paid subscription. |
| `/api/my-face-certificates/*` | JWT (`POST /api/sessions`). No 402. |

Paid POSTs: `generate`, `verify`, `encrypt`, `decrypt`, `sign`, `public-key`, `verify-signature`, `verify-signature-with-public-key`.

Inbound uses `zelfProof`, `faceBase64`, `purposeId`, `certificate`, `keyBase64`, `encryptedKey`, `dataSha256`, `signature`, `publicKey`.
