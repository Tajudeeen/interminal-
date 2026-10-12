# Arc Microgrants submission pack

- Live app: https://tajudeeen.github.io/interminal-/
- Public repo: https://github.com/Tajudeeen/interminal-
- Builder: https://x.com/Deeen_Codes
- Network: Arc Mainnet, chain 5042

## Description

Interminal is a reserve-protected USDC payment workspace on Arc Mainnet. A treasury operator keeps operating cash liquid, reviews the full recipient address, exact payment and maximum network fee, confirms one native USDC transfer in their wallet, and exports a receipt that anyone can independently compare with Arc transaction evidence.

## Why Arc

USDC is both the payment asset and the native gas asset on Arc. Interminal includes payment and gas in one cash-reserve check. The wallet-free verifier reads the actual Arc transaction and receipt, including recipient, sender, native value, block and fee. No custom settlement deployment or USYC entitlement is required for the payment flow.

## Reviewer path

1. Try the clearly labeled simulation. Set a reserve, review a payment to the demo recipient, and create a simulated receipt.
2. Open the mainnet workspace and inspect the live payment controls.
3. Once final evidence exists, open its permanent `?payment=0xACTUAL_HASH` link without connecting a wallet.
4. Compare the transaction with Arc Explorer and independently run `npm run verify:payment -- 0xACTUAL_HASH`.
5. Import the exported receipt to compare its integrity and exact payment fields.

## Final builder actions

- [ ] Confirm one real non-self USDC payment in the builder's own wallet, to a wallet they control or an intended recipient.
- [ ] Export its receipt and generate the final public proof bundle.
- [ ] Independently reverify with `npm run check:submission`.
- [ ] Commit actual evidence and confirm the final deployed commit with `npm run check:release`.
- [ ] Confirm this project has not already received Circle or Arc funding.
- [ ] Record the short demo and submit the live app, repo, description and builder profile.

A contract deployment, simulation or self-transfer is not the final payment proof. USYC and historical swap tools are optional context. Live legacy swaps are disabled and aren't submitted as working execution.
