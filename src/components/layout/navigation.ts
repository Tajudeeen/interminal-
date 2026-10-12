export const CORE_NAV_ITEMS = [
  {
    id: "portfolio",
    label: "Treasury",
    icon: "savings",
    detail: "Set the USDC operating reserve",
  },
  {
    id: "terminal",
    label: "Execute",
    icon: "swap_horiz",
    detail: "Review recipient, payment, and gas",
  },
  {
    id: "ledger",
    label: "Receipts",
    icon: "receipt_long",
    detail: "Inspect saved execution evidence",
  },
  {
    id: "proof",
    label: "Verify",
    icon: "verified_user",
    detail: "Verify a USDC payment without a wallet",
  },
] as const;

export const LAB_NAV_ITEMS = [
  { id: "swaps", label: "USYC reference/demo", icon: "swap_horiz", detail: "Historical demo, live swaps disabled" },
  {
    id: "markets",
    label: "Arc routes",
    icon: "route",
    detail: "Registered assets and price sources",
  },
  {
    id: "ai",
    label: "Market context",
    icon: "query_stats",
    detail: "Read-only deterministic indicators",
  },
  {
    id: "testnet",
    label: "Testnet rehearsal",
    icon: "science",
    detail: "Optional wallet/network check",
  },
] as const;

export const NAV_ITEMS = [...CORE_NAV_ITEMS, ...LAB_NAV_ITEMS] as const;
