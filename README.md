# INTERMINAL

Arc-native trading workstation.

Analyze. Execute. Monitor.

There is no compile step. Interminal is a static terminal: open `index.html` and the desk boots. Tailwind and fonts load from CDN. All market math, risk scores, and wallet calls run in the browser.

```
Connect → Monitor → Analyze → Decide → Execute → Track
```

AI recommends. Trading engine validates. Wallet authorizes. Arc executes.

## Run

```bash
git clone https://github.com/Tajudeeen/interminal-.git
cd interminal-
python3 -m http.server 8765
```

Open `http://localhost:8765`. File-open also works; a local server avoids some browser wallet quirks.

Connect MetaMask, Rabby, or another injected EIP-1193 wallet. Interminal will request Arc mainnet and refuse the desk on any other chain.

## Network

| Field | Value |
|---|---|
| Network | Arc mainnet |
| Chain ID | `5042` (`0x13b2`) |
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| Native gas | USDC, 18 decimals |

If the wallet does not already know Arc, Interminal calls `wallet_addEthereumChain` / `wallet_switchEthereumChain` with those values.

## What is real

| Layer | Source |
|---|---|
| Account | Injected wallet (`eth_requestAccounts`) |
| Network gate | `eth_chainId` must equal `5042` |
| USDC | `eth_getBalance` — native units, 18 decimals |
| WETH / EURC / USYC / cirBTC | `balanceOf` on the official Arc contracts |
| Block height | Public Arc RPC |
| Trade confirm | Wallet popup. EIP-712 `TradeTicket` signed by the connected address |

Native USDC and the ERC-20 interface at `0x3600000000000000000000000000000000000000` are the same balance at two decimal scales. The book lists USDC once.

## What is local

Candles, EMAs, RSI, MACD, quotes, slippage, price impact, and AI copy are computed in `app.js` from the selected pair. The model does not invent prices — it interprets numbers the market engine already produced.

Risk scores (concentration, stable buffer, size vs NAV, impact) are formulas. AI only narrates them.

## What is not shipped yet

Router broadcast is gated. Signing a ticket does **not** send swap calldata. No private keys, seeds, or signing authority are given to the model. Interminal will not auto-execute an AI suggestion.

## Layout

```
index.html    shell, design tokens, Tailwind CDN
app.js        wallet, market, indicators, risk, AI, views
logo.svg      mark
```

Views: Terminal, Markets, Portfolio, AI Analyst, Activity.

## Contracts read on mainnet

| Asset | Address | Decimals |
|---|---|---|
| USDC (ERC-20 view) | `0x3600000000000000000000000000000000000000` | 6 |
| WETH | `0x128cC466B61f542da60c70e3aA11c10e19B84EDB` | 18 |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 |
| USYC | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 |
| cirBTC | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 |

## Security

- Never store keys or seeds
- Never let the AI sign
- Never display an AI-invented amount as the thing you sign
- Validate chain ID before any wallet prompt
- Fees are labeled in USDC, not ETH
