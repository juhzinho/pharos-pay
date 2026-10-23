/** Pull amount, token and recipient out of a sentence. Missing or ambiguous pieces stay empty. */
const TOKEN_NAMES = ["wpros", "usdc.e", "usdce", "usdc", "link", "weth", "pros"];
const AMOUNT_RE = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
const ADDRESS_RE = /0x[a-fA-F0-9]{40}/g;
const TO_RE = /(?:\bto\b|\bpara\b|\bpra\b|\bpro\b)\s+(0x[a-fA-F0-9]{40})/gi;

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

function tokenKey(name) {
  if (name === "usdc.e" || name === "usdce") return "USDCe";
  return name.toUpperCase();
}

function findTokens(src) {
  let rest = src;
  const found = [];
  for (const name of TOKEN_NAMES) {
    const re = new RegExp(`(?<![a-z])${name.replace(".", "\\.")}(?![a-z])`, "i");
    if (!re.test(rest)) continue;
    found.push(tokenKey(name));
    rest = rest.replace(new RegExp(`(?<![a-z])${name.replace(".", "\\.")}(?![a-z])`, "ig"), " ");
  }
  return found;
}

export function parsePayment(text, pending = {}) {
  const src = String(text ?? "");
  const addresses = [...src.matchAll(ADDRESS_RE)].map((match) => match[0]);
  const fromMatch = src.match(/(?:\bfrom\b|\bde\b)\s+(0x[a-fA-F0-9]{40})/i);
  const toAll = [...src.matchAll(TO_RE)].map((match) => match[1]);
  const from = fromMatch?.[1] || "";
  let to = "";
  let ambiguous = "";
  if (toAll.length > 1) ambiguous = "to";
  else if (toAll.length === 1) to = toAll[0];
  const rest = addresses.filter((item) => item.toLowerCase() !== from.toLowerCase());
  if (!ambiguous && !to && rest.length === 1) to = rest[0];
  else if (!ambiguous && !to && rest.length > 1) ambiguous = "to";
  else if (!ambiguous && to && rest.some((item) => item.toLowerCase() !== to.toLowerCase())) ambiguous = "to";

  const tokens = findTokens(src);
  if (tokens.length > 1) ambiguous = ambiguous || "token";
  const token = tokens.length === 1 ? tokens[0] : "";

  const withoutHex = src.replace(/0x[a-fA-F0-9]+/g, " ");
  const amounts = [...withoutHex.matchAll(AMOUNT_RE)].map((match) => normalizeAmount(match[0]));
  if (amounts.length > 1) ambiguous = ambiguous || "amount";
  const amount = amounts.length === 1 ? amounts[0] : "";
  const ens = to ? "" : src.match(/\b[a-z0-9-]+\.eth\b/i)?.[0] || "";
  const usd = !token && !tokens.length && /\busd\b/i.test(src);

  const merged = {
    amount: ambiguous === "amount" ? "" : amount || pending.amount || "",
    token: ambiguous === "token" ? "" : token || (usd ? "" : pending.token || ""),
    to: ambiguous === "to" ? "" : to || (ens ? "" : pending.to || ""),
    from,
    ens,
    usd,
    ambiguous,
  };
  const missing = [];
  if (!merged.amount) missing.push("amount");
  if (!merged.token) missing.push("token");
  if (!merged.to) missing.push("to");
  return { ...merged, missing };
}

export function followUp(parsed, lang = "en") {
  const pt = lang === "pt";
  if (parsed.ambiguous === "amount") {
    return pt ? "Qual valor? A frase tem mais de um." : "Which amount? The sentence has more than one.";
  }
  if (parsed.ambiguous === "token") {
    return pt ? "Qual token? A frase cita mais de um." : "Which token? The sentence names more than one.";
  }
  if (parsed.ambiguous === "to") {
    return pt ? "Para qual endereço 0x? A frase tem mais de um." : "Which 0x address should receive it? The sentence has more than one.";
  }
  if (parsed.ens) {
    return pt
      ? `${parsed.ens} não resolve na Pacific. Manda o endereço 0x.`
      : `${parsed.ens} does not resolve on Pacific. Send the 0x address.`;
  }
  if (parsed.usd) {
    return pt ? "Qual token? USDC é o oficial da Pacific. USDC.e é o bridged." : "Which token? USDC is the official Pacific one. USDC.e is the bridged one.";
  }
  const key = parsed.missing[0];
  if (key === "amount") return pt ? "Quanto?" : "How much?";
  if (key === "token") return pt ? "Qual token? USDC, USDC.e, WPROS, LINK, WETH ou PROS." : "Which token? USDC, USDC.e, WPROS, LINK, WETH or PROS.";
  if (key === "to") return pt ? "Para qual endereço 0x?" : "Which 0x address should receive it?";
  return pt ? "De qual carteira sai?" : "Which wallet is sending?";
}
