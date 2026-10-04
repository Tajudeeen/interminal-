export type EnvironmentMode = "demo" | "testnet" | "mainnet";

export interface NetworkConfig {
  mode: EnvironmentMode;
  name: string;
  chainId: number;
  chainIdHex: string;
  rpc: string;
  explorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  usdcErc20: string;
  isProduction: boolean;
}

export const NETWORKS: Record<EnvironmentMode, NetworkConfig> = {
  demo: {
    mode: "demo",
    name: "Treasury Demo",
    chainId: 5042,
    chainIdHex: "0x13b2",
    rpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    usdcErc20: "0x3600000000000000000000000000000000000000",
    isProduction: false,
  },
  testnet: {
    mode: "testnet",
    name: "Arc Testnet",
    chainId: 5042002,
    chainIdHex: "0x4cef52",
    rpc: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    usdcErc20: "0x3600000000000000000000000000000000000000",
    isProduction: false,
  },
  mainnet: {
    mode: "mainnet",
    name: "Arc Mainnet",
    chainId: 5042,
    chainIdHex: "0x13b2",
    rpc: "https://rpc.mainnet.arc.io",
    explorer: "https://explorer.arc.io",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    usdcErc20: "0x3600000000000000000000000000000000000000",
    isProduction: true,
  },
};

export function networkFor(mode: EnvironmentMode): NetworkConfig {
  return NETWORKS[mode];
}
