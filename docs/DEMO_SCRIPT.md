# Interminal short demo script

About 60 seconds. Read the three paragraphs below while showing Treasury, Execute, and Receipts / Verify.

A wallet can tell you how much USDC you have, but a business also needs to know how much it can safely spend. Money needed for payroll, bills, and daily operations should stay available. On Arc, network fees also come from that same USDC balance, so the full cost matters before you send.

I built Interminal to bring that check into the payment flow. You set an operating reserve, enter a recipient and amount, and review the maximum network fee and remaining balance. The app blocks payments that would dip into your reserve, and you confirm the transaction in your own wallet. For a confirmed payment, you can export a receipt and verify the transaction against Arc without connecting a wallet.

It's built for small teams, founders, and treasury operators who use USDC to pay people and cover business expenses. They can check what they can afford before sending, then share evidence of what actually settled.

## Recording accuracy

Reserve protection is enforced inside Interminal, not on-chain or across other wallet apps. Label simulated payments as simulation. The repository currently has no committed builder payment proof, so don't claim that your own real payment has already been demonstrated. Only show a completed mainnet payment after confirming it and independently verifying its receipt.
