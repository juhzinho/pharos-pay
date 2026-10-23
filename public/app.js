import { setMode } from "./scene.js";

const FROM = "0x15dDce897D76ac39c188AdE4D353711A60395315";
const DEAD = "0x000000000000000000000000000000000000dEaD";
const I = {
  en: {
    kicker: "Pacific · chain 1672 · unsigned",
    title: "Say it. Then sign it.",
    lead: "A sentence becomes a payment. If a piece is missing, it asks. Nothing is signed here.",
    fromL: "From",
    go: "Prepare",
    wait: "Reading the chain…",
    you: "You",
    chips: {
      pay: "send 1 USDC",
      ask: "manda 1 USDC",
      short: "send too much",
    },
  },
  pt: {
    kicker: "Pacific · chain 1672 · sem assinatura",
    title: "Diz. Depois assina.",
    lead: "Uma frase vira um pagamento. Se faltar um pedaço, ele pergunta. Nada é assinado aqui.",
    fromL: "De",
    go: "Preparar",
    wait: "Lendo a rede…",
    you: "Você",
    chips: { pay: "manda 1 USDC para…", ask: "manda 1 USDC", short: "manda demais" },
  },
};
function example(kind) {
  if (lang === "pt") {
    return {
      pay: { text: `manda 1 USDC para ${DEAD}`, from: FROM },
      ask: { text: "manda 1 USDC", from: FROM },
      short: { text: `manda 999999999999 USDC para ${DEAD}`, from: FROM },
    }[kind];
  }
  return {
    pay: { text: `send 1 USDC to ${DEAD}`, from: FROM },
    ask: { text: "manda 1 USDC", from: FROM },
    short: { text: `send 999999999999 USDC to ${DEAD}`, from: FROM },
  }[kind];
}
let lang = localStorage.getItem("pharos-lang") === "pt" ? "pt" : "en";
let pending = { amount: "", token: "", to: "" };
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

function apply() {
  const t = I[lang];
  document.documentElement.lang = lang;
  $("kicker").textContent = t.kicker;
  $("title").textContent = t.title;
  $("lead").textContent = t.lead;
  $("fromL").textContent = t.fromL;
  $("go").textContent = t.go;
  $("pay").textContent = t.chips.pay;
  $("ask").textContent = t.chips.ask;
  $("short").textContent = t.chips.short;
  $("text").placeholder = lang === "pt" ? "manda 1 USDC para 0x…" : "send 1 USDC to 0x…";
  document.querySelectorAll("[data-lang]").forEach((button) => button.classList.toggle("on", button.dataset.lang === lang));
}

function bubble(role, text, extra = "") {
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.innerHTML = `<b>${role === "you" ? esc(I[lang].you) : "Pay"}</b><p>${esc(text)}</p>${extra}`;
  $("log").append(node);
  node.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function send(text) {
  const q = new URLSearchParams({ lang, text, from: $("from").value.trim(), amount: pending.amount, token: pending.token, to: pending.to });
  $("go").disabled = true;
  $("status").textContent = I[lang].wait;
  setMode("wait");
  try {
    const res = await fetch("/api/pay?" + q);
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || res.statusText);
    pending = data.pending || { amount: "", token: "", to: "" };
    const lines = (data.lines || []).map((line) => `<span>${esc(line)}</span>`).join("");
    const raw = data.unsigned ? `<code>${esc(JSON.stringify(data.unsigned))}</code>` : "";
    bubble("pay", data.headline, `<div class="detail">${lines}${raw}</div>`);
    setMode(data.ready ? "pass" : data.question ? "ask" : "stop");
  } catch (error) {
    bubble("pay", error.message);
    setMode("stop");
  } finally {
    $("status").textContent = "";
    $("go").disabled = false;
    $("text").focus();
  }
}

$("form").addEventListener("submit", (event) => {
  event.preventDefault();
  const text = $("text").value.trim();
  if (!text) return;
  bubble("you", text);
  $("text").value = "";
  send(text);
});
$("chips").addEventListener("click", (event) => {
  const button = event.target.closest("[data-ex]");
  if (!button) return;
  const row = example(button.dataset.ex);
  pending = { amount: "", token: "", to: "" };
  $("from").value = row.from;
  $("text").value = row.text;
  apply();
});
document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => { lang = button.dataset.lang; localStorage.setItem("pharos-lang", lang); apply(); });
});
apply();
setMode("ask");
