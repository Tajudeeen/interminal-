import { createHash } from "node:crypto";

export const SUBMISSION = Object.freeze({
  appUrl: "https://useinterminal.vercel.app/",
  repoUrl: "https://github.com/Tajudeeen/interminal-",
  builderUrl: "https://x.com/Deeen_Codes",
  explorerBase: "https://explorer.arc.io",
  chainId: 5042,
  settlement: "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36",
  deploymentTx: "0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404",
  runtimeKeccak256: "0x0f8491da3d30f0441520308dfb21175d9272f81b5f3bb6bca60347ebbd2fcac8",
  usdc: "0x3600000000000000000000000000000000000000",
  usyc: "0x8a5D989Bbb96929F689B0200f435f53dA42bF490",
});

const hash64 = /^0x[\da-f]{64}$/i;
const address = /^0x[\da-f]{40}$/i;

function fail(message) {
  throw new Error(message);
}

export function sha256Hex(bytes) {
  return "0x" + createHash("sha256").update(bytes).digest("hex");
}

export function assertSubmissionExecution(execution) {
  if (!execution || execution.verified !== true) fail("Execution verifier did not return verified=true");
  if (execution.chainId !== SUBMISSION.chainId) fail("Execution is not on Arc Mainnet chain 5042");
  if (String(execution.contract || "").toLowerCase() !== SUBMISSION.settlement.toLowerCase()) fail("Execution used the wrong settlement contract");
  if (!hash64.test(execution.transactionHash || "")) fail("Missing valid mainnet transaction hash");
  if (!address.test(execution.trader || "")) fail("Missing valid trader address");
  if (!address.test(execution.tokenIn || "") || !address.test(execution.tokenOut || "")) fail("Missing valid token route");
  if (!execution.amountInRaw || BigInt(execution.amountInRaw) <= 0n) fail("Invalid input amount");
  if (!execution.amountOutRaw || BigInt(execution.amountOutRaw) <= 0n) fail("Invalid output amount");
  if (!hash64.test(execution.executionReceiptHash || "")) fail("Missing TradeSettled receipt hash");
  if (execution.isTreasuryFlow !== true) fail("Transaction does not prove the USDC/USYC treasury route");
  if (execution.certificateMatched !== true) fail("Exported certificate does not match the on-chain settlement");
  const route = new Set([String(execution.tokenIn).toLowerCase(), String(execution.tokenOut).toLowerCase()]);
  if (!route.has(SUBMISSION.usdc.toLowerCase()) || !route.has(SUBMISSION.usyc.toLowerCase())) {
    fail("Verified event is not the expected USDC/USYC route");
  }
  return true;
}

export function buildSubmissionEvidence({
  execution,
  certificate,
  infrastructure,
  receiptFileSha256,
  receiptFileName,
  generatedAt = new Date().toISOString(),
}) {
  assertSubmissionExecution(execution);
  if (!certificate || certificate.mode !== "mainnet" || certificate.status !== "confirmed") {
    fail("Submission evidence requires a confirmed mainnet certificate");
  }
  if (!hash64.test(certificate.integrityDigest || "")) fail("Certificate integrity digest is missing");
  if (!hash64.test(receiptFileSha256 || "")) fail("Receipt file SHA-256 is missing");
  if (!infrastructure || infrastructure.chainId !== SUBMISSION.chainId || infrastructure.runtimeKeccak256?.toLowerCase() !== SUBMISSION.runtimeKeccak256.toLowerCase()) {
    fail("Arc infrastructure fingerprint did not match the recorded deployment");
  }

  const txHash = execution.transactionHash;
  return {
    version: 1,
    generatedAt,
    status: "verified-mainnet-treasury-execution",
    publicLinks: {
      app: SUBMISSION.appUrl,
      repository: SUBMISSION.repoUrl,
      builder: SUBMISSION.builderUrl,
      settlement: `${SUBMISSION.explorerBase}/address/${SUBMISSION.settlement}`,
      deployment: `${SUBMISSION.explorerBase}/tx/${SUBMISSION.deploymentTx}`,
      execution: `${SUBMISSION.explorerBase}/tx/${txHash}`,
      reviewer: `${SUBMISSION.appUrl}?verify=${txHash}`,
    },
    arc: {
      chainId: SUBMISSION.chainId,
      settlement: SUBMISSION.settlement,
      deploymentTransaction: SUBMISSION.deploymentTx,
      runtimeKeccak256: SUBMISSION.runtimeKeccak256,
      headBlockAtVerification: infrastructure.headBlock,
    },
    execution: {
      transactionHash: txHash,
      blockNumber: execution.blockNumber,
      trader: execution.trader,
      tokenIn: execution.tokenIn,
      tokenOut: execution.tokenOut,
      amountInRaw: execution.amountInRaw,
      amountOutRaw: execution.amountOutRaw,
      executionReceiptHash: execution.executionReceiptHash,
      isTreasuryFlow: true,
      certificateMatched: true,
      certificateAnchored: execution.certificateAnchored,
      anchorError: execution.anchorError || null,
    },
    certificate: {
      receiptId: certificate.receiptId,
      integrityDigest: certificate.integrityDigest,
      receiptFileName,
      receiptFileSha256,
      mode: certificate.mode,
      status: certificate.status,
    },
    claims: {
      liveArcMainnetContract: true,
      successfulSettlementTransaction: true,
      exactTradeSettledEvent: true,
      usdcUsycTreasuryRoute: true,
      exportedCertificateMatchesEvent: true,
      walletFreeReviewerLink: true,
      sourceReproductionOfV1: false,
    },
    commands: {
      verifyExecution: `npm run verify:execution -- ${txHash}`,
      verifyReceipt: `npm run verify:execution -- --receipt ${receiptFileName}`,
      verifySubmission: "npm run verify:submission",
      scanTreasuryHistory: "npm run verify:treasury-history",
    },
    caveats: [
      "The deployed v1 runtime fingerprint is independently verified, but the maintained Solidity source does not reproduce that live runtime. Do not claim deployed-source verification.",
      "Receipt anchoring is separate from execution proof. TradeSettled plus the matching certificate proves execution provenance.",
    ],
  };
}

