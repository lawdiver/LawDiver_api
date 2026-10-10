# LawDiver API -- Examples & Integration Guide

> Full boolean and semantic legal search, case retrieval, and a cite checker that resolves and scores citations -- over **~10 million** U.S. federal and state opinions kept current around the clock. Same verified corpus as [CaseDiver](https://lawdiver.com/casediver). **No Westlaw contract required.**

This repository is the official **examples pack** for the [LawDiver API](https://lawdiver.com/products/api): thin TypeScript and Python clients you **clone and copy**, cURL recipes, and docs so you can search cases, retrieve opinions, and cite-check briefs from your own apps and agents.

**Not a published SDK.** `@lawdiver/api-examples` is not on npm and `lawdiver` is not on PyPI -- install by cloning this repo (or copying `typescript/src` / `python/lawdiver` into your project). The API itself is language-agnostic REST; these clients are worked examples with typed surfaces, not a package registry product.

| | |
| --- | --- |
| **Product** | [lawdiver.com/products/api](https://lawdiver.com/products/api) |
| **API docs** | [lawdiver.com/docs/api](https://lawdiver.com/docs/api) |
| **Base URL** | `https://lawdiver.com/api/v1` |
| **Auth** | Bearer API key (`ld_live_...`) |
| **Status** | Plain REST · JSON (PDF where noted) |

```bash
# Discover endpoints -- no key required
curl https://lawdiver.com/api/v1
```

**About / advantages (read this first):** [docs/about-lawdiver.md](./docs/about-lawdiver.md) · [docs/why-lawdiver-api.md](./docs/why-lawdiver-api.md)

---

## What this repository is

LawDiver's API is **language-agnostic REST**. You do not need an SDK -- any HTTP client works. This repo ships:

- A **TypeScript / Node** examples client and runnable demos (primary -- matches the official quickstart)
- A **Python 3** examples client and matching demos (`httpx`)
- **cURL / shell** recipes for any stack
- Deep guides under [`docs/`](./docs/) (auth, endpoints, errors, agent recipes)

Clone it, set a key, run an example, then copy the pattern into your product. Prefer a real `User-Agent` on hand-rolled clients -- see [docs/authentication.md](./docs/authentication.md).

| Language | Role | Folder |
| --- | --- | --- |
| **TypeScript / Node.js** | **Primary** | [`typescript/`](./typescript/) |
| **Python 3** | Also included | [`python/`](./python/) |
| **cURL / shell** | Language-agnostic | [`curl/`](./curl/) |
| **PowerShell** | Windows-native HTTP recipes | [`curl/powershell.md`](./curl/powershell.md) |

---

## Why the LawDiver API

- **Same corpus as the product** -- Case search, cite check, and PDF retrieval over the verified opinions that power CaseDiver -- not a thin scrape. Public records + LawDiver's citator graph; no commercial research-platform feed underneath.
- **Legal search that behaves like research** -- Four engines + a router: citation, case name, boolean (strict Terms and Connectors: `AND`, `&`, `OR`, `NOT`, `%`, `"phrase"`, `!`, `*`, `/s` = 25 words, `/p` = 80 words, `w/n`), semantic, hybrid, or `auto`. `keyword` is the old name for `boolean` and runs the same strict search. `/s` and `/p` are word windows because many opinions are PDFs converted to text. Jurisdiction is required; filters run inside every engine.
- **Cite check built for legal AI** -- Resolves against a held corpus; returns Bluebook form and good-law. **`name_mismatch`** catches the classic hallucination (real reporter cite, wrong caption). **`likely_valid`** never silently "fixes" a cite.
- **Whole-brief cite check** -- Upload PDF/DOCX -> async job -> report PDF with verdicts and exhibit pages; short forms bind correctly.
- **Agent-ready search** -- One `POST /search` can return analysis cards, opinion excerpts, and good-law reports so LLM tools reason without a second hop.
- **Honest defaults** -- Bad law is flagged, not hidden; unpublished opinions are excluded by default; `unknown` treatment is never sold as a clean bill of health.
- **Production REST** -- Bearer auth, `requestId` on every response, idempotency keys on hot paths, rate-limit headers, usage ledger.
- **Bulk upload** -- `POST /bulk` runs a file of calls, retries each one 3 times (timeouts and degraded searches are common when the API is busy), and returns one JSON document. When usage is low the file runs in parallel.
- **Usage ledger** -- `GET /usage` shows volume by operation and your rate limits.
- **Same key via MCP** -- hosted MCP at [lawdiver.com/mcp](https://lawdiver.com/mcp); tool catalog at [`/mcp/toolspec.json`](https://lawdiver.com/mcp/toolspec.json).

Full narrative: [docs/about-lawdiver.md](./docs/about-lawdiver.md).

---

## What the API can do

| Capability | Endpoint(s) | Typical use |
| --- | --- | --- |
| **Case search** | `POST /search` | Issue research scoped to jurisdiction; optional AI case card + opinion text + good-law |
| **Jurisdictions reference** | `GET /jurisdictions` | Authoritative state/circuit codes and example payloads |
| **Cite check (citations)** | `POST /citecheck/cite` | Validate 1-50 cites; Bluebook form; good-law; hallucination-shaped `name_mismatch` |
| **Cite check (document)** | `POST /citecheck/document` + jobs | Upload brief -> async report PDF; optional `delivery=email_link` + `emails` emails a results-page link |
| **Bulk upload** | `POST /bulk` + `GET /bulk/jobs/:id/result` | JSON file of calls. Each call is attempted 3 times. One combined JSON document when the job finishes. Parallel when API usage is low |
| **Citation resolve** | `POST /citations/resolve` | Map cite/name -> up to 5 candidates (no PDF) |
| **Case retrieve** | `POST /cases/retrieve` | Resolve -> deliver one case or did-you-mean round trip |
| **Statute retrieve** | `POST /statutes/retrieve` | Pull statute / regulation / rule text by Bluebook section cite |
| **Case metadata** | `GET /cases/:id` | Metadata for opinion or cluster id |
| **Case batch** | `POST /cases/batch` | Up to 50 ids in one call |
| **Good-law detail** | `GET /cases/:id/good-law` | Status + negative treatment citations |
| **Goodlaw check** | `GET /cases/:id/goodlaw-check` | Citing cases with status. Reversal first, then the newest cite. `limit` 10/50/100/unlimited, `order` recent or negative |
| **Cited by** | `GET /cases/:id/cited-by` | Paginated citing cases |
| **Case PDF** | `GET /cases/:id/pdf` | Opinion PDF + processing/analysis appendix |
| **Usage ledger** | `GET /usage` | Volume by operation + your rate limits |

Full field-level reference: [docs/endpoints.md](./docs/endpoints.md) · Canonical source: [lawdiver.com/docs/api](https://lawdiver.com/docs/api).

---

## Get an API key (5 minutes)

1. **Sign up** at [lawdiver.com](https://lawdiver.com) and **verify your email**.
2. Open **[Account -> API keys](https://lawdiver.com/account/api-keys)**.
3. **Create a key**. It is shown **exactly once** (only a SHA-256 hash is stored -- it cannot be re-displayed).
4. Store it as an environment variable on your **server**:

```bash
# preferred
export LAWDIVER_API_KEY=ld_live_xxxxxxxxxxxxxxxxxxxx

# optional legacy alias (sample clients still accept it)
# export LAWTOOLS_API_KEY=ld_live_xxxxxxxxxxxxxxxxxxxx
```

5. Send it on every authenticated request:

```http
Authorization: Bearer ld_live_xxxxxxxxxxxxxxxxxxxx
# or
X-API-Key: ld_live_xxxxxxxxxxxxxxxxxxxx
```

**Never** put a key in browser JavaScript, a mobile app bundle, or a public repo. Call LawDiver from your backend and proxy results to the client. If a key is lost, revoke it and issue a new one -- revocation applies on the next request.

More detail: [docs/getting-started.md](./docs/getting-started.md) · [docs/authentication.md](./docs/authentication.md).

---

## Quickstart

### 1. Clone and configure

```bash
git clone https://github.com/lawdiver/LawDiver_api.git
cd LawDiver_api
cp .env.example .env
# edit .env and paste your key
```

### 2a. TypeScript (Node 18+)

```bash
cd typescript
npm install
npm run example:search
```

Minimal call:

```typescript
import { LawDiverClient } from "./src/client.js";

const client = new LawDiverClient(); // reads LAWDIVER_API_KEY

const found = await client.search({
  query: "promissory estoppel reliance damages",
  jurisdiction: { type: "one_state_plus_federal", state: "NY" },
  limit: 5,
});

for (const r of found.results) {
  console.log(r.caseName, " -- ", r.citation);
}
```

### 2b. Python 3.10+

```bash
cd python
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
python examples/01_search.py
```

Minimal call:

```python
from lawdiver import LawDiverClient

client = LawDiverClient()  # reads LAWDIVER_API_KEY

found = client.search(
    query="promissory estoppel reliance damages",
    jurisdiction={"type": "one_state_plus_federal", "state": "NY"},
    limit=5,
)

for r in found["results"]:
    print(r["caseName"], " -- ", r.get("citation"))
```

### 2c. cURL

```bash
curl -X POST https://lawdiver.com/api/v1/search \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "qualified immunity excessive force",
    "jurisdiction": { "type": "federal_circuit", "circuit": "11" },
    "limit": 5
  }'
```

See [`curl/examples.sh`](./curl/examples.sh) for the full cookbook.

---

## Repository map

```
LawDiver_api/
+---- README.md                 <- you are here (overview + SEO guide)
+---- docs/                     <- deep guides (about, auth, endpoints, recipes)
+---- typescript/               <- TypeScript examples client + runnable demos
+---- python/                   <- Python examples client + runnable demos
+---- curl/                     <- shell recipes
+---- .github/workflows/        <- CI (build + unit tests)
+---- .env.example              <- key template (copy to .env)
```

| Doc | Contents |
| --- | --- |
| [docs/about-lawdiver.md](./docs/about-lawdiver.md) | **About the API** -- features, advantages, corpus, agent loop (SEO) |
| [docs/why-lawdiver-api.md](./docs/why-lawdiver-api.md) | Builder value props vs scrape / incumbents |
| [docs/getting-started.md](./docs/getting-started.md) | Signup, keys, first successful call, env vars |
| [docs/authentication.md](./docs/authentication.md) | Headers, key hygiene, revocation |
| [docs/endpoints.md](./docs/endpoints.md) | Endpoint catalog with request/response notes |
| [docs/error-handling.md](./docs/error-handling.md) | Stable error codes, did-you-mean, retries |
| [docs/recipes.md](./docs/recipes.md) | End-to-end patterns (agents, briefs, idempotency) |

---

## How the API works (mental model)

1. **Authenticate** with a server-side Bearer key.
2. **Every JSON response** includes `requestId` (quote it in support) and usually a `usage` block (units recorded even while free).
3. **Search requires jurisdiction** -- unscoped national search is almost never what you want.
4. **Cite check never silently "fixes" a cite** -- `likely_valid` returns candidates; you (or a human) pick.
5. **Retrieve ambiguity is `200` + `did_you_mean`**, not an error -- present candidates, call again with `caseId`.
6. **Idempotency-Key** is honored on `POST /search`, `POST /citecheck/cite`, `POST /cases/retrieve`, and `POST /statutes/retrieve` for safe retries after timeouts.
7. **Document cite check is async** -- upload -> poll job -> download report PDF.
8. **PDFs are re-rendered** (good-law changes) -- cache bytes yourself when you need safe retry; they do not use idempotency keys.
9. **Rate limits** arrive as `X-RateLimit-*` and `RateLimit-*`; on `429`, honor `Retry-After`.
10. **Branch on `error.code`**, not message text -- codes are stable.

---

## Example gallery

| Example | TypeScript | Python |
| --- | --- | --- |
| Case search | [`typescript/examples/01-search.ts`](./typescript/examples/01-search.ts) | [`python/examples/01_search.py`](./python/examples/01_search.py) |
| Cite check citations | [`02-cite-check.ts`](./typescript/examples/02-cite-check.ts) | [`02_cite_check.py`](./python/examples/02_cite_check.py) |
| Case retrieve + did-you-mean | [`03-retrieve.ts`](./typescript/examples/03-retrieve.ts) | [`03_retrieve.py`](./python/examples/03_retrieve.py) |
| Statute retrieve by section | [`08-statute-retrieve.ts`](./typescript/examples/08-statute-retrieve.ts) | [`08_statute_retrieve.py`](./python/examples/08_statute_retrieve.py) |
| Document cite check | [`04-document-cite-check.ts`](./typescript/examples/04-document-cite-check.ts) | [`04_document_cite_check.py`](./python/examples/04_document_cite_check.py) |
| Agent-oriented search | [`05-agent-search.ts`](./typescript/examples/05-agent-search.ts) | [`05_agent_search.py`](./python/examples/05_agent_search.py) |
| Usage + discovery | [`06-usage.ts`](./typescript/examples/06-usage.ts) | [`06_usage.py`](./python/examples/06_usage.py) |
| Good-law + cited-by | [`07-good-law-cited-by.ts`](./typescript/examples/07-good-law-cited-by.ts) | [`07_good_law_cited_by.py`](./python/examples/07_good_law_cited_by.py) |
| Goodlaw check | [`09-goodlaw-check.ts`](./typescript/examples/09-goodlaw-check.ts) | [`09_goodlaw_check.py`](./python/examples/09_goodlaw_check.py) |

---

## Limits and support

- Default-ish ceiling: on the order of **60 requests/minute** per account (confirm via `GET /usage` -> `limits.rateLimitPerMinute`).
- Need a higher ceiling or another key? Ask -- those are per-account settings.
- Support: include the response **`requestId`** so LawDiver can jump to the exact log row.

Canonical policy always wins: [API docs](https://lawdiver.com/docs/api) and `GET /api/v1`.

---

## SEO / product keywords

LawDiver API · boolean and semantic legal search · U.S. court opinions API · case citation checker API · Bluebook citation validation · good law citator API · legal research API for developers and agents · TypeScript client · Python examples · brief cite check PDF · federal and state opinion search API · hallucination detection for legal citations · MCP legal tools · CaseDiver API integration

---

## Disclaimer

Examples in this repository are community-oriented integration samples. They are **not legal advice**. Always verify authority against primary sources for any filing or advice. See LawDiver [Terms](https://lawdiver.com/terms) and the official [API documentation](https://lawdiver.com/docs/api).

---

## Links

- [LawDiver home](https://lawdiver.com)
- [API product](https://lawdiver.com/products/api)
- [API documentation](https://lawdiver.com/docs/api)
- [CaseDiver](https://lawdiver.com/casediver)
- [Search connectors](https://lawdiver.com/docs/search-connectors)
- [API keys](https://lawdiver.com/account/api-keys)
