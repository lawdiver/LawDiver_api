# Getting started with the LawDiver API

This guide takes you from zero to a successful authenticated call against `https://lawdiver.com/api/v1`.

## Prerequisites

- A United States-based account on [lawdiver.com](https://lawdiver.com)
- Verified email
- Node.js 18+ **or** Python 3.10+ **or** any HTTP client (cURL, Postman, etc.)

The API is **plain REST**. TypeScript and Python folders in this repo are convenience clients, not required runtimes.

## 1. Create an account and API key

1. Sign up at [https://lawdiver.com](https://lawdiver.com).
2. Verify your email (keys require a verified account).
3. Visit [https://lawdiver.com/account/api-keys](https://lawdiver.com/account/api-keys).
4. Create a key. Copy it immediately -- it is shown **once**. Only a SHA-256 hash is stored server-side.
5. If you lose it, revoke and create a new key. Revocation takes effect on the next request.

Keys look like: `ld_live_xxxxxxxxxxxxxxxxxxxx`.

## 2. Store the key safely

```bash
# Linux / macOS
export LAWDIVER_API_KEY=ld_live_xxxxxxxxxxxxxxxxxxxx

# Windows PowerShell
$env:LAWDIVER_API_KEY = "ld_live_xxxxxxxxxxxxxxxxxxxx"
```

Or copy `.env.example` -> `.env` in this repository root and fill in the value. Prefer `LAWDIVER_API_KEY`; sample clients also accept the optional legacy alias `LAWTOOLS_API_KEY`.

**Rules**

- Server-side only (backend, worker, CI secret store).
- Never commit `.env` or paste keys into issues/PRs.
- Never ship keys in browser bundles or mobile apps.
- Proxy API results from your backend to any front end.

## 3. Sanity-check connectivity (no key)

```bash
curl https://lawdiver.com/api/v1
```

You should receive a discovery document listing endpoints. If this fails, fix network/DNS before debugging credentials.

## 4. Sanity-check credentials

```bash
curl "https://lawdiver.com/api/v1/usage?days=7" \
  -H "Authorization: Bearer $LAWDIVER_API_KEY"
```

- Discovery works but usage returns `invalid_api_key` -> network is fine; key is wrong/revoked.
- Usage returns your consumer + `byOperation` -> you are ready to integrate.

## 5. First real call -- case search

Jurisdiction is **required**. Prefer practitioner-shaped scopes such as `one_state_plus_federal`.

```bash
curl -X POST https://lawdiver.com/api/v1/search \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "adverse possession",
    "jurisdiction": { "type": "one_state", "state": "FL" },
    "limit": 5
  }'
```

Successful responses include:

- Payload fields (`results`, etc.)
- `usage` -- units recorded for the call
- `requestId` -- quote this in any support ticket

## 6. Run the sample projects

**TypeScript**

```bash
cd typescript && npm install && npm run example:search
```

**Python**

```bash
cd python
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python examples/01_search.py
```

## 7. Many calls at once -- bulk upload

Every call still has a completion deadline. When the API is busy, a complex search can time out. Upload a JSON list instead:

```bash
curl -X POST https://lawdiver.com/api/v1/bulk \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -H "Content-Type: application/json" \
  -d @bulk.json
```

Poll `statusUrl`, then `GET` `resultUrl` for one combined document. Each call is attempted 3 times. When usage is low, calls in the file run in parallel. Full shape: [endpoints.md](./endpoints.md#bulk-upload-async) and [lawdiver.com/docs/api#bulk](https://lawdiver.com/docs/api#bulk).

## Next steps

- [Authentication](./authentication.md)
- [Endpoint catalog](./endpoints.md)
- [Error handling & retries](./error-handling.md)
- [Recipes](./recipes.md)
- Official reference: [https://lawdiver.com/docs/api](https://lawdiver.com/docs/api)
