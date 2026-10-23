import { test } from "node:test";
import assert from "node:assert/strict";
import { followUp, normalizeAmount, parsePayment } from "../lib/parse.js";
import { bufferedGas } from "../lib/pay.js";

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
