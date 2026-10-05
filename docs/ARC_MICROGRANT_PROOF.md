# Arc Microgrant evidence

Interminal is a wallet-controlled USDC treasury prototype on Arc. It helps an operator preserve an app-level cash reserve, review a USYC router trade, and export execution evidence that another person can check without a wallet.

## Public infrastructure

- App: https://useinterminal.vercel.app/
- Repo: https://github.com/Tajudeeen/interminal-
- Builder: https://x.com/Deeen_Codes
- Chain: Arc Mainnet, 5042
- Settlement: https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36
- Deployment: https://explorer.arc.io/tx/0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404

Deployment proves that a contract exists. It does not prove a USYC trade succeeded. The app and CLI distinguish those claims.

## Source provenance status

The stricter comparison found that the maintained source does not reproduce the live executable runtime with recorded settings. Infrastructure identity remains verified separately. See LIVE_CONTRACT_FINGERPRINT.md. Resolve the original source/settings or deploy a reviewed, reproducible successor before claiming verified deployed source.

## Treasury execution evidence status

A new successful USDC/USYC wallet execution has **not** been produced in this engineering pass. The builder must capture one from an eligible wallet before claiming the treasury workflow is demonstrated end to end. Do not present a simulated receipt, unrelated swap, or deployment transaction as that proof.

To complete the evidence:

1. Open the mainnet workspace, connect an eligible Arc wallet, and load its actual holdings.
2. Set the cash reserve. Use a small amount above the reserve that the wallet can afford.
3. Review a USDC/USYC sweep. If eligibility or the router route prevents it, record the failure and do not claim success.
4. Confirm the exact approval, reviewed ticket, and settlement in the wallet.
5. Open the receipt, query execution provenance, and export the certificate. A separate digest anchor may require another wallet transaction.
6. Open the app in a fresh browser without a wallet and import the certificate into Verification. Check the actual trader, token route, raw amounts, block, and digest anchor.
7. Run `npm run verify:execution -- --receipt exported-receipt.json` independently.
8. Include the actual transaction URL and `https://useinterminal.vercel.app/?verify=0xACTUAL_HASH` in the submission. Replace placeholders only with observed data.
9. If claiming unwind capability in the demo video, separately execute and verify a USYC-to-USDC unwind. Review the next trade after holdings refresh.

## Claim and proof matrix

| Claim | What verifies it | Limit |
| --- | --- | --- |
| Contract deployed on Arc | Deployment receipt and runtime fingerprint | Not a trade |
| Source matches live executable code | `npm run verify:source` is the strict comparison | Currently unresolved and failing; do not claim source verification |
| Trade settled | Successful transaction plus exact `TradeSettled` event from the settlement | Must use the actual transaction hash |
| Treasury route worked | Verified event contains USDC and USYC | Other token trades do not satisfy this claim |
| Certificate matches execution | Digest integrity plus route, trader, block, output, and raw amount comparisons | Integrity alone is not provenance |
| Certificate digest anchored | Separate `isReceiptAnchored` query | Any caller can anchor a digest; it does not prove the JSON's business claims |
| Cash reserve protected in this app | Regression tests and fresh raw balance checks before broadcast | Not an on-chain reserve covenant |
| Receipts survive reload | Versioned device archive and exported JSON | No cloud sync or durable institutional ledger |
| Pending transactions recover | Saved hash, status query, and event-based recovery | Original quote/signature cannot be reconstructed from the event alone |
| Public candles | GeckoTerminal smoke checks and selected-feed UI labels | Feed accuracy is not independently attested |
| Demo conserves value | NAV-aware shared sweep logic and financial regression tests | Simulation is not chain history |

## 90-second reviewer path

1. Open the app and try the walkthrough. Sweep once and inspect its clearly simulated receipt.
2. Open the mainnet workspace to see wallet-gated holdings and the stated reserve-protection boundary.
3. Open Verification and paste the builder's actual USDC/USYC transaction hash. No wallet or payment is needed.
4. Import its exported certificate and verify settlement matching separately from anchoring.
5. Download the evidence report or rerun the CLI.

## Submission description

Interminal is a wallet-controlled treasury desk for teams holding USDC on Arc. Operators set a cash reserve, review USYC router trades, sign bounded settlement tickets, and export receipts whose transaction provenance can be checked independently.

## Scope

Mainnet trading requires explicit review and wallet signatures. USYC issuer eligibility and router liquidity are external requirements. The app does not send payroll or wires. Unwind and subsequent trade are separate operations. Live agent mandates remain blocked on deployed v1. DCA is a planner without a background runner. This is an early proof of concept, not an institutional treasury service.
