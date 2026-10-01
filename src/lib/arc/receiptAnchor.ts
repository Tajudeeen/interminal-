import { ARC } from "../../constants/arc";
import { TradeReceipt } from "../../types/receipt";
import { publicRpc } from "./rpcClient";
import { isAddress, walletRpc } from "./wallet";

export async function checkReceiptAnchoredOnchain(receipt: TradeReceipt, settlementAddress?: string): Promise<boolean> {
  const contract = settlementAddress || ARC.settlement;
  if (!receipt || !receipt.integrityDigest || !contract || !isAddress(contract)) return false;
  try {
    const hashNo0x = receipt.integrityDigest.replace(/^0x/, "").padStart(64, "0");
    const data = "0x9815336b" + hashNo0x;
    const res = await publicRpc("eth_call", [{ to: contract, data }, "latest"]);
    if (res && res.length >= 66) {
      const isAnchored = BigInt(res.slice(0, 66)) > 0n;
      if (isAnchored) {
        receipt.onchainAnchored = true;
        return true;
      }
    }
  } catch {}
  return false;
}

export async function anchorReceiptOnchain(
  receipt: TradeReceipt,
  traderAddress: string,
  settlementAddress?: string
): Promise<string> {
  const contract = settlementAddress || ARC.settlement;
  if (!contract || !isAddress(contract)) {
    throw new Error("Invalid settlement contract address");
  }
  const hashNo0x = (receipt.integrityDigest || "").replace(/^0x/, "").padStart(64, "0");
  const calldata = "0xea683470" + hashNo0x;
  const txHash = await walletRpc("eth_sendTransaction", [
    {
      from: traderAddress,
      to: contract,
      data: calldata,
      gas: "0x30D40",
    },
  ]);
  receipt.onchainAnchored = true;
  receipt.anchorTx = txHash;
  return txHash;
}
