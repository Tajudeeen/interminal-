import { create } from 'zustand';
import { useAppStore } from './useAppStore';
import { getInjected } from '../lib/arc/wallet';
import { address, arcRead, assertPaymentBudget, assertPaymentRecord, formatUsdc, preparePayment, sealPayment, usdcWei, verifyPayment, type PaymentReceipt, type PaymentReview } from '../lib/payments/core.mjs';
const KEY = 'interminal_payments_v2';
const PENDING_KEY = 'interminal_payment_pending_v2';
type Pending = {hash:string;sender:string;recipient:string;valueWei:string};
function read<T>(key:string, fallback:T):T { try { const raw=localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function write(key:string,value:unknown):boolean {try {localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
function pendingInitial():Pending|null { const p=read<any>(PENDING_KEY,null); return p && (p.hash==='unknown' || /^0x[\da-f]{64}$/i.test(p.hash)) && /^0x[\da-f]{40}$/i.test(p.sender) && /^0x[\da-f]{40}$/i.test(p.recipient) && /^\d+$/.test(p.valueWei) ? p : null; }
function initialReceipts():PaymentReceipt[] { const values=read<any>(KEY,[]);return Array.isArray(values)?values.filter(r=>r?.receiptVersion==='2.0-ARC-PAYMENT').slice(0,200):[]; }
const demoSender = '0x000000000000000000000000000000000000deee';
interface PaymentState { review:PaymentReview|null;reviewMode:string|null;receipts:PaymentReceipt[];pending:Pending|null;busy:boolean;error:string;storageWarning:boolean;prepare:(recipient:string,amount:string)=>Promise<void>;cancel:()=>void;execute:()=>Promise<void>;recover:(hash?:string)=>Promise<void>;importReceipt:(receipt:unknown)=>Promise<void>;resetDemo:()=>void; }
export const usePaymentStore=create<PaymentState>((set,get)=>({
 review:null,reviewMode:null,receipts:initialReceipts(),pending:pendingInitial(),busy:false,error:'',storageWarning:false,
 cancel:()=>{if(!get().busy)set({review:null,error:''});},
 resetDemo:()=>{if(get().busy)return;const receipts=get().receipts.filter(r=>r.mode==='mainnet');set({review:null,receipts,error:''});write(KEY,receipts);},
 prepare:async(recipient,amount)=>{
  if(get().busy)return;
  const app=useAppStore.getState(); const mode=app.environmentMode; const sender=app.address;
  set({busy:true,error:'',review:null});useAppStore.setState({executing:true});
  try{
   if(mode==='testnet')throw new Error('Payments use Arc Mainnet. Testnet is a separate rehearsal.');
   if(mode==='mainnet' && get().pending)throw new Error('Resolve your submitted payment before starting another.');
   let review:PaymentReview;
   const reserve=String(app.targetBufferUsd);
   if(mode==='mainnet'){
    if(!sender || app.wrongNetwork || !app.connected)throw new Error('Connect an Arc Mainnet wallet first.');
    review=await preparePayment({sender,recipient,amount,reserve});
   }else{
    const value=usdcWei(amount), reserveWei=usdcWei(reserve,true), balance=usdcWei(String(app.balances.USDC||0),true);
    assertPaymentBudget(balance,value,0n,reserveWei);
    const to=address(recipient);
    review={sender:demoSender,recipient:to,valueWei:String(value),reserveWei:String(reserveWei),balanceWei:String(balance),maxFeeWei:'0',expiresAt:Date.now()+120000,tx:{from:demoSender,to,value:'0x'+value.toString(16),data:'0x',gas:'0x0',gasPrice:'0x0'}};
   }
   const current=useAppStore.getState();
   if(current.environmentMode!==mode || current.address!==sender || current.targetBufferUsd!==app.targetBufferUsd)throw new Error('Wallet or reserve changed. Review again.');
   set({review,reviewMode:mode});
  }catch(e){set({error:e instanceof Error?e.message:String(e)});}finally{set({busy:false});useAppStore.setState({executing:false});}
 },
 execute:async()=>{
  const {review,reviewMode}=get();if(!review || get().busy)return;
  const app=useAppStore.getState();
  set({busy:true,error:''});useAppStore.setState({executing:true});
  try{
   const current=()=>{const state=useAppStore.getState();if(Date.now()>review.expiresAt || state.environmentMode!==reviewMode || usdcWei(String(state.targetBufferUsd),true)!==BigInt(review.reserveWei) || (reviewMode==='mainnet' && (state.address?.toLowerCase()!==review.sender || state.wrongNetwork)))throw new Error('Review expired or wallet/reserve changed. Review again.');};
   current();
   let receipt:PaymentReceipt;
   if(reviewMode==='demo'){
    assertPaymentBudget(usdcWei(String(app.balances.USDC||0),true),BigInt(review.valueWei),0n,BigInt(review.reserveWei));
    receipt=await sealPayment({receiptVersion:'2.0-ARC-PAYMENT',kind:'native-usdc-payment',mode:'simulation',status:'simulated',chainId:5042,transactionHash:null,sender:review.sender,recipient:review.recipient,valueWei:review.valueWei,blockNumber:0,blockHash:null,gasUsed:'0',effectiveGasPrice:'0',feeWei:'0',selfTransfer:review.sender===review.recipient,policyEvidence:'Simulation only. No wallet signature, funds, or Arc transaction.'});
    if(!receipt.selfTransfer)useAppStore.setState(s=>({balances:{...s.balances,USDC:Number(formatUsdc(usdcWei(String(s.balances.USDC||0),true)-BigInt(review.valueWei)))}}));
   }else{
    if(get().pending)throw new Error('Resolve your submitted payment first.');
    const provider=getInjected();if(!provider)throw new Error('Wallet unavailable.');
    const checkWallet=async()=>{const [chain,accounts]=await Promise.all([provider.request({method:'eth_chainId'}),provider.request({method:'eth_accounts'})]);if(BigInt(chain)!==5042n || String(accounts?.[0]).toLowerCase()!==review.sender || getInjected()!==provider)throw new Error('Wallet account, provider, or chain changed.');};
    await checkWallet();
    await arcRead('eth_call',[review.tx,'latest']);
    const balance=BigInt(await arcRead('eth_getBalance',[review.sender,'latest']));
    assertPaymentBudget(balance,BigInt(review.valueWei),BigInt(review.maxFeeWei),BigInt(review.reserveWei));
    await checkWallet();current();
    const unknown={hash:'unknown',sender:review.sender,recipient:review.recipient,valueWei:review.valueWei};
    if(!write(PENDING_KEY,unknown))throw new Error('Device storage unavailable. Payment blocked so a submitted transaction cannot be lost.');
    set({pending:unknown});
    let hash:string;
    try{hash=await provider.request({method:'eth_sendTransaction',params:[{...review.tx,chainId:'0x13b2'}]});}catch(e:any){if(e?.code===4001 || e?.code==='4001'){set({pending:null});write(PENDING_KEY,null);}throw e;}
    if(typeof hash!=='string'||!/^0x[\da-f]{64}$/i.test(hash))throw new Error('Wallet returned no valid hash. Inspect wallet activity before retrying.');
    const pending={hash,sender:review.sender,recipient:review.recipient,valueWei:review.valueWei};
    set({pending,review:null,storageWarning:!write(PENDING_KEY,pending)});
    useAppStore.getState().addToast('Payment submitted',`Track ${hash}. A timeout does not mean failure.`,'info');
    const started=Date.now();
    while(true){
     const chainReceipt=await arcRead('eth_getTransactionReceipt',[hash]);
     if(chainReceipt){if(chainReceipt.status==='0x0'){set({pending:null});write(PENDING_KEY,null);throw new Error('Payment reverted. No successful payment.');}break;}
     if(Date.now()-started>90000)throw new Error('Confirmation pending. Use Check submitted payment before sending again.');
     await new Promise(r=>setTimeout(r,1500));
    }
    receipt=await verifyPayment(hash);
    if(BigInt(receipt.feeWei)>BigInt(review.maxFeeWei))throw new Error('Wallet fee exceeded the reviewed maximum. Inspect the confirmed transaction before continuing.');
    if(receipt.sender!==pending.sender || receipt.recipient!==pending.recipient || receipt.valueWei!==pending.valueWei)throw new Error('Wallet transaction differs from the reviewed payment. Inspect its details.');
    const savedReceipts=[receipt,...get().receipts.filter(r=>r.transactionHash!==receipt.transactionHash)].slice(0,200);
    if(!write(KEY,savedReceipts))throw new Error('Confirmed payment could not be archived. Keep the hash and recover it before another payment.');
    set({receipts:savedReceipts,pending:null});write(PENDING_KEY,null);
    const refreshed=await arcRead('eth_getBalance',[review.sender,'latest']).catch(()=>null);
    if(refreshed && useAppStore.getState().address?.toLowerCase()===review.sender)useAppStore.setState(s=>({balances:{...s.balances,USDC:Number(formatUsdc(BigInt(refreshed)))},nativeGasBalance:Number(formatUsdc(BigInt(refreshed)))}));
   }
   const receipts=[receipt,...get().receipts.filter(r=>r.integrityDigest!==receipt.integrityDigest)].slice(0,200);
   set({receipts,review:null,storageWarning:!write(KEY,receipts)});
   useAppStore.getState().addToast(receipt.mode==='mainnet'?'Payment confirmed':'Payment simulated',receipt.mode==='mainnet'?'Arc transaction and receipt matched. Export the evidence.':'No wallet action or funds moved.','ok');
   useAppStore.getState().setView('ledger');
  }catch(e){set({review:null,error:e instanceof Error?e.message:String(e)});}finally{set({busy:false});useAppStore.setState({executing:false});}
 },
 recover:async(suppliedHash)=>{
  const original=get().pending;
  const p=original && original.hash==='unknown' ? {...original,hash:suppliedHash?.trim()||'unknown'} : original;if(!p || get().busy)return;set({busy:true,error:''});
  try{
   if(!/^0x[\da-f]{64}$/i.test(p.hash))throw new Error('The wallet response was interrupted. Inspect wallet activity and paste its transaction hash. Payments stay blocked until resolved.');
   const raw=await arcRead('eth_getTransactionReceipt',[p.hash]);
   if(!raw)throw new Error('Still pending or unavailable. Do not repeat this payment.');
   if(raw.status==='0x0'){const tx=await arcRead('eth_getTransactionByHash',[p.hash]);if(!tx || tx.from?.toLowerCase()!==p.sender || tx.to?.toLowerCase()!==p.recipient || BigInt(tx.value)!==BigInt(p.valueWei) || BigInt(tx.chainId)!==5042n)throw new Error('Failed transaction does not match the saved payment.');set({pending:null});write(PENDING_KEY,null);throw new Error('Transaction reverted. No successful payment.');}
   const receipt=await verifyPayment(p.hash);
   if(receipt.sender!==p.sender || receipt.recipient!==p.recipient || receipt.valueWei!==p.valueWei)throw new Error('Transaction differs from saved review. Inspect wallet activity.');
   const receipts=[receipt,...get().receipts.filter(r=>r.transactionHash!==p.hash)].slice(0,200);
   if(!write(KEY,receipts))throw new Error('Unable to save confirmed receipt. Keep the hash and retry recovery before another payment.');set({receipts,pending:null,storageWarning:false});write(PENDING_KEY,null);
  }catch(e){set({error:e instanceof Error?e.message:String(e)});}finally{set({busy:false});}
 },
 importReceipt:async(value)=>{const receipt=await assertPaymentRecord(value);const receipts=[receipt,...get().receipts.filter(r=>r.integrityDigest!==receipt.integrityDigest)].slice(0,200);set({receipts,storageWarning:!write(KEY,receipts)});},
}));
