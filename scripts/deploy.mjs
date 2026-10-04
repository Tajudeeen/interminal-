import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const artifactPath = path.join(root, "artifacts", "InterminalSettlement.json");

if (!fs.existsSync(artifactPath)) {
  console.error("Artifact not found. Run 'node scripts/compile.mjs' first.");
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const ARC_RPC = process.env.ARC_RPC || "https://rpc.mainnet.arc.io";
const ARC_CHAIN_ID = 5042;
// Never accept private keys as CLI arguments. Shell history, process listings, CI logs,
// and pasted commands can expose argv values. Deployment credentials must come from
// the process environment or the deployment platform's secret manager.
const privateKey = process.env.PRIVATE_KEY;

async function main() {
  console.log("=== Interminal Settlement — Arc Mainnet Deployer ===");
  console.log("RPC:", ARC_RPC);
  console.log("Target Chain ID:", ARC_CHAIN_ID);

  if (!privateKey) {
    console.log("\n[Notice] No PRIVATE_KEY provided in environment or arguments.");
    console.log("To deploy headlessly via CLI:");
    console.log("  $env:PRIVATE_KEY=\"0x...\"; node scripts/deploy.mjs");
    console.log("Or deploy directly with 1-click in the Interminal browser interface (MetaMask/Rabby)!");
    console.log("\nCurrent compiled contract:");
    console.log("  Contract:", artifact.contractName);
    console.log("  Bytecode Size:", (artifact.bytecode.length / 2 - 1), "bytes");
    console.log("  ABI Methods:", artifact.abi.filter(x => x.type === "function").length);
    return;
  }

  const provider = new ethers.JsonRpcProvider(ARC_RPC, {
    chainId: ARC_CHAIN_ID,
    name: "arc-mainnet"
  });

  const network = await provider.getNetwork();
  console.log("Connected Network:", network.name, "ChainId:", Number(network.chainId));
  if (Number(network.chainId) !== ARC_CHAIN_ID) {
    throw new Error(`Chain ID mismatch! Expected ${ARC_CHAIN_ID}, got ${Number(network.chainId)}`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Deployer Address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log(`Deployer Arc Gas Balance: ${ethers.formatUnits(balance, 18)} native USDC`);

  if (balance === 0n) {
    throw new Error("Deployer has zero native USDC gas balance on Arc mainnet. Fund the wallet with native USDC first.");
  }

  console.log("\nBroadcasting deployment transaction to Arc Mainnet...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const feeData = await provider.getFeeData();
  const tx = await factory.deploy({
    gasLimit: 3_500_000,
    gasPrice: feeData.gasPrice || ethers.parseUnits("0.1", "gwei")
  });

  console.log("Deployment Tx Hash:", tx.deploymentTransaction().hash);
  console.log("Waiting for confirmation on Arc...");

  await tx.waitForDeployment();
  const deployedAddress = await tx.getAddress();
  console.log("\n========================================================");
  console.log("SUCCESS! InterminalSettlement deployed to Arc Mainnet!");
  console.log("Contract Address:", deployedAddress);
  console.log(`Explorer Link: https://explorer.arc.io/address/${deployedAddress}`);
  console.log("========================================================\n");

  artifact.deployedAddress = deployedAddress;
  artifact.deploymentTx = tx.deploymentTransaction().hash;
  artifact.deployedAt = new Date().toISOString();
  artifact.deployer = wallet.address;

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), "utf8");
  console.log("Updated artifacts/InterminalSettlement.json with deployment records.");
}

main().catch((err) => {
  console.error("Deployment failed:", err.message || err);
  process.exit(1);
});
