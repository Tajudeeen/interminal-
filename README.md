# Interminal

Interminal is a reserve-aware USDC treasury proof on Arc Mainnet. An operator keeps an explicit USDC operating reserve, reviews a USDC → USYC router quote, signs a bounded EIP-712 trade ticket, and exports a receipt that another person can verify against Arc without connecting a wallet.

[Open the app](https://useinterminal.vercel.app/) · [Settlement contract](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36) · [Builder profile](https://x.com/Deeen_Codes) · [Submission pack](docs/ARC_MICROGRANT_SUBMISSION.md) · [Security notes](SECURITY.md)

## Arc Microgrant fit

The submission is intentionally scoped as a working Arc-native proof, not a broad trading platform.

| Host expectation | Interminal evidence |
| --- | --- |
| Live deployment on Arc mainnet | Production app points to Arc Mainnet chain `5042` and the deployed settlement contract below |
| Public repository | This repository is public and contains the application, contract references, verification scripts, tests, and evidence docs |
| Short explanation of what Arc is used for | Arc provides USDC-denominated gas, the live settlement layer, registered USDC/USYC assets, and the transaction/event history used by the verifier |
| Public builder profile | [@Deeen_Codes](https://x.com/Deeen_Codes) |
| Not testnet-only | Mainnet is the primary workflow; testnet is an optional developer rehearsal and is never presented as submission proof |

The core reviewer path is **Treasury → Execute → Receipts → Verify**. Markets, read-only indicator context, and testnet rehearsal are secondary tools.

## Choose a workspace

| Workspace | Holdings | Execution |
| --- | --- | --- |
| Demo | Explicit simulated balances | Local simulation and simulated receipts. No wallet transaction. |
| Mainnet | Holdings read from an Arc wallet | Exact approval when needed, EIP-712 signature, settlement transaction, and a separate receipt-anchor transaction. |
| Optional testnet rehearsal | Arc Testnet wallet | Wallet/network check only. It is not part of the grant proof and doesn't test the mainnet settlement contract. |

Opening mainnet review doesn't connect a wallet or submit a transaction. Testnet is optional. A generic wallet connection targets mainnet unless the user explicitly opens the testnet lab.

## Operator workflow

1. Open **Treasury** and set the USDC operating reserve.
2. Open **Execute** and review a USDC → USYC Arc router quote, including exact input, minimum output, slippage, and expiry.
3. Sign the bounded EIP-712 ticket and submit settlement. An exact token approval may be requested first.
4. Open **Receipts** to inspect/export the confirmed execution evidence.
5. Open **Verify** from a fresh wallet-free session and check the transaction, exact `TradeSettled` event, trader, route, raw amounts, block, output, and certificate integrity.

Buy reviews preserve your configured cash reserve. The app checks raw USDC balances before approval and again immediately before broadcast. Percentage sizing excludes the reserve. Changing the reserve invalidates an open review. This protection applies to this app; the deployed v1 contract cannot enforce the reserve against other apps or direct contract calls.

The deployed trade path spends liquid USDC. It doesn't automatically unwind a USYC position to fund a buy. Unwind separately and review the next trade after wallet balances refresh.

## Screens

### Core submission path

- **Home:** states the Arc mainnet use case, links the live contract/repo/builder profile, and offers a clearly marked simulation.
- **Treasury:** reserve policy, real wallet holdings in mainnet mode, USYC position, sweep/unwind review, and deployed Arc infrastructure references.
- **Execute:** chart/reference context plus the fresh Arc router quote, bounded review, explicit wallet signing, and settlement submission.
- **Receipts:** confirmed execution records, pending-transaction recovery, explorer links, JSON export, and independent evidence entry point.
- **Verify:** wallet-free transaction/event/certificate verification and live Arc infrastructure reads.

### Optional lab

- **Arc routes:** only registered Arc assets and treasury routes are foregrounded.
- **Market context:** read-only deterministic indicators. It cannot choose a trade side, size a position, create an agent mandate, or pre-fill an execution.
- **Testnet rehearsal:** optional wallet/network check. It is not submission evidence.

Desktop and mobile both prioritize the four-step mainnet proof path. Experimental agent-mandate and DCA planner UI is excluded from the submission runtime.

## Market data and valuation

Charts never fall back to generated candles in the production data path.

- WETH/USDC, cirBTC/USDC, and EURC/USDC candles use GeckoTerminal Arc pools through the same-origin `/api/market-data` serverless endpoint.
- USYC uses Hashnote NAV reports and a daily line chart. A NAV reference isn't an executable redemption quote.
- A failed feed shows an unavailable state. A selected feed doesn't make every row in the market directory live.
- Directory reference prices and modeled trade previews aren't executable quotes. Mainnet review fetches a separate Arc router quote.
- Registered token addresses don't guarantee issuer eligibility, a usable pool, or liquidity. The submission route directory foregrounds registered Arc assets only.
- The USYC net-yield reference is 3.225%, checked against the issuer product data on 2026-10-07. Return estimates exclude fees, price changes, access restrictions, and execution costs. This isn't a guaranteed return.

TradingView Lightweight Charts provides rendering, not market data. Attribution remains enabled. The CSP permits the specific read-only feed hosts used by the app, including Hashnote and Binance.

## Contract and execution

| Setting | Value |
| --- | --- |
| Arc mainnet chain | `5042` |
| Settlement | `0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36` |
| Router | `0x52FE40c00530db2e43d01652f903870571A14AFD` |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000` |
| Native gas decimals | `18` |
| USDC token-interface decimals | `6` |

The registry is in `src/constants/arc.ts`. Exact approvals are restricted to the verified settlement spender and registered token addresses. Mainnet execution requires a loaded wallet on the expected chain. Switching modes clears financial session state and detaches prior wallet subscriptions.

**Live agent mandates remain disabled on the deployed v1 contract.** The hardened successor source isn't a deployed upgrade. Experimental agent-mandate and DCA planner interfaces are excluded from the current submission runtime. The submitted product requires explicit user review and wallet signatures.

## Verify execution independently

Open **Verification**, paste a settlement transaction hash, and run the read-only check. Or import an exported mainnet receipt. The verifier requires a successful transaction to the configured contract and its exact `TradeSettled` event, then compares trader, route, block, received output, and raw amounts where present. Certificate anchoring is reported separately. A digest anchor alone is never sufficient proof of execution.

A verified transaction without a certificate can rebuild an event-based receipt. Recovered receipts explicitly state that the original quote and wallet signature were not recovered. An unresolved broadcast blocks new mainnet executions until its chain status is checked in Activity. A reverted transaction can be resolved without claiming settlement.

Share a wallet-free reviewer link with `?verify=0xTRANSACTION_HASH` or run:

```sh
npm run verify:execution -- 0xTRANSACTION_HASH
npm run verify:execution -- --receipt exported-receipt.json
```

The CLI verifies the event independently with ethers and requires exact raw amounts for certificate matching. Old receipts missing raw amounts can still be inspected in the app; regenerate event evidence from their transaction for current CLI checks.

See [the live contract fingerprint](docs/LIVE_CONTRACT_FINGERPRINT.md), [Arc submission evidence](docs/ARC_MICROGRANT_PROOF.md), [the rework review](docs/REWORK_REVIEW.md), and [the remaining chain-evidence steps](docs/CLOSE_CHAIN_GAPS.md).

## Submission readiness

The previous final-hardening baseline passed the full CI and production deployment checks. This host-alignment pass narrows the public product around the Arc-native proof path and removes non-core automation/advisory UI from the submission experience. One material proof item still remains before submission: execute one small successful USDC-to-USYC settlement from an eligible Arc mainnet wallet, export its receipt, verify it independently, and replace the documented transaction placeholder with the observed hash and permanent `?verify=0x...` reviewer link.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Vite serves the UI on port 5173. Vite alone doesn't run the production serverless market-data endpoint, so Arc candle requests will show unavailable locally unless the same-origin API is also hosted. The UI handles that state. The repository is designed so the production host serves the UI and `/api/market-data` together.

No private key is needed to build, browse, or run the demo. Wallet keys stay in the user's wallet. Contract deployment uses `PRIVATE_KEY` from the process environment through `scripts/deploy.mjs`. Never pass a private key in command arguments or commit it.

```sh
npm test
npm run build
npm run test:legacy
npm run verify:market
npm run verify:arc
```

`npm test` runs deterministic TypeScript, UI wiring, security, and financial-execution regressions. The legacy suite and verification scripts also query live services, so RPC/provider availability can fail those checks independently of local code.

## Current limits

- This rework doesn't replace or redeploy the v1 settlement contract. Its full runtime fingerprint is recorded, but strict compiled-source reproduction is unresolved. `npm run verify:source` fails until the actual source/build settings or a reproducible successor deployment resolve it.
- USYC treasury moves use a router route, not a promise of instant par redemption. Eligibility and liquidity can prevent execution.
- Gas is estimated by the wallet. A fixed sub-cent fee isn't guaranteed.
- Receipts and unresolved submitted transaction hashes are saved in versioned device storage. Mainnet receipts reopen in the mainnet workspace. Export JSON for portable backups. The archive retains up to 200 certificates, and wallet-specific reserve settings are saved locally. Clearing browser storage removes the archive. This is not a shared accounting database.
- Market valuation can use reference prices and shouldn't be treated as a guaranteed liquidation value.
- No new mainnet transaction was sent to validate this rework. The submission still needs a successful USDC/USYC execution from an eligible wallet. Wallet write paths were checked with mocked regression tests; read-only chain checks and browser flows are reported separately in the review.

Built by [@Deeen_Codes](https://x.com/Deeen_Codes).

### Reproducible successor deployment

`npm run prepare:deployment` creates the hardened successor artifact and an unsigned deployment transaction without a key. `npm run deploy` uses a securely provided environment key and refuses to accept altered builds or a mismatching on-chain runtime. `npm run verify:deployment` independently checks the creation transaction and full runtime and can resume an interrupted deployment. None of these commands changes the live app address. See [the remaining chain steps](docs/CLOSE_CHAIN_GAPS.md). `npm run verify:treasury-history` checks the complete settlement event history in bounded RPC ranges.
