# Authentication

Base URL: `https://lawdiver.com/api/v1`

## Which routes need a key?

| Route | Auth |
| --- | --- |
| `GET /api/v1` (discovery) | **None** -- lists endpoints |
| All other `/api/v1/*` routes | **Required** |

## Headers

Preferred (Bearer -- what gateways and HTTP clients already understand):

```http
Authorization: Bearer ld_live_xxxxxxxxxxxxxxxxxxxx
```

Also accepted:

```http
X-API-Key: ld_live_xxxxxxxxxxxxxxxxxxxx
```

JSON bodies also need:

```http
Content-Type: application/json
```

Except multipart uploads (`POST /citecheck/document`, and `POST /bulk` when you send a JSON file in field `file`), where the client must set the multipart boundary (let `fetch` / `httpx` / `curl -F` do it -- do not manually set `Content-Type: application/json`). A bulk upload can also be a normal JSON body.

## User-Agent (required at the edge)

Cloudflare sits in front of `lawdiver.com`. Requests with **no `User-Agent`** (common with bare `urllib.request`, some generated snippets, and minimal scripts) are often rejected at the edge with **Cloudflare error 1010** before they reach the API -- you will not see a LawDiver JSON `error.code`.

Both sample clients in this repo send:

```http
User-Agent: LawDiver-API-Examples/1.0 (+https://github.com/lawdiver/LawDiver_api; ...)
```

`curl` and `httpx` already send a default User-Agent. If you roll your own HTTP client, set one explicitly:

```bash
curl -A "MyApp/1.0 (+https://example.com)" \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  https://lawdiver.com/api/v1/usage
```

Do **not** inject spoofed `CF-Connecting-IP` (or related) headers -- those yield a bare Cloudflare 403 (error code 1000). See the official [API docs](https://lawdiver.com/docs/api) troubleshooting notes.

## Obtaining and rotating keys

1. Sign up and verify email on [lawdiver.com](https://lawdiver.com).
2. Create keys at [Account -> API keys](https://lawdiver.com/account/api-keys).
3. Copy the key at creation time -- it cannot be re-displayed (only a hash is stored).
4. Revoke compromised or lost keys immediately; create a replacement.
5. Revocation applies on the **next** request.

## Environment variables used by this repo

| Variable | Purpose |
| --- | --- |
| `LAWDIVER_API_KEY` | Preferred env var for this repository and new integrations |
| `LAWTOOLS_API_KEY` | Optional legacy alias still accepted by sample clients |
| `LAWDIVER_API_BASE` | Optional override (default `https://lawdiver.com/api/v1`) |

Sample clients check `LAWDIVER_API_KEY` first, then `LAWTOOLS_API_KEY`.

## Security checklist

- [ ] Key lives only in server env / secret manager
- [ ] Front ends call **your** API, which calls LawDiver
- [ ] `.env` is gitignored
- [ ] CI uses encrypted secrets, not plaintext workflow files
- [ ] Logs never print full keys
- [ ] Separate keys per environment (dev/stage/prod) when possible

## Account states you may see

| `error.code` | HTTP | Meaning |
| --- | --- | --- |
| `missing_api_key` | 401 | No key presented |
| `invalid_api_key` | 401 | Unknown, revoked, or expired (not distinguished on purpose) |
| `account_suspended` | 403 | Account exists but may not call the API |

## Idempotency (related header)

On `POST /search`, `POST /citecheck/cite`, and `POST /cases/retrieve`:

```http
Idempotency-Key: my-request-2026-08-13-001
```

Same key + same body -> stored response with `replayed: true` (no re-run). Same key + different body -> `idempotency_conflict` (HTTP 409). Generate a fresh key for each distinct request. The first call must have sent the key -- you cannot attach one after the fact.

## Rate-limit headers

Authenticated responses may include both legacy and IETF-style headers:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 57
X-RateLimit-Reset: 1726260000   # unix seconds when the window resets
RateLimit-Limit: 60
RateLimit-Remaining: 57
RateLimit-Reset: 12             # seconds until reset
RateLimit-Policy: 60;w=60
Retry-After: 12                 # only on 429
```

`Retry-After` appears on `429`. Confirm your ceiling via `GET /usage` -> `limits.rateLimitPerMinute`.
