# Provable payment submission workflow

The current workflow supersedes the historical swap proof pipeline.

1. Complete one real non-self native USDC payment from the current application on Arc Mainnet.
2. Export its confirmed payment receipt into the gitignored `private-evidence/payment.json` file.
3. Run `npm run verify:payment -- --receipt private-evidence/payment.json`.
4. Run `npm run proof:payment -- --receipt private-evidence/payment.json`.
5. Run `npm run check:submission`. This re-queries the observed evidence.
6. Commit the generated `artifacts/payment-submission-evidence.json` and `docs/FINAL_MAINNET_EVIDENCE.md`.
7. After final deployment, run `npm run build` and `npm run check:release` to compare public main and production HTML.

The generator rejects simulations, self-transfers, mismatching receipts, failed transactions, wrong chain, calldata and contract recipients. No transaction is invented. CI's separate `submission-ready` job fails until real evidence exists.

Reserve policy is app-side. Chain evidence proves a successful payment, not the original reserve review. Wallet confirmation belongs to the builder. No private key or seed phrase is needed in the project or chat.
