# Security Model

Interminal is a prototype treasury execution desk. It is designed to make important execution constraints explicit and verifiable, not to claim that a smart contract removes all operational or market risk.

## Trust boundaries

### Wallet

The user wallet is the signing authority. Interminal does not store or transmit private keys.

### Browser

The browser may run simulations, calculate quotes, build EIP-712 payloads, and display audit certificates. Simulation state is not treated as blockchain history.

### Settlement contract

The deployed Arc contract is the final authority for live `executeTradeTicket` validation. The live contract enforces:

- Arc chain-specific EIP-712 domain separation.
- Ticket deadline.
- Per-trader nonce equality and increment-before-execution.
- Signature recovery and signer equality.
- Reentrancy protection.
- Pause protection.
- ERC-20 input transfer.
- Router execution with a minimum output bound.
- Receipt-hash state recording.

The maintained reference source is `contracts/InterminalSettlement.sol`. A strict comparison found that its compiled executable runtime does not match the live runtime with recorded settings. These source-level controls must not be presented as source-verified live guarantees. Runtime fingerprinting, domain reads, and actual settlement-event verification are separate evidence.

## What the browser does not guarantee

A displayed quote is not a guarantee that liquidity will remain available until a transaction is mined.

Market data is sourced from external public feeds. Chart data is not itself settlement evidence.

Legacy DCA planning logic is simulation-only and is excluded from the Arc Microgrant submission runtime. The browser walkthrough is also a simulation and never represents mainnet history.

Agent-mandate signing is an authorization artifact in the current application. The live browser does not run an unattended agent. A security review found that deployed v1 `executeAgentTrade` validates the signed pair bitmask but does not bind `execution.tokenIn` and `execution.tokenOut` to the selected pair. If a user gave the v1 settlement contract an ERC-20 allowance and then authorized an agent, that gap could let the agent spend within the budget on an unintended token route. The browser therefore blocks new live agent-mandate signing against v1.

`contracts/InterminalSettlementV2.sol` is the hardened successor. It binds agent input to Arc USDC, maps each authorized pair index to a concrete output token, enforces the mandate slippage ceiling against a fresh router quote, and now rejects invalid pair indexes explicitly. V2 is not deployed on Arc Mainnet yet. Do not treat it as live until a fresh deployment, runtime fingerprint, and independent review are complete.

## Receipt integrity

Execution certificates use canonical JSON and SHA-256. The digest proves integrity of the certificate payload that was hashed. On-chain anchoring proves that the digest was written to the deployed settlement contract. It does not prove that every off-chain data source or business assumption was correct.

## Known risks

- Smart-contract bugs can still cause loss.
- Router and liquidity conditions can change.
- External market-data APIs can be unavailable or stale.
- Wallets may display or reject transactions differently.
- A compromised user wallet can authorize its own transactions.
- App-level cash reserve checks are not enforced by deployed v1 against other clients.
- Device receipt archives can be deleted or modified locally. Verify execution against Arc and export backups.
- A submitted transaction may confirm after a polling timeout. Resolve its hash before retrying.
- The prototype has no institutional key ceremony, multi-signature approval workflow, withdrawal recovery process, or production monitoring/SOC function.

## Verification commands

From the repository root:

`npm ci`
`npm test`
`npm run build`
`npm run test:legacy`
`npm run verify:market`
`npm run verify:arc`

The Arc infrastructure verifier is fail-closed on deployment identity, recorded bytecode fingerprint, and EIP-712 domain mismatches. The separate `npm run verify:source` gate is fail-closed on compiled-source/runtime mismatches and currently fails.

## Responsible disclosure

Please open a private security report through the repository owner before publicly disclosing a security-sensitive issue whenever practical.


## Final submission validation snapshot

The submission-hardening production commit is `14c4175f0d80f21254bcc5248c564533d62820ff`.

On 2026-10-07, GitHub Actions run `269` passed the unit suite, TypeScript/Vite production build, protocol and legacy regressions, GeckoTerminal market-data verification, and Arc mainnet infrastructure verification. Vercel then promoted the same commit to the production alias with deployment state `READY`.

The final UI removes absolute "zero custody", fixed gas-cost, zero price-impact, fixed USYC NAV, autonomous treasury, and source-verified protocol claims. These wording changes are security-relevant because they keep displayed guarantees aligned with the actual trust boundaries described in this document.

The remaining missing proof is not a hidden software check: a real eligible-wallet USDC/USYC settlement still needs to be signed, mined, exported, and independently verified before the project claims end-to-end treasury execution evidence.


## Arc Microgrant submission surface

The public submission path is intentionally smaller than the repository's full experimental history.

The primary runtime exposes reserve policy, reviewed Arc execution, receipts, and wallet-free verification. The disabled v1 agent-mandate interface and DCA planner are not presented in the submission runtime. Read-only market context cannot choose a side, size a position, create a mandate, or pre-fill an execution.

This reduction is deliberate: the grant proof should be judged on the mainnet behavior that is active and defensible today, not on experimental automation that is not safe or necessary for the current use case.
