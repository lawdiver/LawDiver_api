/**
 * Example 04 -- Document cite check (upload -> poll -> report PDF)
 * Language: TypeScript (Node.js)
 *
 * Usage:
 *   npx tsx examples/04-document-cite-check.ts path/to/brief.pdf
 *   EMAILS=a@firm.com,b@firm.com npx tsx examples/04-document-cite-check.ts path/to/brief.pdf
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { writeFile } from "node:fs/promises";
import { LawDiverClient } from "../src/client.js";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: npx tsx examples/04-document-cite-check.ts <brief.pdf|docx>");
  process.exit(1);
}

const emails = (process.env.EMAILS || "")
  .split(/[,;]+/)
  .map((s) => s.trim())
  .filter(Boolean);

const client = new LawDiverClient();
const bytes = await readFile(filePath);
const fileName = basename(filePath);
const mime = fileName.endsWith(".docx")
  ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  : fileName.endsWith(".doc")
    ? "application/msword"
    : "application/pdf";

console.log(`Uploading ${fileName} (${bytes.byteLength} bytes)...`);
if (emails.length) {
  console.log(`Email-link delivery → ${emails.join(", ")}`);
}

const { job, report, started } = await client.citeCheckDocument(
  new Blob([new Uint8Array(bytes)], { type: mime }),
  fileName,
  {
    downloadReport: true,
    ...(emails.length
      ? { delivery: "email_link" as const, emails }
      : {}),
  },
);

if (started.resultsUrl) {
  console.log(`resultsUrl: ${started.resultsUrl}`);
}
console.log(`status: ${job.status}`);
console.log(`pages: ${job.pageCount} · citations: ${job.citationCount}`);
console.log(`counts:`, job.counts);
if (job.otherAuthoritiesFound) {
  console.log(`other authorities (not verified): ${job.otherAuthoritiesFound}`);
}

for (const item of job.citations ?? []) {
  const label = item.citationAsSent ?? item.citationAsWritten ?? "(unknown)";
  console.log(
    `  [input ${item.inputIndex}] ${label} -> ${item.verdict}` +
      (item.lookupStatus ? ` (${item.lookupStatus})` : ""),
  );
}

if (report) {
  const out = `cite-report-${job.jobId}.pdf`;
  await writeFile(out, Buffer.from(report));
  console.log(`wrote ${out}`);
}
