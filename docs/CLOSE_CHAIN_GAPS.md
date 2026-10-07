# Closing the remaining on-chain evidence gaps

## Current result

The final application hardening is merged and deployed. Production commit `14c4175f0d80f21254bcc5248c564533d62820ff` passed GitHub Actions run `269` and is live on the production Vercel alias.

Two chain-evidence limits remain distinct from application readiness:

1. strict source reproduction for the deployed v1 contract remains unresolved;
2. a real USDC/USYC treasury settlement still needs to be executed and independently verified.

The original source/build settings could not be recovered. Solidity metadata records solc 0.8.28 and IPFS CID `QmcAp1N3MSR6cqDGYxiq6exa1y6KHdmHnF5smUBNUiGUom`; attempted metadata gateways did not return the document. Repository history and tested compiler variations did not reproduce executable runtime. The live address remains unchanged and `npm run verify:source` must still fail.

A complete read-only Arc RPC scan found zero `TradeSettled` events from settlement deployment block 23,367,508 through block 24,448,374. `artifacts/treasury-history.json` records the bounded observation. Rerun `npm run verify:treasury-history` to check a newer head. Any discovered transaction must separately pass `verify:execution`; log discovery alone is not a receipt certificate.

## Reproducible successor package

Run `npm ci` followed by `npm run prepare:deployment`. No signing key is needed to prepare it. This compiles the existing hardened V2 candidate and writes:

- `artifacts/InterminalSettlementV2.json`: exact compiler version, complete standard JSON input, source hash, compiler metadata, ABI, creation bytecode and full runtime hash.
- `artifacts/successor-unsigned-transaction.json`: unsigned contract creation data on chain 5042, zero value. Wallet chooses sender, nonce and fees after estimation.

Preparation is deterministic. Compilation no longer carries an old deployment address into a new artifact or regenerates the archived browser deployment file. Tests reject altered source hashes, compiler version and creation/runtime bytes.

The V2 candidate has not undergone a new full EVM adversarial review in this pass. Reproducibility tests establish build identity, not contract correctness. Live agent execution remains disabled.

## Wallet actions still required

For the current Arc Microgrants submission, do **not** deploy V2 merely to make the documentation look cleaner. The current wallet-controlled v1 path is intentionally bounded in the browser, and live agent mandates are disabled.

The smallest remaining submission action is to execute and verify one real USDC-to-USYC treasury trade from an eligible wallet using the current production application. That produces the missing judge-facing proof without introducing a new settlement address immediately before submission.

A later successor deployment can close the source-reproduction gap:

1. Review the V2 source and deployment package. Use an Arc wallet with enough native USDC for gas. Never paste a private key into chat, commit it, or put it in command arguments.
2. Deploy the unsigned package from a wallet. Alternatively, with `PRIVATE_KEY` securely injected in the local process environment, `npm run deploy` validates the fresh build, estimates gas, broadcasts and records the pending hash before waiting. It fails unless the full runtime, initial owner, pause state and EIP-712 domain match. It does not modify the live app address.
3. If deploying through a wallet, create `artifacts/successor-deployment.json` with `chainId: 5042`, the real `transactionHash`, `deployer`, and the `sourceSha256` and `expectedRuntimeKeccak256` from the V2 artifact. Run `npm run verify:deployment`. This also resumes verification after interrupted CLI deployment. It checks actual creation input, receipt, full runtime, chain, deployer and domain before marking the record verified.
4. After verification, update the app settlement address, all verifier deployment constants and deployment evidence together. Keep historical receipts tied to their original settlement address; the current verifier is tied to the current address. Recheck ticket signing/domain, proof lookup and UI on the successor before promoting it.
5. Connect an eligible wallet, review and execute a small USDC-to-USYC treasury trade through the updated app. Approval, ticket signature and settlement require wallet confirmation. Record the actual failure if issuer eligibility or router liquidity prevents execution.
6. Export its receipt, verify it from a fresh wallet-free session and run `npm run verify:execution -- --receipt receipt.json`. Publish the real transaction URL and verification deep link. Verify a separate unwind if claiming that direction.

These gaps close only after observed successful transactions and strict verification. Prepared bytecode, a deployment transaction, a simulated receipt or an unsigned trade does not satisfy the treasury execution claim.


## Submission priority

For the current submission, priority is:

1. keep production on the tested commit;
2. execute one small eligible-wallet USDC-to-USYC settlement;
3. export and independently verify its receipt;
4. publish the real transaction URL and `?verify=0x...` deep link;
5. update README and `ARC_MICROGRANT_PROOF.md` with observed evidence.

The V2 successor is follow-up hardening, not a prerequisite for demonstrating the present wallet-controlled treasury workflow.
