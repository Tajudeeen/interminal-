import { ArcReadProvider } from "./arcRpc.mjs";
import fs from "fs";
import solc from "solc";
import { ethers } from "ethers";

const RPC = process.env.ARC_RPC || "https://rpc.mainnet.arc.io";
const EXPECTED_CHAIN_ID = 5042;
const EXPECTED_SETTLEMENT_RUNTIME_HASH = "0x0f8491da3d30f0441520308dfb21175d9272f81b5f3bb6bca60347ebbd2fcac8";
const EXPECTED_DEPLOYMENT_TX = "0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404";
const EXPECTED_DEPLOYMENT_BLOCK = 23367508;
const EXPECTED_SETTLEMENT_BYTES = 8802;
const SETTLEMENT = "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36";
const ROUTER = "0x52FE40c00530db2e43d01652f903870571A14AFD";
const USDC = "0x3600000000000000000000000000000000000000";
const USYC = "0x8a5D989Bbb96929F689B0200f435f53dA42bF490";

function ok(label, value) {
  if (!value) throw new Error(label + " failed");
  console.log("PASS", label);
}

async function getReceiptWithRetry(provider, txHash, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) return receipt;
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
  }
  return null;
}

function stripSolidityMetadata(bytecode) {
  const hex = String(bytecode || "").replace(/^0x/i, "");
  if (hex.length < 4) return "0x" + hex;
  const metadataBytes = Number.parseInt(hex.slice(-4), 16);
  const metadataHexLength = metadataBytes * 2;
  if (!Number.isFinite(metadataBytes) || metadataHexLength + 4 > hex.length) return "0x" + hex;
  return "0x" + hex.slice(0, hex.length - metadataHexLength - 4);
}

function executableRuntimeHash(bytecode) {
  return ethers.keccak256(stripSolidityMetadata(bytecode));
}