export function assertSubmissionEvidenceRecord(evidence) {
  if (!evidence || evidence.version !== 1 || evidence.status !== "verified-mainnet-treasury-execution") fail("Unsupported submission evidence artifact");
  if (evidence.arc?.chainId !== SUBMISSION.chainId) fail("Evidence chain ID mismatch");
  if (String(evidence.arc?.settlement || "").toLowerCase() !== SUBMISSION.settlement.toLowerCase()) fail("Evidence settlement mismatch");
  if (String(evidence.arc?.runtimeKeccak256 || "").toLowerCase() !== SUBMISSION.runtimeKeccak256.toLowerCase()) fail("Evidence runtime fingerprint mismatch");
  if (!hash64.test(evidence.execution?.transactionHash || "")) fail("Evidence transaction hash invalid");
  if (evidence.execution?.isTreasuryFlow !== true || evidence.execution?.certificateMatched !== true) fail("Evidence is not submission-grade treasury proof");
  const expectedReviewer = `${SUBMISSION.appUrl}?verify=${evidence.execution.transactionHash}`;
  const expectedExplorer = `${SUBMISSION.explorerBase}/tx/${evidence.execution.transactionHash}`;
  if (evidence.publicLinks?.reviewer !== expectedReviewer || evidence.publicLinks?.execution !== expectedExplorer) fail("Evidence public links do not match the transaction");
  if (!hash64.test(evidence.certificate?.integrityDigest || "") || !hash64.test(evidence.certificate?.receiptFileSha256 || "")) fail("Evidence certificate hashes missing");
  return true;
}

export function renderSubmissionMarkdown(evidence) {
  assertSubmissionEvidenceRecord(evidence);
  const e = evidence.execution;
  const anchor = e.certificateAnchored === true ? "found" : e.certificateAnchored === false ? "not found" : "not checked / unavailable";
  return `# Interminal final Arc Mainnet execution evidence

This document is generated from independently checked Arc data. It records the transaction that proves the live USDC/USYC treasury path.

## Public links

- Live app: ${evidence.publicLinks.app}
- Public repository: ${evidence.publicLinks.repository}
- Builder: ${evidence.publicLinks.builder}
- Settlement contract: ${evidence.publicLinks.settlement}
- Contract deployment: ${evidence.publicLinks.deployment}
- Real treasury execution: ${evidence.publicLinks.execution}
- Wallet-free reviewer link: ${evidence.publicLinks.reviewer}

## Verified execution

- Chain: Arc Mainnet (${evidence.arc.chainId})
- Settlement: \`${evidence.arc.settlement}\`
- Transaction: \`${e.transactionHash}\`
- Block: \`${e.blockNumber}\`
- Trader: \`${e.trader}\`
- Token in: \`${e.tokenIn}\`
- Token out: \`${e.tokenOut}\`
- Raw input: \`${e.amountInRaw}\`
- Raw output: \`${e.amountOutRaw}\`
- TradeSettled receipt hash: \`${e.executionReceiptHash}\`
- USDC/USYC treasury route: **PASS**
- Exported certificate matches event: **PASS**
- Certificate digest anchor: **${anchor}**

## Certificate integrity

- Receipt ID: \`${evidence.certificate.receiptId}\`
- Certificate SHA-256 digest: \`${evidence.certificate.integrityDigest}\`
- Exported receipt file SHA-256: \`${evidence.certificate.receiptFileSha256}\`
- Receipt file used during generation: \`${evidence.certificate.receiptFileName}\`

## Reproduce the proof

\`\`\`sh
${evidence.commands.verifyExecution}
${evidence.commands.verifyReceipt}
${evidence.commands.verifySubmission}
${evidence.commands.scanTreasuryHistory}
\`\`\`

## Claim boundary

The transaction and exact \`TradeSettled\` event prove the live Arc execution. The exported certificate was checked against that event. Receipt anchoring is reported separately and is not used as a substitute for settlement proof.

The deployed v1 runtime fingerprint is independently verified. Strict source reproduction of that v1 runtime remains unresolved, so this repository does not claim that the maintained Solidity source is verified deployed source.

Generated: ${evidence.generatedAt}
`;
}
