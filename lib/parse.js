/** Pull amount, token and recipient out of a sentence. Missing or ambiguous pieces stay empty. */
import { PACIFIC } from "./tokens.js";

const TOKEN_NAMES = ["wpros", "usdc.e", "usdce", "usdc", "link", "weth", "pros"];
const AMOUNT_RE = /\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
const ADDRESS_RE = /0[xX][a-fA-F0-9]{40}/g;
const BLOB_RE = /0[xX][a-fA-F0-9]*/g;
const TO_RE = /(?:\bto\b|\bpara\b|\bpra\b|\bpro\b|\brecipient\b|\bdestinat[aá]rio\b)\s+(0[xX][a-fA-F0-9]{40})/gi;
const FROM_RE = /(?:\bfrom\b|\bde\b|\bsender\b|\bremetente\b)\s+(0[xX][a-fA-F0-9]{40})/i;
const MAX_RE = /(?<![a-z])(?:all|everything|entire|maximum|max|tudo|todo|toda|m[aá]ximo)(?![a-z])/i;
const SELF_RE = /(?<![a-z])(?:myself|to me|send me|para mim|pra mim|me manda|me envia)(?![a-z])/i;
const BURN_RE = /(?<![a-z])(?:burn address|dead address|endere[cç]o de queima|queima|burn|dead)(?![a-z])/i;
const WORD_AMOUNT = [
  ["one hundred", "100"],
  ["a hundred", "100"],
  ["a thousand", "1000"],
  ["hundred", "100"],
  ["thousand", "1000"],
  ["fifty", "50"],
  ["twenty", "20"],
  ["vinte", "20"],
  ["cinco", "5"],
  ["three", "3"],
  ["três", "3"],
  ["tres", "3"],
  ["duas", "2"],
  ["dois", "2"],
  ["two", "2"],
  ["five", "5"],
  ["ten", "10"],
  ["dez", "10"],
  ["cem", "100"],
  ["cento", "100"],
  ["mil", "1000"],
  ["one", "1"],
  ["uma", "1"],
  ["um", "1"],
  ["half", "0.5"],
  ["meia", "0.5"],
  ["meio", "0.5"],
];

const TOKEN_BY_ADDRESS = new Map(Object.values(PACIFIC).map((token) => [token.address.toLowerCase(), token.symbol]));

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
    const pattern = `(?<![a-z])${name.replace(".", "\\.")}(?![a-z])`;
    if (!new RegExp(pattern, "i").test(rest)) continue;
    found.push(tokenKey(name));
    rest = rest.replace(new RegExp(pattern, "ig"), " ");
  }
  return found;
}

function wordAmounts(src) {
  let rest = src.toLowerCase();
  const hits = [];
  for (const [phrase, value] of WORD_AMOUNT) {
    const pattern = `(?<![a-zà-ú])${phrase}(?![a-zà-ú])`;
    if (!new RegExp(pattern, "i").test(rest)) continue;
    hits.push(value);
    rest = rest.replace(new RegExp(pattern, "ig"), " ");
  }
  return hits;
}

function canonical(address) {
  return `0x${address.slice(2)}`;
}

