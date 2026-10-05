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

The deployed v1 contract isn't changed by this PR. Live agent mandates remain disabled. DCA plans have no autonomous runner. Session receipts aren't persisted across reloads. USYC issuer access and router liquidity are external constraints. A successful browser check doesn't prove a live trade with the user's wallet has executed.
