import fs from 'node:fs';
import {verifyPayment,formatUsdc} from '../src/lib/payments/core.mjs';
try{
 const args=process.argv.slice(2);if(args[0]!=='--receipt'||!args[1])throw new Error('Usage: npm run proof:payment -- --receipt private-evidence/payment.json');
 const expected=JSON.parse(fs.readFileSync(args[1],'utf8'));
 const receipt=await verifyPayment(expected.transactionHash,expected);
 if(receipt.selfTransfer)throw new Error('Self-transfers are excluded from submission payment proof.');
 const evidence={schema:'interminal-payment-submission-v1',appUrl:'https://useinterminal.vercel.app/',repoUrl:'https://github.com/Tajudeeen/interminal-',builderUrl:'https://x.com/Deeen_Codes',verifiedAt:new Date().toISOString(),receipt};
 fs.writeFileSync('artifacts/payment-submission-evidence.json',JSON.stringify(evidence,null,2)+'\n');
 fs.writeFileSync('docs/FINAL_MAINNET_EVIDENCE.md',`# Verified Arc USDC payment\n\nObserved and independently verified ${evidence.verifiedAt}.\n\n- Amount: ${formatUsdc(receipt.valueWei)} USDC\n- Sender: ${receipt.sender}\n- Recipient: ${receipt.recipient}\n- Block: ${receipt.blockNumber}\n- Actual fee: ${formatUsdc(receipt.feeWei)} USDC\n- Transaction: https://explorer.arc.io/tx/${receipt.transactionHash}\n- Wallet-free reviewer link: ${evidence.appUrl}?payment=${receipt.transactionHash}\n\nThe chain proves a confirmed native USDC payment. Reserve checks are enforced by the app and aren't an on-chain guarantee. This evidence doesn't claim a USYC trade or custom settlement deployment.\n`);
 console.log('Verified public payment proof written. No wallet signature or key is included.');
}catch(e){console.error('FAIL proof generation:',e.message);process.exitCode=1;}
