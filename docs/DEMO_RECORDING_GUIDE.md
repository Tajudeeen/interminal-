# Interminal payment recording guide

For the concise problem, solution, and audience narration, use [the short demo script](DEMO_SCRIPT.md).

Rehearse the simulation first. For the final submission, complete and independently verify a real non-self Arc payment before recording its proof segment.

| Time | Screen | Say |
| --- | --- | --- |
| 0–12s | Home | “A treasury payment should start with what must stay liquid. Interminal protects operating USDC before you review a payment.” |
| 12–28s | Treasury, reserve input | “I set the cash reserve first. Arc uses USDC for payments and gas, so the payment budget has to cover both.” |
| 28–48s | Execute, Use demo recipient, amount, Review simulated payment | “Before confirmation, the operator sees the full recipient, exact amount, maximum network fee, and remaining cash. This walkthrough is a simulation, so no funds move.” |
| 48–62s | Simulate payment, Receipts, Inspect receipt | “The receipt is clearly marked simulated and has no transaction hash. Its integrity digest checks the contents, but doesn't prove a mainnet payment.” |
| 62–90s | Open actual `?payment=0x...` link, Verify payment, Arc Explorer | “This separate payment confirmed on Arc. The verifier reads the actual sender, recipient, amount, block and fee without a wallet. Importing the exported receipt compares those same fields with the chain.” |

If real payment proof isn't ready, do not record the last segment as completed. Show the verifier's empty state and state that real payment evidence is still pending.

Do not advertise USYC swaps, EIP-712 settlement tickets, autonomous execution, source-verified contracts or an on-chain reserve guarantee. The current payment flow uses a normal wallet-confirmed native USDC transfer. Reserve policy is checked in the app. Keys stay in the wallet.
