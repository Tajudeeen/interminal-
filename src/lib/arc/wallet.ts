import type { EnvironmentMode } from "../../constants/networks";
import { NETWORKS } from "../../constants/networks";

type Eip6963Detail = {
  info: {
    uuid: string;
    name: string;
    rdns?: string;
    icon?: string;
  };
  provider: any;
};

const discovered = new Map<string, Eip6963Detail>();
let discoveryStarted = false;

function startWalletDiscovery() {
  if (typeof window === "undefined" || discoveryStarted) return;
  discoveryStarted = true;

  window.addEventListener("eip6963:announceProvider", ((event: CustomEvent<Eip6963Detail>) => {
    if (event.detail?.info?.uuid && event.detail.provider) {
      discovered.set(event.detail.info.uuid, event.detail);
    }
  }) as EventListener);

  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function getInjectedProviders(): Eip6963Detail[] {
  if (typeof window === "undefined") return [];
  startWalletDiscovery();

  const providers: Eip6963Detail[] = [...discovered.values()];
  const eth = (window as any).ethereum;
  if (eth) {
    if (Array.isArray(eth.providers)) {
      for (const provider of eth.providers) {
        if (!providers.some((item) => item.provider === provider)) {
          providers.push({
            info: {
              uuid: "legacy-" + providers.length,
              name: provider.isRabby ? "Rabby" : provider.isMetaMask ? "MetaMask" : "Injected wallet",
            },
            provider,
          });
        }
      }
    } else if (!providers.some((item) => item.provider === eth)) {
      providers.push({
        info: {
          uuid: "legacy-window-ethereum",
          name: eth.isRabby ? "Rabby" : eth.isMetaMask ? "MetaMask" : "Injected wallet",
        },
        provider: eth,
      });
    }
  }

  return providers;
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
}

export function getMobileWalletDappUrl(wallet: "metamask" = "metamask"): string {
  if (typeof window === "undefined") return "";
  const dappUrl = window.location.host + window.location.pathname + window.location.search;
  if (wallet === "metamask") {
    return "https://metamask.app.link/dapp/" + dappUrl;
  }
  return window.location.href;
}

export function openMobileWallet(wallet: "metamask" = "metamask"): void {
  const url = getMobileWalletDappUrl(wallet);
  if (!url) return;
  window.location.href = url;
}

export function isAddress(val: any): boolean {
  return typeof val === "string" && /^0x[0-9a-fA-F]{40}$/.test(val);
}

export function normalizeAddress(val: any): string {
  if (!isAddress(val)) throw new Error("Invalid EVM address: " + val);
  return val.toLowerCase();
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function padAddr(addr: string): string {
  return addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function pad32(val: bigint | number | string): string {
  if (typeof val === "bigint" || typeof val === "number") {
    return BigInt(val).toString(16).padStart(64, "0");
  }
  return String(val || "").replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function getInjected(): any {
  const providers = getInjectedProviders();
  if (!providers.length) return null;

  const preferred = providers.find(({ provider }) => provider?.isRabby)
    || providers.find(({ provider }) => provider?.isMetaMask && !provider?.isBraveWallet)
    || providers[0];

  return preferred.provider;
}

export function providerName(eth: any): string {
  if (!eth) return "No wallet";
  if (eth.isRabby) return "Rabby";
  if (eth.isCoinbaseWallet) return "Coinbase Wallet";
  if (eth.isRainbow) return "Rainbow";
  if (eth.isOkxWallet || eth.isOKExWallet) return "OKX Wallet";
  if (eth.isMetaMask) return "MetaMask";
  return "Injected wallet";
}

export type WalletEventHandlers = {
  accountsChanged?: (accounts: string[]) => void | Promise<void>;
  chainChanged?: (chainId: string) => void | Promise<void>;
};

export function subscribeWalletEvents(provider: any, handlers: WalletEventHandlers): () => void {
  if (!provider?.on) return () => {};
  const onAccountsChanged = (accounts: string[]) => { void handlers.accountsChanged?.(accounts); };
  const onChainChanged = (chainId: string) => { void handlers.chainChanged?.(chainId); };
  provider.on("accountsChanged", onAccountsChanged);
  provider.on("chainChanged", onChainChanged);
  return () => {
    try { provider.removeListener?.("accountsChanged", onAccountsChanged); } catch {}
    try { provider.removeListener?.("chainChanged", onChainChanged); } catch {}
  };
}

export async function switchOrAddNetwork(
  provider: any,
  mode: Exclude<EnvironmentMode, "demo">,
): Promise<number> {
  const network = NETWORKS[mode];
  const targetHex = network.chainIdHex;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetHex }],
    });
  } catch (error: any) {
    const code = error?.code;
    if (code !== 4902 && code !== -32603 && code !== "4902") throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: targetHex,
        chainName: network.name,
        nativeCurrency: network.nativeCurrency,
        rpcUrls: [network.rpc],
        blockExplorerUrls: [network.explorer],
      }],
    });
  }

  const actual = await provider.request({ method: "eth_chainId" });
  const actualId = Number.parseInt(String(actual), 16);
  if (actualId !== network.chainId) {
    throw new Error(
      "Wallet did not switch to " + network.name + " (" + network.chainId + "). Open the wallet app and select the network manually.",
    );
  }
  return actualId;
}

export async function walletRpc(method: string, params: any[] = []): Promise<any> {
  const eth = getInjected();
  if (!eth) throw new Error("No EVM wallet found");
  return eth.request({ method, params });
}

startWalletDiscovery();