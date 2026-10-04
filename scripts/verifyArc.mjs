import fs from "fs";
import solc from "solc";
import { ethers } from "ethers";

const RPC = process.env.ARC_RPC || "https://rpc.mainnet.arc.io";
const EXPECTED_CHAIN_ID = 5042;
const SETTLEMENT = "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36";
const ROUTER = "0x52FE40c00530db2e43d01652f903870571A14AFD";
const USDC = "0x3600000000000000000000000000000000000000";
const USYC = "0x8a5D989Bbb96929F689B0200f435f53dA42bF490";

function ok(label, value) {
  if (!value) throw new Error(label + " failed");
  console.log("PASS", label);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC, {
    chainId: EXPECTED_CHAIN_ID,
    name: "arc-mainnet",
  });

  const network = await provider.getNetwork();
  ok("Arc chain ID 5042", Number(network.chainId) === EXPECTED_CHAIN_ID);

  const block = await provider.getBlockNumber();
  ok("Arc mainnet is producing blocks", block > 0);

  const settlementCode = await provider.getCode(SETTLEMENT);
  ok("settlement contract bytecode exists", settlementCode !== "0x");

  const artifact = JSON.parse(
    fs.readFileSync(new URL("../artifacts/InterminalSettlement.json", import.meta.url), "utf8")
  );
  ok("committed artifact is for InterminalSettlement", artifact.contractName === "InterminalSettlement");

  function stripSolidityMetadata(bytecode) {
    const hex = String(bytecode || "").replace(/^0x/i, "");
    if (hex.length < 4) return "0x" + hex;
    const metadataBytes = Number.parseInt(hex.slice(-4), 16);
    const metadataHexLength = metadataBytes * 2;
    if (!Number.isFinite(metadataBytes) || metadataHexLength + 4 > hex.length) return "0x" + hex;
    return "0x" + hex.slice(0, hex.length - metadataHexLength - 4);
  }

  const source = fs.readFileSync(
    new URL("../contracts/InterminalSettlement.sol", import.meta.url),
    "utf8"
  );
  const compileInput = {
    language: "Solidity",
    sources: { "InterminalSettlement.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] }
      }
    }
  };
  const compileOutput = JSON.parse(solc.compile(JSON.stringify(compileInput)));
  const errors = (compileOutput.errors || []).filter((e) => e.severity === "error");
  if (errors.length) throw new Error("Committed Solidity source does not compile");
  const freshRuntime = "0x" + compileOutput.contracts["InterminalSettlement.sol"]["InterminalSettlement"].evm.deployedBytecode.object;

  const deployedCore = stripSolidityMetadata(settlementCode);
  const freshCore = stripSolidityMetadata(freshRuntime);
  console.log("INFO runtime bytes: deployed=" + ((settlementCode.length - 2) / 2) + ", freshly-compiled=" + ((freshRuntime.length - 2) / 2));
  console.log("INFO executable bytes after metadata: deployed=" + ((deployedCore.length - 2) / 2) + ", freshly-compiled=" + ((freshCore.length - 2) / 2));
  console.log("INFO deployed runtime prefix: " + deployedCore.slice(0, 66));
  console.log("INFO fresh runtime prefix: " + freshCore.slice(0, 66));
  const sourceRuntimeMatches = deployedCore.toLowerCase() === freshCore.toLowerCase();
  ok("deployed Arc runtime matches freshly compiled committed source", sourceRuntimeMatches);

  const artifactRuntimeMatches = stripSolidityMetadata(String(artifact.deployedBytecode || "")).toLowerCase() ===
    stripSolidityMetadata(freshRuntime).toLowerCase();
  if (!artifactRuntimeMatches) {
    console.log("WARN committed artifact runtime differs from freshly compiled source; regenerate artifacts before submission.");
  }

  const routerCode = await provider.getCode(ROUTER);
  ok("Arc router target resolves", routerCode !== "0x");

  const usycCode = await provider.getCode(USYC);
  ok("USYC contract target resolves", usycCode !== "0x");

  const usdcCode = await provider.getCode(USDC);
  ok("Arc USDC interface target resolves", usdcCode !== "0x");

  const settlement = new ethers.Contract(
    SETTLEMENT,
    [
      "function ARC_CHAIN_ID() view returns (uint256)",
      "function DOMAIN_SEPARATOR() view returns (bytes32)",
      "function owner() view returns (address)",
      "function paused() view returns (bool)",
    ],
    provider
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
    network: {
      rpc: RPC,
      chainId: Number(network.chainId),
      headBlock: block,
    },
    contracts: {
      settlement: SETTLEMENT,
      router: ROUTER,
      usdcErc20: USDC,
      usyc: USYC,
    },
    settlement: {
      contractChainId,
      owner,
      paused,
      domainSeparator: liveDomain,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error("FAIL Arc verification:", error?.message || String(error));
  process.exit(1);
});
