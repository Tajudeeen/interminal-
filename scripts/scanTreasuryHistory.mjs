import fs from 'node:fs';
import { ethers } from 'ethers';
import { arcRpc } from './arcRpc.mjs';

const settlement = '0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36';
const iface = new ethers.Interface(['event TradeSettled(bytes32 indexed receiptHash,address indexed trader,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 timestamp)']);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  if (Number(BigInt(await arcRpc('eth_chainId'))) !== 5042) throw new Error('Wrong chain');
  const toBlock = Number(BigInt(await arcRpc('eth_blockNumber')));
  const report = { chainId: 5042, settlement, fromBlock: 23367508, toBlock, completedThrough: 23367507, complete: false, events: [] };
  const output = new URL('../artifacts/treasury-history.json', import.meta.url);
  for (let from = report.fromBlock; from <= toBlock; from += 10000) {
    const to = Math.min(from + 9999, toBlock);
    let logs;
    for (let attempt = 0; attempt < 4; attempt++) {
      await delay(attempt ? 5000 * attempt : 1500);
      try {
        logs = await arcRpc('eth_getLogs', [{ address: settlement, fromBlock: ethers.toQuantity(from), toBlock: ethers.toQuantity(to), topics: [iface.getEvent('TradeSettled').topicHash] }]);
        break;
      } catch (error) { if (attempt === 3) throw error; }
    }
    for (const log of logs) {
      if (log.removed || log.address.toLowerCase() !== settlement) throw new Error('Unexpected log identity');
      const event = iface.parseLog(log);
      const tokens = [event.args.tokenIn.toLowerCase(), event.args.tokenOut.toLowerCase()];
      report.events.push({ transactionHash: log.transactionHash, blockNumber: Number(BigInt(log.blockNumber)), trader: event.args.trader, tokenIn: event.args.tokenIn, tokenOut: event.args.tokenOut, amountInRaw: String(event.args.amountIn), amountOutRaw: String(event.args.amountOut), isTreasuryFlow: tokens.includes('0x3600000000000000000000000000000000000000') && tokens.includes('0x8a5d989bbb96929f689b0200f435f53da42bf490') });
    }
    report.completedThrough = to;
    // Partial output cannot be mistaken for a complete scan after interruption.
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  report.complete = true;
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
