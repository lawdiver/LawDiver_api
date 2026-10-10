/**
 * Example 10 -- Boolean (terms-and-connectors) search
 * Language: TypeScript (Node.js)
 * Docs: https://lawdiver.com/docs/api#search
 *
 * searchType "boolean" is strict Terms and Connectors. keyword is the old name
 * and runs the same search. On this pin, lowercase and/or/not are connectors.
 * /s is 25 words and /p is 80 words.
 * searchInfo.booleanOperatorsDetected is true when the parser saw them.
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();

const found = await client.search(
  {
    query: '"qualified immunity" /s "clearly established" AND NOT prison',
    jurisdiction: { type: "federal_circuit", circuit: "11" },
    searchType: "boolean",
    limit: 5,
    filters: { dateFrom: "2015-01-01" },
  },
  `boolean-demo-${crypto.randomUUID()}`,
);

const info = found.searchInfo ?? {};
console.log(`requestId: ${found.requestId}`);
console.log(`booleanOperatorsDetected: ${String(info.booleanOperatorsDetected)}`);
console.log(`returned ${found.total}`);
console.log("");

for (const r of found.results) {
  const flag = r.connectorMatch === false ? " connectorMatch=false" : "";
  console.log(`* ${r.caseName}${flag}`);
  console.log(`  ${r.citation ?? "(no citation)"}`);
  console.log("");
}

if (found.suggestion) {
  console.log("Suggestion:", found.suggestion);
}
