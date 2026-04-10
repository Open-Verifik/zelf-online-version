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
    "latestVersion": "2.0.0",
    "minimumVersion": "1.5.0",
    "storeUrl": "https://apps.apple.com/app/id0000000000"
  }
}
```

When `current` is provided and valid:

```json
{
  "data": {
    "platform": "android",
    "latestVersion": "2.0.0",
    "minimumVersion": "1.5.0",
    "storeUrl": "https://play.google.com/store/apps/details?id=com.example.zelf",
    "currentClientVersion": "1.6.0",
    "updateAvailable": true,
    "forceUpdate": false
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
| `500` | Server misconfiguration (invalid or inconsistent `latestVersion` / `minimumVersion` in environment). |

### Server configuration

Values are set per environment (see repository root `.env.example`):

- `MOBILE_IOS_LATEST_VERSION`, `MOBILE_IOS_MINIMUM_VERSION`, `MOBILE_IOS_STORE_URL`
- `MOBILE_ANDROID_LATEST_VERSION`, `MOBILE_ANDROID_MINIMUM_VERSION`, `MOBILE_ANDROID_STORE_URL`

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
