/**
 * Example 02 -- Cite check one or many citations
 * Language: TypeScript (Node.js)
 * Docs: https://lawdiver.com/docs/api
 *
 * Match expanded rows on inputIndex (not array index). There is no cite
 * verdict "not_found" -- use not_in_corpus / implausible / not_covered / etc.
 */
import { LawDiverClient } from "../src/client.js";
import type { CiteCheckItem } from "../src/types.js";

const client = new LawDiverClient();

const payload = await client.citeCheck({
  citations: ["570 U.S. 744", "999 F.3d 1"],
});

console.log(`requestId: ${payload.requestId}`);
console.log(`units: ${payload.usage.quantity}`);
console.log(`rows: ${payload.results.length} (may exceed input count for compounds)`);
console.log("");

function summarizeNegatives(item: CiteCheckItem): string | null {
  switch (item.verdict) {
    case "implausible":
      return "strong fabrication signal";
    case "not_in_corpus":
      return "searched held range, no match";
    case "not_covered":
      return "range not held / unparseable";
    case "unverified":
      return "cannot confirm or deny";
    case "error":
      return item.lookupStatus === "deadline_exceeded"
        ? "soft timeout (deadline_exceeded) -- not billed; retry"
        : "row failed -- not billed";
    default:
      return null;
  }
}

for (const item of payload.results) {
  const label = item.citationAsSent ?? item.citationAsWritten ?? "(unknown)";
  console.log(
    `[input ${item.inputIndex}${item.unitIndex != null ? ` unit ${item.unitIndex}` : ""}] ${label} -> ${item.verdict}`,
  );
  if (item.lookupStatus) console.log(`  lookupStatus: ${item.lookupStatus}`);
  if (item.correctedCitation) console.log(`  Bluebook: ${item.correctedCitation}`);
  if (item.explanation) console.log(`  ${item.explanation}`);
  if (item.corpusCaveat) console.log(`  caveat: ${item.corpusCaveat}`);

  const negative = summarizeNegatives(item);
  if (negative) console.log(`  note: ${negative}`);

  if (
    item.verdict === "likely_valid" ||
    item.verdict === "name_mismatch" ||
    item.verdict === "page_mismatch"
  ) {
    for (const c of item.candidates ?? []) {
      console.log(`  candidate: ${c.bluebookCitation ?? JSON.stringify(c)}`);
    }
  }
  console.log("");
}
