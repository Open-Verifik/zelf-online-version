# Mobile app version and update policy

Public endpoint used by native clients to read the current **latest** and **minimum** supported version per platform and, when the app sends its installed version, whether an update is optional or **forced**.

## `GET /api/app/version`

**Base URL (production):** `https://api.zelf.world`

### Query parameters

| Name | Required | Description |
|------|----------|-------------|
| `platform` | Yes | `ios` or `android` |
| `current` | No | Client app version (semver). If omitted or empty, the response contains only policy fields (no `updateAvailable` / `forceUpdate`). |

### Success response (`200`)

Body shape:

```json
{
  "data": {
    "platform": "ios",
    "latestVersion": "2.16.1",
    "minimumVersion": "2.16.1",
    "storeUrl": ""
  }
}
```

When `current` is provided and valid:

```json
{
  "data": {
    "platform": "android",
    "latestVersion": "3.16.1",
    "minimumVersion": "3.16.1",
    "storeUrl": "",
    "currentClientVersion": "3.10.0",
    "updateAvailable": true,
    "forceUpdate": true
  }
}
```

**Semantics**

- `updateAvailable`: `true` when the client version is **strictly older** than `latestVersion`.
- `forceUpdate`: `true` when the client version is **strictly older** than `minimumVersion` (the app should block usage until updated).
- Versions are compared using semantic versioning rules (see server `semver` behavior).

### Error responses

| Status | When |
|--------|------|
| `409` | Missing or invalid `platform` (validation); body may include `validationError`. |
| `422` | `current` was sent but is not a valid semver string. |
| `500` | Server misconfiguration (invalid or inconsistent `latestVersion` / `minimumVersion` stored for that platform). |

### Server configuration

Policy values are stored in **MongoDB** as a singleton document (model `MobileAppVersionPolicy`, `key: "default"`) with nested `ios` and `android` objects: `latestVersion`, `minimumVersion`, and `storeUrl`.

If that document does not exist yet, the API **inserts defaults** on first successful read: **iOS** `latestVersion` / `minimumVersion` `2.16.1`, **Android** `3.16.1`, empty `storeUrl` each. Changing these defaults in code only affects new databases; update the MongoDB document directly to change policy on an existing deployment. Environment variables are not used for this endpoint.

---

## Examples

### cURL

```bash
curl -sS "https://api.zelf.world/api/app/version?platform=ios&current=1.6.0"
```

### Node.js

```javascript
const base = "https://api.zelf.world";
const params = new URLSearchParams({ platform: "ios", current: "1.6.0" });
const res = await fetch(`${base}/api/app/version?${params}`);
const json = await res.json();
console.log(json.data);
```

### Python

```python
import urllib.request
import urllib.parse
import json

base = "https://api.zelf.world/api/app/version"
qs = urllib.parse.urlencode({"platform": "android", "current": "1.6.0"})
with urllib.request.urlopen(f"{base}?{qs}") as r:
    print(json.load(r))
```

### PHP

```php
<?php
$qs = http_build_query(['platform' => 'ios', 'current' => '1.6.0']);
$url = 'https://api.zelf.world/api/app/version?' . $qs;
echo file_get_contents($url);
```

### Rust

```rust
// reqwest example (async)
let url = reqwest::Url::parse_with_params(
    "https://api.zelf.world/api/app/version",
    &[("platform", "ios"), ("current", "1.6.0")],
)?;
let body: serde_json::Value = reqwest::get(url).await?.json().await?;
println!("{body:?}");
```

### Local testing

Use your API `PORT` and localhost only for development, for example:

```bash
curl -sS "http://localhost:3003/api/app/version?platform=ios"
```
