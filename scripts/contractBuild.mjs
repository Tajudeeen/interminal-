import fs from 'node:fs';
import solc from 'solc';
import { ethers } from 'ethers';

export function buildContract(sourcePath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const input = {
    language: 'Solidity',
    sources: { 'InterminalSettlement.sol': { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 }, evmVersion: 'cancun', viaIR: false,
      metadata: { bytecodeHash: 'ipfs', appendCBOR: true },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object', 'metadata'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter(e => e.severity === 'error');
  if (errors.length) throw new Error(errors.map(e => e.formattedMessage).join('\n'));
  const contract = output.contracts['InterminalSettlement.sol'].InterminalSettlement;
  const bytecode = '0x' + contract.evm.bytecode.object;
  const deployedBytecode = '0x' + contract.evm.deployedBytecode.object;
  return {
    contractName: 'InterminalSettlement', network: 'arc-mainnet', chainId: 5042,
    compilerVersion: solc.version(), sourceSha256: ethers.sha256(ethers.toUtf8Bytes(source)),
    compilerInput: input, compilerMetadata: JSON.parse(contract.metadata),
    abi: contract.abi, bytecode, deployedBytecode,
    creationKeccak256: ethers.keccak256(bytecode), runtimeKeccak256: ethers.keccak256(deployedBytecode),
  };
}

export function validateBuild(artifact, sourcePath) {
  const fresh = buildContract(sourcePath);
  for (const key of ['compilerVersion', 'sourceSha256', 'bytecode', 'deployedBytecode', 'creationKeccak256', 'runtimeKeccak256']) {
    if (artifact[key] !== fresh[key]) throw new Error(`Artifact ${key} differs from the current reproducible build`);
  }
  if (JSON.stringify(artifact.compilerInput) !== JSON.stringify(fresh.compilerInput)) throw new Error('Compiler input differs');
  return fresh;
}
