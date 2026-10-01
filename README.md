# INTERMINAL — Autonomous Corporate Treasury & Liquidity Desk for Arc

Autonomous corporate cash management, 4.95% USYC Treasury sweeps, and just-in-time liquidity orchestration built natively for Arc Mainnet (Chain 5042).

Interminal is the on-chain Brex / Mercury workstation for digital-native enterprises, DAOs, and protocol treasuries operating on Arc. It eliminates idle cash drag by continuously sweeping excess liquid capital into tokenized US Treasuries (Hashnote USYC @ ~4.95% APY), maintains configurable working-capital operating reserves, unwinds liquidity just-in-time for outgoing obligations, and anchors tamper-evident cryptographic audit certificates directly on Arc L1.

Built with **React 18 + TypeScript + Vite + Tailwind CSS + Zustand**, featuring an institutional desktop sidebar, glassmorphic modals, streaming market marquee, and a zero-custody EIP-712 execution engine.

```
Deposit -> Monitor NAV -> Allocate Buffer -> Auto-Sweep Yield -> JIT Unwind -> Audit On-Chain
```

AI recommends. Treasury engine validates. Wallet authorizes. Arc executes.

## Quickstart (React 18 + TypeScript)

```bash
git clone https://github.com/Tajudeeen/interminal-.git
cd interminal-
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build & Typecheck

```bash
npm run build        # Typecheck via tsc & compile bundle via Vite
npx vitest run       # Run Vitest unit test suite (12/12 passing)
node test.mjs        # Run core protocol verification tests (28/28 passing)
```

Run automated verification tests:

```bash
node test.mjs
node test-dom.mjs
```

This re-queries Arc Mainnet (`eth_chainId` must equal `5042`), tests on-chain contract bytecode, verifies mathematical formulas, checks DCA slices and treasury buffers, and exercises all 14 fail-closed gates.

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
| Corporate Account | Injected browser wallet (`eth_requestAccounts`) |
| Network Gate | `eth_chainId` must strictly equal `5042` |
| Native Gas / USDC | `eth_getBalance` - native protocol units, 18 decimals |
| WETH / EURC / USYC / cirBTC | `balanceOf` on official Arc verified contracts |
| Block Height | Public Arc RPC (`https://rpc.mainnet.arc.io`) |
| Treasury Confirm | Wallet popup. EIP-712 `TradeTicket` signed by authorized corporate address |
| Market Prices & 24h Stats | Real-time live feeds from Uniswap V3 and DEX oracles (DexScreener API) |
| On-Chain Settlement | `InterminalSettlement.sol` on Arc Mainnet (`chainId: 5042`) |
| Cryptographic Receipts | Canonical SHA-256 JSON-LD corporate audit certificates |
| Gas Runway Controller | Instant native gas wrap / refuel and runway estimator |
| Auto-Sweep Engine | Mathematical yield sweep of excess liquid USDC into Hashnote USYC |
| JIT Liquidity Unwind | Instant 1:1 par redemption engine for outgoing disbursements |

Native USDC (18 decimals) and the ERC-20 trading token at `0x3600000000000000000000000000000000000000` (6 decimals) represent the same asset at two decimal scales. Interminal bridges both cleanly with its integrated Gas Tank.

## What is Real vs. What is Local

