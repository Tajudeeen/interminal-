# INTERMINAL — Policy-Controlled Treasury Infrastructure for USDC on Arc

> **Live Deployment:** [https://useinterminal.vercel.app/](https://useinterminal.vercel.app/)  
> **Arc Mainnet (Chain ID: 5042)** · Policy-controlled USDC reserves, USYC treasury rebalancing, quoted JIT liquidity execution, and cryptographic receipt anchoring.

[![Live App](https://img.shields.io/badge/Live%20App-useinterminal.vercel.app-blueviolet?style=flat-square)](https://useinterminal.vercel.app/)
[![Arc Mainnet](https://img.shields.io/badge/Arc%20Mainnet-Chain%205042-00F0FF?style=flat-square)](https://explorer.arc.io)
[![Smart Contract](https://img.shields.io/badge/Settlement%20Contract-0x2b38...ab36-10B981?style=flat-square)](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36)
[![React 19 + TS](https://img.shields.io/badge/Stack-React%2019%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Zustand-blue?style=flat-square)](https://react.dev)
[![Tests Passing](https://img.shields.io/badge/Tests-44%2F44%20Passing-brightgreen?style=flat-square)](test.mjs)
[![X / Twitter](https://img.shields.io/badge/Builder-%40Deeen__Codes-000000?style=flat-square&logo=x)](https://x.com/Deeen_Codes)
[![GitHub](https://img.shields.io/badge/GitHub-Tajudeeen-181717?style=flat-square&logo=github)](https://github.com/Tajudeeen)

---

## Live market data

Interminal does not generate production chart candles.

- **Arc markets:** OHLCV comes from GeckoTerminal's free public API using real Arc DEX pools for WETH/USDC, cirBTC/USDC, and EURC/USDC.
- **USYC:** the chart uses Hashnote's official NAV price reports. USYC is priced once per business day, so it is rendered as a daily NAV series rather than fake intraday candles.
- **Other reference markets:** Binance public klines are labelled as global reference data, not Arc liquidity.
- **Unavailable markets:** the UI shows no-data instead of silently inventing candles.

GeckoTerminal attribution: https://www.geckoterminal.com/arc

The CI pipeline runs a live GeckoTerminal smoke test against the three configured Arc pools on every push. This verifies that the upstream OHLCV endpoints still return usable market data before the Arc verification stage.

### Chart rendering

The terminal chart is rendered with **TradingView Lightweight Charts 5.2.1**. Desktop chart space uses a wider terminal-style proportion rather than a square 1:1 panel. The chart library does not provide market data itself; Interminal feeds it verified OHLCV returned by GeckoTerminal. A same-origin `/api/market-data` Vercel function proxies the GeckoTerminal request so the browser is not calling the public data endpoint directly. Lightweight Charts' built-in attribution logo remains enabled.

### Timeframe switching

The terminal timeframe controls are wired to the live market-data loader. Selecting `1m`, `5m`, `15m`, `1h`, `4h`, or `1D` updates the active timeframe immediately, requests the matching GeckoTerminal aggregation, recomputes indicators from the returned candles, and ignores stale responses when a user switches again before a request completes. USYC remains `1D` because its source is daily NAV reporting rather than intraday OHLCV.

> TradingView Lightweight Charts™  
> Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/

### Arc chart pools

| Market | GeckoTerminal pool | Venue |
|---|---|---|
| ETH/USDC | `0x6f302decb49fb30b2d2c609bdd16e04e7dd096fc` | Aero · Arc |
| BTC/USDC (cirBTC) | `0xd945caee4635bcd7fb8a9fa74dc1d0c4c1472782` | Aero · Arc |
| EURC/USDC | `0xbe080ac37ad1305dfcc9521f5e6f68cfdc41b7fa` | Aero · Arc |

The public GeckoTerminal API is cached for roughly one minute and is limited to 30 requests/minute, so Interminal caches chart responses locally for 45 seconds and refreshes market state no more than necessary.

Timeframe changes are request-scoped: the UI clears the previous series while loading, validates that the API returned the requested timeframe, and ignores stale responses from earlier selections so an older request cannot overwrite the active chart.

---

## Builder

| | |
|---|---|
| **X / Twitter** | [@Deeen_Codes](https://x.com/Deeen_Codes) |
| **GitHub** | [github.com/Tajudeeen](https://github.com/Tajudeeen) |
| **Repo** | [github.com/Tajudeeen/interminal-](https://github.com/Tajudeeen/interminal-) |

---

## What is Interminal?

**Interminal** is policy-controlled treasury infrastructure for USDC-denominated operations on Arc.

In corporate finance, **idle cash drag destroys enterprise value**. Traditional corporate bank accounts forfeit yields to institutional fees, while standard Web3 treasuries leave liquid operating cash sitting idle in non-yielding wallet balances to avoid high gas costs.

Interminal uses Arc for USDC-denominated settlement, low-cost repeated execution, and a verifiable on-chain audit trail:
1. **Operating Cash Reserve:** Maintains a user-configured liquid buffer for immediate expenses and gas.
2. **Policy Sweep Engine:** Detects excess cash above the configured operating buffer and models a USDC → USYC treasury sweep using the current reference rate and live Arc quote path.
3. **Just-In-Time (JIT) Liquidity Bridge:** When an outgoing operation exceeds liquid cash, Interminal calculates the USYC shortfall and can execute a quoted USYC → USDC route on Arc with a bounded minimum output.
4. **Cryptographic Proofs & Arc Settlement:** Executed actions can produce a canonical SHA-256 JSON audit certificate whose digest can be anchored into Arc state through the deployed settlement contract.

---

## What Actually Works on Arc Mainnet?

For a reproducible live-chain identity check, see [`docs/LIVE_CONTRACT_FINGERPRINT.md`](docs/LIVE_CONTRACT_FINGERPRINT.md).

## Live versus simulation

Interminal deliberately separates browser simulation from confirmed Arc execution.

| Capability | Mode | Proof |
|---|---|---|
| Wallet and Arc network detection | Live | EIP-1193 wallet + chain ID 5042 |
| Native USDC and ERC-20 balance reads | Live | Arc public RPC |
| AMM route quotes | Live | Verified Arc router |
| Trade ticket signing | Live | EIP-712 domain bound to chain 5042 and settlement contract |
| Trade settlement | Live | executeTradeTicket + confirmation receipt |
| Audit digest anchoring | Live | anchorReceipt(bytes32) + isReceiptAnchored(bytes32) |
| Seeded treasury, DCA scheduling, walkthrough | Simulation | Explicitly labeled in the UI |

A live action is only marked confirmed after the Arc transaction receipt succeeds. The browser never presents a simulated balance update as a historical blockchain transaction.

## Verification evidence

Interminal is designed so a reviewer can independently verify its important claims without trusting the UI alone.

| Claim | Evidence |
|---|---|
| Live Arc Mainnet deployment | Settlement address + deployment transaction in this README and the Arc Explorer |
| Canonical source matches live bytecode | `npm run verify:arc` compiles `contracts/InterminalSettlement.sol` and fails on any runtime mismatch |
| Deployment provenance | `verify:arc` checks the deployment receipt, contract address, and recorded block |
| EIP-712 execution controls | Live source + ABI expose deadline, trader nonce, signer recovery, pause and reentrancy guards |
| Real settlement | Confirmed `TradeSettled` receipt is decoded before the UI marks the trade successful |
| Audit proof | Receipt SHA-256 digest is anchored and then queried through `isReceiptAnchored(bytes32)` |
| Real market data | `npm run verify:market` checks the configured Arc GeckoTerminal OHLCV feeds |
| Simulation boundary | Simulation transactions have no blockchain hash and are labelled as simulation throughout the UI |
| Security boundaries | [SECURITY.md](SECURITY.md) documents trust assumptions, risks, and non-goals |


| Component | Status on Arc Mainnet | Verification Details |
|---|---|---|
| **Settlement Contract** | **Live on Chain 5042** | [`0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36`](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36) |
| **Deployment Transaction** | **Confirmed Block #23,367,508** | [`0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404`](https://explorer.arc.io/tx/0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404) |
| **Receipt Anchoring** | **Live & Callable** | `anchorReceipt(bytes32)` anchors trade & reasoning certificates on-chain |
| **Wallet Connection** | **Live EIP-1193** | Detects Arc Mainnet (`5042`), queries live native USDC and ERC-20 balances |
| **EIP-712 TradeTicket Verification** | **Active Protocol** | On-chain signature verification with fail-closed replay nonces and deadlines |
| **Dual-USDC accounting** | **Active application model** | Separates native 18-decimal Arc gas USDC from 6-decimal operational ERC-20 USDC |

---

## What to Try (3-Step Reviewer Guide)

### Option A: 3-Minute Simulation Tour (No Wallet or Gas Required)
1. Open the live deployment: [https://useinterminal.vercel.app/](https://useinterminal.vercel.app/)
2. Click **"Take a Tour"** on the landing page or in the navigation bar.
3. Walk through the 3 core pillars using the pre-seeded simulation state:
   - **Step 1:** Simulate the USDC → USYC yield sweep above the operating buffer.
   - **Step 2:** Open the $25,000 JIT scenario and inspect the calculated USYC shortfall. No transaction is broadcast.
   - **Step 3:** Inspect the cryptographic JSON certificate and SHA-256 integrity proof.

### Option B: Live Arc Mainnet Execution (With MetaMask / Rabby)
1. Connect your wallet to **Arc Mainnet (Chain ID: 5042)**.
2. The Treasury Cockpit will instantly switch to **"LIVE ARC MAINNET CONNECTED"** mode, querying your real on-chain native USDC and token balances via Arc's public RPC.
3. Open the **Corporate Ledger** or any trade certificate, and click **"Anchor to Arc Settlement"**. Your wallet will prompt an `anchorReceipt(bytes32)` transaction to contract `0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36`. Once confirmed, click the link to view the live block and transaction on the [Arc Explorer](https://explorer.arc.io).

*Note on Gas:* Arc uses native USDC for gas. The app's ~$0.0012 figure is an estimate, not a fixed network fee. Simulation mode requires no wallet or gas.

---

## Architecture

```text
                           INTERMINAL
                                │
          ┌─────────────────────┴─────────────────────┐
          │                                           │
    Treasury Cockpit                             AI Analyst
  (Reserves · NAV · Sweeps)                 (Deterministic Oracles)
          │                                           │
          └─────────────────────┬─────────────────────┘
                                │
                         Policy Engine
                 (Spend Caps · Slippage · Whitelist)
                                │
                         Execution Layer
                   (Zero-Custody EIP-712 TradeTickets)
                                │
                           Arc Mainnet
                     (Chain ID: 5042 · USDC)
                                │
          ┌─────────────────────┴─────────────────────┐
          ▼                                           ▼
 Interminal Settlement                       Immutable Receipt Anchor
 (0x2b38...ab36 · AMM Router)                (anchorReceipt(bytes32))
```

---

## Why Arc? (Arc Network Superpowers)

Interminal is purpose-built to exploit Arc's unique L1 architectural capabilities:

* **Low-cost USDC gas:** The UI uses ~$0.0012 USDC as an application-level gas estimate. Actual transaction cost depends on gas used and network conditions.
* **USDC as Native Gas Token:** Gas is priced directly in USDC (18 decimals), eliminating foreign token friction for corporate accounting departments.
* **Dual-Scale USDC Accounting:** Separates native 18-decimal Arc gas USDC from 6-decimal operational ERC-20 USDC.
* **Fast deterministic settlement:** Supports rapid treasury rebalancing and repeated USDC-denominated execution on Arc. Exact execution remains subject to the selected route and transaction confirmation.

---

## Arc Mainnet Smart Contract Protocol

Interminal settles on-chain via [`contracts/InterminalSettlement.sol`](contracts/InterminalSettlement.sol):

| Parameter | Value |
|---|---|
| **Settlement Contract** | [`0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36`](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36) |
| **Deployment Tx** | [`0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404`](https://explorer.arc.io/tx/0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404) |
| **Network** | Arc Mainnet (`chainId: 5042` / `0x13b2`) |
| **Public RPC** | `https://rpc.mainnet.arc.io` |
| **Compiler** | Solidity `v0.8.28` (200 optimizer runs, 8,802 bytes bytecode) |
| **Arc AMM Router** | `0x52FE40c00530db2e43d01652f903870571A14AFD` (Uniswap V2 Router on Arc) |
| **Deployer** | `0x541291139b59570d1cd5d0e64df217b3f6efd7c8` |
| **Deployment Block** | `23,367,508` |

### Core Functions:
* `executeTradeTicket(...)`: Validates EIP-712 `TradeTicket` signatures and routes token swaps with strict slippage limits.
* `executeAgentTrade(...)`: Present in the deployed v1 contract with signed-agent authorization, nonce, expiry, cumulative-spend, per-transaction, pair-mask, and minimum-output checks. This is **not the primary live browser execution path** and is not presented as a fully unattended production agent. The hardened successor is preserved separately as `contracts/InterminalSettlementV2.sol` and is not deployed.
* `anchorReceipt(bytes32 receiptHash)`: Stores receipt hashes permanently on-chain.
* `isReceiptAnchored(bytes32)`: Read-only verification query for external auditors and compliance officers.

---

## Verified Arc Token Registry

| Asset | Address | Decimals | Role |
|---|---|---|---|
| **USDC (Native)** | Native gas | 18 | Arc L1 gas token |
| **USDC (ERC-20)** | `0x3600000000000000000000000000000000000000` | 6 | Operational liquidity & settlement |
| **USYC** | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 | Hashnote Tokenized US Treasuries (3.225% net-yield reference as of 2026-10-04) |
| **EURC** | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 | Circle Euro Stablecoin |
| **WETH** | `0x128cC466B61f542da60c70e3aA11c10e19B84EDB` | 18 | Wrapped Ether on Arc |
| **cirBTC** | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 | Arc Bridged Bitcoin |

---

## Automated Verification & Testing

Interminal includes **44 automated tests** across dual test suites:

### 1. Vitest Unit & TypeScript Test Suite (16 Tests)
```bash
npm test
```
*Verifies TypeScript module exports, quote calculators, JIT liquidity formulas, SHA-256 canonical hashing, and EIP-712 typed data hashing.*

### 2. Protocol & Fail-Closed Gate Test Suite (28 Tests)
```bash
npm run test:legacy
```
*Verifies live Arc Mainnet RPC connectivity (`eth_chainId: 5042`), on-chain settlement contract bytecode, opportunity cost derivations, carry trade spread calculations, and all 14 fail-closed security gates.*

---

## Quickstart (Local Development)

```bash
git clone https://github.com/Tajudeeen/interminal-.git
cd interminal-
npm install
npm run dev
```

Open `http://localhost:5173` to launch the workspace.

### Production Build
```bash
npm run build
npm run verify:arc
```
Typechecks the repository with `tsc` and bundles optimized production assets into `dist/`.

---

## Program Eligibility

* **Built independently for Arc Mainnet.**
* **No prior funding:** This project has received zero funding from any Circle or Arc grant program.
* **Open Source:** MIT License.
