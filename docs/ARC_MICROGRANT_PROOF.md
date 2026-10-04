# Arc Microgrant Proof

Interminal is presented as a live Arc mainnet proof-of-concept. The important distinction is between simulation features and transactions that actually execute on Arc.

## Live Arc evidence

- Network: Arc Mainnet
- Chain ID: 5042
- RPC: https://rpc.mainnet.arc.io
- Explorer: https://explorer.arc.io
- Settlement contract: https://explorer.arc.io/address/0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36
- Deployment transaction: https://explorer.arc.io/tx/0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404
- Builder: https://x.com/Deeen_Codes
- Repo: https://github.com/Tajudeeen/interminal-

## What is actually live

1. Wallet connection and Arc network detection.
2. Live native USDC and Arc ERC-20 balance reads.
3. Live Arc AMM quote reads.
4. Exact ERC-20 approval for the requested input amount.
5. EIP-712 TradeTicket signing bound to chain 5042 and the deployed settlement contract.
6. executeTradeTicket transaction submission to the deployed settlement contract.
7. Transaction confirmation polling before the UI marks execution as successful.
8. Certificate hash anchoring through anchorReceipt(bytes32).
9. On-chain receipt verification through isReceiptAnchored(bytes32).
10. Balance refresh from Arc after confirmation.

## What is intentionally simulated

The browser demo includes seeded treasury balances, DCA scheduling, gas-tank demonstration controls, and the interactive walkthrough. These are labeled as simulation and never claim to be historical Arc transactions.

The browser does not run an unattended background agent. Agent mandates are authorization artifacts, not a background service. The maintained Solidity source now hardens agent execution with USDC-only spend, concrete pair mapping, spend caps, expiry, nonce protection, and an on-chain slippage ceiling. Those latest source hardenings require a new deployment before they become live on Arc. The Microgrant live path uses signed TradeTickets for confirmed user-triggered settlement.

## Reproducible checks

Run these commands from the repository root:

npm ci
npm test
npm run build
npm run verify:arc

The verify:arc command checks the live Arc chain ID, advancing head block, settlement bytecode, configured Arc infrastructure targets, deployed contract chain ID, and EIP-712 domain separator.

## Receipt integrity model

Audit certificates are canonical JSON objects hashed with SHA-256 over UTF-8 bytes. Mutable presentation fields such as confirmation status and on-chain anchor metadata are excluded from the digest. A verified anchor proves that the certificate digest was committed to the deployed settlement contract.

## Submission framing

Recommended one-line description:

Interminal is a policy-controlled USDC treasury desk for Arc that rebalances idle capital into USYC, executes quoted USDC/USYC treasury flows through a deployed Arc settlement contract, and anchors cryptographic audit receipts on-chain.

The grant submission should link directly to the live deployment and the public repository.

## Evidence matrix

| Claim a reviewer may ask about | Direct proof |
|---|---|
| Live on Arc Mainnet | Settlement contract and deployment transaction above |
| Correct chain | `eth_chainId -> 5042` in `npm run verify:arc` |
| Exact deployed source | CI compiles `contracts/InterminalSettlement.sol` and requires byte-for-byte runtime equality |
| Contract runtime identity | Recorded runtime keccak256 and 8,802-byte size |
| Real trade path | Wallet approval → EIP-712 TradeTicket → Arc transaction → receipt confirmation |
| Receipt provenance | `TradeSettled` event decoded from the confirmed receipt |
| Audit anchoring | `anchorReceipt(bytes32)` followed by `isReceiptAnchored(bytes32)` |
| Policy/replay controls | Live source guards plus local fail-closed regression suite |
| Real market data | GeckoTerminal Arc OHLCV smoke test on CI |
| USYC pricing | Hashnote NAV feed, rendered as daily data |
| Simulation boundaries | UI labels simulation and never invents historical Arc transactions |
| Reproducible build | `npm test`, `npm run build`, `npm run test:legacy`, `npm run verify:market`, `npm run verify:arc` |
| Threat model | [SECURITY.md](../SECURITY.md) |

## 90-second reviewer path

1. Open the live app and choose **Take a Tour**.
2. Load the **$25k JIT Scenario**. The terminal shows the USYC shortfall without pretending a transaction occurred.
3. Open **Proof / Arc RPC** and run the live verification.
4. For a real-wallet proof, connect to Arc Mainnet, approve only the requested ERC-20 amount, sign the EIP-712 ticket, and follow the confirmed transaction to Arc Explorer.
5. Open the receipt and verify the certificate digest plus on-chain anchor.
