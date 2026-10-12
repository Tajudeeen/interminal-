export const PAYMENT_CHAIN = 5042;
export const PAYMENT_RPC = 'https://rpc.mainnet.arc.io';
export const HASH = /^0x[0-9a-f]{64}$/i;
export const ADDRESS = /^0x[0-9a-f]{40}$/i;
export function address(value) {
  if (!ADDRESS.test(value) || /^0x0{40}$/i.test(value)) throw new Error('Enter a non-zero EVM address.');
  return value.toLowerCase();
}
export function usdcWei(value, allowZero = false) {
  const s = String(value).trim();
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(s)) throw new Error('Use a USDC amount with at most six decimal places.');
  const [whole, fraction = ''] = s.split('.');
  const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0'));
  if (wei === 0n && !allowZero) throw new Error('Amount must be greater than zero.');
  return wei;
}
export function formatUsdc(wei) {
  const n = BigInt(wei);
  return `${n / 10n ** 18n}.${(n % 10n ** 18n).toString().padStart(18, '0').replace(/0+$/, '').padEnd(6, '0')}`;
}
export function assertPaymentBudget(balance, value, fee, reserve) {
  for (const n of [balance, value, fee, reserve]) if (typeof n !== 'bigint' || n < 0n) throw new Error('Invalid payment budget.');
  if (value === 0n) throw new Error('Amount must be greater than zero.');
  if (balance < value + fee + reserve) throw new Error('Payment and maximum network fee would breach your protected reserve. Reduce the amount or explicitly lower the reserve.');
}
export async function arcRead(method, params = []) {
  const allowed = new Set(['eth_chainId', 'eth_getBalance', 'eth_gasPrice', 'eth_estimateGas', 'eth_call', 'eth_getCode', 'eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_blockNumber']);
  if (!allowed.has(method)) throw new Error('Read-only RPC method blocked.');
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(PAYMENT_RPC, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({jsonrpc:'2.0',id:1,method,params}), signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error(`Arc RPC HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message || 'Arc RPC rejected the request.');
      if (!Object.hasOwn(json, 'result')) throw new Error('Arc RPC returned no result.');
      return json.result;
    } catch (error) { last = error; if (i < 2) await new Promise(r => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
}
function quantity(value) { if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) throw new Error('Malformed Arc quantity.'); return BigInt(value); }
export async function preparePayment({sender, recipient, amount, reserve}, rpc = arcRead) {
  sender = address(sender); recipient = address(recipient);
  const value = usdcWei(amount), protectedWei = usdcWei(reserve, true);
  const [chain, balance, code, price] = await Promise.all([rpc('eth_chainId'),rpc('eth_getBalance',[sender,'latest']),rpc('eth_getCode',[recipient,'latest']),rpc('eth_gasPrice')]);
  if (quantity(chain) !== 5042n) throw new Error('Arc RPC chain mismatch.');
  if (code !== '0x') throw new Error('This payment flow supports wallet recipients only. Contract recipients need a separate reviewed integration.');
  const tx = {from:sender,to:recipient,value:'0x'+value.toString(16),data:'0x'};
  const gas = quantity(await rpc('eth_estimateGas',[tx]));
  if (gas <= 0n || gas > 100000n) throw new Error('Unexpected gas estimate for a wallet payment.');
  const gasLimit = (gas * 120n + 99n) / 100n;
  const gasPrice = (quantity(price) * 125n + 99n) / 100n;
  if (gasPrice <= 0n) throw new Error('Network fee estimate unavailable.');
  const fee = gasLimit * gasPrice;
  assertPaymentBudget(quantity(balance),value,fee,protectedWei);
  return {sender,recipient,valueWei:value.toString(),reserveWei:protectedWei.toString(),balanceWei:quantity(balance).toString(),maxFeeWei:fee.toString(),expiresAt:Date.now()+120000,tx:{...tx,gas:'0x'+gasLimit.toString(16),gasPrice:'0x'+gasPrice.toString(16)}};
}
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
export async function sealPayment(record) {
  const {integrityDigest: _digest, ...payload} = record;
  const bytes = new TextEncoder().encode(canonical(payload));
  const digest = await crypto.subtle.digest('SHA-256',bytes);
  return {...payload,integrityDigest:'0x'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')};
}
export async function assertPaymentRecord(record) {
  if (!record || record.receiptVersion !== '2.0-ARC-PAYMENT' || record.kind !== 'native-usdc-payment' || record.chainId !== PAYMENT_CHAIN || !['mainnet','simulation'].includes(record.mode)) throw new Error('Not an Interminal Arc payment receipt.');
  address(record.sender); address(record.recipient);
  if (!/^\d{1,31}$/.test(record.valueWei) || BigInt(record.valueWei) <= 0n) throw new Error('Invalid receipt amount.');
  if (record.mode === 'mainnet' && (!HASH.test(record.transactionHash) || record.status !== 'confirmed')) throw new Error('Receipt has no confirmed mainnet payment.');
  if (record.mode === 'simulation' && (record.transactionHash !== null || record.status !== 'simulated')) throw new Error('Simulation cannot contain a transaction.');
  if ((await sealPayment(record)).integrityDigest !== record.integrityDigest) throw new Error('Receipt integrity mismatch.');
  return record;
}
export async function verifyPayment(hash, expected, rpc = arcRead) {
  if (!HASH.test(hash)) throw new Error('Enter a valid transaction hash.');
  if (expected) { await assertPaymentRecord(expected); if (expected.mode !== 'mainnet') throw new Error('Simulation receipts cannot prove a mainnet payment.'); if (expected.transactionHash.toLowerCase() !== hash.toLowerCase()) throw new Error('Receipt transaction differs.'); }
  const [chain, tx, receipt] = await Promise.all([rpc('eth_chainId'),rpc('eth_getTransactionByHash',[hash]),rpc('eth_getTransactionReceipt',[hash])]);
  if (quantity(chain) !== 5042n) throw new Error('Arc RPC chain mismatch.');
  if (!tx || !receipt) throw new Error('Transaction is pending or unavailable. Do not send it again.');
  if (receipt.status !== '0x1') throw new Error('Transaction reverted. No successful payment.');
  if (!HASH.test(receipt.blockHash) || receipt.blockHash.toLowerCase() !== String(tx.blockHash).toLowerCase() || quantity(tx.blockNumber) !== quantity(receipt.blockNumber)) throw new Error('Transaction and receipt blocks differ.');
  if (String(tx.hash).toLowerCase() !== hash.toLowerCase() || String(receipt.transactionHash).toLowerCase() !== hash.toLowerCase() || quantity(tx.chainId) !== 5042n) throw new Error('Transaction identity or chain differs.');
  const sender = address(tx.from), recipient = address(tx.to);
  if (address(receipt.from) !== sender || address(receipt.to) !== recipient) throw new Error('Receipt participants differ.');
  if (tx.input !== '0x' || quantity(tx.value) <= 0n) throw new Error('Transaction is not a plain native USDC payment.');
  const code = await rpc('eth_getCode',[recipient,receipt.blockNumber]);
  if (code !== '0x') throw new Error('Recipient was a contract at the execution block.');
  const result = {receiptVersion:'2.0-ARC-PAYMENT',kind:'native-usdc-payment',mode:'mainnet',status:'confirmed',chainId:PAYMENT_CHAIN,transactionHash:hash.toLowerCase(),sender,recipient,valueWei:quantity(tx.value).toString(),blockNumber:Number(quantity(receipt.blockNumber)),blockHash:receipt.blockHash.toLowerCase(),gasUsed:quantity(receipt.gasUsed).toString(),effectiveGasPrice:quantity(receipt.effectiveGasPrice).toString(),feeWei:(quantity(receipt.gasUsed)*quantity(receipt.effectiveGasPrice)).toString(),selfTransfer:sender===recipient,policyEvidence:'Reserve policy is app-side. Chain evidence proves the payment, not the original policy review.'};
  if (expected) for (const key of ['sender','recipient','valueWei','blockNumber','blockHash','feeWei','gasUsed','effectiveGasPrice','selfTransfer']) if (expected[key] !== result[key]) throw new Error(`Receipt ${key} does not match Arc.`);
  return sealPayment(result);
}
