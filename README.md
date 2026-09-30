# INTERMINAL

Arc-native trading workstation.

Analyze. Execute. Monitor.

There is no compile step. Interminal is a zero-build static terminal: open `index.html` and the desk boots. Tailwind CSS and fonts load from CDN. All market math, technical indicators, risk scores, gas tank wrapping, and wallet calls run purely client-side in the browser.

```
Connect -> Monitor -> Analyze -> Decide -> Execute -> Track
```

AI recommends. Trading engine validates. Wallet authorizes. Arc executes.

## Quickstart

```bash
git clone https://github.com/Tajudeeen/interminal-.git
cd interminal-
python3 -m http.server 8765
```

Open `http://localhost:8765` in your browser.

Run automated verification tests:

```bash
node test.mjs
node test-dom.mjs
```

This re-queries Arc Mainnet (`eth_chainId` must equal `5042`), tests on-chain contract bytecode, verifies mathematical formulas, checks DCA slices, and exercises all 14 fail-closed gates.

Connect MetaMask, Rabby, or any injected EIP-1193 wallet. Interminal automatically requests Arc Mainnet and refuses execution on any other chain.

The **Proof** view re-queries the RPC live from the browser without relying on static mocks or screenshots.

## Network

| Field | Value |
|---|---|
| Network | Arc Mainnet |
| Chain ID | `5042` (`0x13b2`) |
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| Native gas | USDC, 18 decimals |

If the wallet does not already know Arc, Interminal calls `wallet_addEthereumChain` / `wallet_switchEthereumChain` with those parameters.

## Architecture

| Layer | Source |
|---|---|
| Account | Injected browser wallet (`eth_requestAccounts`) |
| Network gate | `eth_chainId` must strictly equal `5042` |
| Native Gas / USDC | `eth_getBalance` - native protocol units, 18 decimals |
| WETH / EURC / USYC / cirBTC | `balanceOf` on official Arc verified contracts |
| Block height | Public Arc RPC (`https://rpc.mainnet.arc.io`) |
| Trade confirm | Wallet popup. EIP-712 `TradeTicket` signed by connected address |
| Market Prices & 24h Stats | Real-time live feeds from Uniswap V3 and DEX oracles (DexScreener API) |
| On-Chain Settlement | `InterminalSettlement.sol` on Arc Mainnet (`chainId: 5042`) |
| Cryptographic Receipts | Canonical SHA-256 JSON-LD trade certificates |
| Gas Runway Controller | Instant native gas wrap / refuel and runway estimator |
| Autonomous DCA Bot | EIP-712 scoped time-weighted average price (TWAP) execution engine |

Native USDC (18 decimals) and the ERC-20 trading token at `0x3600000000000000000000000000000000000000` (6 decimals) represent the same asset at two decimal scales. Interminal bridges both cleanly with its integrated Gas Tank.

## What is Real vs. What is Local

- **Market Data:** DexScreener batch endpoint streams verified live pair prices and volumes.
- **Indicators:** EMAs (20, 50, 200), RSI (14), MACD histogram, and 30-bar swing pivots are computed deterministically in `app.js` from live candle series. The AI model does not invent prices - it interprets numbers produced by the mathematical engine.
- **Risk Metrics:** Concentration percentage, stable buffer ratio, trade size vs. NAV, and price impact are derived from mathematical formulas. AI narrates the computed risk posture.
- **Zero Key Custody:** Private keys never leave your browser wallet. Automated agents operate under cryptographically bounded EIP-712 permits.

## Arc Mainnet Smart Contract Protocol

