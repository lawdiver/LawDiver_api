/**
 * Example 08 -- Pull a statute section by Bluebook citation
 * Language: TypeScript (Node.js)
 *
 * Requires a proper section number (e.g. 42 U.S.C. § 1983). Cite-check confirms
 * existence; this call delivers statute.body when LawDiver holds or can fetch it.
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();
const query = process.argv[2] ?? "42 U.S.C. § 1983";

const hit = await client.retrieveStatute({ query });

console.log(`status: ${hit.status}`);
console.log(`message: ${hit.message ?? ""}`);
console.log(`requestId: ${hit.requestId}`);

if (hit.status === "ok" && hit.statute) {
  console.log(`bluebook: ${hit.statute.bluebook}`);
  console.log(`heading:  ${hit.statute.heading ?? "(none)"}`);
  console.log(`chars:    ${hit.statute.bodyChars ?? 0}`);
  console.log(`key:      ${hit.statute.authorityKey}`);
  const preview = (hit.statute.body ?? "").slice(0, 280).replace(/\s+/g, " ").trim();
  console.log(`preview:  ${preview}${(hit.statute.body?.length ?? 0) > 280 ? "…" : ""}`);
} else if (hit.status === "not_found") {
  console.log("No such section.", hit.note ?? "");
} else if (hit.status === "not_a_statute") {
  console.log("Not a statute citation. Include jurisdiction + section number.");
} else {
  console.log("Unavailable.", hit.note ?? hit.message ?? "");
  if (hit.statute?.officialUrl) console.log(`officialUrl: ${hit.statute.officialUrl}`);
}
