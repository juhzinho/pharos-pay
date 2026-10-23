/** Pull amount, token and recipient out of a sentence. Missing pieces stay empty. */
const TOKEN_ORDER = ["wpros", "usdc", "link", "weth", "pros"];

export function normalizeAmount(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "";
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return text.replace(/[.,]/g, "");
  if (text.includes(",") && text.includes(".")) {
    const last = Math.max(text.lastIndexOf(","), text.lastIndexOf("."));
    const decimal = text[last];
    const thousands = decimal === "," ? "." : ",";
    return text.replaceAll(thousands, "").replace(decimal, ".");
  }
  return text.replace(",", ".");
}

export function parsePayment(text, pending = {}) {
  const src = String(text ?? "");
  const addresses = [...src.matchAll(/0x[a-fA-F0-9]{40}/g)].map((match) => match[0]);
  const fromMatch = src.match(/(?:\bfrom\b|\bde\b)\s+(0x[a-fA-F0-9]{40})/i);
  const toMatch = src.match(/(?:\bto\b|\bpara\b|\bpra\b|\bpro\b)\s+(0x[a-fA-F0-9]{40})/i);
  const from = fromMatch?.[1] || "";
  let to = toMatch?.[1] || "";
  if (!to) {
    const rest = addresses.filter((item) => item.toLowerCase() !== from.toLowerCase());
    if (rest.length === 1) to = rest[0];
  }

  let token = "";
  for (const name of TOKEN_ORDER) {
    if (new RegExp(`\\b${name}\\b`, "i").test(src)) {
      token = name.toUpperCase();
      break;
    }
  }
  const withoutAddresses = src.replace(/0x[a-fA-F0-9]{40}/g, " ");
  const amountMatch = withoutAddresses.match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? normalizeAmount(amountMatch[1]) : "";
  const ens = src.match(/\b[a-z0-9-]+\.eth\b/i)?.[0] || "";
  const usd = !token && /\busd\b/i.test(src);

  const merged = {
    amount: amount || pending.amount || "",
    token: token || (usd ? "" : pending.token || ""),
    to: to || (ens ? "" : pending.to || ""),
    from,
    ens,
    usd,
  };
  const missing = [];
  if (!merged.amount) missing.push("amount");
  if (!merged.token) missing.push("token");
  if (!merged.to) missing.push("to");
  return { ...merged, missing };
}

export function followUp(parsed, lang = "en") {
  const pt = lang === "pt";
  if (parsed.ens) {
    return pt
      ? `${parsed.ens} não resolve na Pacific. Manda o endereço 0x.`
      : `${parsed.ens} does not resolve on Pacific. Send the 0x address.`;
  }
  if (parsed.usd) {
    return pt ? "Qual token? USDC é o oficial da Pacific." : "Which token? USDC is the official Pacific one.";
  }
  const key = parsed.missing[0];
  if (key === "amount") return pt ? "Quanto?" : "How much?";
  if (key === "token") return pt ? "Qual token? USDC, WPROS, LINK, WETH ou PROS." : "Which token? USDC, WPROS, LINK, WETH or PROS.";
  if (key === "to") return pt ? "Para qual endereço 0x?" : "Which 0x address should receive it?";
  return pt ? "De qual carteira sai?" : "Which wallet is sending?";
}
