# INTERMINAL

Arc-native trading terminal.

Analyze. Execute. Monitor.

Open `index.html` in a browser. Connect an injected EVM wallet (MetaMask, Rabby). Interminal requires Arc mainnet — chain ID `5042` (`0x13b2`), native gas USDC.

```
AI recommends. Trading engine validates. Wallet authorizes. Arc executes.
```

## Stack

Vanilla HTML + JS. No build step.

| Piece | Detail |
|---|---|
| Network | Arc mainnet, `https://rpc.mainnet.arc.io` |
| Wallet | EIP-1193 + `wallet_addEthereumChain` / `wallet_switchEthereumChain` |
| Book | Native USDC (`eth_getBalance`, 18 decimals). Do not also list ERC-20 USDC at `0x3600…000` |
| Tokens | WETH, EURC, USYC, cirBTC via `balanceOf` |
| Ticket | EIP-712 `TradeTicket` signed in the wallet. Router broadcast is gated |

## Layout

```
index.html   shell
app.js       market, wallet, risk, AI, UI
logo.svg     mark
```
