import React, { useState } from 'react';
import { usePaymentStore } from '../../store/usePaymentStore';
import { useAppStore } from '../../store/useAppStore';
import { assertPaymentRecord, formatUsdc, type PaymentReceipt } from '../../lib/payments/core.mjs';
import { PaymentEvidencePanel, exportPayment } from '../treasury/PaymentEvidencePanel';
import { Button } from '../ui/Button';
export const PaymentLedgerView:React.FC=()=>{
 const {receipts,pending,recover,busy,error,storageWarning}=usePaymentStore();const [selected,setSelected]=useState<PaymentReceipt>();const [integrity,setIntegrity]=useState('');
 const [recoveryHash,setRecoveryHash]=useState('');
 const inspect=async(receipt:PaymentReceipt)=>{setSelected(receipt);try{await assertPaymentRecord(receipt);setIntegrity('Receipt integrity passed. Mainnet confirmation must be rechecked against Arc.');}catch(e){setIntegrity(e instanceof Error?e.message:String(e));}};
 return <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6"><div className="flex flex-wrap gap-3 justify-between"><div><h1 className="font-bold text-3xl">Payment receipts</h1><p className="text-sub text-sm mt-2">Saved on this device. Export JSON for a portable backup.</p></div><Button onClick={()=>useAppStore.getState().setView('terminal')}>Review a payment</Button></div>
 {storageWarning&&<p className="text-neg text-sm" role="alert">Device storage is unavailable. Save the transaction hash and export your receipt now.</p>}
 {pending&&<section className="border border-amber-500 rounded-xl p-4 space-y-3"><p>Submitted payment requires a status check.</p><p className="font-mono text-xs break-all">{pending.hash}</p><label className="block text-xs">Transaction hash from wallet activity<input aria-label="Recovery transaction hash" value={recoveryHash} onChange={e=>setRecoveryHash(e.target.value)} className="block w-full border border-themed rounded-lg p-2 bg-transparent mt-2" placeholder="Only needed if the wallet response was interrupted"/></label><Button disabled={busy} onClick={()=>void recover(recoveryHash)}>Check submitted payment</Button>{error&&<p role="alert" className="text-neg">{error}</p>}</section>}
 <PaymentEvidencePanel/>
 <div className="space-y-3">{receipts.length?receipts.map((r,index)=><article key={r.integrityDigest+index} className="card-themed border border-themed rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between"><div><p className="text-xs text-muted">{r.mode==='simulation'?'SIMULATION · NO TRANSACTION':'MAINNET · REVERIFY AGAINST ARC'}</p><p className="font-bold mt-2">{formatUsdc(r.valueWei)} USDC</p><p className="text-xs font-mono break-all mt-1">To {r.recipient}</p>{r.transactionHash&&<a className="text-cyan text-xs" href={`?payment=${r.transactionHash}`}>Open wallet-free proof</a>}</div><div className="flex gap-2"><Button size="sm" onClick={()=>void inspect(r)}>Inspect receipt</Button><Button size="sm" onClick={()=>exportPayment(r)}>Export JSON</Button></div></article>):<p className="text-sub">No payment receipts yet. Start with a simulated payment, or import a real receipt.</p>}</div>
 {selected&&<section className="card-themed rounded-xl border border-themed p-4 space-y-3" aria-label="Payment receipt details"><h2 className="font-bold">Receipt details</h2><p role="status" className="text-sm text-sub">{integrity}</p><pre className="text-xs overflow-x-auto max-h-96">{JSON.stringify(selected,null,2)}</pre><Button size="sm" onClick={()=>setSelected(undefined)}>Close receipt</Button></section>}
 </div>;
};
