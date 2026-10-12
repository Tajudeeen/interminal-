import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
export const TreasuryPolicyView:React.FC=()=>{
 const {balances,targetBufferUsd,setTargetBufferUsd,environmentMode,connected,wrongNetwork,connectWallet,connecting,setView}=useAppStore();const [draft,setDraft]=useState(String(targetBufferUsd));const [error,setError]=useState('');
 useEffect(()=>setDraft(String(targetBufferUsd)),[targetBufferUsd]);
 const cash=balances.USDC||0;const live=environmentMode==='mainnet';
 return <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6"><div><p className="eyebrow">{live?'Arc Mainnet treasury':'Simulation treasury'}</p><h1 className="font-bold text-3xl mt-2">Keep operating cash protected.</h1><p className="text-sub mt-3">Set the USDC you need to keep liquid before reviewing a payment. Network fees are included in the final payment budget.</p></div>
 {live&&(!connected||wrongNetwork)&&<Button isLoading={connecting} onClick={()=>void connectWallet('mainnet')}>Connect Arc wallet</Button>}
 <div className="grid sm:grid-cols-3 gap-3">{[['Liquid USDC',cash],['Protected reserve',targetBufferUsd],['Available before fees',Math.max(0,cash-targetBufferUsd)]].map(([label,value])=><div key={String(label)} className="card-themed rounded-xl border border-themed p-5"><p className="text-muted text-xs">{label}</p><p className="text-xl font-bold mt-2">{Number(value).toLocaleString()} USDC</p></div>)}</div>
 <form className="card-themed rounded-xl border border-themed p-5 space-y-4" onSubmit={e=>{e.preventDefault();if(!/^\d{1,12}(\.\d{1,6})?$/.test(draft)){setError('Use a non-negative reserve with at most six decimal places.');return;}setTargetBufferUsd(Number(draft));setError('');}}><label className="block text-sm">Operating reserve in USDC<input aria-label="Operating reserve in USDC" inputMode="decimal" value={draft} onChange={e=>setDraft(e.target.value)} className="block w-full mt-2 border border-themed rounded-lg p-3 bg-transparent"/></label><Button type="submit">Save reserve</Button>{error&&<p role="alert" className="text-neg">{error}</p>}<p className="text-xs text-sub">Reserve is saved per wallet on this device. Other apps and direct wallet transfers can spend it. Every payment review checks the live balance again.</p></form>
 <Button variant="primary" onClick={()=>setView('terminal')}>Review a USDC payment</Button>
 <details className="card-themed rounded-xl border border-themed p-5"><summary className="cursor-pointer font-bold">USYC reference and historical swap demo</summary><p className="text-sub text-sm my-3">USYC is optional reference context. The historical V2 route has no verified usable USDC/USYC pool, so live swaps are disabled. Its simulation and legacy settlement verifier remain available without being claimed as payment proof.</p><Button size="sm" onClick={()=>setView('swaps')}>Open reference/demo workspace</Button></details>
 </div>;
};
