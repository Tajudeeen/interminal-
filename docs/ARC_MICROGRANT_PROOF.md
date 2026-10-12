# Current Arc payment proof status

The current submitted flow is reserve-protected native USDC payments, not the historical USYC swap route.

- Mainnet: chain 5042.
- App: https://useinterminal.vercel.app/
- Proof type: successful plain native USDC payment to a wallet recipient.
- Contract dependency: none for payment settlement.
- Receipt verifier: shared browser/CLI logic in `src/lib/payments/core.mjs`.
- Final artifact: `artifacts/payment-submission-evidence.json`.

No real payment was sent by the coding agent. The final artifact must be generated from the builder's observed confirmed non-self payment. `npm run check:submission` fails until that proof exists and passes independent Arc verification.

The verifier checks transaction and receipt identity, chain, success, sender, recipient, native value, calldata, execution block, recipient code at execution, gas and actual fee. Imported receipts additionally require integrity and exact field matching. App-side reserve policy is not proved by a chain receipt.

The old settlement deployment and fingerprint remain historical infrastructure evidence. Strict source reproduction is unresolved and is not claimed. The payment flow does not use that contract. The historical V2 route has no verified USDC/USYC pool and live execution is disabled.