- **Treasury Math:** Net Asset Value (NAV), passive daily yield accrual, opportunity cost of idle capital, and working capital buffers are computed deterministically in `app.js` using live on-chain balances.
- **Market Data:** DexScreener batch endpoint streams verified live pair prices and volumes.
- **Indicators:** EMAs (20, 50, 200), RSI (14), MACD histogram, and 30-bar swing pivots are computed deterministically in `app.js` from live candle series. The AI model does not invent prices - it interprets numbers produced by the mathematical engine.
- **Risk Metrics:** Concentration percentage, stable buffer ratio, trade size vs. NAV, and price impact are derived from mathematical formulas. AI narrates the computed risk posture.
- **Zero Key Custody:** Private keys never leave your browser wallet. Automated agents and corporate officers operate under cryptographically bounded EIP-712 permits.

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
app.js              Core application: treasury engine, wallet, market feeds, indicators, AI, gas tank
test.mjs            28-suite automated mathematical and on-chain verification harness
test-dom.mjs        Interactive DOM simulation suite for view routing and controls
logo.svg            Geometric brand emblem
```

Primary Views: **Treasury** (Cockpit & NAV), **FX & Trade** (Terminal), **Markets**, **AI Analyst**, **Activity** (Corporate Ledger), and **Proof**.

## Verified Arc Token Contracts

| Asset | Address | Decimals | Role |
|---|---|---|---|
| USDC (Native) | Native gas | 18 | Arc L1 gas token |
| USDC (ERC-20) | `0x3600000000000000000000000000000000000000` | 6 | Operational liquidity & settlement |
| USYC | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 | Hashnote Tokenized US Treasuries (~4.95% APY) |
| EURC | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 | Circle Euro Stablecoin |
| WETH | `0x128cC466B61f542da60c70e3aA11c10e19B84EDB` | 18 | Wrapped Ether |
| cirBTC | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 | Arc Bridged Bitcoin |

## Institutional Corporate Treasury Features

### 1. Autonomous Operating Cash Buffer & 4.95% USYC Auto-Sweep
- **Configurable Operating Reserves:** Corporate treasurers select target operating cash buffers ($100, $250, $500, $1,000, $2,500, $5,000) based on runway and operational expense profiles.
- **Dynamic Liquidity Water-Level Bar:** Visual representation of liquid working capital versus interest-bearing capital allocation.
- **1-Click Autonomous Sweep:** Sweeps excess liquid USDC into Hashnote USYC (T-Bills yielding ~4.95% APY) with immediate cryptographic audit certificate generation.
- **Live Yield Meter:** Continuously displays annual yield projection and daily accrued interest in USD.

### 2. Just-In-Time (JIT) Liquidity Stress Tester & Unwind Bridge
- **Zero-Drag Cash Management:** Keeps 100% of non-working capital deployed in interest-bearing T-Bills right up until disbursement.
- **Interactive Payout Simulator:** Test immediate corporate expenses ($500, $1,000, $2,500, $5,000, $10,000) against current liquidity.
- **Instant Unwind Bridge:** Dynamically unwinds USYC back into liquid USDC at 1:1 par with 0 bps drag to satisfy outgoing vendor payments, payroll, or trades.

### 3. Arc Dual-USDC Gas Tank & Operating Runway Controller
- **Dual-Scale Accounting:** Arc uses USDC natively for gas (18 decimals) and ERC-20 USDC for trading liquidity (6 decimals).
- **Runway Estimator:** Automatically calculates the treasury's estimated transaction runway based on live balance and average Arc execution costs (~0.0012 USDC/tx).
- **1-Click Refuel:** Fast wrap presets (+0.10, +0.25, +1.00 USDC) convert operational USDC into native gas balance with zero external token friction.
- **Status Indicator:** Header pill displays live fuel gauge with color-coded health states.

### 4. Institutional On-Chain FX Corridor (EURC/USDC)
- **Corporate FX Desk Pricing:** Dedicated quoting for EURC/USDC with micro-pip metrics (1 pip = 0.0001) and tight spread tracking.
- **Macro Carry Differential:** Tracks central bank policy divergence (+175 bps carry advantage: Federal Reserve 5.25% vs. ECB 3.50%), providing on-chain parity visibility for cross-border payroll.

### 5. Bounded Corporate Mandates (EIP-712 Scoped Delegation)
- **Zero-Key-Custody Officer Automation:** Grants time-limited, bounded execution permits to treasury operators or autonomous agents without sharing private keys.
- **Cryptographic Enforcement Gates:** Hard caps on spend budget, slippage bands, pair allowlists, and mandatory expiration timestamps enforced on-chain.

### 6. Tamper-Evident SHA-256 Audit Certificates & On-Chain State Anchoring
- **Canonical JSON-LD Trade Certificates:** Every signed treasury action or trade produces a permanent, portable cryptographic audit receipt.
- **Tamper-Evident SHA-256 Digest:** Uses deterministic canonical hashing to bind treasury operator, rate, slippage, block height, and signature into a 64-character hash that fails verification upon tampering.
- **On-Chain State Anchoring:** Anchors SHA-256 trade receipts directly to Arc blockchain state (`anchorReceipt(bytes32)`).
- **Institutional Export:** View, copy, or download certificate JSON directly from the desk or Activity corporate ledger.

## Screen Adaptability & Design Architecture

- **High-Contrast Theme Engine:** Pure black and white aesthetic using semantic CSS variables (`--bg`, `--card`, `--border`, `--text`, `--pos`, `--neg`).
- **Persistent Theme:** Dark and light modes with zero flash on reload.
- **Clean Typography & Icons:** Standard typography with Google Material Symbols; **zero unicode emojis across the entire repository**.
- **Responsive Screen Adaptation:**
  - **Compact Mobile (< 380px):** Scaled typography and compact header elements ensure zero horizontal overflow.
  - **Standard Mobile (380px–639px):** Adaptive table columns hide non-essential fields (Volume, TVL, Category) to present treasury balances and trade buttons without horizontal panning.
  - **Tablet / iPad (640px–1023px):** Side-by-side terminal layout (`md:grid-cols-12`) placing candlestick chart and order panel simultaneously in view.
  - **Desktop & Ultrawide (1024px–1440px+):** Expanded `max-w-7xl` container giving corporate treasury desks full breathing room.
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
