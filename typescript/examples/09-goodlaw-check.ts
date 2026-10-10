/**
 * Example 09 -- Goodlaw check
 * Language: TypeScript (Node.js)
 *
 * Lists cases that cite a case, with treatment status. A reversal is first
 * when one exists, then the newest citing case. Default limit is 10, order recent.
 *
 * Usage: npx tsx examples/09-goodlaw-check.ts [caseId]
 * Default caseId is United States v. Windsor (570 U.S. 744) as used in the docs.
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();
const caseId = process.argv[2] ?? "2812209";

const recent = await client.goodlawCheck(caseId, { limit: "10", order: "recent" });
console.log(`=== Goodlaw check (recent, limit 10) total=${recent.total} ===`);
for (const row of recent.citingCases) {
  const pin = row.pin ? ` [${row.pin}]` : "";
  console.log(`* ${row.caseName} -- ${row.status}${pin}`);
}

const negative = await client.goodlawCheck(caseId, { limit: "10", order: "negative" });
console.log(`\n=== Goodlaw check (negative, limit 10) total=${negative.total} ===`);
for (const row of negative.citingCases) {
  const pin = row.pin ? ` [${row.pin}]` : "";
  console.log(`* ${row.caseName} -- ${row.status}${pin}`);
}
