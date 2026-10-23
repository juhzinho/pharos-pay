import { CHAIN_MCP_URL } from "../lib/mcp.js";
import { withClient } from "../lib/api-util.js";
import { prepare } from "../lib/pay.js";

export default async function handler(req, res) {
  const q = new URL(req.url, "http://localhost").searchParams;
  const lang = q.get("lang") === "pt" ? "pt" : "en";
  return withClient(CHAIN_MCP_URL, res, (client) => prepare(client, {
    lang,
    text: q.get("text") || "",
    from: q.get("from") || "",
    amount: q.get("amount") || "",
    token: q.get("token") || "",
    to: q.get("to") || "",
  }));
}
