# About the LawDiver API

**LawDiver** ([lawdiver.com](https://lawdiver.com)) is a U.S. legal research and workflow platform. The [LawDiver API](https://lawdiver.com/products/api) gives builders programmatic access to the **same verified opinion database** that powers CaseDiver on the site: search cases, retrieve full opinions, and check citations from your own applications, agents, and workflows.

This repository is the public **examples and integration guide** for that API -- TypeScript, Python, and cURL clients you can clone and run against `https://lawdiver.com/api/v1`.

| Resource | Link |
| --- | --- |
| Product page | [lawdiver.com/products/api](https://lawdiver.com/products/api) |
| API reference | [lawdiver.com/docs/api](https://lawdiver.com/docs/api) |
| Discovery (no key) | `GET https://lawdiver.com/api/v1` |

---

## The legal research API builders have been waiting for

Every team building legal AI hits the same wall: the agent reasons well, the draft demos well -- then someone asks where the law comes from.

Until recently the answers were scrape-and-stitch (search that behaves like 2003) or a six-figure commercial data license with procurement cycles and usage caps written by vendors whose business model your product threatens. The bottleneck was never the model. It was **retrieval and verification at the level a lawyer actually researches**.

LawDiver opens the same stack our own products run on:

- **Full legal search** with real engine control (boolean, semantic, hybrid, citation, case name, or auto)
- **Case retrieval** with the citation graph attached
- **A cite checker** that resolves and scores individual citations -- or every citation in an entire brief

It is a versioned REST API, authenticated with an API key.

> Get a key at [Account -> API keys](https://lawdiver.com/account/api-keys) after signup. Call from your backend only -- never ship keys in browser or mobile bundles.

---

## What the API includes

| Capability | What you get |
| --- | --- |
| **Case search** | Semantic, boolean (strict Terms and Connectors, with `/s` as 25 words and `/p` as 80 words), hybrid, citation, and case-name search across federal and state opinions, with jurisdiction and court filters |
| **Case retrieval** | Full opinion text and structured metadata -- holdings, citations, court, dates -- plus PDF with processing material appended |
| **Cite check** | Verify whether a citation exists and is still good law, including treatment, subsequent history, and reversal flags; batch up to 50 cites or upload a whole brief |
| **Citation graph** | Good-law detail and paginated cited-by for any case |
| **Same key via MCP** | Hosted MCP at [lawdiver.com/mcp](https://lawdiver.com/mcp); tool catalog [`/mcp/toolspec.json`](https://lawdiver.com/mcp/toolspec.json) -- same API key and usage meter as REST |

Canonical field-level docs: [endpoints.md](./endpoints.md) · [lawdiver.com/docs/api](https://lawdiver.com/docs/api).

---

## Advantages that matter in production

### 1. Same corpus as the product -- not a thin scrape

Roughly **10 million** opinions (majority, concurrence, and dissent individually addressable) spanning the U.S. Supreme Court, all federal courts of appeals, federal district courts, and the appellate and supreme courts of all fifty states. Tens of millions of resolved citation edges; continuous harvest from **200+** court websites, government feeds, and bulk backfills so yesterday's slip opinion is in the index today.

**None of this is licensed from a commercial research platform.** No Westlaw feed, no Lexis feed, no scraped headnotes. Inputs are public records and public government publications; the analysis and citator graph are LawDiver's. That is why it can be offered as an API -- and why there is no clause forbidding your product from competing with ours.

### 2. Legal search that behaves like research

Lawyers type five different things into one box: a reporter cite, a half-remembered caption, a proximity boolean, a plain-language issue, or all of the above at once. Systems that treat those as one problem are bad at all five.

LawDiver runs **four independent engines** plus a router that produces a *plan* (not a single label): citations, dockets, `X v. Y` captions, parsed boolean, jurisdiction phrases lifted into filters, and residual concept text. Constraints become filters -- leave "5th Circuit" in the query and you match opinions that *discuss* the Fifth Circuit; lift it into a filter and you remove most of the corpus before expensive work runs.

`searchType` accepts `auto` (recommended), `citation`, `case_name`, `boolean`, `semantic`, or `hybrid`. `keyword` is accepted and runs `boolean`. Pin `boolean` for a strict terms-and-connectors query (`AND`, `&`, `OR`, `NOT`, `%`, `"phrase"`, `!`, `*`, `/s` = 25 words, `/p` = 80 words, `w/n`) when every hit must satisfy the expression and an empty page must stay empty. `/s` and `/p` are word windows because many opinions are PDFs converted to text. Pinning is honest: if you pin `citation` on a string with no cite, the API tells you the engine was dropped -- rather than returning an empty set indistinguishable from "this case does not exist."

### 3. Boolean and proximity done correctly

Under `auto`, `AND` / `OR` / `NOT` are operators only in capitals; lowercase `and` is a word. On a boolean pin, lowercase `and` / `or` / `not` are connectors too. `/s` is within 25 words and `/p` is within 80 words. Those are substitutes for a sentence and a paragraph: many opinions are PDFs converted to text, so real sentence breaks are not reliable. `/n` and `w/n` are within *n* words. A boolean pin does not relax a miss into a looser search.

### 4. Cite checking built for legal AI, not string matching

Most checkers ask whether a string *looks* like a citation. Hallucinated cites look real. The right question is: does this name a real case **in a corpus we hold**, what is the correct Bluebook form, and is it still good law?

Verdict taxonomy includes the product-defining **`name_mismatch`**: the reporter key resolves to a real case, but party names, year, or court as written do not match -- the classic hallucinated-cite shape (a real cite glued to the wrong caption). **`likely_valid`** returns ranked candidates and deliberately does **not** pick one. Silent "correction" to a case the author never read is the worst failure mode in legal software.

Upload a PDF or Word brief and every case citation is checked -- short forms (`Id.`, `supra`, pincites) bind to earlier full cites instead of being re-resolved as first pages. Positions come back so you can highlight spans in your own viewer.

### 5. Agent-ready payloads in one round trip

On search, turn on `include.caseCard`, `include.opinionText`, and `include.goodLawReport` (good-law report is on by default) so a tool-calling model gets analysis, excerpts, and treatment evidence without a hop per hit. Keep `limit` small when opinion text is on.

### 6. Honest uncertainty and production HTTP

- Bad law is **flagged, not hidden** by default (`goodLawOnly` is opt-in)
- Unpublished opinions are **hidden by default** (cannot be cited as precedent in most jurisdictions)
- `goodLaw.unknown` means *not yet determined* -- never present silence as approval
- Every response carries `requestId`; billable responses carry a `usage` block
- `Idempotency-Key` on search, cite-check-cite, and retrieve so retries do not run the work twice
- Stable `error.code` values; rate-limit headers and `Retry-After`

### 7. Discover before you sign

The unauthenticated discovery document at `https://lawdiver.com/api/v1` lists endpoints **before** anyone asks for a signature. Usage is ledgered so volume stays visible.

---

## What building a legal research agent looks like

1. **Constrain, then rank** -- `POST /search` with `searchType: "auto"`, jurisdiction, and date filters.
2. **Read the flags** -- every hit already carries good-law status and `matchExplanation`.
3. **Pull what matters** -- `POST /cases/batch` (up to 50) or `/cases/:id/pdf` for court pagination.
4. **Walk the graph** -- `/cases/:id/cited-by` and `/cases/:id/good-law`.
5. **Check your own output** -- `/citecheck/document` or `/citecheck/cite` before a human sees the draft. A `name_mismatch` means the model hallucinated -- and you caught it.

A legal AI product's reputation is not lost on a mediocre answer. It is lost the first time it cites a case that does not exist.

---

## CaseDiver and the broader platform

[**CaseDiver**](https://lawdiver.com/casediver) is the public research UI over the same corpus: search 10M+ opinions, read full text, download PDFs -- no login for core search. Beyond that, LawDiver offers **CiteDiver**, **StatDiver**, **MCP** (same key as REST), and bulk/data products.

> LawDiver is offered to users located in the United States. It is **not legal advice**. Westlaw and Lexis are trademarks of their respective owners; LawDiver is not affiliated with, endorsed by, or sponsored by either.

---

## Who this is for

| Audience | Why LawDiver API |
| --- | --- |
| Legal AI / agent builders | Search + retrieve + cite-check loop with hallucination-shaped verdicts |
| Legaltech product engineers | Plain REST, TypeScript/Python examples in this repo, MCP option |
| Law firms & workflow tools | Jurisdiction-scoped research, Bluebook forms, good-law treatment |
| Research & compliance pipelines | Batch metadata, cited-by graph, usage ledger, idempotent retries |
| Students & public-interest builders | Free rollout access over a public-records corpus |

---

## SEO keywords (product language)

LawDiver API · legal AI API · U.S. court opinions API · boolean and semantic legal search · case citation checker API · Bluebook citation validation · good-law citator API · brief cite check PDF · federal and state opinion search · legal research API for agents · CaseDiver API · LawDiver MCP · hallucination detection for legal citations

---

## Next steps

- [Why the LawDiver API](./why-lawdiver-api.md) -- builder-focused value props
- [Getting started](./getting-started.md) -- key, first call, env vars
- [Endpoints](./endpoints.md) -- full catalog
- [Recipes](./recipes.md) -- agents, briefs, idempotency
- Official docs: [https://lawdiver.com/docs/api](https://lawdiver.com/docs/api)
