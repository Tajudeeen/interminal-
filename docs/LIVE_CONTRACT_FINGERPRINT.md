# Live Arc Contract Fingerprint

This page records the immutable identity of the Interminal settlement contract currently referenced by the live application.

- Network: Arc Mainnet
- Chain ID: 5042
- Settlement: 0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36
- Deployment transaction: 0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404
- Observed live runtime size: 8,802 bytes
- Live runtime keccak256: 0x0f8491da3d30f0441520308dfb21175d9272f81b5f3bb6bca60347ebbd2fcac8

## What the verifier proves

`npm run verify:arc` checks:

1. Arc mainnet chain ID is 5042.
2. Arc is producing blocks.
3. The settlement address has non-empty bytecode.
4. The live runtime matches the recorded keccak256 fingerprint above.
5. The deployed contract reports chain ID 5042.
6. The deployed EIP-712 domain separator matches Interminal, version 1, chain 5042, and the settlement address.
7. The configured Arc router, USDC interface, and USYC addresses resolve.

## Source provenance status: unresolved

A strict executable-runtime comparison during the judge-readiness pass found that `contracts/InterminalSettlement.sol`, compiled with solc 0.8.28 and the recorded optimizer settings, does **not** reproduce the deployed executable runtime. The previous claim that CI proved source-to-chain equality was incorrect. Prior checks compared local source with the local artifact and checked the live fingerprint independently.

Observed live executable-runtime keccak256, after removing Solidity metadata:
`0x6f866206a102a9424e5a352116113c80f9f29e3bd8da97cb28398a631b58bdbb`

The full live runtime fingerprint and deployment identity remain independently checkable. They do not establish that the maintained source is the deployed source.

`npm run verify:arc` reports infrastructure checks and explicitly reports this provenance gap. `npm run verify:source` is a separate strict gate and fails until the original source/build settings reproduce the live executable code, or a reviewed successor is deployed and its source/runtime evidence is updated.

The repository preserves `contracts/deployed/InterminalSettlementV1.sol` as a historical repository snapshot, not verified deployed source. `contracts/InterminalSettlementV2.sol` remains an undeployed hardened successor. Do not present either as verified live source.
