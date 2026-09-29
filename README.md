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

```bash
node test.mjs
```

That re-queries Arc (`eth_chainId` must be `5042`) and runs the fail-closed checks. If a check cannot be reproduced, it is not claimed.

Connect MetaMask, Rabby, or another injected EIP-1193 wallet. Interminal will request Arc mainnet and refuse the desk on any other chain.

The Proof view hits the same RPC from the browser. It does not treat a banner or a screenshot as verification.

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
| Native Gas / USDC | `eth_getBalance` — native units, 18 decimals |
| WETH / EURC / USYC / cirBTC | `balanceOf` on the official Arc contracts |
| Block height | Public Arc RPC (`https://rpc.mainnet.arc.io`) |
| Trade confirm | Wallet popup. EIP-712 `TradeTicket` signed by the connected address |
| Market Prices & 24h Stats | Real-time live feeds from Uniswap V3 & DEX oracles (DexScreener API) |
| On-Chain Settlement | `InterminalSettlement.sol` protocol on Arc Mainnet (`chainId: 5042`) |
| Cryptographic Receipts | Canonical SHA-256 digests anchored into Arc blockchain state |

Native USDC and the ERC-20 interface at `0x3600000000000000000000000000000000000000` are the same balance at two decimal scales. The book lists USDC once.

## What is local

Candles, EMAs, RSI, and MACD are computed in `app.js` using real live pair prices and volumes. The model does not invent prices — it interprets numbers the live market engine produces.

Risk scores (concentration, stable buffer, size vs NAV, impact) are mathematical formulas. AI only narrates them.

## Arc Mainnet Smart Contract Protocol