export function parsePayment(text, pending = {}) {
  const src = String(text ?? "");
  const addresses = [...src.matchAll(ADDRESS_RE)].map((match) => canonical(match[0]));
  const blobs = [...src.matchAll(BLOB_RE)].map((match) => match[0]);
  const shortAddress = blobs.find((blob) => blob.length !== 42) || "";
  const fromMatch = src.match(FROM_RE);
  const toAll = [...src.matchAll(TO_RE)].map((match) => canonical(match[1]));
  const from = fromMatch?.[1] ? canonical(fromMatch[1]) : "";
  let to = "";
  let ambiguous = "";
  if (toAll.length > 1) ambiguous = "to";
  else if (toAll.length === 1) to = toAll[0];

  const tokens = findTokens(src);
  if (tokens.length > 1) ambiguous = ambiguous || "token";
  let token = tokens.length === 1 ? tokens[0] : "";

  const namedByAddress = [...new Set(addresses.map((item) => TOKEN_BY_ADDRESS.get(item.toLowerCase())).filter(Boolean))];
  const consumed = new Set();
  if (!token && namedByAddress.length === 1) {
    const only = addresses.find((item) => TOKEN_BY_ADDRESS.get(item.toLowerCase()) === namedByAddress[0]);
    if (only && only.toLowerCase() !== to.toLowerCase()) {
      token = namedByAddress[0];
      consumed.add(only.toLowerCase());
    }
  } else if (!token && namedByAddress.length > 1) ambiguous = ambiguous || "token";
  if (token) {
    for (const item of addresses) {
      const named = TOKEN_BY_ADDRESS.get(item.toLowerCase());
      if (named === token && item.toLowerCase() !== to.toLowerCase()) consumed.add(item.toLowerCase());
    }
  }

  const rest = addresses.filter((item) => item.toLowerCase() !== from.toLowerCase() && !consumed.has(item.toLowerCase()));
  if (!ambiguous && !to && rest.length === 1) to = rest[0];
  else if (!ambiguous && !to && rest.length > 1) ambiguous = "to";
  else if (!ambiguous && to && rest.some((item) => item.toLowerCase() !== to.toLowerCase())) ambiguous = "to";

  const withoutHex = src.replace(BLOB_RE, " ");
  const ensNames = [...withoutHex.matchAll(/\b[a-z0-9-]+\.eth\b/gi)].map((match) => match[0]);
  const ens = ensNames[0] || "";
  const self = SELF_RE.test(withoutHex);
  const burn = BURN_RE.test(withoutHex);
  if (!ambiguous && shortAddress && (to || self || burn)) ambiguous = "to";
  if (!ambiguous && ((ens && (to || self || burn || ensNames.length > 1)) || (self && (to || burn)) || (burn && to))) ambiguous = "to";
  if (!ambiguous && !to && self) to = "self";
  if (!ambiguous && !to && burn) to = "burn";

  const amounts = [...withoutHex.matchAll(AMOUNT_RE)].map((match) => normalizeAmount(match[0]));
  const words = wordAmounts(withoutHex);
  const wantsMax = MAX_RE.test(withoutHex);
  if (amounts.length > 1 || words.length > 1 || ((amounts.length + words.length) > 1) || (wantsMax && (amounts.length || words.length))) ambiguous = ambiguous || "amount";
  let amount = "";
  if (!ambiguous) {
    if (wantsMax) amount = "max";
    else if (amounts.length === 1) amount = amounts[0];
    else if (words.length === 1 && (token || withoutHex.trim().split(/\s+/).length <= 2)) amount = words[0];
  }
  const usd = !token && !tokens.length && (/\b(usd|dollars?|d[oó]lares|bucks)\b/i.test(src) || /US\$/i.test(src));

  const merged = {
    amount: ambiguous === "amount" ? "" : amount || pending.amount || "",
    token: ambiguous === "token" ? "" : token || (usd ? "" : pending.token || ""),
    to: ambiguous === "to" ? "" : to || (ens && !ambiguous ? "" : pending.to || ""),
    from,
    ens: ambiguous === "to" ? "" : (to ? "" : ens),
    usd,
    ambiguous,
    shortAddress: to ? "" : shortAddress,
  };
  const missing = [];
  if (!merged.amount) missing.push("amount");
  if (!merged.token) missing.push("token");
  if (!merged.to) missing.push("to");
  return { ...merged, missing };
}

function held(parsed, lang) {
  const pt = lang === "pt";
  const bits = [];
  if (parsed.amount === "max") bits.push(pt ? "o saldo todo" : "the full balance");
  else if (parsed.amount) bits.push(parsed.amount);
  if (parsed.token) bits.push(parsed.token);
  if (!bits.length) return "";
  return pt ? `Já tenho ${bits.join(" ")}. ` : `I have ${bits.join(" ")}. `;
}

export function followUp(parsed, lang = "en") {
  const pt = lang === "pt";
  const known = held(parsed, lang);
  if (parsed.ambiguous === "amount") {
    return pt ? "Qual valor? A frase tem mais de um." : "Which amount? The sentence has more than one.";
  }
  if (parsed.ambiguous === "token") {
    return pt ? "Qual token? A frase cita mais de um." : "Which token? The sentence names more than one.";
  }
  if (parsed.ambiguous === "to") {
    return pt ? "Para qual endereço 0x? A frase tem mais de um." : "Which 0x address should receive it? The sentence has more than one.";
  }
  if (parsed.shortAddress) {
    return pt
      ? `${known}Esse endereço precisa ter 40 caracteres depois do 0x.`
      : `${known}That address needs 40 hex characters after 0x.`;
  }
  if (parsed.ens) {
    return pt
      ? `${known}${parsed.ens} não resolve na Pacific. Manda o endereço 0x.`
      : `${known}${parsed.ens} does not resolve on Pacific. Send the 0x address.`;
  }
  if (parsed.usd) {
    return pt ? `${known}Qual token? USDC é o oficial da Pacific. USDC.e é o bridged.` : `${known}Which token? USDC is the official Pacific one. USDC.e is the bridged one.`;
  }
  const key = parsed.missing[0];
  if (key === "amount") return pt ? `${known}Quanto?` : `${known}How much?`;
  if (key === "token") return pt ? `${known}Qual token? USDC, USDC.e, WPROS, LINK, WETH ou PROS.` : `${known}Which token? USDC, USDC.e, WPROS, LINK, WETH or PROS.`;
  if (key === "to") return pt ? `${known}Para qual endereço 0x?` : `${known}Which 0x address should receive it?`;
  return pt ? "De qual carteira sai?" : "Which wallet is sending?";
}
