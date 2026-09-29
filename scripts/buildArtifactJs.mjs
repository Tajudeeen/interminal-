import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const artPath = path.join(root, "artifacts", "InterminalSettlement.json");
const art = JSON.parse(fs.readFileSync(artPath, "utf8"));

const jsContent = `/* Auto-generated from contracts/InterminalSettlement.sol */
const SETTLEMENT_ARTIFACT = ${JSON.stringify({
  contractName: art.contractName,
  chainId: art.chainId,
  bytecode: art.bytecode,
  abi: art.abi,
  compiledAt: art.compiledAt,
}, null, 2)};

if (typeof globalThis !== "undefined") {
  globalThis.SETTLEMENT_ARTIFACT = SETTLEMENT_ARTIFACT;
}
if (typeof window !== "undefined") {
  window.SETTLEMENT_ARTIFACT = SETTLEMENT_ARTIFACT;
}
`;

fs.writeFileSync(path.join(root, "contractArtifact.js"), jsContent, "utf8");
console.log("Successfully created contractArtifact.js!");
