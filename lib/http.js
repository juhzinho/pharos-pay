// Plain Node response helpers, so the API handlers run the same on Vercel and on the local dev server.
export function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers });
  res.end(JSON.stringify(body));
}
