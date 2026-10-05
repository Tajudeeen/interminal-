# Interminal

A wallet-controlled treasury desk for teams holding USDC on Arc. Operators can set an operating cash buffer, model USYC allocations, review a router quote, sign a bounded trade ticket, and inspect execution receipts.

[Open the app](https://useinterminal.vercel.app/) · [Settlement contract](https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36) · [Security notes](SECURITY.md)

## Choose a workspace

| Workspace | Holdings | Execution |
| --- | --- | --- |
| Demo | Explicit simulated balances | Local simulation and simulated receipts. No wallet transaction. |
| Mainnet | Holdings read from an Arc wallet | Exact approval when needed, EIP-712 signature, settlement transaction, and a separate receipt-anchor transaction. |
| Testnet lab | Arc Testnet wallet | Optional 0.01 native-USDC self-transfer to check wallet, network, submission, and confirmation. It doesn't test the mainnet settlement contract. |

Opening mainnet review doesn't connect a wallet or submit a transaction. Testnet is optional. A generic wallet connection targets mainnet unless the user explicitly opens the testnet lab.

## Operator workflow

1. Open **Treasury** to inspect holdings, liquid USDC, and the USYC position. Set the operating cash buffer and model a disbursement.
2. Review a sweep, unwind, or trade. Mainnet treasury buttons use the same router-backed review as the trade desk.
3. Inspect the input, estimated output, minimum output, slippage, and quote expiry. The wallet may request an exact input-token approval before signing.
4. Sign the EIP-712 trade ticket and submit settlement. The signed raw input and minimum match the reviewed router quote. Expired or changed reviews are blocked.
5. Open **Activity & receipts** to inspect the confirmed transaction and certificate. A separate anchor failure doesn't undo settlement or erase the confirmed receipt. Don't repeat a settled trade to retry its anchor.

The deployed trade path spends liquid USDC. It doesn't automatically unwind a USYC position to fund a buy. Unwind separately and review the next trade after wallet balances refresh.

## Screens

- **Home:** product explanation, interactive capital/buffer scenario, and demo/mainnet entry points.
- **Treasury:** cash policy, modeled yield, USYC position, sweep and unwind review.
- **Trade desk:** chart, sizing controls, quote review, and bounded execution.
- **Markets:** registered Arc routes, clearly labeled reference values, filters, and read-only imported-token metadata.
- **Analysis:** deterministic EMA, RSI, MACD, and support/resistance signals. No remote AI service or autonomous trading agent.
- **Activity & receipts:** session executions, integrity checks, explorer links, and inspectable JSON certificates.
- **Verification:** public RPC, contract fingerprint, and local negative authorization checks.
- **Testnet lab:** optional wallet/network rehearsal.

Desktop uses a persistent sidebar. Mobile includes quick navigation and a full workspace menu, including verification and testnet. Modals trap keyboard focus, restore focus on close, support Escape, and scroll inside the viewport. SVG icons are bundled, so a failed font request can't replace icons with raw text. Views load separately to reduce the initial JavaScript bundle.

## Market data and valuation

Charts never fall back to generated candles in the production data path.

- WETH/USDC, cirBTC/USDC, and EURC/USDC candles use GeckoTerminal Arc pools through the same-origin `/api/market-data` Vercel function.
- USYC uses Hashnote NAV reports and a daily line chart. A NAV reference isn't an executable redemption quote.
- Other supported chart references use Binance public klines and are labeled global references. They aren't Arc liquidity.
- A failed feed shows an unavailable state. A selected feed doesn't make every row in the market directory live.
- Directory reference prices and modeled trade previews aren't executable quotes. Mainnet review fetches a separate Arc router quote.
- Registered token addresses don't guarantee issuer eligibility, a usable pool, or liquidity. Imported tokens remain view-only for live execution.
- The USYC yield reference is 3.225%, dated 2026-10-04. Return estimates exclude fees, price changes, access restrictions, and execution costs. This isn't a guaranteed return.

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

**Live agent mandates remain disabled on the deployed v1 contract.** The hardened successor source isn't a deployed upgrade. DCA/TWAP records are browser-side plans and don't run a background executor. The current product requires explicit user review and wallet signatures.

See [the live contract fingerprint](docs/LIVE_CONTRACT_FINGERPRINT.md), [Arc submission evidence](docs/ARC_MICROGRANT_PROOF.md), and [the rework review](docs/REWORK_REVIEW.md).

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Vite serves the UI on port 5173. Vite alone doesn't run `api/market-data.ts`, so Arc candle requests will show unavailable locally unless the same-origin API is also hosted. The UI handles that state. Deploy the repository on Vercel to run the UI and market-data function together.

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

- This rework doesn't replace or redeploy the v1 settlement contract.
- USYC treasury moves use a router route, not a promise of instant par redemption. Eligibility and liquidity can prevent execution.
- Gas is estimated by the wallet. A fixed sub-cent fee isn't guaranteed.
- Receipts and plans are session state. Export receipts before resetting a workspace or reloading. This isn't a durable accounting system.
- Market valuation can use reference prices and shouldn't be treated as a guaranteed liquidation value.
- No new mainnet transaction was sent to validate this rework. Wallet write paths were checked with mocked regression tests; read-only chain checks and browser flows are reported separately in the review.

Built by [@Deeen_Codes](https://x.com/Deeen_Codes).
