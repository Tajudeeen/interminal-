# Arc Microgrants submission pack

## Links

- Live app: https://useinterminal.vercel.app/
- Public repository: https://github.com/Tajudeeen/interminal-
- Public builder profile: https://x.com/Deeen_Codes
- Arc Mainnet settlement: https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36

## Short description

Interminal is a reserve-aware USDC treasury proof on Arc Mainnet. An operator keeps an explicit USDC operating reserve, reviews a USDC → USYC router quote, signs a bounded EIP-712 trade ticket, and exports a receipt that anyone can verify against the confirmed Arc transaction without connecting a wallet.

## What Interminal uses Arc for

- Arc Mainnet chain 5042 is the live settlement network.
- USDC is used as Arc's gas asset, so the treasury's dollar-denominated operating asset also pays network fees.
- Interminal reads registered Arc USDC/USYC assets and requests a fresh Arc router quote before live review.
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
- [ ] Add one real successful USDC → USYC mainnet settlement and verification deep link before submitting
- [ ] Builder should confirm the project has not already been funded by a Circle or Arc program

## Submission sentence

A small Arc-native treasury experiment: protect an operating USDC reserve, move only reviewed excess cash into USYC through a bounded wallet-signed settlement, and make the resulting Arc execution independently verifiable.
