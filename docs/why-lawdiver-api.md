# Why the LawDiver API

If you are shipping legal research features, cite hygiene, or grounded legal AI, most opinion APIs fall into one of three traps: thin scrapes, silent citation rewriting, or search that ignores how lawyers actually scope authority. LawDiver's [public API](https://lawdiver.com/products/api) is designed to avoid those traps -- the same retrieval and citation stack that powers [CaseDiver](https://lawdiver.com/casediver), exposed as versioned REST.

Field reference: [lawdiver.com/docs/api](https://lawdiver.com/docs/api).

---

## Why builders choose LawDiver

### Same verified corpus as the product

Every search, cite check, and PDF comes from the corpus that powers lawdiver.com -- **~10 million** federal and state opinions, structured metadata, and a large citation graph (tens of millions of resolved opinion-to-opinion edges). Your integration and the public site stay aligned. Harvest is continuous across 200+ court sites and government sources -- not a quarterly dump.

**Public records, not a commercial feed.** There is no Westlaw or Lexis license underneath, and no clause that forbids your product from competing with ours. That is why an API like this can exist for legal AI builders at all.

### Cite checking that refuses to lie

Silent auto-correction is dangerous: rewriting a brief's citation to a case the author never read is worse than flagging ambiguity.

LawDiver asks the determinate question -- does this cite name a real case **in a corpus we hold**, what is the correct Bluebook form, and is it still good law? -- and returns explicit verdicts:

| Verdict | Meaning |
| --- | --- |
| `valid` | Exact reporter-key match **and** name/year/court as written agree; `correctedCitation` carries proper Bluebook form |
| `name_mismatch` | Reporter cite is real, but names/year/court as written do not match -- **classic hallucination shape** |
| `page_mismatch` | Pin/internal page rather than first page; corrected first-page form supplied |
| `likely_valid` | Candidates only; **no automatic pick** |
| `implausible` | Strong fabrication signal (e.g. impossible reporter volume) |
| `not_in_corpus` | Searched a held range, no match -- may include `corpusCaveat` (not proof of fabrication) |
| `not_covered` | Range not held / unparseable -- absence is evidence of nothing |
| `unverified` | No source can honestly confirm or deny |
| `error` | This row failed to check, including soft timeout (`lookupStatus: deadline_exceeded`); reported, not omitted |

There is no cite verdict `not_found` -- that code is only HTTP 404 or retrieve `status: "not_found"`.

Present candidates to a human (or an explicit product policy). Confidence reaches **1.0 only** for reporter-key matches -- no fuzzy 0.97 standing in for certainty.

### Legal search with engine-level control

`POST /search` **requires** jurisdiction -- Florida counsel rarely wants an unscoped national crawl. Eight scopes cover state-only, state+federal, circuits, districts, Supreme Court, and "everything" when you truly need it. Call `GET /jurisdictions` instead of hard-coding codes.

Four engines + a router that plans (citation, name, boolean with `AND` / `OR` / `NOT`, `/s` = 25 words, `/p` = 80 words, `w/n`, semantic, hybrid, or `auto`). `searchType: "boolean"` is the strict Terms and Connectors pin. `keyword` is the old name and runs the same search. Pinning is honest: drop an engine for want of input rather than return a mysterious empty set.

### One call for agent loops

```json
{
  "include": {
    "caseCard": true,
    "opinionText": true,
    "goodLawReport": true
  },
  "opinionTextMaxChars": 10000,
  "limit": 5
}
```

A tool-using model gets summary/holdings (when analyzed), opinion excerpts or full short opinions, and negative-treatment evidence -- without a second retrieval round-trip. Keep `limit` small when opinion text is on.

### Document-scale cite check

Upload a PDF/DOCX brief (`multipart/form-data`), receive a job id, poll until complete, download a report PDF with tallies, Bluebook forms, and first-page exhibits. Short forms bind to earlier full cites. Jobs are account-scoped -- another account's job id returns `not_found`.

### Did-you-mean is a feature, not an error

Ambiguous retrieve queries return **HTTP 200** with `status: "did_you_mean"` and up to three candidates. Your error handler should not swallow them. Answer on the **same** endpoint by resubmitting with `caseId`.

### Production-minded HTTP

- Bearer auth (or `X-API-Key`)
- Stable `error.code` values
- `requestId` on every response for support
- `Idempotency-Key` on search, cite-check-cite, and retrieve
- Rate-limit headers + `Retry-After`
- Usage ledger on every call
- Additive-only public shapes -- fields get added, never renamed out from under you

### Measure volume while you integrate

Integrate and measure volume via `GET /usage`. The unauthenticated discovery document at `https://lawdiver.com/api/v1` shows endpoints **before** you create a key.

---

## When to choose LawDiver over rolling your own

| Build yourself | Use LawDiver API |
| --- | --- |
| Maintain opinion ingest + PDF rendering | Call `/cases/:id/pdf` |
| Parse Bluebook edge cases + short forms | `/citecheck/cite` + `/citecheck/document` |
| Track negative treatment | `goodLaw` + `/good-law` |
| Scope search like a practitioner | jurisdiction object + `/jurisdictions` |
| Detect hallucinated cites (real reporter, wrong caption) | `name_mismatch` verdict |
| Boolean + semantic + fusion retrieval | `POST /search` with `auto` / `boolean` / `hybrid` / pin |
| Run many calls and keep one output | `POST /bulk` — 3 attempts per call, parallel when the API is quiet |

---

## Fits modern stacks

- **TypeScript / Node** backends and Next.js API routes (primary examples in this repo)
- **Python** research notebooks, Django/FastAPI services, data pipelines
- **Any language** via plain REST / cURL
- Complements LawDiver **MCP** at [lawdiver.com/mcp](https://lawdiver.com/mcp) (toolspec: [`/mcp/toolspec.json`](https://lawdiver.com/mcp/toolspec.json)) -- same key, same usage meter

---

## Next

- [About LawDiver & the API](./about-lawdiver.md)
- [Getting started](./getting-started.md)
- [Endpoints](./endpoints.md)
- [Recipes](./recipes.md)
- Product: [lawdiver.com/products/api](https://lawdiver.com/products/api)
- Docs: [lawdiver.com/docs/api](https://lawdiver.com/docs/api)
