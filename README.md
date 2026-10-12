# Interminal

Interminal protects operating USDC before a treasury payment. Set an app-level cash reserve, review the recipient, exact payment and maximum network fee, confirm one native USDC transaction in your wallet, then export evidence anyone can independently check against Arc Mainnet.

[Open Interminal](https://useinterminal.vercel.app/) · [Public repository](https://github.com/Tajudeeen/interminal-) · [Builder](https://x.com/Deeen_Codes) · [Submission pack](docs/ARC_MICROGRANT_SUBMISSION.md) · [Recording guide](docs/DEMO_RECORDING_GUIDE.md)

## Current submission scope

**Treasury → Execute → Receipts → Verify** is a reserve-protected USDC payment flow on Arc Mainnet, chain 5042. It uses Arc's native USDC balance, with 18-decimal transaction values and user input limited to exact six-decimal USDC amounts. Payment and gas draw from the same balance. No approval, custom settlement contract, agent mandate or USYC entitlement is required.

| Workspace | Balance | What confirmation does |
| --- | --- | --- |
| Simulation | Clearly labeled fictional balances | Creates a simulated receipt. No wallet request or transaction hash. |
| Mainnet | Connected Arc wallet | Requests one reviewed native USDC payment to a wallet address. |
| Optional USYC reference/demo | Issuer NAV and historical demo | Live swaps disabled. No claimed USYC execution. |

The historical settlement contract exists on Arc, but its maintained source doesn't reproduce its live runtime. It is not used by the current payment flow. The old AchSwap V2 route has no USDC/USYC pair. On October 12, direct quote requests reverted and the factory returned no pair. Chart pools are Aero concentrated-liquidity pools, not evidence that the historical V2 route can trade. This release disables live legacy swaps at both review and broadcast boundaries.

## Payment controls

1. Set the operating reserve in Treasury. It is saved per connected wallet on this device.
2. In Execute, enter the full recipient wallet address and an exact USDC amount.
3. Review loads the actual native balance, checks chain 5042 and a wallet recipient, and estimates gas and a bounded gas price.
4. `payment + maximum estimated fee + reserve <= live balance` must pass. Review expires after two minutes.
5. Before requesting the wallet transaction, the app checks account, chain, provider, reserve, expiry, transaction simulation and actual balance again.
6. The wallet displays the full transaction. The app requests the exact reviewed recipient, native value, gas limit and gas price.
7. A durable pending record is written before the wallet request. If its response is interrupted, additional mainnet payments stay blocked until the user recovers the transaction hash from wallet activity.
8. A receipt is saved only after the actual transaction and successful Arc receipt match the reviewed sender, recipient and value.

Reserve protection is enforced by this app. The wallet can modify a request, and external transactions can change balances. It is not an on-chain policy guarantee. Wallet recipients only are supported. Contract recipients need their own reviewed integration. Self-transfers are labeled and excluded from final submission proof.

## Independent evidence

Open Verify without a wallet. Enter a payment transaction hash or import an exported mainnet payment receipt. Verification requires:

- Arc RPC and transaction chain 5042;
- successful transaction receipt;
- exact transaction and receipt identity and execution block;
- matching sender and recipient;
- positive native USDC value with empty calldata;
- wallet recipient at execution;
- actual gas and effective gas price;
- for imported receipts, SHA-256 integrity and exact matching payment fields.

A receipt digest alone does not prove payment. Simulation receipts are rejected as mainnet proof. A hash-only verification reconstructs chain evidence and cannot recover or prove the original app-side reserve review. Reviewer links use `?payment=0xACTUAL_TRANSACTION_HASH` and skip the splash screen.

```sh
npm run verify:payment -- 0xACTUAL_TRANSACTION_HASH
npm run verify:payment -- --receipt private-evidence/payment.json
npm run proof:payment -- --receipt private-evidence/payment.json
npm run check:submission
```

The proof command refuses simulation, a reverted transaction, wrong chain, mismatching receipt and self-transfer. On success it writes `artifacts/payment-submission-evidence.json` and `docs/FINAL_MAINNET_EVIDENCE.md`, with actual transaction values and a wallet-free reviewer link. Never substitute the historical contract deployment transaction for payment proof.

`check:submission` independently re-queries committed payment evidence. It fails when the artifact is missing. CI has a separate `submission-ready` job so green software checks cannot imply mainnet proof exists. `check:release` additionally requires HEAD to match public main and the live HTML to match the locally built release.

**Current evidence status:** payment code and verification pipeline are prepared. No real payment has been made by the coding agent, and no final payment artifact exists until the builder confirms a payment in their wallet and exports its receipt.

## Development

Node.js 22 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:legacy
npm run verify:arc
```

The deterministic suite covers exact USDC precision, fee-inclusive reserve boundaries, wallet/account/chain changes, expiry, submission ambiguity, receipt tampering, wrong transaction fields, failed execution, simulated evidence rejection, and recovery.

Vite serves the UI. Its development server does not run the production `/api/market-data` serverless function. Production Vercel serves the UI and read-only market API together. USYC NAV is reference context from Hashnote. Arc chart candles are read through GeckoTerminal. Failed feeds show unavailable data and don't block the payment flow. No AI chooses a payment, recipient or amount.

## Storage and security

Wallet keys stay in the user's wallet. No key or seed phrase is needed to use this app. Payment receipts and pending state are stored on this device. Export receipts for a portable backup. Device storage must accept a durable pending record before a mainnet payment is requested. Clearing storage removes recovery state and receipts, so inspect wallet activity before repeating an interrupted payment.

The historical `contracts/` and `legacy/` files remain for provenance. `verify:source` still fails for the old deployment, and its hardened successor is undeployed. These contracts are not part of current payment settlement and aren't claimed as audited or source-verified. Old swap receipts can still be checked in the historical verifier under Verify. See [historical contract status](docs/LIVE_CONTRACT_FINGERPRINT.md).

## Grant fit

Interminal is a small Arc-native treasury-control experiment: protect operating USDC, account for payment gas in the same asset, require an explicit wallet confirmation, and make the actual payment independently verifiable. The builder must still confirm that this project hasn't already received Circle or Arc funding and include one observed successful non-self payment before claiming end-to-end execution.
