import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {arcRead,verifyPayment} from '../src/lib/payments/core.mjs';
try{
 const checks=[];const add=(id,ok,detail)=>checks.push({id,ok,detail});
 add('arc-mainnet',BigInt(await arcRead('eth_chainId'))===5042n,'Read-only Arc chain 5042');
 const file='artifacts/payment-submission-evidence.json';
 if(!fs.existsSync(file))add('real-payment-proof',false,'No independently verified real payment committed. Complete a wallet payment, export its receipt, and run proof:payment.');
 else{const evidence=JSON.parse(fs.readFileSync(file,'utf8'));if(evidence.schema!=='interminal-payment-submission-v1')throw new Error('Wrong proof schema.');const receipt=await verifyPayment(evidence.receipt?.transactionHash,evidence.receipt);add('real-payment-proof',!receipt.selfTransfer,receipt.transactionHash);}
 const source=fs.readFileSync('src/constants/arc.ts','utf8');add('unsupported-swaps-disabled',source.includes('liveSwapsEnabled: false'),'Legacy swap execution remains disabled.');
 if(process.argv.includes('--release')){
  const local=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const response=await fetch('https://api.github.com/repos/Tajudeeen/interminal-/commits/main',{headers:{Accept:'application/vnd.github+json'}});if(!response.ok)throw new Error('Unable to verify the public main commit.');const remote=await response.json();add('pushed-main-commit',remote.sha===local,local);
  const html=fs.readFileSync('dist/index.html','utf8');const responseHtml=await fetch('https://useinterminal.vercel.app/',{cache:'no-store'});add('live-latest-build',responseHtml.ok&&(await responseHtml.text())===html,'Live HTML must match this built release exactly.');
 }
 const ready=checks.every(x=>x.ok);console.log(JSON.stringify({ready,scope:'reserve-protected-native-usdc-payments',checks},null,2));if(!ready)process.exitCode=2;
}catch(e){console.error('FAIL readiness:',e.message);process.exitCode=1;}
