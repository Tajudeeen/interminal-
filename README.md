# INTERMINAL — Autonomous Corporate Treasury & Liquidity Desk for Arc

> **Arc Hackathon Submission** · Autonomous corporate cash management, 4.95% USYC Treasury sweeps, and just-in-time liquidity orchestration built natively for **Arc Mainnet (Chain ID: 5042)**.

[![Arc Mainnet](https://img.shields.io/badge/Arc%20Mainnet-Chain%205042-00F0FF?style=flat-square)](https://explorer.arc.io)
[![Smart Contract](https://img.shields.io/badge/Settlement%20Contract-0x2b38...ab36-10B981?style=flat-square)](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36)
[![React 18 + TS](https://img.shields.io/badge/Stack-React%2018%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Zustand-blue?style=flat-square)](https://react.dev)
[![Tests Passing](https://img.shields.io/badge/Tests-41%2F41%20Passing-brightgreen?style=flat-square)](test.mjs)

---

## Executive Overview

**Interminal** is the on-chain Brex / Mercury workstation for digital-native enterprises, venture-backed startups, DAOs, and protocol treasuries operating on Arc.

In corporate finance, **idle cash drag destroys enterprise value**. Traditional corporate bank accounts forfeit yields to institutional fees, while standard Web3 treasuries leave liquid operating cash sitting idle in non-yielding wallet balances to avoid high gas costs.

Interminal solves this on Arc by leveraging Arc's sub-cent gas fees and deterministic finality to build an **autonomous capital flow pipeline**:
1. Maintains a strict, configurable **Operating Cash Buffer** (e.g. $5,000 liquid USDC) for gas, payroll, and vendor payments.
2. Automatically detects idle cash drag above the buffer and sweeps excess funds into **Hashnote USYC** (tokenized short-duration US Treasury bills yielding **~4.95% APY**).
3. If an outgoing vendor invoice, wire, or trade exceeds liquid cash, the **Just-In-Time (JIT) Liquidity Bridge** automatically unwinds USYC back into liquid USDC at 1:1 par with zero capital drag.
4. Every single transaction generates a canonical **SHA-256 JSON-LD Audit Certificate** anchored directly into Arc blockchain state (`anchorReceipt(bytes32)`).

```
[ Liquid Inflow ]
       │
       ▼
┌─────────────────────────────────┐
│   Operating Cash Buffer ($5k)   │ ──(Immediate Disbursements & Gas)
└─────────────────────────────────┘
       │ (Excess Idle Cash)
       ▼
┌─────────────────────────────────┐
│  Yield Sweep Engine (4.95% USYC)│ ──(Continuous Daily Compounding)
└─────────────────────────────────┘
       │ (Liquidity Deficit on Outgoing Order)
       ▼
┌─────────────────────────────────┐
│ JIT Par Redemption Bridge ($1.00)│ ──(Zero-Drag Instant Unwind)
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Arc Mainnet Settlement (5042)   │ ──(Zero-Custody EIP-712 + SHA-256 Receipts)
└─────────────────────────────────┘
```

---

## 3-Minute Hackathon Judge Showcase Tour

To allow judges to evaluate the full institutional protocol in under 3 minutes, Interminal features an interactive **1-Click Judge Showcase Tour**:

* **How to Launch:** Click the glowing **"Start Arc Judge Showcase Tour"** banner on the Landing page or the **"Judge Tour (3 min)"** button in the Desktop Sidebar.
* **Pre-Seeded State:** Pre-loaded with an institutional portfolio ($250,000 NAV: $15,000 liquid USDC, $185,000 USYC T-Bills, $25,000 EURC, 6.5 ETH, 0.35 cirBTC) and 3 verified audit certificates.

### The 3 Core Pillars Demonstrated in the Tour:

1. **Pillar 1: Continuous Cash Optimization & 4.95% USYC Yield Sweep**
   * Sets a $5,000 operational reserve for gas and daily wires.
   * Instantly detects **$10,000 USDC** in idle cash drag.
   * With 1 click, sweeps the excess capital into USYC T-Bills, accruing +$495.00/yr in passive yield without manual intervention.

2. **Pillar 2: Just-In-Time (JIT) Liquidity Bridge & Par Redemption**
   * Simulates an outgoing trade or disbursement of **$25,000**.
   * The JIT engine detects a liquidity shortfall ($25k required vs. $5k liquid USDC).
   * Automatically unwinds the exact deficit ($20,000) from USYC T-Bills at par ($1.00) with 0 bps drag, executing the transaction seamlessly.

3. **Pillar 3: Zero-Custody EIP-712 Mandates & Arc Settlement**
   * Inspects the generated canonical JSON-LD audit certificate.
   * Verifies the 64-character SHA-256 digest against Arc blockchain state.
   * Confirms zero key custody: funds move only under cryptographically signed typed permits bound to Chain ID 5042 and the verified Arc settlement contract.

---

## Why Arc? (Arc Network Superpowers)

Interminal is purpose-built to exploit Arc's unique L1 architectural capabilities:

* **Sub-Cent Gas (< $0.0012 USDC):** Frequent micro-sweeps and continuous rebalancing are economically impossible on Ethereum L1 ($15–$60 per sweep) and costly on standard L2s. On Arc, sweeping $500 costs less than a tenth of a cent, unlocking true continuous cash management.
* **USDC as Native Gas Token:** Gas is priced directly in USDC (18 decimals), eliminating foreign token friction for corporate accounting departments.
* **Dual-Scale Accounting & Gas Tank:** Bridges native 18-decimal gas USDC and 6-decimal operational ERC-20 USDC seamlessly via the integrated Gas Tank runway controller.
* **Deterministic Sub-Second Finality:** Enables instant JIT par redemption of T-Bills at time of execution with zero latency or re-org risk.

---

## Key Institutional Features

### 1. Autonomous Treasury Cockpit & NAV Monitor
* **Real-Time NAV Calculation:** Total balance aggregation across native gas, ERC-20 USDC, USYC T-Bills, EURC, WETH, and cirBTC.
* **Interactive Capital Flow Architecture:** Visualizes the live capital movement across Operating Buffer, Yield Sweep, JIT Redemption, and Arc Settlement.
* **Opportunity Cost Estimator:** Real-time calculation of potential yield forfeited to traditional banking fees vs. active Arc USYC compounding.

### 2. Institutional FX Corridor (EURC/USDC)
* **Dedicated Corporate Cross-Border Pricing:** Micro-pip quotes (1 pip = 0.0001) for international payroll and European vendor settlement.
* **Central Bank Carry Differential:** Tracks Fed (5.25%) vs. ECB (3.50%) divergence (+175 bps carry advantage), giving corporate CFOs interest-rate parity transparency.

### 3. Bounded Agentic Mandates (EIP-712 Scoped Delegation)
* Grants automated agents or treasury officers scoped execution permits without exposing private keys.
* On-chain cryptographic enforcement of spend budgets, maximum transaction sizes, slippage bands, pair allowlists, and expiry timestamps.

### 4. Tamper-Evident SHA-256 Audit Certificates & On-Chain Anchoring
* Produces canonical JSON-LD trade receipts adhering to corporate compliance standards.
* Deterministic SHA-256 digest calculation (`sha256Hex(canonicalString)`) guarantees tamper detection.
* Verified anchor on Arc Mainnet: `anchorReceipt(bytes32)` anchors the receipt hash directly into blockchain state.

### 5. AI Quant Analyst (Grounded in Deterministic Math)
* Built-in AI market analysis powered by strict mathematical indicator pipelines (EMA 20/50/200, RSI 14, MACD Histogram, and 30-bar Swing Pivots).
* **Zero hallucinations:** The AI never invents prices or levels; it interprets the deterministic calculations produced by the math engine.

### 6. Arc Gas Tank & Runway Controller
* Real-time transaction runway projection based on current native gas balance and historical transaction consumption (~0.0012 USDC/tx).
* 1-Click refuel presets (+0.10, +0.25, +1.00 USDC) converting operational liquidity into gas runway.

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
| **Block Height** | `23,367,508` |

### Core Contract Capabilities:
* `executeTradeTicket(...)`: Validates EIP-712 `TradeTicket` signatures and routes token swaps with slippage limits.
* `executeAgentTrade(...)`: Verifies `AgentMandate` signatures, checks spending limits and expiration, and executes trades on behalf of the corporate treasury.
* `anchorReceipt(bytes32 receiptHash)`: Stores receipt hashes permanently on-chain.
* `isReceiptAnchored(bytes32)`: Read-only verification query for external auditors and compliance officers.

---

## Verified Arc Token Registry

| Asset | Address | Decimals | Role |
|---|---|---|---|
| **USDC (Native)** | Native gas | 18 | Arc L1 gas token |
| **USDC (ERC-20)** | `0x3600000000000000000000000000000000000000` | 6 | Operational liquidity & settlement |
| **USYC** | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 | Hashnote Tokenized US Treasuries (~4.95% APY) |
| **EURC** | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 | Circle Euro Stablecoin |
| **WETH** | `0x128cC466B61f542da60c70e3aA11c10e19B84EDB` | 18 | Wrapped Ether on Arc |
| **cirBTC** | `0x171A4217b86A807A64eB94757Db6849fb4bDbAA0` | 8 | Arc Bridged Bitcoin |

---

## 14 Fail-Closed Security Gates

Interminal enforces 14 deterministic security gates that fail closed before any transaction or permit can be generated:

1. **Chain Gate:** Chain ID must strictly equal `5042`; refuses execution on any other network.
2. **Address Gate:** Hex validation (`0x` + 40 characters) enforced on all counterparties.
3. **Public RPC Allowlist:** Only benign read methods (`eth_chainId`, `eth_blockNumber`, `eth_getBalance`, `eth_call`, `eth_getCode`, `eth_getTransactionReceipt`) permitted.
4. **eth_call Allowlist:** Queries restricted strictly to verified Arc tokens and settlement contract functions.
5. **Quote Boundary Gate:** Trade parameters must be positive, finite numbers; slippage restricted between 1 and 500 bps.
6. **Ticket Domain Gate:** EIP-712 domain strictly bound to Arc Mainnet (5042) and verified settlement protocol.
7. **Treasury Safety Gate:** Exact mathematical calculation of JIT par redemptions prevents over-unwinding or liquidity starvation.
8. **FX Carry Gate:** EURC/USDC quotes map to pip spreads and interest rate differentials.
9. **Mandate Permit Gate:** Scoped EIP-712 permits enforce strict budget, slippage, pair allowlists, and expiration bounds.
10. **Audit Receipt Integrity Gate:** Tamper-evident canonical JSON-LD hashing fails verification if a single byte is altered.
11. **On-Chain State Anchoring Gate:** Audit receipts anchor directly into Arc blockchain state via `anchorReceipt(bytes32)`.
12. **Signature Malleability Gate:** EIP-2 `s`-value upper-bound check in `recoverSigner` prevents signature replay malleability.
13. **Safe Approval Gate:** ERC-20 allowances reset to 0 before setting swap amounts.
14. **Precision Decimal Gate:** Exact `parseUnits` decimal scaling prevents floating-point precision loss across 6, 8, and 18-decimal assets.

---

## Tech Stack & Architecture

* **Frontend Framework:** React 18 + TypeScript (Strict Mode)
* **Build System:** Vite 8 + LightningCSS / PostCSS
* **State Management:** Zustand (reactive, decoupled store)
* **Styling & Design System:** Tailwind CSS with high-contrast institutional palette, glassmorphism modal wrappers, and CSS View Transitions.
* **Component Library:** Real, fully typed React UI components (`Button`, `Modal`, `Logo`, `Toast`) with zero AI-generated button styling.
* **Icons:** Google Material Symbols (strictly **zero unicode emojis** across the repository).
* **Testing:** Vitest + Node Test Runner (41 tests passing).

### Project Structure

```
interminal/
├── contracts/               # Solidity smart contracts
│   └── InterminalSettlement.sol  # On-chain settlement & receipt anchor
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, Header, BottomNav, JudgeTourBar, SplashScreen
│   │   ├── modals/          # Glassmorphic modals (Review, Gas, Mandate, Receipt, Search)
│   │   ├── treasury/        # CapitalFlowDiagram pipeline visualizer
│   │   ├── ui/              # Button, Logo, Input primitives
│   │   └── views/           # TreasuryCockpit, TerminalTrade, Markets, AI, Ledger, Proof
│   ├── constants/           # Arc network parameters, verified tokens, market pairs
│   ├── lib/
│   │   ├── arc/             # RPC client, wallet connection, on-chain portfolio loader
│   │   ├── crypto/          # EIP-712 ticket builders, SHA-256 canonical hasher
│   │   └── math/            # Treasury calculations, indicators, quotes
│   ├── store/               # Zustand application store (useAppStore.ts)
│   ├── test/                # Vitest TypeScript module unit tests
│   ├── types/               # TypeScript interfaces (market, trade, receipt, mandate)
│   ├── App.tsx              # Root component & view router
│   ├── main.tsx             # React entrypoint
│   └── index.css            # Institutional theme variables & glassmorphism utilities
├── test.mjs                 # 28-suite protocol & fail-closed verification harness
├── test-dom.mjs             # DOM simulation test suite
└── README.md                # Institutional documentation
```

---

## Quickstart & Verification

### Prerequisites
* Node.js v18+
* npm or pnpm

### 1. Installation
```bash
git clone https://github.com/Tajudeeen/interminal-.git
cd interminal-
npm install
```

### 2. Development Server
```bash
npm run dev
```
Open `http://localhost:5173` to access the terminal.

### 3. Production Build
```bash
npm run build
```
Typechecks the entire repository with `tsc --noEmit` and bundles optimized production assets via Vite into `dist/`.

### 4. Running the Test Suites

**Unit & TypeScript Tests (Vitest):**
```bash
npm test
```
*Executes 13 unit tests verifying TypeScript exports, math engines, SHA-256 hashing, and EIP-712 ticket builders.*

**Protocol & Fail-Closed Gate Tests:**
```bash
npm run test:legacy
```
*Executes 28 automated tests verifying Arc Mainnet RPC (5042), deployed contract bytecode, JIT unwinds, carry trade metrics, and all 14 fail-closed security gates.*

---

## License

MIT License. Built for the Arc Hackathon.
