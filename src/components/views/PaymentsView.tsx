import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { usePaymentStore } from '../../store/usePaymentStore';
import { formatUsdc } from '../../lib/payments/core.mjs';
import { Button } from '../ui/Button';
export const PaymentsView:React.FC=()=>{
 const {environmentMode,address,connected,wrongNetwork,connecting,connectWallet,switchToCurrentNetwork,targetBufferUsd,balances}=useAppStore();
 const {prepare,review,execute,cancel,busy,error,pending,recover}=usePaymentStore();
 const [recoveryHash,setRecoveryHash]=useState('');const [noSubmission,setNoSubmission]=useState(false);
 const [recipient,setRecipient]=useState('');const [amount,setAmount]=useState('1');const [now,setNow]=useState(Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const live=environmentMode==='mainnet';
 return <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
 <div><p className="eyebrow">{live?'Arc Mainnet · USDC payments':'Simulation · no funds move'}</p><h1 className="font-display font-black text-3xl mt-2">Pay without touching your reserve.</h1><p className="text-sub mt-3">Review the full recipient address, exact USDC amount, and maximum network fee. Your wallet confirms one native USDC payment. No token approval or settlement contract is involved.</p></div>
 <div className="grid sm:grid-cols-3 gap-3">{[['USDC balance',`${(balances.USDC||0).toLocaleString()} USDC`],['Protected reserve',`${targetBufferUsd.toLocaleString()} USDC`],['Before network fees',`${Math.max(0,(balances.USDC||0)-targetBufferUsd).toLocaleString()} USDC`]].map(([label,value])=><div key={label} className="card-themed border border-themed rounded-xl p-4"><p className="text-muted text-xs">{label}</p><p className="text-themed font-bold mt-2">{value}</p></div>)}</div>
 {live && (!connected || wrongNetwork) && <Button disabled={busy||connecting} onClick={()=>void (wrongNetwork?switchToCurrentNetwork():connectWallet('mainnet'))}>{wrongNetwork?'Switch to Arc and connect':'Connect Arc wallet'}</Button>}
 {pending && <div className="border border-amber-500 rounded-xl p-4 space-y-3"><p>Submitted payment needs a status check. Sending another payment is blocked.</p><p className="break-all font-mono text-xs">{pending.hash}</p><label className="block text-xs">Transaction hash from wallet activity<input aria-label="Recovery transaction hash" value={recoveryHash} onChange={e=>setRecoveryHash(e.target.value)} className="block w-full border border-themed rounded-lg p-2 bg-transparent mt-2" placeholder="Only needed if the wallet response was interrupted"/></label><Button disabled={busy} onClick={()=>void recover(recoveryHash)}>Check submitted payment</Button>{pending.hash==='unknown'&&<div className="space-y-2"><p className="text-xs text-sub">If the wallet never submitted a transaction, check its activity first. If you are uncertain, keep this payment blocked.</p><label className="flex gap-2 text-xs"><input type="checkbox" checked={noSubmission} onChange={e=>setNoSubmission(e.target.checked)}/>I checked wallet activity and no payment was submitted.</label><Button size="sm" disabled={busy||!noSubmission} onClick={()=>{usePaymentStore.getState().clearUnsubmitted(noSubmission);setNoSubmission(false);}}>Clear unsubmitted review</Button></div>}</div>}
 <form className="card-themed border border-themed rounded-2xl p-5 space-y-5" onSubmit={e=>{e.preventDefault();void prepare(recipient,amount);}}>
 <label className="block text-sm">Recipient wallet address<input aria-label="Recipient wallet address" autoComplete="off" spellCheck={false} className="mt-2 w-full rounded-lg border border-themed bg-transparent p-3 font-mono text-sm" value={recipient} disabled={busy||!!review} placeholder="0x…" onChange={e=>setRecipient(e.target.value)}/></label>
 {!live && <Button size="sm" disabled={busy||!!review} onClick={()=>setRecipient('0x000000000000000000000000000000000000beef')}>Use demo recipient</Button>}
 <label className="block text-sm">Payment amount in USDC<input aria-label="Payment amount in USDC" inputMode="decimal" className="mt-2 w-full rounded-lg border border-themed bg-transparent p-3" value={amount} disabled={busy||!!review} onChange={e=>setAmount(e.target.value)}/></label>
 <p className="text-muted text-xs">Wallet recipients only. At most six decimal places. Reserve protection includes the maximum fee estimate and is checked again before the wallet request.</p>
 {!review && <Button type="submit" isLoading={busy} disabled={live&&(!address||wrongNetwork||!!pending)}>Review {live?'mainnet':'simulated'} payment</Button>}
 {review && <section aria-label="Payment review" className="border border-lime-500 rounded-xl p-4 space-y-4">
 <h2 className="text-lg font-bold">Confirm every detail</h2><dl className="space-y-3 text-sm"><div><dt className="text-muted">To</dt><dd className="break-all font-mono">{review.recipient}</dd></div><div><dt className="text-muted">From</dt><dd className="break-all font-mono">{review.sender}</dd></div><div><dt className="text-muted">Exact payment</dt><dd>{formatUsdc(review.valueWei)} USDC</dd></div><div><dt className="text-muted">Maximum estimated network fee</dt><dd>{formatUsdc(review.maxFeeWei)} USDC</dd></div><div><dt className="text-muted">Cash remaining after payment and maximum fee</dt><dd>{formatUsdc(BigInt(review.balanceWei)-BigInt(review.valueWei)-BigInt(review.maxFeeWei))} USDC</dd></div></dl>
 {review.sender===review.recipient&&<p className="text-amber-500 text-sm">This is a self-transfer. It won’t count as submission payment evidence.</p>}
 <p role="status" className="text-xs text-muted">{now>=review.expiresAt?'Review expired. Start again.':`Review expires in ${Math.ceil((review.expiresAt-now)/1000)} seconds.`} {live?'Verify these details again in your wallet.':'Confirmation creates a simulated receipt only.'}</p>
 <div className="flex flex-wrap gap-3"><Button disabled={busy||now>=review.expiresAt} isLoading={busy} onClick={()=>void execute()}>{live?'Confirm in wallet':'Simulate payment'}</Button><Button disabled={busy} onClick={cancel}>Cancel review</Button></div>
 </section>}
 {error&&<p role="alert" className="text-neg text-sm">{error}</p>}
 </form><p className="text-sub text-xs">Reserve settings are enforced by this app. The chain independently proves the payment amount, recipient, sender, block, and actual fee. It cannot prove your original reserve setting.</p>
 </div>;
};
