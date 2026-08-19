# zSend Client Contract

## First client: the browser extension

**zSend ships in `verifik-wallet-extension` first.** The dashboard comes second.

The extension already owns the two things zSend needs and the dashboard does not:

- **Face capture and the v4 ZelfProof.** Publishing a certificate, unwrapping a content key, and signing all require a live face plus the proof. The extension is where that flow already exists.
- **Zelf Keys as a neighbour.** zSend is the first feature that encrypts *to someone else*; Zelf Keys only encrypts for yourself. Shipping them side by side is what makes the difference legible to a user.

Large-file UX (drag, resume, progress) is a dashboard strength, but it is not what v1 is proving. v1 proves *only their face opens it*.

### Shell layout

Send and open are detail/form/result screens, so they are **deep** screens: hide `home-hub-header`, own the back control, footer shows **+ Add**. Register paths in `src/app/services/shell-layout.service.ts` (`DEEP_SHELL_PATH_MATCHERS`). A zSend hub screen (the inbox) is a **hub** screen and keeps the header plus footer AI.

## Key handling rules

These are not stylistic preferences. Breaking any of them breaks the product's core claim.

| Rule | Why |
| --- | --- |
| **Never embed `ISSUERS_PUBLIC_KEY`** in the extension, the ZNS app, or a Zelf ID APK | Only `https://v4.zelf.world` holds `pki_private_key`. Proofs stay unsigned so Android and iOS keep working offline. |
| **Pin only the root certificate** | `GET /api/face-certificates/root-certificate`. Pin it once, compare on every verify. It is public, so pinning it leaks nothing. |
| **Never persist a content key** | Generate per envelope, wrap it, drop it. Recovering it must always cost a face. |
| **Never send plaintext to any Zelf API** | `POST /api/my-zsend/envelopes` has no parameter for plaintext or a raw key, by design. |
| **Never reuse a nonce** | One fresh 12-byte IV per encrypt. GCM nonce reuse under one key is catastrophic. |

The content key does transit `POST /api/my-face-certificates/encrypt`, because the wrap happens on v4. That is a property of Face Certificates, not something zSend adds — and zSend itself never receives it.

## Reference implementation

Use [`client/zsend-envelope.client.js`](client/zsend-envelope.client.js) rather than reimplementing the framing. It is WebCrypto-only, so it runs unchanged in the extension, the dashboard, and Node, and it is covered by [`tests/unit/zsend-envelope.client.test.js`](../../tests/unit/zsend-envelope.client.test.js) (round trip, tamper detection, nonce freshness).

Two clients writing their own AES-GCM framing is exactly how a recipient ends up unable to open a file.

## Receive setup (once per name)

```js
// 1. Ask the API for the purpose id. Do not hardcode `zsend:${name}`.
const { data: purpose } = await api.get("/api/zsend/purpose-id", { params: { tagName: "alice.zelf" } });

// 2. Issue the certificate with the user's face + v4 ZelfProof.
const { certificate } = await api.post("/api/my-face-certificates/generate", {
    faceBase64,
    zelfProof,
    purposeId: purpose.purposeId,          // zsend:alice.zelf
    userSubjectName: "alice.zelf",
    expirationDateUtc: "2034-10-01T00:00:00Z",
    keyType: purpose.keyTypeDefault,       // Secp256k1
    os: "DESKTOP",
});

// 3. Publish it. zSend rejects anything the Face PKI root did not sign.
await api.post("/api/my-zsend/certificates", { tagName: "alice.zelf", certificate });
```

Publishing is what claims the name and what creates the inbox.

## Send

```js
const client = require("./zsend-envelope.client");

const { data: purpose } = await api.get("/api/zsend/purpose-id", { params: { tagName: "alice.zelf" } });
const { data: entry } = await api.get("/api/zsend/certificates", { params: { tagName: "alice.zelf" } });

// Confirm the certificate was issued for the name that was typed.
client.assertCertificateMatchesPurpose(entry, purpose.purposeId);

// Encrypt locally. The file never leaves the device in the clear.
const contentKey = client.generateContentKey();
const { cipherBase64, cipher } = await client.encryptPayload(fileBytes, contentKey);

// Wrap the content key to the recipient's certificate.
const { encryptedKey } = await api.post("/api/my-face-certificates/encrypt", {
    certificate: entry.certificate,
    keyBase64: client.toBase64(contentKey),
});

// Optional: prove who sent it, without revealing the sender's face.
const { signature } = await api.post("/api/my-face-certificates/sign", {
    faceBase64,
    zelfProof,
    purposeId: senderPurposeId,
    dataSha256: cipher.sha256,
});

// Upload the ciphertext, then record the envelope.
const { data: blob } = await api.post("/api/my-zsend/blobs", { cipherBase64 });  // ≤ 5 MB only

await api.post("/api/my-zsend/envelopes", client.buildEnvelopeRequest({
    toTagName: "alice.zelf",
    encryptedKey,
    cipher: { ...cipher, cid: blob.cid, url: blob.url },
    senderProof: { signature, purposeId: senderPurposeId, certificate: senderCertificate },
    filename: "contract.pdf",
    mimeType: "application/pdf",
    expiresInHours: 72,
}));
```

For payloads over 5 MB, upload the ciphertext yourself and pass `cipher.cid` or `cipher.url`. Do not route large files through `/blobs`.

## Open

```js
const { data: envelope } = await api.get(`/api/my-zsend/envelopes/${envelopeId}`);

// Recover the content key. This is the step that requires the face.
const { keyBase64 } = await api.post("/api/my-face-certificates/decrypt", {
    faceBase64,
    zelfProof,
    purposeId: envelope.purposeId,
    encryptedKey: envelope.encryptedKey,
});

const cipherBase64 = await downloadCiphertext(envelope.cipher.cid || envelope.cipher.url);

// Verify the sender before showing anything, when a proof is attached.
if (envelope.senderProof) {
    const { valid } = await api.post("/api/my-face-certificates/verify-signature", {
        dataSha256: envelope.cipher.sha256,
        signature: envelope.senderProof.signature,
        certificate: envelope.senderProof.certificate,
    });

    if (!valid) throw new Error("sender_signature_invalid");
}

const fileBytes = await client.decryptPayload({ cipherBase64, cipher: envelope.cipher, contentKey: client.fromBase64(keyBase64) });

await api.post(`/api/my-zsend/envelopes/${envelopeId}/opened`);
```

`decryptPayload` throws when the blob or the nonce was altered, so there is no "decrypted to garbage" state to handle.

## What the client must surface to the user

- **Expiry.** Free tier is up to 3 days; the API caps any request at 30 days. Show the deadline on both send and receive.
- **Sender identity.** Distinguish "signed by bob.zelf" from unsigned. An unsigned envelope proves nothing about who sent it.
- **Rotation.** If `recipientFingerprint` no longer matches the recipient's published certificate, the recipient rotated. Old envelopes still open with the old face; say so rather than showing a generic error.
- **Server-visible metadata.** `filename`, `mimeType`, and size are stored in the clear for the inbox list. Contents are not. Do not imply filenames are private.
