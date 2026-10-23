import { decodeFunctionResult, encodeFunctionData, erc20Abi, getAddress, isAddress, parseUnits } from "viem";
import { callJson } from "./mcp.js";
import { PACIFIC } from "./tokens.js";
import { followUp, parsePayment } from "./parse.js";
import { plainReason, reasonFromMessage } from "./revert.js";
import { formatAmount, formatInteger, reviewed } from "./format.js";

export const PACIFIC_CHAIN_ID = 1672;
export const SAMPLE_FROM = "0x15dDce897D76ac39c188AdE4D353711A60395315";
export const SAMPLE_TO = "0x000000000000000000000000000000000000dEaD";

const say = (lang, pack) => (lang === "pt" ? pack.pt : pack.en);

export function bufferedGas(gas) {
  if (gas == null) return null;
  return BigInt(gas) * 12n / 10n;
}

/** Native max keeps the fee reserve. Null means the balance cannot cover it. */
export function maxNativeAmount(balance, gas, price) {
  const reserve = bufferedGas(gas) * price;
  if (balance <= reserve) return null;
  return balance - reserve;
}

/** The same payment, shaped as the request a wallet would show. Nothing here is broadcast. */
export function signingRequestOf(unsigned) {
  const hex = (value) => `0x${BigInt(value).toString(16)}`;
  return {
    method: "eth_sendTransaction",
    params: [{
      from: unsigned.from,
      to: unsigned.to,
      data: unsigned.data,
      value: unsigned.value,
      gas: unsigned.gas,
      gasPrice: unsigned.gasPrice,
      nonce: hex(unsigned.nonce),
      chainId: hex(unsigned.chainId),
    }],
  };
}

/** What the wallet will hold after a mined transfer. A send to itself only spends the fee. */
export function expectedAfter({ native, same, tokenBal, fromNative, amount, fee }) {
  const pros = fromNative - fee;
  if (native) return { token: same ? pros : fromNative - amount - fee, pros };
  return { token: same ? tokenBal : tokenBal - amount, pros };
}

function hexWei(value) {
  return `0x${(value ?? 0n).toString(16)}`;
}

function weiOf(res) {
  if (res?.balanceWei != null && res.balanceWei !== "") return BigInt(res.balanceWei);
  if (res?.balanceHex) return BigInt(res.balanceHex);
  if (res?.result != null && res.result !== "") return BigInt(res.result);
  return null;
}

