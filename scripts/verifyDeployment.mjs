import fs from 'node:fs';
import { ethers } from 'ethers';
import { ArcReadProvider } from './arcRpc.mjs';
import { validateBuild } from './contractBuild.mjs';

async function main() {
  const artifact = JSON.parse(fs.readFileSync(new URL('../artifacts/InterminalSettlementV2.json', import.meta.url), 'utf8'));
  validateBuild(artifact, new URL('../contracts/InterminalSettlementV2.sol', import.meta.url));
  const recordPath = new URL('../artifacts/successor-deployment.json', import.meta.url);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (record.chainId !== 5042 || record.sourceSha256 !== artifact.sourceSha256 || record.expectedRuntimeKeccak256 !== artifact.runtimeKeccak256) throw new Error('Deployment record belongs to another build');
  const provider = new ArcReadProvider(process.env.ARC_RPC || 'https://rpc.mainnet.arc.io', { chainId: 5042, name: 'arc-mainnet' });
  if (Number((await provider.getNetwork()).chainId) !== 5042) throw new Error('Wrong chain');
  const [receipt, tx] = await Promise.all([provider.getTransactionReceipt(record.transactionHash), provider.getTransaction(record.transactionHash)]);
  if (!receipt || !tx) throw new Error('Deployment is pending or unavailable');
  if (receipt.status !== 1 || !receipt.contractAddress || tx.to !== null || tx.data !== artifact.bytecode || tx.from.toLowerCase() !== record.deployer.toLowerCase()) throw new Error('Transaction does not prove this build deployment');
  const code = await provider.getCode(receipt.contractAddress);
  if (code !== artifact.deployedBytecode) throw new Error('Full runtime differs from compiled source');
  const settlement = new ethers.Contract(receipt.contractAddress, artifact.abi, provider);
  const domain = ethers.TypedDataEncoder.hashDomain({ name: 'Interminal', version: '1', chainId: 5042, verifyingContract: receipt.contractAddress });
  if (await settlement.DOMAIN_SEPARATOR() !== domain) throw new Error('Domain differs');
  Object.assign(record, { status: 'verified', address: receipt.contractAddress, blockNumber: receipt.blockNumber, runtimeKeccak256: ethers.keccak256(code), domainSeparator: domain });
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
  console.log('PASS exact creation bytecode, full runtime, chain, deployer and EIP-712 domain');
  console.log(JSON.stringify(record, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
