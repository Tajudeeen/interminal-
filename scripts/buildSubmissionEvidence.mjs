import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";
import { arcRpc, arcRpcRetry } from "./arcRpc.mjs";
import { loadReceiptCertificate, verifyExecution } from "./verifyExecution.mjs";
import {
  SUBMISSION,
  buildSubmissionEvidence,
  renderSubmissionMarkdown,
  sha256Hex,
} from "./submissionEvidenceLib.mjs";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const receiptPath = arg("--receipt");
const jsonPath = arg("--out") || "artifacts/submission-evidence.json";
const markdownPath = arg("--markdown") || "docs/FINAL_MAINNET_EVIDENCE.md";

if (!receiptPath) {
  console.error(
    "Usage: npm run proof:submission -- --receipt path/to/exported-receipt.json\n" +
    "Optional: --out artifacts/submission-evidence.json --markdown docs/FINAL_MAINNET_EVIDENCE.md",
  );
  process.exit(1);
}

async function main() {
  const { certificate, bytes } = loadReceiptCertificate(receiptPath);

  const execution = await verifyExecution({ certificate });
  const [chainHex, headHex, code, deployment] = await Promise.all([
    arcRpcRetry("eth_chainId"),
    arcRpcRetry("eth_blockNumber"),
    arcRpcRetry("eth_getCode", [SUBMISSION.settlement, "latest"]),
    arcRpcRetry("eth_getTransactionReceipt", [SUBMISSION.deploymentTx]),
  ]);

  const chainId = Number(BigInt(chainHex));
  if (chainId !== SUBMISSION.chainId) throw new Error("Arc RPC returned the wrong chain");
  if (!code || code === "0x") throw new Error("Settlement bytecode is missing on Arc");
  const runtimeKeccak256 = ethers.keccak256(code);
  if (runtimeKeccak256.toLowerCase() !== SUBMISSION.runtimeKeccak256.toLowerCase()) {
    throw new Error("Live settlement runtime fingerprint changed");
  }
  if (
    deployment?.status !== "0x1" ||
    deployment.contractAddress?.toLowerCase() !== SUBMISSION.settlement.toLowerCase()
  ) {
    throw new Error("Recorded deployment transaction does not prove the configured settlement");
  }

  const infrastructure = {
    chainId,
    headBlock: Number(BigInt(headHex)),
    runtimeKeccak256,
  };

  const evidence = buildSubmissionEvidence({
    execution,
    certificate,
    infrastructure,
    receiptFileSha256: sha256Hex(bytes),
    receiptFileName: path.basename(receiptPath),
  });

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 2) + "\n");
  fs.writeFileSync(markdownPath, renderSubmissionMarkdown(evidence));

  console.log(JSON.stringify({
    verified: true,
    evidenceJson: jsonPath,
    evidenceMarkdown: markdownPath,
    execution: evidence.publicLinks.execution,
    reviewer: evidence.publicLinks.reviewer,
    transactionHash: evidence.execution.transactionHash,
    blockNumber: evidence.execution.blockNumber,
    isTreasuryFlow: evidence.execution.isTreasuryFlow,
    certificateMatched: evidence.execution.certificateMatched,
  }, null, 2));
}

main().catch((error) => {
  console.error("FAIL submission evidence generation:", error?.message || String(error));
  process.exitCode = 1;
});
