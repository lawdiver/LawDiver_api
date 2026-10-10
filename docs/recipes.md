# Recipes -- end-to-end LawDiver API patterns

Runnable code lives under [`typescript/examples`](../typescript/examples) and [`python/examples`](../python/examples). This page explains the patterns.

---

## Recipe A -- Practitioner search in one state + federal

Use `one_state_plus_federal` when you want what a lawyer in that state actually cites: state courts, the regional circuit, and the U.S. Supreme Court.

```json
{
  "query": "landlord security deposit ordinary wear and tear",
  "jurisdiction": { "type": "one_state_plus_federal", "state": "FL" },
  "limit": 10,
  "filters": { "dateFrom": "2010-01-01" }
}
```

---

## Recipe B -- Agent search (card + excerpts + good-law)

One round-trip for tool-using models. Keep `limit` small when `opinionText` is on.

```json
{
  "query": "can a landlord withhold a deposit for ordinary wear and tear",
  "jurisdiction": { "type": "one_state_plus_federal", "state": "FL" },
  "limit": 5,
  "include": {
    "caseCard": true,
    "opinionText": true,
    "goodLawReport": true
  },
  "opinionTextMaxChars": 10000
}
```

Surface `goodLaw.negative` loudly. Treat `goodLaw.unknown` as unknown -- never as a clean bill of health.

See: `05-agent-search` examples.

---

## Recipe B2 -- Boolean (terms and connectors)

Pin `searchType: "boolean"` when every hit must satisfy the expression. On that pin, lowercase `and` / `or` / `not` are connectors, every term is required, and an empty page stays empty. `/s` is within 25 words and `/p` is within 80 words, because many opinions are PDFs converted to text. `keyword` is accepted and runs the same search. `searchInfo.booleanOperatorsDetected` confirms the parser saw connectors. Same call from the TypeScript and Python clients (`searchType` / `searchType=`).

```json
{
  "query": "\"qualified immunity\" /s \"clearly established\" AND NOT prison",
  "jurisdiction": { "type": "federal_circuit", "circuit": "11" },
  "searchType": "boolean",
  "limit": 10,
  "filters": { "dateFrom": "2015-01-01" }
}
```

See: `10-boolean-search` / `10_boolean_search.py`. Operator rules: [lawdiver.com/docs/search-connectors](https://lawdiver.com/docs/search-connectors).

---

## Recipe C -- Cite-check a list before filing

```json
{ "citations": ["570 U.S. 744", "999 F.3d 1"] }
```

UI guidance (match rows on `inputIndex`, not array index -- compounds can expand):

- `valid` -> show `correctedCitation`
- `name_mismatch` -> warn: real reporter, wrong caption (hallucination shape)
- `page_mismatch` -> show corrected first-page form; review pin
- `likely_valid` -> show candidates; require human pick
- `implausible` -> strong fabrication signal
- `not_in_corpus` -> show `corpusCaveat` / `coverage` if present; do not auto-label "fake"
- `not_covered` -> range not held / unparseable; absence proves nothing
- `unverified` -> cannot confirm or deny
- `error` -> show failure for that row (including `lookupStatus: deadline_exceeded`); do not omit

There is no cite verdict `not_found` (that is HTTP 404 or retrieve `status` only).

---

## Recipe D -- Cite-check an entire brief

1. `POST /citecheck/document` with multipart `file`
2. Poll `GET /citecheck/jobs/:id` every ~5s (match `pollAfterSeconds`)
3. Stop on `completed` / `failed` or attempt ceiling
4. Read `counts` / `citations` only after `completed`
5. Download `GET /citecheck/jobs/:id/report` as PDF

See: `04-document-cite-check` examples.

### Recipe D2 -- Email the results page

Same upload, plus recipients who should open the interactive results webpage (no poll required for those humans; poll/PDF still work for your integration):

1. `POST /citecheck/document` with `file`, `delivery=email_link`, and one or more `emails` (repeat field or comma-separate; max 10)
2. Response includes `resultsUrl` (opaque, 7-day expiry) — the same link emailed to every recipient when the job completes
3. Optionally still poll `GET /citecheck/jobs/:id` / download the report PDF

```bash
curl -X POST https://lawdiver.com/api/v1/citecheck/document \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -F "file=@brief.pdf" \
  -F "delivery=email_link" \
  -F "emails=partner@firm.com" \
  -F "emails=associate@firm.com"
```

See: `04-document-cite-check` examples (TypeScript / Python accept `emails` / `delivery`).

---

## Recipe E -- Retrieve with did-you-mean round trip

```text
POST /cases/retrieve { "query": "Smith v. Jones" }
  -> status: did_you_mean + candidates[]

POST /cases/retrieve { "query": "Smith v. Jones", "caseId": "<chosen>" }
  -> status: ok + case.pdfUrl
```

Auto-picking `candidates[0]` is a product decision -- it can silently deliver the wrong case.

See: `03-retrieve` examples.

---

## Recipe F -- Safe retry after timeout

```text
key = "search-" + uuid()
attempt POST /search with Idempotency-Key: key
on timeout -> retry with SAME key and SAME body
  -> stored response + replayed: true
same key + different body -> 409 idempotency_conflict
  -> generate a new key for the new request (does not return the old answer)
```

Never reuse a key across different queries/bodies.

---

## Recipe G -- Download and cache a PDF

```bash
curl -L "https://lawdiver.com/api/v1/cases/2812209/pdf" \
  -H "Authorization: Bearer $LAWDIVER_API_KEY" \
  -o windsor.pdf
```

Re-fetch when currency of good-law/analysis matters; otherwise cache bytes for retries.

---

## Recipe H -- Distinguish network vs credentials

1. `GET /api/v1` -> proves network
2. `GET /api/v1/usage` -> proves key

See: `06-usage` examples.

---

## Recipe I -- Treatment graph lite

1. Search or retrieve to obtain `caseId`
2. `GET /cases/:id/goodlaw-check?limit=10&order=recent` for citing cases with status (reversal first, then the newest cite)
3. `GET /cases/:id/good-law` for the stored good-law summary
4. `GET /cases/:id/cited-by?limit=25&offset=0` for a plain recency page

See: `09-goodlaw-check` and `07-good-law-cited-by` examples.

## Recipe J -- Bulk analysis in one output

Use this when you have more than a handful of searches or cite checks.

Every API call has a time limit. Under heavy usage a complex search can time out and return an error (or a degraded search) before it finishes. `POST /bulk` attempts each call **3 times**, which is what makes the output usable. When usage is low, the service runs several calls from the file at once and the batch can finish faster than your own serial loop. When usage is high, it runs them one at a time.

1. Build `{ "requests": [ { "id", "method", "path", "body" } ] }`.
2. `POST /api/v1/bulk`.
3. Poll `statusUrl` until `status` is `completed`.
4. `GET` `resultUrl`. That body is the whole run: `results[]` in the same order, each with `attempts`, `ok`, and `response`.

`ok: false` after 3 attempts means that call still timed out. The last `response` is included. Do not read it as "no such case."

TypeScript: `typescript/examples/10-bulk-upload.ts`. Python: `python/examples/10_bulk_upload.py`.