function nonceOf(res) {
  const raw = res?.nonce ?? res?.transactionCount ?? res?.count ?? res?.result;
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
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
  if (parsed.ambiguous || parsed.missing.length || parsed.ens || parsed.usd) return ask(lang, parsed, followUp(parsed, lang));

  const fromText = parsed.from || String(input.from || "").trim();
  if (!isAddress(fromText)) return ask(lang, parsed, say(lang, { pt: "De qual carteira sai?", en: "Which wallet is sending?" }));
  let toText = parsed.to;
  if (toText === "self") toText = fromText;
  if (toText === "burn") toText = SAMPLE_TO;
  let from;
  let to;
  try {
    from = getAddress(fromText);
    to = getAddress(toText);
  } catch {
    return ask(lang, { ...parsed, to: "" }, say(lang, { pt: "Esse endereço não fecha.", en: "That address is not valid." }));
  }

  const native = parsed.token === "PROS";
  const token = native ? null : PACIFIC[parsed.token];
  if (!native && !token) return ask(lang, { ...parsed, token: "" }, followUp({ ...parsed, token: "", missing: ["token"] }, lang));

  const max = parsed.amount === "max";
  let amount = 0n;
  if (!max) {
    try {
      amount = parseUnits(parsed.amount, native ? 18 : token.decimals);
    } catch {
      return ask(lang, { ...parsed, amount: "" }, say(lang, { pt: "Esse valor não cabe nesse token.", en: "That amount does not fit this token." }));
    }
    if (amount <= 0n) return ask(lang, { ...parsed, amount: "" }, say(lang, { pt: "O valor tem que ser maior que zero.", en: "The amount has to be greater than zero." }));
  }

  const chain = await callJson(client, "get_chain_info");
  if (Number(chain.chainId) !== PACIFIC_CHAIN_ID) {
    return stop(lang, say(lang, { pt: "Rede errada.", en: "Wrong network." }), [
      say(lang, { pt: `O nó respondeu chain ${chain.chainId}. Pacific é ${PACIFIC_CHAIN_ID}.`, en: `The node answered chain ${chain.chainId}. Pacific is ${PACIFIC_CHAIN_ID}.` }),
    ]);
  }
  const block = Number(chain.latestBlock);
  const blockTag = chain.latestBlockHex || `0x${block.toString(16)}`;
  const gasPrice = await callJson(client, "get_gas_price");
  const priceRaw = gasPrice.gasPriceWei ?? gasPrice.gasPriceHex;
  if (priceRaw == null || priceRaw === "") {
    return stop(lang, say(lang, { pt: "Sem preço do gás.", en: "No gas price." }), [
      say(lang, { pt: "O nó não devolveu o preço do gás.", en: "The node did not return the gas price." }),
    ]);
  }
  const gasPriceWei = BigInt(priceRaw);
  const money = (raw, decimals) => formatAmount(raw, decimals, decimals >= 18 ? 8 : 6, locale);
  const shown = native ? "PROS" : token.chainSymbol || token.symbol;

  if (!native) {
    const code = codeOf(await callJson(client, "get_code", { address: token.address, block: blockTag }));
    if (!code || code === "0x") {
      return stop(lang, say(lang, { pt: "Contrato vazio.", en: "Empty contract." }), [
        say(lang, { pt: `${shown} não tem código nesse endereço.`, en: `${shown} has no code at that address.` }),
      ]);
    }
    let symbol;
    let chainDecimals;
    try {
      const [symbolRes, decimalsRes] = await Promise.all([
        callJson(client, "eth_call", { transaction: { to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: "symbol" }) }, block: blockTag }),
        callJson(client, "eth_call", { transaction: { to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: "decimals" }) }, block: blockTag }),
      ]);
      symbol = decodeFunctionResult({ abi: erc20Abi, functionName: "symbol", data: symbolRes.result });
      chainDecimals = Number(decodeFunctionResult({ abi: erc20Abi, functionName: "decimals", data: decimalsRes.result }));
    } catch {
      return stop(lang, say(lang, { pt: "Contrato ilegível.", en: "Unreadable contract." }), [
        say(lang, { pt: "O contrato não devolveu símbolo e casas decimais.", en: "The contract did not return a symbol and decimals." }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
    const expected = shown.toUpperCase();
    if (String(symbol).toUpperCase() !== expected) {
      return stop(lang, say(lang, { pt: "Token não confere.", en: "Token does not match." }), [
        say(lang, { pt: `O contrato respondeu ${symbol}, não ${shown}.`, en: `The contract answered ${symbol}, not ${shown}.` }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
    if (chainDecimals !== token.decimals) {
      return stop(lang, say(lang, { pt: "Casas decimais não conferem.", en: "Decimals do not match." }), [
        say(lang, { pt: `O contrato usa ${chainDecimals} casas. O registro diz ${token.decimals}.`, en: `The contract uses ${chainDecimals} decimals. The registry says ${token.decimals}.` }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
  }

  const [fromNativeRes, nonceRes, tokenBalRes] = await Promise.all([
    callJson(client, "get_balance", { address: from, block: blockTag }),
    callJson(client, "get_transaction_count", { address: from, block: blockTag }),
    native
      ? Promise.resolve(null)
      : callJson(client, "eth_call", {
        transaction: { to: token.address, data: encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [from] }) },
        block: blockTag,
      }),
  ]);
  const fromNative = weiOf(fromNativeRes);
  if (fromNative == null) {
    return stop(lang, say(lang, { pt: "Sem saldo de PROS.", en: "No PROS balance." }), [
      say(lang, { pt: "O nó não devolveu o saldo de PROS.", en: "The node did not return the PROS balance." }),
    ]);
  }
  let tokenBal = fromNative;
  if (!native) {
    try {
      tokenBal = BigInt(tokenBalRes.result);
    } catch {
      return stop(lang, say(lang, { pt: "Sem saldo do token.", en: "No token balance." }), [
        say(lang, { pt: "O contrato não devolveu o saldo.", en: "The contract did not return a balance." }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
  }
  const nonce = nonceOf(nonceRes);
  if (nonce == null) {
    return stop(lang, say(lang, { pt: "Sem nonce.", en: "No nonce." }), [
      say(lang, { pt: "O nó não devolveu o nonce.", en: "The node did not return the nonce." }),
    ]);
  }
  const decimals = native ? 18 : token.decimals;
  if (max && !native) {
    amount = tokenBal;
    if (amount <= 0n) {
      return stop(lang, say(lang, { pt: "Saldo insuficiente.", en: "Not enough balance." }), [
        say(lang, {
          pt: `A carteira tem 0 ${shown} no bloco ${formatInteger(block, locale)}.`,
          en: `The wallet holds 0 ${shown} at block ${formatInteger(block, locale)}.`,
        }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
  }
  const have = money(max && native ? fromNative : tokenBal, decimals);
  const need = money(amount, decimals);

  if (!max && tokenBal < amount) {
    return stop(lang, say(lang, { pt: "Saldo insuficiente.", en: "Not enough balance." }), [
      say(lang, {
        pt: `A carteira tem ${have} ${shown} no bloco ${formatInteger(block, locale)}. O pedido é ${need}.`,
        en: `The wallet holds ${have} ${shown} at block ${formatInteger(block, locale)}. The request is ${need}.`,
      }),
      say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
    ]);
  }

  async function estimateGas(transaction) {
    const est = await callJson(client, "estimate_gas", { transaction });
    const gasRaw = est.gas ?? est.gasUsed ?? est.gasHex;
    if (gasRaw == null || gasRaw === "") {
      const missing = new Error("missing gas");
      throw missing;
    }
    return BigInt(gasRaw);
  }

  if (max && native) {
    let probeGas;
    try {
      probeGas = await estimateGas({ from, to, data: "0x", value: hexWei(1n) });
    } catch (error) {
      if (error.message === "missing gas") {
        return stop(lang, say(lang, { pt: "Sem estimativa.", en: "No gas estimate." }), [
          say(lang, { pt: "O nó não devolveu o gás.", en: "The node did not return a gas estimate." }),
          say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
        ]);
      }
      return stop(lang, say(lang, { pt: "A estimativa reverteu.", en: "The estimate reverted." }), [
        plainReason(reasonFromMessage(error.message), lang) || say(lang, { pt: "O nó não devolveu o motivo.", en: "The node did not return a reason." }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
    amount = maxNativeAmount(fromNative, probeGas, gasPriceWei);
    if (amount == null) {
      return stop(lang, say(lang, { pt: "Sem PROS para a taxa.", en: "Not enough PROS for the fee." }), [
        say(lang, {
          pt: `A carteira tem ${money(fromNative, 18)} PROS. Isso não cobre a taxa.`,
          en: `The wallet has ${money(fromNative, 18)} PROS. That does not cover the fee.`,
        }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
    try {
      const tightened = maxNativeAmount(fromNative, await estimateGas({ from, to, data: "0x", value: hexWei(amount) }), gasPriceWei);
      if (tightened != null) amount = tightened;
    } catch {
      /* The first estimate still sizes the payment. The final estimate below checks it. */
    }
  }

  const data = native
    ? "0x"
    : encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] });
  const value = native ? amount : 0n;
  const tx = { from, to: native ? to : token.address, data, value: hexWei(value) };

  let callOk = false;
  let callRes = null;
  let decoded = null;
  try {
    callRes = await callJson(client, "eth_call", { transaction: tx, block: blockTag });
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
  if (!native && callRes?.result && callRes.result !== "0x") {
    try {
      const accepted = decodeFunctionResult({ abi: erc20Abi, functionName: "transfer", data: callRes.result });
      if (accepted === false) {
        return stop(lang, say(lang, { pt: "O token recusou.", en: "The token refused." }), [
          say(lang, { pt: "A transferência devolveu false.", en: "The transfer returned false." }),
          say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
        ]);
      }
    } catch {
      /* The call succeeded and the token did not return a bool. */
    }
  }

  let gas = null;
  try {
    gas = await estimateGas(tx);
  } catch (error) {
    if (error.message === "missing gas") {
      return stop(lang, say(lang, { pt: "Sem estimativa.", en: "No gas estimate." }), [
        say(lang, { pt: "O nó não devolveu o gás.", en: "The node did not return a gas estimate." }),
        say(lang, { pt: "Nada foi montado para assinar.", en: "Nothing was prepared for signing." }),
      ]);
    }
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
  const same = from.toLowerCase() === to.toLowerCase();
  const after = expectedAfter({ native, same, tokenBal, fromNative, amount, fee });
  const who = (address) => reviewed(address, locale);
  const gwei = formatAmount(gasPriceWei, 9, 9, locale);
  const sent = money(amount, decimals);
  const action = say(lang, {
    pt: `enviar ${sent} ${shown} para ${who(to)}`,
    en: `send ${sent} ${shown} to ${who(to)}`,
  });
  const lines = [
    say(lang, { pt: `Resumo: ${action}.`, en: `Summary: ${action}.` }),
    `${say(lang, { pt: "De", en: "From" })}: ${who(from)}`,
    `${say(lang, { pt: "Para", en: "To" })}: ${who(to)}`,
    `${say(lang, { pt: "Saldo agora", en: "Balance now" })}: ${have} ${shown}`,
    `${say(lang, { pt: "Saldo depois", en: "Balance after" })}: ${money(after.token, decimals)} ${shown}`,
  ];
  if (!native) {
    lines.push(say(lang, {
      pt: `PROS agora: ${money(fromNative, 18)}. Depois da taxa: ${money(after.pros, 18)}.`,
      en: `PROS now: ${money(fromNative, 18)}. After the fee: ${money(after.pros, 18)}.`,
    }));
    lines.push(say(lang, {
      pt: `A transação chama o contrato ${shown} em ${token.address}. O destinatário está nos dados da transferência.`,
      en: `The transaction calls the ${shown} contract at ${token.address}. The recipient is in the transfer data.`,
    }));
  }
  lines.push(
    say(lang, {
      pt: `Gás estimado ${formatInteger(gas, locale)}. Taxa ${money(fee, 18)} PROS a ${gwei} gwei. Limite ${formatInteger(limit, locale)}.`,
      en: `Estimated gas ${formatInteger(gas, locale)}. Fee ${money(fee, 18)} PROS at ${gwei} gwei. Limit ${formatInteger(limit, locale)}.`,
    }),
    `${say(lang, { pt: "Bloco", en: "Block" })}: ${formatInteger(block, locale)}`,
    say(lang, { pt: "Nada foi assinado. A transação abaixo está sem assinatura.", en: "Nothing was signed. The transaction below is unsigned." }),
    say(lang, { pt: "O pedido da carteira é eth_sendTransaction. Esta página não enviou.", en: "The wallet request is eth_sendTransaction. This page did not send it." }),
  );
  if (max) {
    lines.push(say(lang, native
      ? { pt: "O valor é o saldo de PROS menos a reserva da taxa.", en: "The amount is the PROS balance minus the fee reserve." }
      : { pt: `O valor é o saldo todo de ${shown}.`, en: `The amount is the full ${shown} balance.` }));
  }
  return {
    ok: true,
    ready: true,
    broadcast: false,
    unsigned,
    signingRequest: signingRequestOf(unsigned),
    question: "",
    pending: null,
    headline: say(lang, { pt: "Pronta para assinar.", en: "Ready to sign." }),
    lines,
    action,
    block,
  };
}