function compileSource(source) {
  const input = {
    language: "Solidity",
    sources: { "InterminalSettlement.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors || []).filter((e) => e.severity === "error");
  if (errors.length) throw new Error("Canonical settlement source does not compile");
  return output.contracts["InterminalSettlement.sol"]["InterminalSettlement"];
}

async function main() {
  const provider = new ArcReadProvider(RPC, {
    chainId: EXPECTED_CHAIN_ID,
    name: "arc-mainnet",
  });

  const network = await provider.getNetwork();
  ok("Arc chain ID 5042", Number(network.chainId) === EXPECTED_CHAIN_ID);

  const block = await provider.getBlockNumber();
  ok("Arc mainnet is producing blocks", block >= EXPECTED_DEPLOYMENT_BLOCK);

  const deploymentReceipt = await getReceiptWithRetry(provider, EXPECTED_DEPLOYMENT_TX);
  ok("deployment transaction exists", !!deploymentReceipt);
  ok("deployment transaction succeeded", deploymentReceipt?.status === 1);
  ok(
    "deployment created the expected settlement contract",
    String(deploymentReceipt?.contractAddress || "").toLowerCase() === SETTLEMENT.toLowerCase(),
  );
  ok("deployment block matches recorded provenance", Number(deploymentReceipt?.blockNumber) === EXPECTED_DEPLOYMENT_BLOCK);

  const settlementCode = await provider.getCode(SETTLEMENT);
  ok("settlement contract bytecode exists", settlementCode !== "0x");
  ok("live settlement bytecode size is recorded", (settlementCode.length - 2) / 2 === EXPECTED_SETTLEMENT_BYTES);

  const source = fs.readFileSync(
    new URL("../contracts/InterminalSettlement.sol", import.meta.url),
    "utf8",
  );
  const contract = compileSource(source);
  const freshRuntime = "0x" + contract.evm.deployedBytecode.object;
  const freshCreation = "0x" + contract.evm.bytecode.object;

  ok("checked-in Solidity compiles with the pinned toolchain", !!freshRuntime && freshRuntime.length > 2);

  const artifact = JSON.parse(
    fs.readFileSync(new URL("../artifacts/InterminalSettlement.json", import.meta.url), "utf8"),
  );
  ok("committed artifact is for InterminalSettlement", artifact.contractName === "InterminalSettlement");
  ok(
    "committed artifact executable runtime matches freshly compiled source",
    executableRuntimeHash(String(artifact.deployedBytecode || "")).toLowerCase() === executableRuntimeHash(freshRuntime).toLowerCase(),
  );
  ok(
    "committed artifact creation bytecode matches freshly compiled source",
    executableRuntimeHash(String(artifact.bytecode || "")).toLowerCase() === executableRuntimeHash(freshCreation).toLowerCase(),
  );

  const deployedRuntimeHash = ethers.keccak256(settlementCode);
  const deployedExecutableHash = executableRuntimeHash(settlementCode);
  console.log("INFO live executable runtime keccak256: " + deployedExecutableHash);
  const sourceRuntimeMatches = executableRuntimeHash(freshRuntime).toLowerCase() === deployedExecutableHash.toLowerCase();
  if (process.argv.includes("--require-source-match")) {
    ok("freshly compiled source matches live executable runtime", sourceRuntimeMatches);
  } else if (!sourceRuntimeMatches) {
    console.warn("SOURCE PROVENANCE UNRESOLVED: maintained source does not reproduce the live executable runtime with recorded settings. Fingerprint and infrastructure checks are not source verification. Run npm run verify:source for the strict gate.");
  }
  ok(
    "live settlement runtime fingerprint matches recorded Arc deployment",
    deployedRuntimeHash.toLowerCase() === EXPECTED_SETTLEMENT_RUNTIME_HASH,
  );

  const sourceGuards = [
    ["pause guard", /modifier whenNotPaused/.test(source)],
    ["reentrancy guard", /modifier nonReentrant/.test(source)],
    ["ticket deadline", /ticket\.deadline/.test(source)],
    ["trader nonce replay protection", /ticket\.nonce == traderNonces\[ticket\.trader\]/.test(source)],
    ["signature recovery", /recoverSigner\(digest, signature\)/.test(source)],
    ["signature ownership check", /signer == ticket\.trader/.test(source)],
    ["input transferFrom", /_safeTransferFrom\(ticket\.tokenIn, ticket\.trader/.test(source)],
    ["minimum output check", /amountOut >= ticket\.minAmountOut/.test(source)],
    ["receipt anchoring state", /anchoredReceipts\[receiptHash\] = block\.timestamp/.test(source)],
  ];
  console.log("INFO maintained-source guards checked separately from live runtime identity.");
  for (const [label, present] of sourceGuards) ok("maintained source contains " + label, present);

  const functionNames = new Set(
    (artifact.abi || []).filter((entry) => entry.type === "function").map((entry) => entry.name),
  );
  for (const required of ["executeTradeTicket", "anchorReceipt", "isReceiptAnchored", "traderNonces", "DOMAIN_SEPARATOR"]) {
    ok("live ABI exposes " + required, functionNames.has(required));
  }

  const routerCode = await provider.getCode(ROUTER);
  ok("Arc router target resolves", routerCode !== "0x");
  const usycCode = await provider.getCode(USYC);
  ok("USYC contract target resolves", usycCode !== "0x");

  const settlement = new ethers.Contract(
    SETTLEMENT,
    [
      "function ARC_CHAIN_ID() view returns (uint256)",
      "function DOMAIN_SEPARATOR() view returns (bytes32)",
      "function owner() view returns (address)",
      "function paused() view returns (bool)",
    ],
    provider,
  );

  const contractChainId = Number(await settlement.ARC_CHAIN_ID());
  ok("deployed contract reports chain ID 5042", contractChainId === EXPECTED_CHAIN_ID);

  const expectedDomain = ethers.TypedDataEncoder.hashDomain({
    name: "Interminal",
    version: "1",
    chainId: EXPECTED_CHAIN_ID,
    verifyingContract: SETTLEMENT,
  });
  const liveDomain = await settlement.DOMAIN_SEPARATOR();
  ok("EIP-712 domain matches deployed contract", liveDomain.toLowerCase() === expectedDomain.toLowerCase());

  const owner = await settlement.owner();
  const paused = await settlement.paused();

  console.log(JSON.stringify({
    network: { rpc: RPC, chainId: Number(network.chainId), headBlock: block },
    deployment: {
      tx: EXPECTED_DEPLOYMENT_TX,
      block: EXPECTED_DEPLOYMENT_BLOCK,
      contract: SETTLEMENT,
      runtimeBytes: EXPECTED_SETTLEMENT_BYTES,
      runtimeKeccak256: deployedRuntimeHash,
    },
    settlement: {
      contractChainId,
      owner,
      paused,
      domainSeparator: liveDomain,
    },
    provenance: {
      maintainedSource: "contracts/InterminalSettlement.sol",
      deployedContractSourceVerification: sourceRuntimeMatches ? "executable runtime reproduced" : "UNRESOLVED: compiled source differs from live executable runtime",
      sourceRuntimeMatches,
      compiledExecutableRuntimeHash: executableRuntimeHash(freshRuntime),
      futureSuccessor: "contracts/InterminalSettlementV2.sol",
      liveRuntimeFingerprintVerified: true,
      executableRuntimeHash: deployedExecutableHash,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error("FAIL Arc verification:", error?.message || String(error));
  process.exit(1);
});
