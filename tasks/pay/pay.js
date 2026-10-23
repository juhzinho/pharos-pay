#!/usr/bin/env node
import { connect, CHAIN_MCP_URL, takeCallLog } from "../../lib/mcp.js";
import { summarizeCalls } from "../../lib/agent.js";
import { prepare, SAMPLE_FROM } from "../../lib/pay.js";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : "";
}
const text = args.filter((arg) => !arg.startsWith("--") && arg !== flag("--from") && arg !== flag("--lang")).join(" ");
const client = await connect(CHAIN_MCP_URL, "pharos-pay");
try {
  takeCallLog(client);
  const report = await prepare(client, { lang: flag("--lang") === "pt" ? "pt" : "en", text, from: flag("--from") || SAMPLE_FROM });
  console.log(report.headline);
  for (const line of report.lines || []) console.log(line);
  if (report.unsigned) console.log(JSON.stringify(report.unsigned));
  console.log(`\ncalls ${summarizeCalls(takeCallLog(client))}`);
} finally {
  await client.close().catch(() => {});
}
