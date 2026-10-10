# LawDiver API -- TypeScript / Node.js examples

**Primary language in this repository.** Official docs also use TypeScript for the quickstart.

Requires **Node.js 18+** (native `fetch`, `FormData`, `Blob`).

This folder is an **examples client** (`private: true` in `package.json`). It is **not** published to npm -- clone this repo or copy `src/` into your app.

## Setup

```bash
# from repo root
cp .env.example .env
# paste LAWDIVER_API_KEY=ld_live_...

cd typescript
npm install
```

## Run examples

```bash
npm run example:search
npm run example:cite-check
npm run example:retrieve
npm run example:document   # needs path to a PDF/DOCX as argv
npm run example:agent
npm run example:usage
npm run example:good-law
npm run example:goodlaw-check
npm run example:boolean
npm run example:bulk
```

## Tests

```bash
npm test   # tsc build + node:test (mocked HTTP; no API key)
```

## Use the client in your app

```typescript
import { LawDiverClient } from "./src/client.js";

const client = new LawDiverClient();

const found = await client.search({
  query: "qualified immunity",
  jurisdiction: { type: "federal_circuit", circuit: "11" },
  limit: 5,
});
```

Build declarations:

```bash
npm run build
```

## Files

| Path | Purpose |
| --- | --- |
| `src/client.ts` | Thin REST client (sets `User-Agent`) |
| `src/types.ts` | Request/response types (full cite-check taxonomy) |
| `examples/*.ts` | Runnable demos |
| `test/*.ts` | Unit tests |
