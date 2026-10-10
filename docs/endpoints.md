# LawDiver API v1 -- endpoint catalog

Canonical field-level reference: [https://lawdiver.com/docs/api](https://lawdiver.com/docs/api)  
Base: `https://lawdiver.com/api/v1`

Every JSON response includes `requestId`. Most also include `usage`. PDFs carry usage in headers -- prefer `X-LawDiver-*` (`X-LawTools-*` is still emitted for older clients).

---

## Discovery

### `GET /`

No API key. Returns the public surface.

```bash
curl https://lawdiver.com/api/v1
```

---

## Case search

### `POST /search`

Searches the opinion corpus. **Jurisdiction is required.**

**Key body fields**

| Field | Required | Notes |
| --- | --- | --- |
| `query` | yes | Citation, case name, issue description, or a boolean query (`AND`, `&`, `OR`, `NOT`, `%`, `"phrase"`, `!`, `*`, `/s`, `/p`, `w/N`) |
| `jurisdiction` | yes | See jurisdiction table below |
| `searchType` | no | `auto` (default), `citation`, `case_name`, `boolean`, `semantic`, `hybrid`. `keyword` is accepted and runs `boolean` |
| `limit` | no | 1-200, default 10; capped by account `maxCasesPerSearch` |
| `filters.dateFrom` / `dateTo` | no | `YYYY-MM-DD` |
| `filters.includeUnpublished` | no | Unpublished excluded by default |
| `filters.publishedOnly` | no | Further restrict to published |
| `filters.goodLawOnly` | no | Hide negative treatment (off by default -- bad law is flagged, not hidden) |
| `include.caseCard` | no | AI analysis card when available |
| `include.opinionText` | no | Full or excerpted opinion text |
| `include.goodLawReport` | no | Expand negative-treatment evidence (**on by default**) |
| `opinionTextMaxChars` | no | Default 10000, clamp 500-50000 |

**Result highlights:** each hit may include `bluebookCitation`, `parallelCitations`, and `opinionType` in addition to `citation` / `caseName` / `goodLaw`. Under `auto`, a row kept only because nothing satisfied the connectors is flagged `connectorMatch: false`. A boolean pin does not keep those rows.

**Boolean search.** Connectors work in any `searchType`. Under `auto` they are uppercase. Under `searchType: "boolean"`, lowercase `and` / `or` / `not` are connectors too, every term is required, and an empty page stays empty. The grammar is `AND` or `&` (a space is also AND), `OR`, `NOT` or `%`, `"phrase"`, a trailing `!` (root expander), `*` (exactly one character, not truncation), `/s` and `w/s` (within 25 words), `/p`, `w/p`, and `/seg` (within 80 words), `w/N` or `/N`, `+s` / `+p` / `+N` (same window, left term first), parentheses, and `field:term` (`case_name`, `syllabus`, `headnotes`, `holdings`, `body`). `/s` and `/p` are word windows, not real sentence or paragraph tests: many opinions are PDFs converted to text, and citation periods plus missing line breaks make those boundaries unreliable. Pin `boolean` to keep semantic and case-name hits out. `keyword` is the previous name and runs this same search. `searchInfo.booleanOperatorsDetected` is true when the parser saw connectors. Full rules: [lawdiver.com/docs/search-connectors](https://lawdiver.com/docs/search-connectors).

```json
{
  "query": "\"qualified immunity\" /s \"clearly established\" AND NOT prison",
  "jurisdiction": { "type": "federal_circuit", "circuit": "11" },
  "searchType": "boolean",
  "limit": 10
}
```

**Jurisdiction `type` values**

| `type` | Extra fields |
| --- | --- |
| `all_states` | -- |
| `all_states_and_federal` | -- |
| `all_federal` | -- |
| `one_state` | `state` (USPS, e.g. `"FL"`) |
| `one_state_plus_federal` | `state` |
| `federal_circuit` | `circuit` (`"1"`-`"11"`, `"dc"`, `"federal"`) |
| `federal_district` | `districtState` |
| `us_supreme_court` | -- |

Supports `Idempotency-Key`.

Prefer `GET /jurisdictions` over hard-coding state/circuit lists.

---

## Jurisdictions

### `GET /jurisdictions`

Authoritative types, circuit ids, USPS codes, and example payloads.

---

## Cite check -- citation(s)

### `POST /citecheck/cite`

Send exactly one of:

- `citation` -- string
- `citations` -- string array, max 50

Beyond 50, use the document endpoint.

**Sync behavior:** soft ~15s lookup budget after an exact-only first pass (overall wall ~20s). Timed-out rows return verdict `error` with `lookupStatus: deadline_exceeded`. Blank or overlong elements become per-row `error` verdicts -- they do **not** fail the whole request.

**Result rows are keyed by `inputIndex`.** Subsequent-history compounds and semicolon string cites can expand to multiple rows that share the same `inputIndex` (`unitIndex` distinguishes units). `results.length` may exceed the input count -- match on `inputIndex`, not array position. `citationAsSent` echoes the exact input; `citationAsWritten` may also be present. Graded negatives may include structured `coverage`; caption/year/court divergence may include `fieldMatches`. Candidates carry `knownCitations` when available.


**Verdicts** (there is no cite verdict `not_found`):

| Verdict | Meaning |
| --- | --- |
| `valid` | Resolves cleanly; `correctedCitation` carries Bluebook form |
| `name_mismatch` | Real reporter cite, wrong caption/year/court as written |
| `page_mismatch` | Pin/internal page rather than first page; corrected form supplied |
| `likely_valid` | Candidates only; **no automatic pick** |
| `implausible` | Strong fabrication signal (e.g. impossible volume) |
| `not_in_corpus` | Searched a held range, no match -- not proof of fabrication |
| `not_covered` | Range not held / unparseable -- absence is evidence of nothing |
| `unverified` | Cannot confirm or deny |
| `error` | Row failed (including soft timeout); reported, not omitted |

Supports `Idempotency-Key`.

---

## Cite check -- document (async)

### `POST /citecheck/document`

`multipart/form-data` with `file` field. Accepts PDF, `.docx`, `.doc` up to 40 MB.

Returns immediately with `jobId`, `status`, `statusUrl`, `reportUrl`, `pollAfterSeconds`.

**Optional email-link delivery** — email recipients a secure link to the interactive results webpage when the check finishes (poll + PDF still work):

| Field | Required | Notes |
| --- | --- | --- |
| `file` | yes | PDF or Word |
| `delivery` | no | `poll` (default) or `email_link`. Supplying any `emails` / `email` also selects `email_link`. |
| `emails` | for email delivery | Repeat the field and/or comma/semicolon-separated. Max 10 unique addresses. |
| `email` | alias | Single address; merged into the same list. |

```bash
curl -X POST https://lawdiver.com/api/v1/citecheck/document \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -F "file=@brief.pdf" \
  -F "delivery=email_link" \
  -F "emails=partner@firm.com" \
  -F "emails=associate@firm.com"
```

Response includes `delivery`, masked `emails`, and `resultsUrl` (opaque URL, 7-day expiry). Each recipient is emailed that link when the job completes.

### `GET /citecheck/jobs/:id`

Poll every 2-5 seconds until `completed` or `failed`. Completed payloads include per-citation findings (`citations`) and `counts`. When email delivery was requested: masked `emails`, `resultsUrl`, `emailSentAt`.

### `GET /citecheck/jobs/:id/report`

`application/pdf` report. Jobs are scoped to your account.

---

## Bulk upload (async)

Every API call has a time limit to completion. The search budget stays under the edge gateway idle timeout (about 100 seconds) so a finished call returns JSON. When API usage is high, some requests — especially complex searches — still hit that limit before they finish and come back as errors or as a degraded search. A timeout is not a finding that the authority is absent.

### `POST /bulk`

Upload a JSON object `{ "requests": [ ... ] }` or the same JSON as multipart field `file`. Up to 100 calls, 2 MB.

The upload returns `jobId`, `statusUrl`, `resultUrl`, and `pollAfterSeconds`. It does not wait for the calls to finish.

Each call is attempted **3 times** before the job gives up on it. The extra attempts run after a timeout, a 5xx, or a degraded search. Invalid requests and real misses are not repeated. When recent API usage is low, several calls in the file run at once, which can finish faster than a serial loop. When usage is high, calls run one at a time.

Allowed inside the file: search, cite check, citation resolve, case and statute retrieval, case JSON (metadata, text, good-law, Goodlaw check, cited-by), jurisdictions, and usage. PDF downloads, document uploads, and nested bulk jobs stay as their own calls.

```bash
curl -X POST https://lawdiver.com/api/v1/bulk \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"requests":[{"id":"q1","method":"POST","path":"/api/v1/search","body":{"query":"qualified immunity","jurisdiction":{"type":"us_supreme_court"},"limit":3}}]}'
```

### `GET /bulk/jobs/:id`

Progress: `status`, `completedCount`, `failedCount`, `concurrency`.

### `GET /bulk/jobs/:id/result`

One JSON document once `status` is `completed` (or `failed`). `results` is in upload order. Each row has `id`, `attempts` (1–3), `ok`, `httpStatus`, and `response` (the body that endpoint would have returned on its own). `ok: false` after 3 attempts means the call still timed out or errored. Read `response` anyway. Polling the result URL before the job finishes returns `not_found`.

Clients: `client.bulkUpload(...)` (TypeScript) and `client.bulk_upload(...)` (Python). See `typescript/examples/10-bulk-upload.ts` and `python/examples/10_bulk_upload.py`.

---

## Citation resolve

### `POST /citations/resolve`

Body: `{ "query": "410 U.S. 113" }` (2-500 chars). Up to five candidates; no PDF delivery.

---

## Case retrieval

### `POST /cases/retrieve`

Body:

- `query` (required) -- citation or case name
- `caseId` (optional) -- answer a prior did-you-mean (opinion id)

**Statuses (all HTTP 200):** `ok` · `did_you_mean` · `not_found`

Retrieve `not_found` is **not** a cite-check verdict. Do not merge the two taxonomies.

Supports `Idempotency-Key`.

---

## Statute retrieval

### `POST /statutes/retrieve`

Pull full section text for a statute, regulation, or court rule when you supply a **proper Bluebook citation with a section number**, or an `authorityKey` from cite-check.

Body (supply at least one of `query` / `authorityKey`):

| Field | Required | Notes |
| --- | --- | --- |
| `query` | one of | e.g. `42 U.S.C. § 1983`, `Fla. Stat. § 768.81`, `Cal. Civ. Code § 1714` |
| `authorityKey` | one of | From cite-check `authorityCoverage.authorityKey` (e.g. `st:federal:usc-42:1983`) |
| `year` | no | Preferred code edition year (1900–2100) |

**Statuses (all HTTP 200):**

| Status | Meaning |
| --- | --- |
| `ok` | `statute.body` holds the section text (records 1 retrieval unit) |
| `not_found` | No such section in a held corpus / official source |
| `unavailable` | Confirmed or attempted, but body not pullable |
| `not_a_statute` | Not a parseable statute/rule cite (or is a specialty form) |

Cite-check verifies existence; this endpoint **delivers the body**. Specialty administrative forms (Rev. Rul., SEC, NLRB) stay on `POST /citecheck/cite`.

Supports `Idempotency-Key`.

```bash
curl -X POST https://lawdiver.com/api/v1/statutes/retrieve \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"42 U.S.C. § 1983"}'
```

TypeScript: `client.retrieveStatute({ query: "42 U.S.C. § 1983" })`  
Python: `client.retrieve_statute(query="42 U.S.C. § 1983")`

---

## Case metadata

### `GET /cases/:id`

Metadata only. `:id` may be **opinion id or cluster id**.

---

## Case batch

### `POST /cases/batch`

Body: `{ "caseIds": ["...", "..."] }` up to 50. Returns `cases` + `notFound`.

---

## Good-law detail

### `GET /cases/:id/good-law`

Status plus `negativeCitations`.

---

## Goodlaw check

### `GET /cases/:id/goodlaw-check?limit=10&order=recent`

Citing cases with a `status` on each row (`overruled`, `questioned`, `followed`, `cited`, and the rest of the treatment vocabulary). When no treatment was recorded, `status` is `not adverse`. An explicit `cited` stays `cited`.

`:id` may be an opinion id or a cluster id. Resolve a reporter cite first (`POST /citations/resolve` or `POST /cases/retrieve`), then pass `caseId`.

| Query | Values | Default |
| --- | --- | --- |
| `limit` | `10`, `50`, `100`, `unlimited` | `10` |
| `order` | `recent`, `negative` | `recent` |

`limit` is the total number of names returned. Other values are `invalid_request`.

`citingCases` is ordered like this, with no duplicate case:

1. The newest reversal, when one exists (`pin` `reversal`). A reversal is a citing case whose treatment is in the overruling family (`overruled`, `reversed`, `vacated`, `abrogated`, `superseded`, including `overruled_in_part`). `status` is still that verb.
2. The newest citing case, any treatment (`pin` `mostRecent`). If there is no reversal, this is the first row. If the newest cite is the reversal, it stays first only. On `order=negative` this row stays even when its status is `not adverse`.
3. The rest. `recent` is newest citing cases first. `negative` is negative treatments only (`overruled`, `reversed`, `vacated`, `abrogated`, `superseded`, `questioned`, `criticized`, `limited`, `distinguished`), newest first.

`total` is the stored citing-case count for `recent`, and the count of citing cases with a negative treatment for `negative`. `citingCaseId` is the public opinion id of the citing case. A completed check records one unit (`operation` `goodlaw_check`). The citing-case count does not change that unit. A missing case records none. `unlimited` can return `service_unavailable` on the same soft deadline as cited-by; retry with `limit=100`. That timeout records no unit.

---

## Cited by

### `GET /cases/:id/cited-by?limit=25&offset=0`

`limit` 1-100 (default 25), `offset` default 0.

---

## Case PDF

### `GET /cases/:id/pdf`

Opinion PDF with processing/analysis appendix. `:id` must be an **opinion id**.

Usage travels in response headers (PDF cannot carry the JSON `usage` envelope). Prefer:

```http
X-Request-Id: req_...
X-LawDiver-Operation: case_retrieval
X-LawDiver-Charge-Units: 1
```

`X-LawTools-Operation` and `X-LawTools-Charge-Units` are still emitted for older clients.

Re-rendered each time -- cache on your side. Does **not** honor `Idempotency-Key`.

---

## Usage

### `GET /usage?days=30`

`days` 1-365, default 30. Returns consumer info, `byOperation` (calls and units), and `limits` (`rateLimitPerMinute`, `dailyRequestLimit`, `maxCasesPerSearch`).

---

## MCP (same key)

Hosted Model Context Protocol server: [https://lawdiver.com/mcp](https://lawdiver.com/mcp) (Streamable HTTP). Tool catalog: [https://lawdiver.com/mcp/toolspec.json](https://lawdiver.com/mcp/toolspec.json). Same API key and usage meter as REST -- no MCP implementation is required in the HTTP clients in this repo.

---

## Retired routes

`POST /requests` and `GET /requests/:id` return `gone` (410). Use retrieval and cite-check instead.

---

## Envelope shape (JSON)

**Success**

```json
{
  "results": [],
  "usage": {
    "operation": "case_search",
    "quantity": 7,
    "breakdown": { "cases": 7 }
  },
  "requestId": "req_Ab3xK9pQ"
}
```

**Error**

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Invalid search request.",
    "details": [{ "field": "jurisdiction.state", "message": "..." }]
  },
  "usage": null,
  "requestId": "req_Ab3xK9pQ"
}
```

Branch on `error.code`, not the message string.
