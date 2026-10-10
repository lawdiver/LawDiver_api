/**
 * Example 03 -- Case retrieve with did-you-mean handling
 * Language: TypeScript (Node.js)
 *
 * Ambiguous queries return HTTP 200 + status "did_you_mean" -- not an error.
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();
const query = process.argv[2] ?? "410 U.S. 113";

let hit = await client.retrieve({ query });

if (hit.status === "did_you_mean") {
  console.log("Ambiguous -- candidates:");
  for (const c of hit.candidates) {
    console.log(`  [${c.caseId}] ${c.bluebookCitation ?? c.caseName} (confidence=${c.confidence})`);
  }
  // Demo policy: pick the first candidate. In production, ask a human.
  const chosen = hit.candidates[0];
  if (!chosen) {
    console.log("No candidates returned.");
    process.exit(0);
  }
  console.log(`\nResolving with caseId=${chosen.caseId}...`);
  hit = await client.retrieve({ query, caseId: chosen.caseId });
}

if (hit.status === "not_found") {
  console.log("No match.", hit.corpusCaveat ?? "");
  console.log(`requestId: ${hit.requestId}`);
  process.exit(0);
}

if (hit.status === "ok") {
  const c = hit.case;
  console.log("OK");
  console.log(`  caseId: ${c.caseId ?? "(see payload)"}`);
  console.log(`  name:   ${(c as { caseName?: string }).caseName ?? "(see payload)"}`);
  console.log(`  pdfUrl: ${c.pdfUrl}`);
  console.log(`  requestId: ${hit.requestId}`);
}
