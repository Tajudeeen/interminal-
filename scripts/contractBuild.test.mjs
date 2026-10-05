import { expect, test } from 'vitest';
import { buildContract, validateBuild } from './contractBuild.mjs';
const path = new URL('../contracts/InterminalSettlementV2.sol', import.meta.url);
test('deployment build is reproducible and never inherits live address metadata', () => {
  const first = buildContract(path);
  expect(buildContract(path)).toEqual(first);
  expect(first.deployedAddress).toBeUndefined();
  expect(first.deploymentTx).toBeUndefined();
  expect(validateBuild(first, path).runtimeKeccak256).toBe(first.runtimeKeccak256);
}, 20000);
test('deployment gate rejects stale source and altered creation/runtime bytes', () => {
  const first = buildContract(path);
  for (const key of ['sourceSha256', 'bytecode', 'deployedBytecode', 'compilerVersion']) {
    expect(() => validateBuild({ ...first, [key]: 'altered' }, path)).toThrow();
  }
}, 20000);
