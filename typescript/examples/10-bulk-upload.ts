/**
 * Example 10 -- Bulk upload
 * Language: TypeScript (Node.js)
 *
 * Every API call has a time limit. When usage is high, a complex search can
 * time out before it finishes. Bulk upload attempts each call 3 times and
 * returns one JSON document when the job completes. When usage is low, calls
 * in the file run in parallel.
 *
 * Docs: https://lawdiver.com/docs/api#bulk
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();

const output = await client.bulkUpload([
  {
    id: "jurisdictions",
    method: "GET",
    path: "/api/v1/jurisdictions",
  },
  {
    id: "search",
    method: "POST",
    path: "/api/v1/search",
    body: {
      query: "qualified immunity",
      jurisdiction: { type: "us_supreme_court" },
      limit: 3,
    },
  },
]);

console.log(`status=${output.status} succeeded=${output.succeeded} failed=${output.failed}`);
for (const row of output.results) {
  console.log(`  ${row.id}: ok=${row.ok} attempts=${row.attempts} http=${row.httpStatus}`);
}
console.log(`requestId: ${output.requestId}`);
