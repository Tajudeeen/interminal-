import fs from 'node:fs';
import {verifyPayment} from '../src/lib/payments/core.mjs';
try{
 const args=process.argv.slice(2);let expected;
 if(args[0]==='--receipt'){if(!args[1])throw new Error('Supply a payment receipt path.');expected=JSON.parse(fs.readFileSync(args[1],'utf8'));}
 const hash=expected?.transactionHash||args[0];
 const receipt=await verifyPayment(hash,expected);
 console.log(JSON.stringify({verified:true,receipt},null,2));
}catch(e){console.error('FAIL payment verification:',e.message);process.exitCode=1;}
