import { connect, CHAIN_MCP_URL } from "./mcp.js";

const MAX_AGE_MS = 5 * 60_000;
const connections = new Map();

export function getSharedClient(url = CHAIN_MCP_URL) {
  const existing = connections.get(url);
  if (existing && Date.now() - existing.at > MAX_AGE_MS) resetSharedClient(url);
  if (!connections.has(url)) {
    const promise = connect(url, "pharos-pay-web");
    connections.set(url, { promise, at: Date.now() });
    promise.catch(() => connections.delete(url));
  }
  return connections.get(url).promise;
}

export function resetSharedClient(url = CHAIN_MCP_URL) {
  const old = connections.get(url);
  connections.delete(url);
  old?.promise.then((c) => c.close()).catch(() => {});
}
