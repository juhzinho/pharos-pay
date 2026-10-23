import { hexToString } from "viem";

const ERROR_STRING = "08c379a0";
const PANIC = "4e487b71";

export function isTxHash(value) {
  return /^0x[0-9a-f]{64}$/i.test(String(value ?? "").trim());
}

function strip(data) {
  return String(data ?? "").replace(/^0x/i, "").toLowerCase();
}

const PANIC_REASON = {
  0: { pt: "O contrato parou numa verificação interna.", es: "El contrato paró en una verificación interna.", en: "The contract hit an internal check." },
  1: { pt: "Uma verificação assert do contrato falhou.", es: "Falló una verificación assert del contrato.", en: "An assert check in the contract failed." },
  17: { pt: "O cálculo estourou o limite do número.", es: "El cálculo se pasó del límite del número.", en: "The math overflowed." },
  18: { pt: "O contrato tentou dividir por zero.", es: "El contrato intentó dividir por cero.", en: "The contract divided by zero." },
  33: { pt: "O contrato recebeu um valor de enum inválido.", es: "El contrato recibió un valor de enum inválido.", en: "The contract got an invalid enum value." },
  34: { pt: "O contrato leu um dado de armazenamento mal formado.", es: "El contrato leyó un dato de almacenamiento mal formado.", en: "The contract read badly stored data." },
  49: { pt: "O contrato tirou um item de uma lista vazia.", es: "El contrato sacó un ítem de una lista vacía.", en: "The contract popped an empty list." },
  50: { pt: "O contrato leu uma posição que não existe na lista.", es: "El contrato leyó una posición que no existe en la lista.", en: "The contract read past the end of a list." },
  65: { pt: "O contrato pediu memória demais.", es: "El contrato pidió demasiada memoria.", en: "The contract asked for too much memory." },
  81: { pt: "O contrato chamou uma função que não estava pronta.", es: "El contrato llamó una función que no estaba lista.", en: "The contract called a function that was not ready." },
};

const SELECTORS = {
  a9059cbb: { pt: "transferência de token", es: "transferencia de token", en: "token transfer" },
  "095ea7b3": { pt: "aprovação para gastar token", es: "aprobación para gastar token", en: "token approval" },
  "23b872dd": { pt: "transferência em nome de outra carteira", es: "transferencia en nombre de otra cartera", en: "transfer on behalf of another wallet" },
  "2e1a7d4d": { pt: "desembrulho de PROS", es: "desenvoltura de PROS", en: "unwrap PROS" },
  d0e30db0: { pt: "embrulho de PROS", es: "envoltura de PROS", en: "wrap PROS" },
};

export function decodeRevert(data) {
  const hex = strip(data);
  const spots = [hex.indexOf(ERROR_STRING), hex.indexOf(PANIC)].filter((n) => n >= 0);
  const at = spots.length ? Math.min(...spots) : -1;
  const body = at >= 0 ? hex.slice(at) : hex;
  if (!body) return { kind: "empty", text: "" };
  if (body.startsWith(ERROR_STRING) && body.length >= 8 + 64 + 64) {
    const offset = Number.parseInt(body.slice(8, 8 + 64), 16);
    const start = 8 + offset * 2;
    const len = Number.parseInt(body.slice(start, start + 64), 16);
    if (!Number.isFinite(len) || len < 0 || start + 64 + len * 2 > body.length + 64) return { kind: "error", text: "Error(string)" };
    const chars = body.slice(start + 64, start + 64 + len * 2);
    try {
      return { kind: "error", text: hexToString(`0x${chars}`).replace(/\u0000/g, "").trim() || "Error(string)" };
    } catch {
      return { kind: "error", text: "Error(string)" };
    }
  }
  if (body.startsWith(PANIC) && body.length >= 8 + 64) {
    const code = Number.parseInt(body.slice(8, 8 + 64), 16);
    return { kind: "panic", code, text: `Panic(${code})` };
  }
  if (body.length >= 8) return { kind: "custom", text: `0x${body.slice(0, 8)}` };
  return { kind: "raw", text: "" };
}

