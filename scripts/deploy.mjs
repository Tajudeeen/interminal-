import fs from 'node:fs';
import { ethers } from 'ethers';
import { ArcReadProvider } from './arcRpc.mjs';
import { validateBuild } from './contractBuild.mjs';

// This path only deploys the hardened successor. It never changes the live app address.
const sourcePath = new URL('../contracts/InterminalSettlementV2.sol', import.meta.url);
const artifactPath = new URL('../artifacts/InterminalSettlementV2.json', import.meta.url);
const recordPath = new URL('../artifacts/successor-deployment.json', import.meta.url);
const privateKey = process.env.PRIVATE_KEY;

async function main() {
  if (!fs.existsSync(artifactPath)) throw new Error('Run npm run prepare:deployment first');
  const artifact = validateBuild(JSON.parse(fs.readFileSync(artifactPath, 'utf8')), sourcePath);
  const unsignedTransaction = { chainId: 5042, value: '0x0', data: artifact.bytecode };
  const packagePath = new URL('../artifacts/successor-unsigned-transaction.json', import.meta.url);
  fs.writeFileSync(packagePath, JSON.stringify(unsignedTransaction, null, 2) + '\n');
  if (!privateKey) {
    console.log('Reproducible successor and unsigned deployment transaction prepared. Wallet signing is required.');
    console.log('Unsigned transaction:', packagePath.pathname);
    console.log('Expected runtime:', artifact.runtimeKeccak256);
    return;
  }
  if (fs.existsSync(recordPath)) throw new Error('A successor deployment record already exists; verify it before attempting another deployment');
  const provider = new ArcReadProvider(process.env.ARC_RPC || 'https://rpc.mainnet.arc.io', { chainId: 5042, name: 'arc-mainnet' });
  if (Number((await provider.getNetwork()).chainId) !== 5042) throw new Error('Wrong chain');
  const wallet = new ethers.Wallet(privateKey, provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const request = await factory.getDeployTransaction();
  request.gasLimit = (await provider.estimateGas({ ...request, from: wallet.address })) * 120n / 100n;
  const tx = await wallet.sendTransaction(request);
  // Persist the hash before waiting so a transport interruption cannot hide a broadcast.
  const record = { status: 'pending', chainId: 5042, transactionHash: tx.hash, deployer: wallet.address, sourceSha256: artifact.sourceSha256, expectedRuntimeKeccak256: artifact.runtimeKeccak256 };
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
  console.log('Deployment submitted:', tx.hash);
  const receipt = await tx.wait();
  if (receipt?.status !== 1 || !receipt.contractAddress) throw new Error('Deployment did not succeed');
  const code = await provider.getCode(receipt.contractAddress);
  if (code !== artifact.deployedBytecode) throw new Error('Deployed full runtime does not match the reproducible artifact; do not promote this address');
  const settlement = new ethers.Contract(receipt.contractAddress, artifact.abi, provider);
  if ((await settlement.owner()).toLowerCase() !== wallet.address.toLowerCase() || await settlement.paused()) throw new Error('Deployment state differs');
  const expectedDomain = ethers.TypedDataEncoder.hashDomain({ name: 'Interminal', version: '1', chainId: 5042, verifyingContract: receipt.contractAddress });
  if (await settlement.DOMAIN_SEPARATOR() !== expectedDomain) throw new Error('EIP-712 domain differs');
  Object.assign(record, { status: 'verified', address: receipt.contractAddress, blockNumber: receipt.blockNumber, runtimeKeccak256: ethers.keccak256(code), domainSeparator: expectedDomain });
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
