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

  const artifactUrl = new URL("../artifacts/InterminalSettlement.json", import.meta.url);
  const artifact = JSON.parse(await (await fetch(artifactUrl)).text());
  const deployedArtifact = String(artifact.deployedBytecode || "");
  ok("committed artifact is for InterminalSettlement", artifact.contractName === "InterminalSettlement");
  ok(
    "deployed Arc bytecode matches committed artifact",
    deployedArtifact.startsWith("0x") &&
      settlementCode.toLowerCase() === deployedArtifact.toLowerCase()
  );

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
