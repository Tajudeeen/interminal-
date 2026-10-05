import fs from 'node:fs';
import { buildContract } from './contractBuild.mjs';

const successor = process.argv.includes('--successor');
const sourcePath = new URL(successor ? '../contracts/InterminalSettlementV2.sol' : '../contracts/InterminalSettlement.sol', import.meta.url);
const outputPath = new URL(successor ? '../artifacts/InterminalSettlementV2.json' : '../artifacts/InterminalSettlement.json', import.meta.url);
const artifact = buildContract(sourcePath);
fs.mkdirSync(new URL('../artifacts/', import.meta.url), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2) + '\n');
console.log(JSON.stringify({ artifact: outputPath.pathname, sourceSha256: artifact.sourceSha256, compilerVersion: artifact.compilerVersion, runtimeKeccak256: artifact.runtimeKeccak256, deployed: false }, null, 2));