export function revertDataFromError(message) {
  const text = String(message ?? "");
  const quoted = text.match(/"data"\s*:\s*"(0x[0-9a-fA-F]+)"/i);
  if (quoted) return quoted[1];
  const hits = [...text.matchAll(/0x[0-9a-fA-F]{8,}/g)].map((match) => match[0].toLowerCase());
  const tagged = hits.find((hit) => hit.includes(ERROR_STRING) || hit.includes(PANIC));
  if (!tagged) return "";
  const start = tagged.includes(ERROR_STRING) ? tagged.indexOf(ERROR_STRING) : tagged.indexOf(PANIC);
  return `0x${tagged.slice(start)}`;
}

export function plainReason(decoded, lang = "en") {
  const pack = lang === "pt" || lang === "es" ? lang : "en";
  if (!decoded || decoded.kind === "empty" || decoded.kind === "raw") return "";
  if (decoded.kind === "panic") {
    const known = PANIC_REASON[decoded.code]?.[pack];
    return known || decoded.text;
  }
  if (decoded.kind === "custom") {
    return pack === "pt"
      ? `O contrato recusou com um erro próprio (${decoded.text}).`
      : pack === "es"
        ? `El contrato rechazó con un error propio (${decoded.text}).`
        : `The contract rejected the call with its own error (${decoded.text}).`;
  }
  const text = String(decoded.text || "");
  const key = text.toLowerCase();
  if (/allowance/.test(key)) {
    return pack === "pt" ? "A carteira não tinha permissão suficiente para gastar esse token." : pack === "es" ? "La cartera no tenía permiso suficiente para gastar ese token." : "The wallet was not allowed to spend that much of the token.";
  }
  if (/balance|exceeds balance|insufficient funds/.test(key)) {
    return pack === "pt" ? "A carteira não tinha saldo suficiente." : pack === "es" ? "La cartera no tenía saldo suficiente." : "The wallet did not have enough balance.";
  }
  if (/expired|deadline|too old/.test(key)) {
    return pack === "pt" ? "A transação passou do prazo." : pack === "es" ? "La transacción pasó del plazo." : "The transaction was past its deadline.";
  }
  if (/slippage|too little received|insufficient output|insufficient_output/.test(key)) {
    return pack === "pt" ? "O preço mudou além do limite que a transação aceitava." : pack === "es" ? "El precio cambió más de lo que la transacción aceptaba." : "The price moved past the limit the transaction accepted.";
  }
  if (!text) return "";
  return pack === "pt" ? `O contrato recusou e disse: ${text}.` : pack === "es" ? `El contrato rechazó y dijo: ${text}.` : `The contract rejected the call and said: ${text}.`;
}

export function reasonFromMessage(message) {
  const data = revertDataFromError(message);
  if (data) {
    const decoded = decodeRevert(data);
    if (decoded.kind !== "empty" && decoded.kind !== "raw") return decoded;
  }
  const text = String(message ?? "");
  const reverted = text.match(/reverted:?\s+([^"\n{}]{3,180})/i);
  if (reverted) return { kind: "error", text: reverted[1].trim() };
  return null;
}

export function functionName(data, lang = "en") {
  const hex = strip(data);
  if (hex.length < 8) return "";
  const pack = lang === "pt" || lang === "es" ? lang : "en";
  return SELECTORS[hex.slice(0, 8)]?.[pack] || "";
}

export function outOfGas(gasUsed, gasLimit) {
  try {
    const used = BigInt(gasUsed);
    const limit = BigInt(gasLimit);
    return limit > 0n && used >= limit;
  } catch {
    return false;
  }
}

export function receiptFailed(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const status = receipt.status ?? receipt.txStatus;
  if (status == null || status === "") return null;
  try {
    return BigInt(status) === 0n;
  } catch {
    const text = String(status).toLowerCase();
    if (text === "failed" || text === "reverted") return true;
    if (text === "success" || text === "ok") return false;
    return null;
  }
}
