import fs from "fs";
import path from "path";
import solc from "solc";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const contractPath = path.join(root, "contracts", "InterminalSettlement.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "InterminalSettlement.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
      },
    },
  },
};

console.log("Compiling InterminalSettlement.sol with solc...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasError = false;
  for (const err of output.errors) {
    if (err.severity === "error") {
      console.error("Compilation error:", err.formattedMessage);
      hasError = true;
    } else {
      console.warn("Compilation warning:", err.formattedMessage);
    }
  }
  if (hasError) {
    process.exit(1);
  }
}

const contract = output.contracts["InterminalSettlement.sol"]["InterminalSettlement"];
const bytecode = "0x" + contract.evm.bytecode.object;
const deployedBytecode = "0x" + contract.evm.deployedBytecode.object;
const abi = contract.abi;

const artifactsDir = path.join(root, "artifacts");
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const artifactFile = path.join(artifactsDir, "InterminalSettlement.json");
let existingMeta = {};
if (fs.existsSync(artifactFile)) {
  try {
    const prev = JSON.parse(fs.readFileSync(artifactFile, "utf8"));
    if (prev.deployedAddress) existingMeta.deployedAddress = prev.deployedAddress;
    if (prev.deploymentTx) existingMeta.deploymentTx = prev.deploymentTx;
    if (prev.deployer) existingMeta.deployer = prev.deployer;
    if (prev.blockNumber) existingMeta.blockNumber = prev.blockNumber;
  } catch {}
}

const artifactData = {
  contractName: "InterminalSettlement",
  network: "arc-mainnet",
  chainId: 5042,
  ...existingMeta,
  abi,
  bytecode,
  deployedBytecode,
  compiledAt: new Date().toISOString(),
};

fs.writeFileSync(
  artifactFile,
  JSON.stringify(artifactData, null, 2),
  "utf8"
);

const jsContent = `/* Auto-generated from contracts/InterminalSettlement.sol */
const SETTLEMENT_ARTIFACT = ${JSON.stringify({
  contractName: artifactData.contractName,
  chainId: artifactData.chainId,
  deployedAddress: artifactData.deployedAddress,
  deploymentTx: artifactData.deploymentTx,
  bytecode: artifactData.bytecode,
  abi: artifactData.abi,
  compiledAt: artifactData.compiledAt,
}, null, 2)};

if (typeof globalThis !== "undefined") {
  globalThis.SETTLEMENT_ARTIFACT = SETTLEMENT_ARTIFACT;
}
if (typeof window !== "undefined") {
  window.SETTLEMENT_ARTIFACT = SETTLEMENT_ARTIFACT;
}
`;

fs.writeFileSync(path.join(root, "contractArtifact.js"), jsContent, "utf8");

console.log("Successfully compiled InterminalSettlement.sol!");
console.log(`Bytecode size: ${bytecode.length / 2 - 1} bytes`);
console.log(`ABI methods: ${abi.filter((x) => x.type === "function").length}`);
console.log(`Artifact saved to artifacts/InterminalSettlement.json and synced to contractArtifact.js`);
