# Remaining wallet evidence step

Interminal's current mainnet path is reserve-protected native USDC payments. It doesn't use the historical settlement contract or unsupported V2 USYC route.

## Complete proof

1. Open https://tajudeeen.github.io/interminal-/ and choose the mainnet workspace.
2. Connect your own Arc wallet. Keep enough USDC for your chosen payment, the protected reserve and gas.
3. Set the reserve in Treasury. Review a payment to a second wallet you control or an intended recipient. Use an amount you intend to send. Self-transfers are excluded from submission evidence.
4. Check the full address, exact amount and fee in Interminal and again in your wallet. Confirm only the reviewed payment.
5. Wait for confirmation. Open Receipts and export the mainnet payment JSON.
6. Save it locally as `private-evidence/payment.json`, then run:

```sh
npm run verify:payment -- --receipt private-evidence/payment.json
npm run proof:payment -- --receipt private-evidence/payment.json
npm run check:submission
```

7. Commit the generated public evidence and `docs/FINAL_MAINNET_EVIDENCE.md`. The file contains no key or wallet signature.
8. Build the final commit and run `npm run check:release` after deployment. Open the permanent wallet-free reviewer link in a fresh browser.

If the wallet response is interrupted, don't send again. Use Check submitted payment and provide the transaction hash from wallet activity. Payment creation stays blocked until it is resolved.

## Historical source gap

`verify:source` still fails for the old custom settlement. It is not used by the current payment flow. Recovering or replacing it is future contract work and must not be advertised as done. Prepared successor bytecode is not a deployment. Historical receipts remain tied to their original contract.
