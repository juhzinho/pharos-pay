# Natural-Language Payment Agent

Turns a sentence into an unsigned Pacific payment. Read-only. Chain MCP. The server never calls `send_raw_transaction` and never holds a key.

| Requirement | How |
|---|---|
| Parse amount, token and recipient, and ask when something is missing | A rule reader for English and Portuguese. A name like `alice.eth` or the word `usd` asks a follow-up instead of guessing |
| Validate recipient, token contract and balance | The recipient must be a 0x address. An ERC-20 must have code and answer `symbol`. The balance is read at one block |
| Summary before the unsigned transaction | Amount, from, balance now, balance after, gas and fee come first. The raw transaction comes after |
| Never sign or send | The output is a legacy type 0 transaction, chain 1672, with no signature. A failed check returns no transaction |

```bash
npm run pay -- --from 0x15dDce897D76ac39c188AdE4D353711A60395315 send 1 USDC to 0x000000000000000000000000000000000000dEaD
npm run pay -- manda 1 USDC
```

Live page: https://pharos-pay.vercel.app