Interminal settles on-chain via [`contracts/InterminalSettlement.sol`](contracts/InterminalSettlement.sol):
- **Deployed Settlement Address:** [`0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36`](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36)
- **Deployment Transaction:** [`0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404`](https://explorer.arc.io/tx/0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404)
- **Deployer Wallet:** `0x541291139b59570d1cd5d0e64df217b3f6efd7c8`
- **Block Height:** `23,367,508`
- **Compiler:** Solidity `v0.8.28` (200 optimizer runs, 8,802 bytes bytecode)
- **EIP-712 TradeTicket Verification:** Direct on-chain signature verification and execution.
- **Arc AMM Router Integration:** Swaps executed via Arc Uniswap V2 Router (`0x52FE40c00530db2e43d01652f903870571A14AFD`).
- **Autonomous Agentic Mandates:** Enforces spending caps, per-transaction maximums, slippage bounds, and pair bitmasks on-chain.
- **On-Chain Audit Anchoring:** Anchors SHA-256 trade receipts directly to Arc blockchain state (`anchorReceipt(bytes32)`).

## Repository Layout

```
contracts/          InterminalSettlement.sol (Solidity v0.8.28)
artifacts/          InterminalSettlement.json (ABI & EVM Bytecode)
scripts/            compile.mjs, deploy.mjs, buildArtifactJs.mjs
contractArtifact.js Browser-ready compiled settlement artifact
index.html          Responsive shell, high-contrast theme tokens, Tailwind CDN
app.js              Core application: wallet, market feeds, indicators, AI, DCA engine, gas tank
test.mjs            28-suite automated mathematical and on-chain verification harness
test-dom.mjs        Interactive DOM simulation suite for view routing and controls
logo.svg            Geometric brand emblem
```

Primary Views: **Terminal**, **Markets**, **Portfolio**, **AI Analyst**, **Activity**, and **Proof**.

## Verified Arc Token Contracts

| Asset | Address | Decimals | Role |
|---|---|---|---|
| USDC (Native) | Native gas | 18 | Arc L1 gas token |
| USDC (ERC-20) | `0x3600000000000000000000000000000000000000` | 6 | Trading settlement |
| WETH | `0x128cC466B61f542da60c70e3aA11c10e19B84EDB` | 18 | Wrapped Ether |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 | Circle Euro Stablecoin |
| USYC | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 | Hashnote Tokenized US Treasuries |
| cirBTC | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 | Arc Bridged Bitcoin |

## Institutional Terminal Features

### 1. Arc Dual-USDC Gas Tank & Runway Controller
- **Dual-Scale Accounting:** Arc uses USDC natively for gas (18 decimals) and ERC-20 USDC for trading liquidity (6 decimals).
- **Runway Estimator:** Automatically calculates the user's estimated gas transaction runway based on live balance and average Arc execution costs (~0.0012 USDC/tx).
- **1-Click Refuel:** Fast wrap presets (+0.10, +0.25, +1.00 USDC) convert trading USDC into native gas balance with zero external token friction.
- **Status Indicator:** Header pill displays live fuel gauge with color-coded health states.

### 2. Autonomous DCA / TWAP Execution Engine
- **Time-Weighted Accumulation:** Set total budget, slice size, and execution intervals (15s test, 1m, 15m, 1h).
- **EIP-712 Bounded Slices:** Autonomous bot slices enforce maximum slippage bounds (0.30%) and hard spend caps per execution.
- **Live Monitor Widget:** Tracks completed slices, remaining budget, average fill price, and countdown to next slice with 1-click cancel support.

### 3. Smart Idle Treasury Engine
- **Opportunity Cost Projection:** Real-time calculation of yield forfeited on unallocated USDC relative to Hashnote USYC (T-Bills yielding ~4.95% APY).
- **Just-In-Time (JIT) Liquidity Bridge:** Keeps capital in interest-bearing USYC right up to the trade execution moment, automatically simulating redemptions to back large orders.
- **Automated Yield Sweep:** Identifies idle balances exceeding working capital reserves ($100 buffer) and executes frictionless sweeps into yield.

### 4. Institutional On-Chain FX Corridor (EURC/USDC)
- **FX Desk Pricing:** Dedicated quoting for EURC/USDC with micro-pip metrics (1 pip = 0.0001) and tight spread tracking.
- **Macro Carry Differential:** Tracks central bank policy divergence (+175 bps carry advantage: Federal Reserve 5.25% vs. ECB 3.50%), providing on-chain parity visibility.

### 5. Bounded Agentic Mandates (EIP-712 Scoped Delegation)
- **Zero-Key-Custody Agent Automation:** Grants time-limited, bounded execution permits to smart agents or algorithmic bots without sharing private keys.
- **Cryptographic Enforcement Gates:** Hard caps on spend budget, slippage bands, pair allowlists, and mandatory expiration timestamps.

### 6. Cryptographic Proof of Execution & Audit Certificates
- **Canonical JSON-LD Trade Certificates:** Every signed ticket produces a permanent, portable cryptographic audit receipt.
- **Tamper-Evident SHA-256 Digest:** Uses deterministic canonical hashing to bind trader, rate, slippage, block height, and signature into a 64-character hash that fails verification upon tampering.
- **Institutional Export:** View, copy, or download certificate JSON directly from the desk or Activity history.

## Screen Adaptability & Design Architecture

- **High-Contrast Theme Engine:** Pure black and white aesthetic using semantic CSS variables (`--bg`, `--card`, `--border`, `--text`, `--pos`, `--neg`).
- **Persistent Theme:** Dark and light modes with zero flash on reload.
- **Clean Typography & Icons:** Standard typography with Google Material Symbols; **zero unicode emojis across the entire repository**.
- **Responsive Screen Adaptation:**
  - **Compact Mobile (< 380px):** Scaled typography and compact header elements ensure zero horizontal overflow.
  - **Standard Mobile (380px–639px):** Adaptive table columns hide non-essential fields (Volume, TVL, Category) to present prices and trade buttons without horizontal panning.
  - **Tablet / iPad (640px–1023px):** Side-by-side terminal layout (`md:grid-cols-12`) placing candlestick chart and order panel simultaneously in view.
  - **Desktop & Ultrawide (1024px–1440px+):** Expanded `max-w-7xl` container giving multi-monitor desks full breathing room.
- **Unconstrained Page Scrolling:** Clean HTML and body overflow rules allowing natural vertical momentum scrolling across all browsers.
- **Accessible Modals:** All modal dialogues (Gas Tank, DCA, Mandates, Certificates, Search, Alerts) include `max-h-[90vh] overflow-y-auto` for accessible interactions on short viewports and landscape mobile devices.

## Security & Fail-Closed Gates

Interminal implements 14 deterministic fail-closed security gates:

1. **Chain Gate:** Chain ID must strictly equal `5042` before the desk or wallet prompt opens.
2. **Address Gate:** Addresses must match `0x` + 40 hex characters before RPC or EIP-712 evaluation.
3. **Public RPC Allowlist:** Only `eth_chainId`, `eth_blockNumber`, `eth_getBalance`, `eth_call`, `eth_getCode`, and `eth_getTransactionReceipt` are permitted.
4. **eth_call Gate:** Queries restricted to official Arc tokens and settlement contract with authorized view selectors (`balanceOf`, `isReceiptAnchored`, `traderNonces`, `mandateNonces`, `DOMAIN_SEPARATOR`).
5. **Quote Gate:** Trade amount must be positive, finite, and within allowable range. Slippage bounded between 1 and 500 bps.
6. **Ticket Domain Gate:** EIP-712 domain strictly bound to Arc Mainnet (5042) and verified settlement protocol, with nonce and deadline matching on-chain `hashTradeTicket()`.
7. **Treasury Safety Gate:** Deterministic opportunity cost and JIT USYC redemption calculations protect capital efficiency.
8. **FX Macro Gate:** EURC/USDC quotes map to pip spreads and central bank interest rate differential.
9. **Mandate Permit Gate:** Scoped EIP-712 permits enforce strict budget, slippage, and pair allowlist constraints matching on-chain `hashAgentMandate()`.
10. **Audit Receipt Integrity Gate:** Every executed ticket produces a tamper-evident SHA-256 canonical audit certificate.
11. **On-Chain State Anchoring Gate:** Audit receipts anchor directly into Arc blockchain state via `anchorReceipt(bytes32)`.
12. **Signature Malleability Gate:** EIP-2 `s`-value upper-bound check in `recoverSigner` prevents signature replay malleability.
13. **Safe Approval Gate:** ERC-20 allowances reset to 0 before setting swap amounts.
14. **Precision Gate:** Exact `parseUnits` decimal scaling prevents floating-point precision loss across 6, 8, and 18-decimal assets.

## Automated Verification

Run both test suites locally:

```bash
# 28-suite mathematical, contract, and protocol verification
node test.mjs

# Interactive DOM simulation test suite
node test-dom.mjs
```

---

(c) Interminal Protocol. Built natively on Arc Mainnet (Chain 5042).
