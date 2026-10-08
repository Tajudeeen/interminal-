import fs from "node:fs";
import { ethers } from "ethers";
import { arcRpc } from "./arcRpc.mjs";
import { verifyExecution } from "./verifyExecution.mjs";
import {
  SUBMISSION,
  assertSubmissionEvidenceRecord,
} from "./submissionEvidenceLib.mjs";

const artifactPath = process.argv.find((v, i) => i > 1 && !v.startsWith("--")) || "artifacts/submission-evidence.json";

function same(a, b, label) {
  if (String(a).toLowerCase() !== String(b).toLowerCase()) {
    throw new Error(label);
  }
}

async function main() {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Missing ${artifactPath}. Generate it only after a real mainnet settlement with: npm run proof:submission -- --receipt exported-receipt.json`,
    );
  }

  const evidence = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  assertSubmissionEvidenceRecord(evidence);

  const [chainHex, headHex, code, deployment, execution] = await Promise.all([
    arcRpc("eth_chainId"),
    arcRpc("eth_blockNumber"),
    arcRpc("eth_getCode", [SUBMISSION.settlement, "latest"]),
    arcRpc("eth_getTransactionReceipt", [SUBMISSION.deploymentTx]),
    verifyExecution({ transactionHash: evidence.execution.transactionHash }),
  ]);

  const chainId = Number(BigInt(chainHex));
  if (chainId !== SUBMISSION.chainId) throw new Error("Arc chain mismatch");
  if (!code || code === "0x") throw new Error("Settlement bytecode missing");
  const runtimeKeccak256 = ethers.keccak256(code);
  same(runtimeKeccak256, SUBMISSION.runtimeKeccak256, "Live runtime fingerprint no longer matches submission evidence");

  if (
    deployment?.status !== "0x1" ||
    deployment.contractAddress?.toLowerCase() !== SUBMISSION.settlement.toLowerCase()
  ) {
    throw new Error("Deployment evidence no longer matches the configured settlement");
  }

  if (!execution.verified || !execution.isTreasuryFlow) {
    throw new Error("Recorded transaction no longer verifies as a USDC/USYC treasury settlement");
  }

  const fields = [
    ["transactionHash", execution.transactionHash, evidence.execution.transactionHash],
    ["blockNumber", execution.blockNumber, evidence.execution.blockNumber],
    ["trader", execution.trader, evidence.execution.trader],
    ["tokenIn", execution.tokenIn, evidence.execution.tokenIn],
    ["tokenOut", execution.tokenOut, evidence.execution.tokenOut],
    ["amountInRaw", execution.amountInRaw, evidence.execution.amountInRaw],
    ["amountOutRaw", execution.amountOutRaw, evidence.execution.amountOutRaw],
    ["executionReceiptHash", execution.executionReceiptHash, evidence.execution.executionReceiptHash],
  ];
  for (const [label, actual, expected] of fields) {
    same(actual, expected, `On-chain ${label} differs from the committed submission evidence`);
  }

  console.log(JSON.stringify({
    submissionEvidenceVerified: true,
    artifact: artifactPath,
    chainId,
    currentHeadBlock: Number(BigInt(headHex)),
    settlement: SUBMISSION.settlement,
    runtimeKeccak256,
    transactionHash: execution.transactionHash,
    blockNumber: execution.blockNumber,
    isTreasuryFlow: execution.isTreasuryFlow,
    committedCertificateMatched: evidence.execution.certificateMatched,
    reviewer: evidence.publicLinks.reviewer,
    explorer: evidence.publicLinks.execution,
    note: "Certificate matching was proven when the bundle was generated. Re-run verify:execution with the original exported receipt to independently re-check certificate contents.",
  }, null, 2));
}

main().catch((error) => {
  console.error("FAIL submission evidence verification:", error?.message || String(error));
  process.exitCode = 1;
});
