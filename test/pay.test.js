import { test } from "node:test";
import assert from "node:assert/strict";
import { followUp, normalizeAmount, parsePayment } from "../lib/parse.js";
import { bufferedGas, expectedAfter } from "../lib/pay.js";

const TO = "0x000000000000000000000000000000000000dEaD";
const FROM = "0x15dDce897D76ac39c188AdE4D353711A60395315";

test("a full English sentence has amount, token and recipient", () => {
  const parsed = parsePayment(`send 1 USDC to ${TO}`);
  assert.equal(parsed.amount, "1");
  assert.equal(parsed.token, "USDC");
  assert.equal(parsed.to, TO);
  assert.deepEqual(parsed.missing, []);
});

test("Portuguese fills only the missing recipient", () => {
  const parsed = parsePayment("para " + TO, { amount: "1", token: "USDC", to: "" });
  assert.equal(parsed.amount, "1");
  assert.equal(parsed.token, "USDC");
  assert.equal(parsed.to, TO);
  assert.deepEqual(parsed.missing, []);
});

test("a sentence with no recipient asks for the address", () => {
  const parsed = parsePayment("manda 1 USDC");
  assert.deepEqual(parsed.missing, ["to"]);
  assert.match(followUp(parsed, "pt"), /endereço/);
});

test("an ENS name is a follow-up, not an address", () => {
  const parsed = parsePayment("send 100 USDC to alice.eth");
  assert.equal(parsed.ens, "alice.eth");
  assert.equal(parsed.to, "");
  assert.match(followUp(parsed, "en"), /0x/);
});

test("digits inside an address are not the amount", () => {
  const parsed = parsePayment(`send 2 LINK to ${FROM}`);
  assert.equal(parsed.amount, "2");
  assert.equal(parsed.token, "LINK");
});

test("comma decimals and thousand dots normalize", () => {
  assert.equal(normalizeAmount("1,5"), "1.5");
  assert.equal(normalizeAmount("1.000"), "1000");
  assert.equal(normalizeAmount("1.500,25"), "1500.25");
});

test("the gas limit is 20% above the estimate", () => {
  assert.equal(bufferedGas(21_000n), 25_200n);
});

test("a Portuguese amount keeps the cents after the thousands", () => {
  const parsed = parsePayment(`manda 1.500,25 USDC para ${TO}`);
  assert.equal(parsed.amount, "1500.25");
  assert.equal(parsed.token, "USDC");
  assert.deepEqual(parsed.missing, []);
});

test("a token glued to the amount still parses", () => {
  const parsed = parsePayment(`send 100USDC to ${TO}`);
  assert.equal(parsed.amount, "100");
  assert.equal(parsed.token, "USDC");
});

test("USDC.e is the bridged token, not official USDC", () => {
  const parsed = parsePayment(`send 1 USDC.e to ${TO}`);
  assert.equal(parsed.token, "USDCe");
  assert.equal(parsePayment(`send 1 USDCe to ${TO}`).token, "USDCe");
});

test("two amounts, two tokens or two recipients ask instead of guessing", () => {
  assert.equal(parsePayment(`send 1 or 2 USDC to ${TO}`).ambiguous, "amount");
  assert.equal(parsePayment(`send 1 USDC or PROS to ${TO}`).ambiguous, "token");
  assert.equal(parsePayment(`send 1 USDC to ${TO} and ${FROM}`).ambiguous, "to");
  assert.match(followUp(parsePayment(`send 1 or 2 USDC to ${TO}`), "en"), /amount/i);
});

test("digits in a short hex blob are not the amount", () => {
  const parsed = parsePayment("send 0x1234 USDC");
  assert.equal(parsed.amount, "");
  assert.equal(parsed.token, "USDC");
});

test("a transfer to the same wallet only spends the fee", () => {
  const same = expectedAfter({ native: true, same: true, tokenBal: 100n, fromNative: 100n, amount: 10n, fee: 1n });
  assert.equal(same.token, 99n);
  const other = expectedAfter({ native: false, same: false, tokenBal: 50n, fromNative: 20n, amount: 5n, fee: 2n });
  assert.equal(other.token, 45n);
  assert.equal(other.pros, 18n);
  const selfToken = expectedAfter({ native: false, same: true, tokenBal: 50n, fromNative: 20n, amount: 5n, fee: 2n });
  assert.equal(selfToken.token, 50n);
  assert.equal(selfToken.pros, 18n);
});
