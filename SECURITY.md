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

The current canonical source for those deployed capabilities is `contracts/InterminalSettlement.sol`.

## What the browser does not guarantee

A displayed quote is not a guarantee that liquidity will remain available until a transaction is mined.

Market data is sourced from external public feeds. Chart data is not itself settlement evidence.

DCA scheduling and the browser walkthrough are simulations. The browser does not run a background autonomous executor.

Agent-mandate signing is an authorization artifact in the current application. The live browser does not run an unattended agent. The deployed v1 `executeAgentTrade` path has pair-mask, spend, expiry, nonce, and minimum-output checks, but it does not contain the concrete token-to-pair binding and fresh-quote slippage ceiling present in V2. Therefore the browser does not advertise V1 as a production unattended executor, and `contracts/InterminalSettlementV2.sol` is explicitly not deployed.

## Receipt integrity

Execution certificates use canonical JSON and SHA-256. The digest proves integrity of the certificate payload that was hashed. On-chain anchoring proves that the digest was written to the deployed settlement contract. It does not prove that every off-chain data source or business assumption was correct.

## Known risks

- Smart-contract bugs can still cause loss.
- Router and liquidity conditions can change.
- External market-data APIs can be unavailable or stale.
- Wallets may display or reject transactions differently.
- A compromised user wallet can authorize its own transactions.
- The prototype has no institutional key ceremony, multi-signature approval workflow, withdrawal recovery process, or production monitoring/SOC function.

## Verification commands

From the repository root:

`npm ci`
`npm test`
`npm run build`
`npm run test:legacy`
`npm run verify:market`
`npm run verify:arc`

The Arc verifier is intentionally fail-closed on deployment, bytecode, EIP-712, and canonical-source mismatches.

## Responsible disclosure

Please open a private security report through the repository owner before publicly disclosing a security-sensitive issue whenever practical.
