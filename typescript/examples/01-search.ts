/**
 * Example 01 -- Case search
 * Language: TypeScript (Node.js)
 * Docs: https://lawdiver.com/docs/api#case-search
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();

const found = await client.search(
  {
    query: "qualified immunity excessive force",
    jurisdiction: { type: "federal_circuit", circuit: "11" },
    limit: 5,
    filters: { dateFrom: "2015-01-01" },
  },
  `search-demo-${crypto.randomUUID()}`, // idempotency key for safe retries
);

console.log(`requestId: ${found.requestId}`);
console.log(`returned ${found.total} of ~${found.totalAvailable ?? "?"} matches`);
console.log(`usage: ${found.usage.quantity} unit(s) · operation=${found.usage.operation}`);
console.log("");

for (const r of found.results) {
  const gl = r.goodLaw
    ? `goodLaw=${r.goodLaw.status}${r.goodLaw.negative ? " (NEGATIVE)" : ""}`
    : "goodLaw=?";
  console.log(`* ${r.caseName}`);
  console.log(`  ${r.citation ?? "(no citation)"} · ${r.courtAbbreviation ?? r.court ?? ""}`);
  console.log(`  ${gl}`);
  if (r.snippet) console.log(`  snippet: ${r.snippet.slice(0, 140)}...`);
  console.log("");
}

if (found.suggestion) {
  console.log("Empty-ish set suggestion:", found.suggestion);
}
