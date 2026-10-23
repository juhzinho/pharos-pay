import { decodeFunctionResult, encodeFunctionData, erc20Abi, getAddress, isAddress, parseUnits } from "viem";
import { callJson } from "./mcp.js";
import { PACIFIC } from "./tokens.js";
import { followUp, parsePayment } from "./parse.js";
import { plainReason, reasonFromMessage } from "./revert.js";
import { formatAmount, formatInteger, labeled } from "./format.js";

export const PACIFIC_CHAIN_ID = 1672;
export const SAMPLE_FROM = "0x15dDce897D76ac39c188AdE4D353711A60395315";
export const SAMPLE_TO = "0x000000000000000000000000000000000000dEaD";

const say = (lang, pack) => (lang === "pt" ? pack.pt : pack.en);

export function bufferedGas(gas) {
  if (gas == null) return null;
  return BigInt(gas) * 12n / 10n;
}

function hexWei(value) {
  return `0x${(value ?? 0n).toString(16)}`;
}

function weiOf(res) {
  if (res?.balanceWei != null && res.balanceWei !== "") return BigInt(res.balanceWei);
  if (res?.balanceHex) return BigInt(res.balanceHex);
  if (res?.result != null && res.result !== "") return BigInt(res.result);
  return 0n;
}

function codeOf(res) {
  return res?.code ?? res?.bytecode ?? res?.result ?? "0x";
}

function ask(lang, parsed, question) {
  return {
    ok: true,
    ready: false,
    broadcast: false,
    unsigned: null,
    question,
    pending: { amount: parsed.amount, token: parsed.token, to: parsed.to },
    lines: [question],
    headline: say(lang, { pt: "Falta um dado.", en: "One detail is missing." }),
  };
}

function stop(lang, headline, lines) {
  return { ok: true, ready: false, broadcast: false, unsigned: null, question: "", pending: null, headline, lines };
}

