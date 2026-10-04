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

## Source provenance

The canonical `contracts/InterminalSettlement.sol` source is now the exact Solidity revision used for the live Arc deployment. CI compiles that file with the recorded optimizer settings and fails if the resulting runtime differs from the live contract byte-for-byte.

The repository also preserves `contracts/deployed/InterminalSettlementV1.sol` as an explicitly labelled historical snapshot and `contracts/InterminalSettlementV2.sol` as a future hardened successor. V2 is **not deployed** and is never presented by the app as a live capability.

