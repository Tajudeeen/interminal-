export interface PaymentReceipt { receiptVersion:string;kind:string;mode:'mainnet'|'simulation';status:string;chainId:number;transactionHash:string|null;sender:string;recipient:string;valueWei:string;blockNumber:number;blockHash:string|null;gasUsed:string;effectiveGasPrice:string;feeWei:string;selfTransfer:boolean;policyEvidence:string;integrityDigest:string; }
export interface PaymentReview {sender:string;recipient:string;valueWei:string;reserveWei:string;balanceWei:string;maxFeeWei:string;expiresAt:number;tx:{from:string;to:string;value:string;data:string;gas:string;gasPrice:string};}
export type ReadRpc = (method:string,params?:any[])=>Promise<any>;
export const PAYMENT_CHAIN:number; export const PAYMENT_RPC:string; export const HASH:RegExp; export const ADDRESS:RegExp;
export function address(value:string):string;
export function usdcWei(value:string|number,allowZero?:boolean):bigint;
export function formatUsdc(value:string|bigint):string;
export function assertPaymentBudget(balance:bigint,value:bigint,fee:bigint,reserve:bigint):void;
export function arcRead(method:string,params?:any[]):Promise<any>;
export function preparePayment(input:{sender:string;recipient:string;amount:string;reserve:string},rpc?:ReadRpc):Promise<PaymentReview>;
export function canonical(value:any):string;
export function sealPayment(record:any):Promise<PaymentReceipt>;
export function assertPaymentRecord(record:any):Promise<PaymentReceipt>;
export function verifyPayment(hash:string,expected?:PaymentReceipt,rpc?:ReadRpc):Promise<PaymentReceipt>;
