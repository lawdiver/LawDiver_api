/**
 * Example 05 -- Agent-oriented search (case card + opinion text + good-law)
 * Language: TypeScript (Node.js)
 *
 * One call returns enough context for a tool-using model to reason.
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();

const found = await client.search({
  query: "can a landlord withhold a deposit for ordinary wear and tear",
  jurisdiction: { type: "one_state_plus_federal", state: "FL" },
  limit: 5,
  include: { caseCard: true, opinionText: true, goodLawReport: true },
  opinionTextMaxChars: 10000,
});

console.log(`requestId: ${found.requestId}`);
console.log(`engines:`, (found.searchInfo as { enginesUsed?: string[] } | undefined)?.enginesUsed);
console.log("");

for (const r of found.results) {
  if (r.goodLaw?.negative) {
    console.warn(`WARNING: BAD LAW · ${r.caseName} · ${r.goodLaw.status}`);
  } else if (r.goodLaw?.unknown) {
    console.warn(`? UNKNOWN treatment · ${r.caseName}`);
  }

  const summary =
    (r.caseCard as { summaryAi?: string } | null)?.summaryAi?.slice(0, 160) ??
    "(no case card yet)";
  console.log(`* ${r.caseName} -- ${r.citation}`);
  console.log(`  summary: ${summary}`);
  if (r.opinion) {
    console.log(
      `  opinion: mode=${r.opinion.mode} chars=${r.opinion.charCount} truncated=${r.opinion.truncated}`,
    );
    console.log(`  excerpt: ${r.opinion.text.slice(0, 120).replace(/\s+/g, " ")}...`);
  }
  console.log("");
}
