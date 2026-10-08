# Provable Arc Microgrant submission workflow

This workflow separates software readiness from observed mainnet evidence. It is intentionally fail-closed: a simulation, testnet transaction, unrelated token trade, deployment transaction, digest anchor, or mismatching receipt cannot become submission proof.

## What is already code-verifiable

The repository can independently check:

- Arc Mainnet chain ID `5042`;
- the deployed Interminal settlement address and deployment transaction;
- the live runtime fingerprint;
- the EIP-712 domain;
- a successful settlement transaction sent to the configured contract;
- exactly one `TradeSettled` event;
- the event trader, token route, block, raw input and raw output;
- whether the route is specifically USDC ↔ USYC;
- whether an exported mainnet certificate matches that exact event;
- whether the certificate digest is separately anchored.

Strict source reproduction of deployed v1 remains unresolved and is not represented as passing evidence.

## One action that code cannot manufacture

A real eligible wallet must complete one small USDC → USYC execution through the production mainnet workflow. That wallet action produces the transaction hash and exported mainnet receipt used by the commands below.

Do not place a private key, seed phrase, or raw wallet credential in this repository.

## After the real transaction confirms

Export the confirmed receipt from Interminal and save it locally:

```text
private-evidence/receipt.json
```

The `private-evidence/` directory is gitignored because an exported receipt can contain a wallet signature. The public evidence bundle generated below does not publish that signature.

Run:

```sh
npm ci
npm run verify:execution -- --receipt private-evidence/receipt.json
npm run proof:submission -- --receipt private-evidence/receipt.json
npm run verify:submission
npm run verify:treasury-history
```

## What `proof:submission` requires

Generation stops with a non-zero exit code unless all of these are true:

1. the receipt is a confirmed `mainnet` receipt;
2. the transaction succeeded on Arc Mainnet;
3. the transaction targets the configured Interminal settlement contract;
4. exactly one `TradeSettled` event is present;
5. the route contains the registered Arc USDC and USYC addresses;
6. the event amounts are positive;
7. the trader, route, block, execution receipt hash and exact raw amounts match the exported certificate;
8. the certificate integrity digest is valid;
9. the live settlement bytecode still matches the recorded runtime fingerprint;
10. the recorded deployment transaction still resolves to the configured settlement address.

## Generated public evidence

On success, the command writes:

- `artifacts/submission-evidence.json`
- `docs/FINAL_MAINNET_EVIDENCE.md`

The JSON bundle contains only the facts needed for public verification: transaction identity, event fields, certificate digest, SHA-256 of the local receipt file, public links, deployment identity and proof claims. It intentionally does not embed the original wallet signature.

The Markdown file contains the copy-ready reviewer evidence, including:

- Arc Explorer transaction link;
- permanent `?verify=0x...` wallet-free link;
- chain, block and settlement;
- exact token addresses and raw amounts;
- `TradeSettled` receipt hash;
- certificate match result;
- reproducible verification commands.

## Continuous verification

Once `artifacts/submission-evidence.json` is committed, GitHub Actions runs:

```sh
npm run verify:submission
```

That command re-queries Arc and fails if the committed transaction, event data, settlement contract, deployment identity or live runtime fingerprint no longer matches the evidence artifact.

The original receipt can be rechecked locally at any time with:

```sh
npm run verify:execution -- --receipt private-evidence/receipt.json
```

## Readiness check

Run:

```sh
npm run check:submission
```

Before a real evidence artifact exists, the command deliberately exits non-zero and identifies `real-treasury-proof` as the blocker. Once the generated artifact is committed and valid, it becomes a compact machine-readable readiness check.

## Claim boundary

A successful deployment transaction proves a contract exists. It does not prove the treasury workflow executed.

A receipt digest anchor proves a digest was stored. It does not prove the business claims inside a receipt.

For this submission, execution proof is:

```text
successful Arc settlement transaction
→ exact TradeSettled event
→ registered USDC/USYC route
→ exact event amounts
→ matching exported mainnet certificate
→ independently repeatable verifier
```

That is the evidence chain Interminal should present to reviewers.
