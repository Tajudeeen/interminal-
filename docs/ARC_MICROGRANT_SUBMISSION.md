# Arc Microgrants submission pack

## Links

- Live app: https://useinterminal.vercel.app/
- Public repository: https://github.com/Tajudeeen/interminal-
- Public builder profile: https://x.com/Deeen_Codes
- Arc Mainnet settlement: https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36

## Short description

Interminal is a reserve-aware treasury execution layer on Arc Mainnet. An operator protects operating USDC first, reviews only policy-eligible capital, signs explicit EIP-712 execution bounds, and exports a receipt that anyone can independently verify against the confirmed Arc transaction. USYC is the current demonstration asset.

## What Interminal uses Arc for

- Arc Mainnet chain 5042 is the live settlement network.
- USDC is used as Arc's gas asset, so the treasury's dollar-denominated operating asset also pays network fees.
- Interminal calculates the amount of USDC that is eligible after the protected reserve, then requests a fresh Arc router quote before live review.
- The wallet signs an EIP-712 trade ticket that is submitted to the deployed Arc settlement contract.
- The verifier checks the actual Arc transaction and exact `TradeSettled` event, including route, trader, raw amounts, block, and output.

## What the reviewer should do

1. Open the live app and read the Arc-specific problem statement.
2. Try the clearly labeled demo if desired.
3. Open the mainnet workflow: **Treasury → Execute → Receipts → Verify**.
4. Inspect the deployed settlement on Arc Explorer.
5. After the real USDC/USYC proof transaction is recorded, open the permanent `?verify=0xTRANSACTION_HASH` link without connecting a wallet.
6. Compare the app verification with the Arc Explorer transaction and, if desired, run `npm run verify:execution -- 0xTRANSACTION_HASH`.

## Scope choices

This submission is intentionally not presented as a full trading platform.

- Markets and deterministic indicator context are optional read-only tools.
- Testnet is an optional wallet rehearsal, not submission evidence.
- Live agent mandates are disabled on deployed v1 and their UI is excluded from the submission runtime.
- Browser DCA/TWAP planning is excluded from the submission runtime.
- No remote AI service makes trading decisions.
- Every live mainnet write requires explicit wallet review/signature.

## Host eligibility self-check

- [x] Live public application
- [x] Public repository
- [x] Public builder profile
- [x] Arc Mainnet contract/infrastructure
- [x] Mainnet is the primary product path, not testnet
- [x] Short Arc-specific project description
- [x] Fail-closed code pipeline for generating and continuously re-verifying the final proof bundle
- [ ] Add one real successful USDC → USYC mainnet settlement and verification deep link before submitting
- [ ] Builder should confirm the project has not already been funded by a Circle or Arc program

## Final proof automation

After the real transaction confirms, export its mainnet receipt locally and run:

```sh
npm run verify:execution -- --receipt private-evidence/receipt.json
npm run proof:submission -- --receipt private-evidence/receipt.json
npm run verify:submission
npm run verify:treasury-history
```

The generator refuses simulations, wrong routes, mismatching certificates, the wrong chain, or a changed live settlement fingerprint. On success it creates the public machine-readable `artifacts/submission-evidence.json` and reviewer-facing `docs/FINAL_MAINNET_EVIDENCE.md`. The original receipt stays in the gitignored `private-evidence/` directory. Once the public artifact is committed, CI re-queries Arc with `npm run verify:submission` on every build.

See [PROVABLE_SUBMISSION_WORKFLOW.md](PROVABLE_SUBMISSION_WORKFLOW.md).

## Submission sentence

A small Arc-native execution-control experiment: protect operating USDC first, move only policy-eligible capital through explicit wallet-signed bounds, and make the resulting settlement independently verifiable. USYC is the current demonstration route.


## Why this is not another USYC yield app

The novelty claim is not access to USYC or treasury yield. Existing Arc products already cover that category.

Interminal focuses on the layer around the move:
- reserve policy before execution;
- human review before signing;
- explicit input/output bounds;
- Arc-native settlement;
- independently reconstructable execution evidence.

The reviewer should judge that control-and-proof loop, not a projected return.
