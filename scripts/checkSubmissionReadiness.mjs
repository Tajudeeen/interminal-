import fs from "node:fs";
import { ethers } from "ethers";
import { arcRpc } from "./arcRpc.mjs";
import { SUBMISSION, assertSubmissionEvidenceRecord } from "./submissionEvidenceLib.mjs";

async function main() {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail });

  const [chainHex, headHex, code, deployment] = await Promise.all([
    arcRpc("eth_chainId"),
    arcRpc("eth_blockNumber"),
    arcRpc("eth_getCode", [SUBMISSION.settlement, "latest"]),
    arcRpc("eth_getTransactionReceipt", [SUBMISSION.deploymentTx]),
  ]);

  const chainId = Number(BigInt(chainHex));
  add("arc-chain", chainId === SUBMISSION.chainId, `Arc RPC chain ${chainId}`);

  const headBlock = Number(BigInt(headHex));
  add("arc-head", Number.isSafeInteger(headBlock) && headBlock > 0, `Arc head #${headBlock.toLocaleString()}`);

  const runtimeKeccak256 = code && code !== "0x" ? ethers.keccak256(code) : null;
  add(
    "settlement-runtime",
    runtimeKeccak256?.toLowerCase() === SUBMISSION.runtimeKeccak256.toLowerCase(),
    runtimeKeccak256 ? `runtime ${runtimeKeccak256}` : "settlement bytecode missing",
  );

  add(
    "deployment",
    deployment?.status === "0x1" &&
      deployment.contractAddress?.toLowerCase() === SUBMISSION.settlement.toLowerCase(),
    `deployment ${SUBMISSION.deploymentTx}`,
  );

  const evidencePath = "artifacts/submission-evidence.json";
  if (!fs.existsSync(evidencePath)) {
    add(
      "real-treasury-proof",
      false,
      "No committed real mainnet treasury evidence yet. Execute one real USDC/USYC settlement, export its receipt, then run proof:submission.",
    );
  } else {
    try {
      const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
      assertSubmissionEvidenceRecord(evidence);
      add(
        "real-treasury-proof",
        true,
        `verified transaction ${evidence.execution.transactionHash}`,
      );
    } catch (error) {
      add("real-treasury-proof", false, error?.message || String(error));
    }
  }

  const readme = fs.readFileSync(new URL("../README.md", import.meta.url), "utf8");
  add("public-app-link", readme.includes(SUBMISSION.appUrl), SUBMISSION.appUrl);
  add("public-repo-link", readme.includes(SUBMISSION.repoUrl), SUBMISSION.repoUrl);
  add("builder-profile-link", readme.includes(SUBMISSION.builderUrl), SUBMISSION.builderUrl);

  const ready = checks.every((check) => check.ok);
  console.log(JSON.stringify({ ready, checks }, null, 2));

  if (!ready) {
    console.error(
      "\nSubmission readiness is fail-closed. Do not claim end-to-end mainnet execution until real-treasury-proof passes.",
    );
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("FAIL submission readiness check:", error?.message || String(error));
  process.exitCode = 1;
});
