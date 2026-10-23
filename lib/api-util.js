import { isTransient, withCallLog } from "./mcp.js";
import { getSharedClient, resetSharedClient } from "./server-client.js";
import { sendJson } from "./http.js";
import { summarizeCalls } from "./agent.js";

export async function withClient(url, res, fn) {
  const started = Date.now();
  try {
    const client = await getSharedClient(url);
    const { out, calls } = await withCallLog(() => fn(client));
    if (out && typeof out === "object") out.calls = summarizeCalls(calls);
    if (out && typeof out === "object") out.ms = Date.now() - started;
    return sendJson(res, 200, out);
  } catch (e) {
    resetSharedClient(url);
    if (e.status === 400) return sendJson(res, 400, { ok: false, error: e.message });
    const busy = isTransient(e);
    return sendJson(res, busy ? 503 : 500, {
      ok: false,
      error: busy ? "A Pharos MCP is not responding right now. Retrying…" : e.message,
    });
  }
}
