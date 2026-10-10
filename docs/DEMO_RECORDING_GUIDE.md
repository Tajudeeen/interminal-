# Interminal recording guide

## Current recording status

The software walkthrough is ready to rehearse. A complete mainnet execution demo still needs a real USDC-to-USYC settlement from an eligible wallet and its exported receipt.

The complete read-only event scan on 10 October 2026 covered deployment block 23,367,508 through block 25,268,582 and found no `TradeSettled` events. See `artifacts/treasury-history.json`. Do not present the simulation as a completed mainnet transaction.

## Prepare your screen

1. Open https://useinterminal.vercel.app/ on desktop, ideally at 1920×1080 or 1440×900 with browser zoom at 100%.
2. Wait for the short splash and the USYC reference feed to finish. The chart is reference NAV, not a router quote.
3. Click **90-second reviewer path**. This resets the simulation to 10,000 USDC, 2,500 USYC, a 2,500 USDC reserve, a 500 USDC proposed buy, and 0.5% slippage. Starting the walkthrough again clears the current demo receipts. Export anything you want to keep first.
4. Do one rehearsal before recording. Keep the **SIMULATION** label visible. Demo review quotes last five minutes so you have time to explain them. Live router quotes still last sixty seconds.
5. For a clean recording without the floating tour, close the tour after starting it. Navigate with **Treasury → Execute → Receipts → Verify**. Starting the tour again restores its first step and the same balances.

## Ninety-second software walkthrough

| Time | Screen and pointer | What to say |
| --- | --- | --- |
| 0–12s | Home headline, then click **90-second reviewer path** | “A treasury can move money on-chain and still leave its operator asking two questions: how much cash must stay liquid, and what can someone else verify afterward? I built Interminal around those questions.” |
| 12–28s | Treasury, point at **Liquid Cash**, **Target Operating Cash Buffer**, and **Policy-Eligible USDC**. Change the reserve to $5,000, then back to $2,500. | “The reserve comes first. With ten thousand USDC and a twenty-five hundred reserve, only seventy-five hundred can enter a buy review. Raising the reserve reduces the reviewable amount.” |
| 28–47s | Tour **2. Review**, then **Open simulated review**. Point at **You Pay**, **Minimum output**, slippage, and expiry. | “For this walkthrough I’m reviewing a five hundred USDC move into USYC. The operator sees the input and output bounds before confirming. In mainnet mode, a fresh Arc router quote and explicit wallet signatures control execution.” |
| 47–64s | Click **Simulate & Generate Certificate**, then tour **3. Receipts** and **Inspect latest receipt**. Point at **SIMULATION · SIMULATED** and the SHA-256 status. | “This is a simulation, so no funds move and no wallet signs. It produces an inspectable JSON receipt with an integrity digest. That digest can detect changed contents, but it cannot prove a mainnet trade.” |
| 64–82s | Close the certificate. Tour **4. Verify**, then **Finish walkthrough**. Point at live chain, bytecode, domain results, and transaction input. | “The verification page queries Arc without a wallet. For an actual execution it checks the transaction and exact TradeSettled event, including the route, trader, amounts, and block. An exported mainnet receipt can then be matched to that event.” |
| 82–90s | Stay on Verify, pointer at transaction input. | “The product is the control and evidence loop: protect operating cash, review explicit bounds, and independently verify the settlement.” |

If you use the sidebar rather than the tour, click **Execute**, keep USYC/USDC selected, choose $500, and click the simulated review button. Click **Receipts**, then **Inspect** on the resulting row.

## Mainnet proof needed for the final submission video

Complete this outside the recording first, in your own wallet. Never provide wallet keys or a seed phrase to the app or repository.

1. Click **Open mainnet workspace** and connect an eligible Arc Mainnet wallet. Check chain 5042 and the holdings shown.
2. Set your operating reserve. Choose a small USDC amount you intend to spend, below policy-eligible cash, with additional USDC for network fees. Do not use the maximum balance for this proof.
3. Review the USDC → USYC move. If issuer eligibility, the quote, liquidity, or simulation blocks the trade, stop and resolve the stated cause. A registered token address does not establish eligibility.
4. Review any exact approval, EIP-712 signature, and settlement transaction in your wallet. Receipt anchoring is a separate optional transaction. Reject anything that differs from your reviewed route and amounts.
5. Wait for confirmation. In **Receipts**, click **Inspect**, verify on-chain, and export the mainnet receipt JSON.
6. Open a fresh browser session. In **Verify**, enter the confirmed settlement hash, then import the mainnet receipt and run **Verify settlement** again. The transaction, event, USDC/USYC route, and certificate must pass.
7. Copy the verification link and compare it with the Arc Explorer transaction. The hash-only reviewer link proves the event. Importing the original receipt separately proves its certificate match.

After saving the receipt into the gitignored `private-evidence/receipt.json`, run:

```sh
npm run verify:execution -- --receipt private-evidence/receipt.json
npm run proof:submission -- --receipt private-evidence/receipt.json
npm run verify:submission
npm run check:submission
```

Commit the generated signature-free `artifacts/submission-evidence.json` and `docs/FINAL_MAINNET_EVIDENCE.md`. Keep the original receipt private. See [PROVABLE_SUBMISSION_WORKFLOW.md](PROVABLE_SUBMISSION_WORKFLOW.md).

## Replace the last segment after mainnet proof exists

Keep the first sixty seconds as an explicitly labeled software walkthrough, then show the real mainnet receipt, actual transaction on Arc Explorer, and fresh wallet-free verification page. Say:

“This separate mainnet execution settled on Arc. These are the actual event amounts and block. From a fresh session, the verifier reads the settlement independently and matches the exported receipt. The simulation explained the controls. This transaction proves the live execution.”

Show actual values from your result. Do not read a placeholder hash or reuse the deployment transaction as execution proof.

## Claim limits

- Reserve protection is checked by this app. The deployed v1 contract does not enforce your cash reserve against direct calls or other apps, and network fees still consume USDC.
- USYC eligibility and router liquidity can prevent execution. Published NAV is reference information, not a redemption promise.
- The deployed contract exists and its runtime fingerprint and EIP-712 domain are verifiable. Its original compiler input is still unresolved, so do not call its source reproducible or its code audited.
- Agent mandates, autonomous execution, and DCA are excluded from the submission runtime. Do not advertise them in the video.
- Local receipt integrity, infrastructure checks, mainnet execution, and certificate matching are separate evidence claims. Keep that distinction visible.
- Confirm that the project has not already received Circle or Arc funding before submitting.
