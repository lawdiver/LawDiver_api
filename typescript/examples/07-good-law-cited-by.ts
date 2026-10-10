/**
 * Example 07 -- Good-law detail + cited-by pagination
 * Language: TypeScript (Node.js)
 *
 * Usage: npx tsx examples/07-good-law-cited-by.ts [caseId]
 * Default caseId is United States v. Windsor (570 U.S. 744) as used in the docs.
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();
const caseId = process.argv[2] ?? "2812209";

const goodLaw = await client.goodLaw(caseId);
console.log("=== Good-law ===");
console.log(JSON.stringify(goodLaw, null, 2).slice(0, 1500));
console.log("");

const citedBy = (await client.citedBy(caseId, { limit: 10, offset: 0 })) as {
  results?: unknown[];
  total?: number;
  requestId?: string;
};
console.log("=== Cited by (first page) ===");
console.log(`total~ ${citedBy.total ?? "?"} · requestId=${citedBy.requestId}`);
const rows = citedBy.results ?? (citedBy as unknown as { cases?: unknown[] }).cases ?? [];
for (const row of rows.slice(0, 10)) {
  const r = row as { caseName?: string; citation?: string; year?: number };
  console.log(`* ${r.caseName ?? JSON.stringify(row).slice(0, 100)} -- ${r.citation ?? ""} (${r.year ?? ""})`);
}

const meta = await client.caseMetadata(caseId);
console.log("\n=== Metadata (truncated) ===");
console.log(JSON.stringify(meta, null, 2).slice(0, 800));
