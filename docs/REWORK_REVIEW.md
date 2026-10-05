# Product and execution rework

## Confirmed problems and fixes

| Severity | Problem | Result |
| --- | --- | --- |
| High | Mainnet confirmation showed a modeled quote, then execution fetched different bounds | Router quoting now happens before confirmation; execution signs the reviewed raw input and minimum |
| High | Simulated JIT buys created purchasing power without reducing USYC | Simulations deduct the required USYC at modeled NAV/slippage and reject unfunded input |
| High | Demo unwind treated token units as dollars and could normalize a null wallet address | Unwind uses token units at NAV and the explicit demo trader address |
| High | Confirmed settlement could be labeled failed if a second anchor transaction failed | Confirmed receipt and transaction are retained independently of anchor status |
| Medium | Mode switches retained balances, reviews, receipts, or prior wallet event subscriptions | Workspace transitions clear financial state and detach subscriptions; stale wallet refreshes are guarded |
| Medium | Empty holdings / zero trade size reached a strict positive-amount calculator | Zero-input rendering is safe; invalid execution remains blocked |
| Medium | Imported lookup could remove an existing registry entry from the RPC allowlist | Temporary metadata lookup restores the allowlist's previous state |
| Medium | Font failure rendered icon names as literal text, distorting navigation | All component icons use bundled SVGs |
| Medium | Mobile header overflow and hidden desktop-only tools | Compact header plus full mobile workspace navigation |
| Medium | Stale 4.95% APY, par redemption, fixed fee, and verification claims | Removed or replaced with dated references, route semantics, and explicit status |
| Medium | CSP blocked the app's Hashnote and Binance reads | Exact required data hosts added to the connection policy |
| Low | Fixed market rows appeared to be live; FX filter used the wrong category | Directory labels reference prices and registered routes separately; filters use the actual registry categories |
| Low | Modals lacked focus trapping/restoration | Shared wrapper manages focus, Escape, and body scrolling |
| Low | Every screen and chart library loaded at startup | Workspace views load separately; initial bundle reduced from about 621 KB to about 381 KB before gzip |

## Verification

- Production TypeScript and Vite build passes.
- 40 deterministic tests pass, including raw quote bounds, changed/expired review blocking, duplicate execution blocking, balance conservation, mainnet liquid-USDC requirements, and settlement retention when anchoring fails.
- Chromium desktop checks: landing, mainnet treasury review, and terminal navigation render without page errors.
- Chromium mobile checks at 390 × 844: no horizontal overflow; complete workspace menu; keyboard focus inside dialogs; verification navigation; light theme; zero-input trade render; simulated trade and visible ledger receipt. No page errors recorded.
- GeckoTerminal smoke checks pass for the three configured Arc pools. Arc chain, deployment, runtime fingerprint, ABI, and domain checks pass.
- Read-only Arc `hashTradeTicket` matches the local EIP-712 hash on a targeted retry. The first legacy full-suite run hit an RPC timeout on that check; this isn't reported as a full uninterrupted suite pass.
- No wallet transaction was sent during verification. Live write-path regressions use mocked wallet/RPC responses.

## Remaining product limits

The deployed v1 contract isn't changed by this PR. Live agent mandates remain disabled. DCA plans have no autonomous runner. Receipts now persist in a device archive, with portable exports. Browser storage is not a shared accounting database. USYC issuer access and router liquidity are external constraints. A successful browser check doesn't prove a live trade with the user's wallet has executed.


## Judge-readiness follow-up

- Walkthrough sweeps now use shared NAV conversion and produce an inspectable simulated receipt.
- App-level cash reserves block buys during review and on fresh raw-balance checks before approval and broadcast. Reserve changes invalidate reviewed quotes, and buy presets use spendable cash.
- Live treasury actions use the shared quote/review flow. Unwind review preserves exact requested USYC units.
- Successful execution decoding requires the exact TradeSettled topic and well-formed logs.
- Versioned device archives retain receipt raw amounts and anchor updates. Mainnet workspace restores saved records without restoring wallet authorization.
- Submitted transaction hashes survive reload. Unresolved transactions block new mainnet writes and can be resolved through RPC. Confirmed event recovery creates a labelled receipt without claiming recovery of the original quote or signature.
- Wallet-free verification matches actual transaction status, recipient contract, event, trader, route, raw amounts, block, output, and certificate integrity. Anchor availability is separate from event verification.
- Splash, analysis, yield comparison, and verification status copy no longer imply autonomy, feed attestation, a bank benchmark, or checks that have not run.
- Infrastructure verification now uses the application's fetch transport. A separate strict source comparison revealed a provenance gap: maintained source does not reproduce the live executable runtime with recorded settings. The infrastructure report explicitly flags it; `verify:source` fails until resolved.

No new wallet trade was broadcast during this follow-up. Public USDC/USYC execution evidence remains a builder-signature step, documented in ARC_MICROGRANT_PROOF.md.


### Follow-up validation

- 60 deterministic regressions pass and production TypeScript/Vite build passes.
- Desktop and 390px mobile Chromium checks pass: tour sweep NAV conversion, tour receipt inspection, archive surviving reload, saved mainnet record restoration, invalid transaction rejection, successful mocked settlement-event verification, verification deep links, no horizontal overflow, no error overlays, and no page errors.
- Successful browser settlement evidence used mocked RPC responses and is not a real wallet transaction.
- All three GeckoTerminal pool smoke checks pass.
- Live Arc deployment, runtime fingerprint, ABI/domain, router, USYC target, owner, and unpaused state were checked successfully through the fetch transport.
- Strict compiled-source/runtime reproduction fails and is reported separately. The observed live executable hash differs from the maintained source compilation. No new contract was deployed to bypass this finding.
