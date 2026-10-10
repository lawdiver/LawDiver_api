# Errors, did-you-mean, retries, and rate limits

## Edge / Cloudflare failures (before JSON errors)

If you see a Cloudflare HTML page with **error 1010** instead of a LawDiver JSON body, the request never reached the API. The usual cause is a missing `User-Agent` (especially bare `urllib`). Set one -- sample clients do. Spoofed `CF-Connecting-IP` yields error **1000**. Details: [authentication.md](./authentication.md).

## Stable error codes

Branch on `error.code` (stable). Messages may be reworded.

| Code | HTTP | What to do |
| --- | --- | --- |
| `missing_api_key` | 401 | Send `Authorization: Bearer ...` |
| `invalid_api_key` | 401 | Check key; revoke/recreate if needed |
| `account_suspended` | 403 | Contact support |
| `rate_limited` | 429 | Sleep `Retry-After` seconds, then retry |
| `invalid_request` | 400 | Fix fields listed in `error.details` |
| `not_found` | 404 | Wrong id / other account's job / missing resource |
| `method_not_allowed` | 405 | Path exists but verb does not -- honor `Allow` |
| `idempotency_conflict` | 409 | Same `Idempotency-Key` with a different body -- generate a new key |
| `gone` | 410 | Path retired -- read any replacement hint |
| `unsupported_media_type` | 415 | Upload PDF or Word only |
| `payload_too_large` | 413 | Shrink the document (limit 40 MB) |
| `service_unavailable` | 503 | Back off and retry |
| `internal_error` | 500 | Retry with backoff; quote `requestId` |

Always log **`requestId`**. It keys the ledger row and log line for support.

## Did-you-mean is not an error

For `POST /cases/retrieve`, ambiguous queries return **HTTP 200** with:

```json
{ "status": "did_you_mean", "candidates": [ /* up to 3 */ ] }
```

Do **not** route this through your generic error handler. Present candidates (or apply an explicit product policy), then call the same endpoint again with `caseId`.

Similarly, cite-check `likely_valid` means "candidates, no silent pick."

## Cite misses vs HTTP / retrieve `not_found`

Cite check does **not** use a `not_found` verdict. Graded negatives include:

- `implausible` -- strong fabrication signal
- `not_in_corpus` -- searched a held range, no match (may include `corpusCaveat` / `coverage`)
- `not_covered` -- range not held / unparseable
- `unverified` -- cannot confirm or deny
- soft timeout -> `error` + `lookupStatus: deadline_exceeded` (never silent absence)

`not_found` is valid only as HTTP `error.code` **404**, or as retrieve `status: "not_found"` (HTTP 200). A retrieve miss may include `corpusCaveat` while the corpus is still loading -- that is a coverage statement, not automatic proof a citation is fabricated.

## Idempotent retries

Use `Idempotency-Key` when a timeout leaves you unsure whether `POST /search`, `POST /citecheck/cite`, or `POST /cases/retrieve` landed:

```http
Idempotency-Key: search-<uuid>
```

Rules:

- One key per distinct logical request
- Same key + same body after timeout -> stored response + `replayed: true`
- Same key + a **different** body -> `idempotency_conflict` (HTTP 409). Generate a **new** key for the new request. Does **not** return the old answer.
- First call must have sent the key -- you cannot attach one after the fact
- PDF and most other routes ignore the header -- cache bytes yourself

## Time limits

Every API call has a time limit to completion. Handlers stop and return JSON before the edge gateway's idle timeout (about 100 seconds) turns the response into an HTML error page.

When API usage is high, some requests still expire first. Complex searches are the common case: engines share one deadline, one of them runs long, and you get `service_unavailable`, `lookupStatus: deadline_exceeded`, or a search with `degraded: true`. That is an error. An empty `results` list on a degraded search is not proof the corpus has no match.

**Bulk upload** (`POST /bulk`) is the path built for this. It attempts every call in the file **3 times** before giving up, which is why a large run comes back cleaner than a single pass of the same searches. When usage is low, the file is processed in parallel and can finish faster than calling each endpoint yourself in series. When usage is high, calls in the file run one at a time. See [endpoints.md](./endpoints.md#bulk-upload-async) and [https://lawdiver.com/docs/api#bulk](https://lawdiver.com/docs/api#bulk).

## Rate limits

- Per-minute, per-account budget on authenticated routes
- Live responses emit both header sets:
  - `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (unix seconds)
  - `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `RateLimit-Policy`
- On 429: honor `Retry-After`
- Treat published limits as a floor (per-replica windows); always prefer header-driven backoff
- Confirm via `GET /usage` -> `limits.rateLimitPerMinute`
- Ask for a higher ceiling if needed

## Suggested client policy

1. On network timeout for idempotent POSTs -> retry with the **same** idempotency key and **same** body (max 2-3 attempts, exponential backoff).
2. On `429` / `503` -> honor `Retry-After` or exponential backoff.
3. On `400` / `401` / `403` / `404` / `405` / `409` / `410` / `413` / `415` -> do not blind-retry; fix the request (for `409`, mint a new idempotency key if the body changed).
4. On `500` -> limited retry + include `requestId` in logs/alerts.
5. Never infinite-poll document jobs -- cap attempts (examples use ~120 x 5s).
