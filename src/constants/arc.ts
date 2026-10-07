export interface ArcTokenMeta {
  address: string;
  decimals: number;
  name: string;
}

export const ARC = {
  name: "Arc",
  chainId: 5042,
  chainIdHex: "0x13b2",
  native: "USDC",
  nativeDecimals: 18,
  explorer: "https://explorer.arc.io",
  rpc: "https://rpc.mainnet.arc.io",
  rpcUrls: ["https://rpc.mainnet.arc.io"],
  blockExplorerUrls: ["https://explorer.arc.io"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  usdcErc20: "0x3600000000000000000000000000000000000000",
  router: "0x52FE40c00530db2e43d01652f903870571A14AFD",
  settlement: "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36",
  deployTx: "0x1d96a8c548268f851a22c23107fbac1a606bbd2b951856d5f9f0f4d3ecbae404",
  deployBlock: 23367508,
  uniswapV2Router: "0x52FE40c00530db2e43d01652f903870571A14AFD",
  avgGasCostUsdc: 0.0012,
  tokens: {
    WETH: { address: "0x128cC466B61f542da60c70e3aA11c10e19B84EDB", decimals: 18, name: "Wrapped Ether" },
    EURC: { address: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1", decimals: 6, name: "EURC" },
    USYC: { address: "0x8a5D989Bbb96929F689B0200f435f53dA42bF490", decimals: 6, name: "USYC" },
    cirBTC: { address: "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0", decimals: 8, name: "Circle BTC" },
  } as Record<string, ArcTokenMeta>,
};

export const RPC_ALLOW = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_call",
  "eth_getCode",
  "eth_getTransactionReceipt",
]);

export function isTokenAllowed(addr: string | null | undefined): boolean {
  if (!addr) return false;
  const a = addr.toLowerCase();
  if (a === ARC.usdcErc20.toLowerCase()) return true;
  if (a === ARC.settlement.toLowerCase()) return true;
  if (a === ARC.router.toLowerCase()) return true;
  if (Object.values(ARC.tokens).some((t) => t.address.toLowerCase() === a)) return true;
  return false;
}

export const TOKEN_ALLOW = new Set<string>([
  ARC.usdcErc20.toLowerCase(),
  ARC.settlement.toLowerCase(),
  ARC.router.toLowerCase(),
  ...Object.values(ARC.tokens).map((t) => t.address.toLowerCase()),
]);

export const USYC_APY = 0.03225; // Current USYC net-yield reference observed 2026-10-07. Update before submission if the issuer's published rate changes.
export const USYC_YIELD_AS_OF = "2026-10-07";
export const FED_FUNDS_RATE = 0.0525; // 5.25%
export const ECB_DEPOSIT_RATE = 0.0350; // 3.50%
