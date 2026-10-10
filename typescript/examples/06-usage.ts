/**
 * Example 06 -- Discovery + usage ledger
 * Language: TypeScript (Node.js)
 *
 * Fastest way to separate network problems from bad credentials:
 * discovery (no key) vs usage (requires key).
 */
import { LawDiverClient } from "../src/client.js";

const client = new LawDiverClient();

console.log("=== Discovery (public) ===");
const discovery = await client.discovery();
console.log(JSON.stringify(discovery, null, 2).slice(0, 800) + "\n...\n");

console.log("=== Usage (authenticated) ===");
const usage = await client.usage(30);
console.log(`consumer: ${usage.consumer.name ?? "?"} <${usage.consumer.email ?? "?"}> [${usage.consumer.status}]`);
console.log(`periodDays: ${usage.periodDays} since ${usage.since}`);
console.log(`rateLimitPerMinute: ${usage.limits.rateLimitPerMinute}`);
console.log(`dailyRequestLimit: ${usage.limits.dailyRequestLimit}`);
console.log(`maxCasesPerSearch: ${usage.limits.maxCasesPerSearch}`);
console.log("");
console.log("byOperation:");
for (const row of usage.byOperation) {
  console.log(`  ${row.operation}: calls=${row.calls} units=${row.units}`);
}
console.log(`requestId: ${usage.requestId}`);