export async function prepare(client, input = {}) {
  const lang = input.lang === "pt" ? "pt" : "en";
  const locale = lang === "pt" ? "pt" : "en";
  const pending = {
    amount: input.amount || input.pending?.amount || "",
    token: input.token || input.pending?.token || "",
    to: input.to || input.pending?.to || "",
  };
  const parsed = parsePayment(input.text, pending);
  if (parsed.missing.length || parsed.ens || parsed.usd) return ask(lang, parsed, followUp(parsed, lang));

  const fromText = parsed.from || String(input.from || "").trim();
  if (!isAddress(fromText)) return ask(lang, parsed, say(lang, { pt: "De qual carteira sai?", en: "Which wallet is sending?" }));
  let from;
  let to;
  try {
    from = getAddress(fromText);
    to = getAddress(parsed.to);
  } catch {
    return ask(lang, parsed, say(lang, { pt: "Esse endereço não fecha.", en: "That address is not valid." }));
  }

  const native = parsed.token === "PROS";
  const token = native ? null : PACIFIC[parsed.token];
  if (!native && !token) return ask(lang, { ...parsed, token: "" }, followUp({ ...parsed, token: "", missing: ["token"] }, lang));

  let amount;
  try {
    amount = parseUnits(parsed.amount, native ? 18 : token.decimals);
  } catch {
    return ask(lang, { ...parsed, amount: "" }, say(lang, { pt: "Esse valor não cabe nesse token.", en: "That amount does not fit this token." }));
  }
  if (amount <= 0n) return ask(lang, { ...parsed, amount: "" }, say(lang, { pt: "O valor tem que ser maior que zero.", en: "The amount has to be greater than zero." }));

  const chain = await callJson(client, "get_chain_info");
  if (Number(chain.chainId) !== PACIFIC_CHAIN_ID) {
    return stop(lang, say(lang, { pt: "Rede errada.", en: "Wrong network." }), [
      say(lang, { pt: `O nó respondeu chain ${chain.chainId}. Pacific é ${PACIFIC_CHAIN_ID}.`, en: `The node answered chain ${chain.chainId}. Pacific is ${PACIFIC_CHAIN_ID}.` }),
    ]);
  }
  const block = Number(chain.latestBlock);
  const gasPrice = await callJson(client, "get_gas_price");
  const gasPriceWei = BigInt(gasPrice.gasPriceWei ?? gasPrice.gasPriceHex ?? 0);
  const money = (raw, decimals) => formatAmount(raw, decimals, decimals >= 18 ? 8 : 6, locale);

  if (!native) {
    const blockHex = chain.latestBlockHex || `0x${block.toString(16)}`;
    const code = codeOf(await callJson(client, "get_code", { address: token.address, block: blockHex }));
    if (!code || code === "0x") {
      return stop(lang, say(lang, { pt: "Contrato vazio.", en: "Empty contract." }), [
        say(lang, { pt: `${parsed.token} não tem código nesse endereço.`, en: `${parsed.token} has no code at that address.` }),
      ]);
    }
    const symbolData = encodeFunctionData({ abi: erc20Abi, functionName: "symbol" });
    const symbolRes = await callJson(client, "eth_call", { transaction: { to: token.address, data: symbolData }, block });
    const symbol = decodeFunctionResult({ abi: erc20Abi, functionName: "symbol", data: symbolRes.result });
    if (String(symbol).toUpperCase() !== token.symbol) {
      return stop(lang, say(lang, { pt: "Token não confere.", en: "Token does not match." }), [
        say(lang, { pt: `O contrato respondeu ${symbol}, não ${token.symbol}.`, en: `The contract answered ${symbol}, not ${token.symbol}.` }),
      ]);
    }
  }

  const [fromNativeRes, nonceRes, tokenBalRes] = await Promise.all([
    callJson(client, "get_balance", { address: from, block }),
    callJson(client, "get_transaction_count", { address: from, block }),
    native
      ? Promise.resolve(null)
      : callJson(client, "eth_call", {
        transaction: { to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [from] }) },
        block,
      }),
  ]);
  const fromNative = weiOf(fromNativeRes);
  const tokenBal = native ? fromNative : BigInt(tokenBalRes.result);
  const nonce = Number(nonceRes.transactionCount ?? nonceRes.count ?? nonceRes.nonce ?? nonceRes.result ?? 0);
  const decimals = native ? 18 : token.decimals;
  const have = money(tokenBal, decimals);
  const need = money(amount, decimals);

  if (tokenBal < amount) {
    return stop(lang, say(lang, { pt: "Saldo insuficiente.", en: "Not enough balance." }), [
      say(lang, {
        pt: `A carteira tem ${have} ${parsed.token} no bloco ${formatInteger(block, locale)}. O pedido é ${need}.`,
        en: `The wallet holds ${have} ${parsed.token} at block ${formatInteger(block, locale)}. The request is ${need}.`,
      }),
      say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
    ]);
  }

  const data = native
    ? "0x"
    : encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] });
  const value = native ? amount : 0n;
  const tx = { from, to: native ? to : token.address, data, value: hexWei(value) };

  let callOk = false;
  let decoded = null;
  try {
    await callJson(client, "eth_call", { transaction: tx, block });
    callOk = true;
  } catch (error) {
    decoded = reasonFromMessage(error.message);
  }
  if (!callOk) {
    return stop(lang, say(lang, { pt: "A chamada reverteu.", en: "The call reverted." }), [
      plainReason(decoded, lang) || say(lang, { pt: "O nó não devolveu o motivo.", en: "The node did not return a reason." }),
      say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
    ]);
  }

  let gas = null;
  try {
    const est = await callJson(client, "estimate_gas", { transaction: tx });
    gas = BigInt(est.gas ?? est.gasUsed ?? est.gasHex);
  } catch (error) {
    decoded = reasonFromMessage(error.message);
    return stop(lang, say(lang, { pt: "A estimativa reverteu.", en: "The estimate reverted." }), [
      plainReason(decoded, lang) || say(lang, { pt: "O nó não devolveu o motivo.", en: "The node did not return a reason." }),
      say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
    ]);
  }

  const fee = gas * gasPriceWei;
  const limit = bufferedGas(gas);
  const reserve = limit * gasPriceWei;
  const needed = value + reserve;
  if (fromNative < needed) {
    return stop(lang, say(lang, { pt: "Sem PROS para a taxa.", en: "Not enough PROS for the fee." }), [
      say(lang, {
        pt: `A taxa prevista é ${money(fee, 18)} PROS e o limite reserva ${money(reserve, 18)} PROS. A carteira tem ${money(fromNative, 18)} PROS.`,
        en: `The expected fee is ${money(fee, 18)} PROS and the limit reserves ${money(reserve, 18)} PROS. The wallet has ${money(fromNative, 18)} PROS.`,
      }),
      say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
    ]);
  }

  const unsigned = {
    chainId: PACIFIC_CHAIN_ID,
    type: "0x0",
    from,
    to: native ? to : token.address,
    data,
    value: hexWei(value),
    gas: hexWei(limit),
    gasPrice: hexWei(gasPriceWei),
    nonce,
  };
  const action = say(lang, {
    pt: `enviar ${need} ${parsed.token} para ${labeled(to, {}, locale)}`,
    en: `send ${need} ${parsed.token} to ${labeled(to, {}, locale)}`,
  });
  const lines = [
    say(lang, { pt: `Resumo: ${action}.`, en: `Summary: ${action}.` }),
    `${say(lang, { pt: "De", en: "From" })}: ${labeled(from, {}, locale)}`,
    `${say(lang, { pt: "Saldo agora", en: "Balance now" })}: ${have} ${parsed.token}`,
    `${say(lang, { pt: "Saldo depois", en: "Balance after" })}: ${money(native ? fromNative - amount - fee : tokenBal - amount, decimals)} ${parsed.token}`,
    say(lang, {
      pt: `Gás estimado ${formatInteger(gas, locale)}. Taxa ${money(fee, 18)} PROS a ${gasPrice.gasPriceGwei} gwei. Limite ${formatInteger(limit, locale)}.`,
      en: `Estimated gas ${formatInteger(gas, locale)}. Fee ${money(fee, 18)} PROS at ${gasPrice.gasPriceGwei} gwei. Limit ${formatInteger(limit, locale)}.`,
    }),
    `${say(lang, { pt: "Bloco", en: "Block" })}: ${formatInteger(block, locale)}`,
    say(lang, { pt: "Nada foi assinado. A transação abaixo está sem assinatura.", en: "Nothing was signed. The transaction below is unsigned." }),
  ];
  return {
    ok: true,
    ready: true,
    broadcast: false,
    unsigned,
    question: "",
    pending: null,
    headline: say(lang, { pt: "Pronta para assinar.", en: "Ready to sign." }),
    lines,
    action,
    block,
  };
}