Interminal operates directly with its production on-chain settlement and verification smart contract: [`contracts/InterminalSettlement.sol`](file:///C:/Users/tajud/desktop/hack/interminal/contracts/InterminalSettlement.sol).
- **Deployed Contract Address:** [`0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36`](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36)
- **Deployment Transaction:** [`0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404`](https://explorer.arc.io/tx/0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404)
- **Deployer Wallet:** `0x541291139b59570d1cd5d0e64df217b3f6efd7c8`
- **Block Height:** `23,367,508`
- **Compiler:** Solidity `v0.8.28` (200 optimizer runs, 8,802 bytes bytecode)
- **EIP-712 TradeTicket Verification:** On-chain cryptographic signature verification and execution.
- **Arc AMM Router Integration:** Swaps executed via Arc Uniswap V2 Router (`0x52FE40c00530db2e43d01652f903870571A14AFD`).
- **Autonomous Agentic Mandates:** Enforces spending caps, per-tx maximums, slippage bounds, and pair bitmasks on-chain.
- **On-Chain Audit Receipt Anchoring:** Anchors SHA-256 trade receipts directly to Arc blockchain state (`anchorReceipt(bytes32)`).

### Verification & Redeployment
- **Live On-Chain Verification:** Run `node test.mjs` to re-query the contract bytecode and methods live from `https://rpc.mainnet.arc.io`.
- **Browser Wallet Deployment:** The **Proof** view in Interminal detects the active deployment and provides 1-click management and anchoring.
- **Headless CLI:** Run `node scripts/deploy.mjs` to deploy additional instances if required.

## Layout

```
contracts/          InterminalSettlement.sol (Solidity v0.8.28)
artifacts/          InterminalSettlement.json (ABI & EVM Bytecode)
scripts/            compile.mjs, deploy.mjs, buildArtifactJs.mjs
contractArtifact.js Browser-ready compiled artifact
index.html          shell, design tokens, Tailwind CDN
app.js              wallet, live market feeds, indicators, AI, settlement
test.mjs            16-suite automated verification harness
logo.svg            mark
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

## Flagship Arc Institutional Features

Interminal introduces 4 native institutional primitives tailored for Arc's unique ecosystem (USDC native gas, Circle FX corridors, tokenized T-Bills, and smart agent autonomy):

### 1. Smart Idle Treasury Engine
- **Opportunity Cost Projection:** Real-time calculation of yield forfeited on unallocated USDC relative to Hashnote / Circle USYC (T-Bills yielding ~4.95%–5.10% APY).
- **Just-In-Time (JIT) Liquidity Bridge:** Enables traders to hold capital in interest-bearing USYC right up to the second of trade execution, automatically simulating USYC redemptions to back trade sizing.
- **Automated Yield Sweep:** Identifies idle balances exceeding working capital reserves and arms frictionless sweeps into tokenized yield.

### 2. Institutional On-Chain FX Corridor (EURC/USDC)
- **Institutional FX Desk:** Dedicated quoting for EURC/USDC with micro-pip metrics (1 pip = 0.0001) and tight spread tracking.
- **Macro Carry Spread:** Tracks central bank policy divergence (+175 bps carry: Federal Reserve 5.25% vs. ECB 3.50% deposit rate), giving institutions on-chain FX rate parity visibility.

### 3. Bounded Agentic Mandates (EIP-712 Scoped Delegation)
- **Zero-Key-Custody Agent Automation:** Users delegate time-limited, bounded execution permits to smart agents or autonomous models without ever handing over private keys or general signing authority.
- **Cryptographic Enforcement Gates:** Hard caps on authorized spend budget (USDC), strict slippage bands (e.g., 20–50 bps), approved market pairs allowlist, and mandatory expiration timestamps.

### 4. Cryptographic Proof of Execution & Audit Certificates
- **Canonical JSON-LD Trade Certificates:** Every signed ticket produces a permanent, portable cryptographic audit receipt.
- **Tamper-Evident SHA-256 Digest:** Uses deterministic canonical hashing to bind trader, rate, slippage, block number, and signature into a 64-character hash that fails verification upon any tampering.
- **Institutional Export:** View, copy, or download certificate JSON directly from the desk or Activity history.

## Security & Fail-Closed Gates

Trust model: the page is untrusted UI. The wallet is the signer. The public Arc RPC is an untrusted data source. The AI layer cannot sign or broadcast.

Gates verified in this build:

1. **Chain Gate:** Chain ID must be `5042` before the desk or a signature prompt
2. **Address Gate:** Addresses must match `0x` + 40 hex before RPC or EIP-712
3. **Public RPC Allowlist:** `eth_chainId`, `eth_blockNumber`, `eth_getBalance`, `eth_call`, `eth_getCode`, `eth_getTransactionReceipt`
4. **eth_call Gate:** Calls only to official Arc tokens and settlement contract with authorized view selectors (`balanceOf`, `isReceiptAnchored`, `traderNonces`, `mandateNonces`, `DOMAIN_SEPARATOR`)
5. **Quote Gate:** Amount must be finite and in (0, 1e9]. Slippage 1–500 bps
6. **Ticket Domain Gate:** EIP-712 domain bound to Arc Mainnet (5042) and verified settlement protocol, with nonce and deadline matching on-chain `hashTradeTicket()`
7. **Treasury Safety Gate:** Deterministic opportunity cost & JIT USYC redemption calculations protect capital efficiency
8. **FX Macro Gate:** EURC/USDC quotes map to pip spreads and central bank interest rate differential
9. **Mandate Permit Gate:** Scoped EIP-712 permits enforce strict budget, slippage, and pair allowlist constraints matching on-chain `hashAgentMandate()`
10. **Audit Receipt Integrity Gate:** Every executed ticket produces a tamper-evident SHA-256 canonical audit certificate
11. **On-Chain State Anchoring Gate:** Audit receipts anchor directly into Arc blockchain state via `anchorReceipt(bytes32)`
12. **Signature Malleability Gate:** EIP-2 `s`-value upper-bound check in `recoverSigner` prevents signature replay malleability
13. **Safe Approval Gate:** ERC-20 allowances reset to 0 before setting swap amounts
14. **Precision Gate:** Exact `parseUnits` decimal scaling prevents floating-point precision loss across 6, 8, and 18-decimal assets

Run the 22-suite test verification locally:
```bash
npm test
```

Residual risk: Tailwind CDN still needs `'unsafe-inline'` for the config tag. An injected wallet extension is trusted for account lists. Off-chain EIP-712 is an authorization preview prior to router settlement.


