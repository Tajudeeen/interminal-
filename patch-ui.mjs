// patch-ui.mjs — overhauls header, landing, markets, activity, adds import modal & category filter
import fs from "fs";
let src = fs.readFileSync("app.js", "utf8");

// ════════════════════════════════════════════════════════
// 1. HEADER — floating pill nav matching Ovryth
// ════════════════════════════════════════════════════════
const headerStart = `function header() {`;
const headerEnd   = `\nfunction landing() {`;
const headerNew = `function header() {
  const p = portfolioSnapshot();
  const navItems = [
    { id: "terminal",  label: "Terminal"   },
    { id: "markets",   label: "Markets"    },
    { id: "portfolio", label: "Portfolio"  },
    { id: "ai",        label: "AI"         },
    { id: "activity",  label: "Activity"   },
    { id: "proof",     label: "Proof"      },
  ];
  const chainOk = state.proof?.live?.chainOk;
  const statusDot = chainOk && state.livePortfolio
    ? '<span class="w-1.5 h-1.5 rounded-full bg-paid animate-pulse"></span>'
    : '<span class="w-1.5 h-1.5 rounded-full bg-electric animate-pulse"></span>';
  const statusText = chainOk && state.livePortfolio
    ? '<span class="text-paid font-mono text-[10px] font-semibold tracking-wider">ARC · LIVE</span>'
    : '<span class="text-electric font-mono text-[10px] tracking-wider">ARC · ' + (state.livePortfolio ? 'WALLET' : 'RPC') + '</span>';

  return \`
  <header class="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-3 pb-0 pointer-events-none">
    <div class="max-w-[1080px] mx-auto pointer-events-auto">
      <div class="flex items-center justify-between gap-2 rounded-pill border border-mist bg-paper/95 backdrop-blur-md px-3 py-2 shadow-invoice">
        <!-- Logo + status -->
        <div class="flex items-center gap-2 shrink-0">
          \${logoSvg(22)}
          <div class="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-mist/60 border border-mist">
            \${statusDot}
            \${statusText}
            <span class="text-fog font-mono text-[10px] tnum">#\${state.block.toLocaleString()}</span>
          </div>
          <div class="hidden 2xl:flex items-center gap-1 px-2 py-0.5 rounded-pill bg-mist/40 border border-mist/60">
            <span class="w-1.5 h-1.5 rounded-full \${state.marketFeedStatus?.live ? 'bg-paid animate-pulse' : 'bg-fog'}"></span>
            <span class="font-mono text-[10px] \${state.marketFeedStatus?.live ? 'text-paid' : 'text-fog'}">\${state.marketFeedStatus?.live ? 'DEX LIVE' : 'DEX OFF'}</span>
          </div>
        </div>

        <!-- Pill navigation -->
        <nav class="hidden md:flex items-center gap-0.5 bg-snow/40 rounded-pill px-1 py-1">
          \${navItems.map(({ id, label }) => \`
            <button data-nav="\${id}" class="px-3 py-1 text-[12px] font-display font-semibold rounded-pill transition-colors \${state.view === id ? 'bg-mist text-ink' : 'text-smoke hover:text-ink hover:bg-mist/50'}">\${label}</button>
          \`).join("")}
        </nav>

        <!-- Right cluster -->
        <div class="flex items-center gap-1.5 shrink-0">
          <div class="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-pill bg-mist/40 tnum text-[11px]">
            <span class="text-smoke">ETH</span>
            <span class="font-mono text-ink">\${fmtUsd(PAIRS["ETH/USDC"].price)}</span>
            <span class="\${PAIRS["ETH/USDC"].change >= 0 ? 'text-paid' : 'text-refused'}">\${fmtPct(PAIRS["ETH/USDC"].change)}</span>
            <span class="text-mist">|</span>
            <span class="text-smoke">ARC</span>
            <span class="font-mono text-ink">\${fmtUsd(PAIRS["ARC/USDC"].price)}</span>
            <span class="\${PAIRS["ARC/USDC"].change >= 0 ? 'text-paid' : 'text-refused'}">\${fmtPct(PAIRS["ARC/USDC"].change)}</span>
          </div>

          <button data-act="import-token" class="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-pill border border-mist text-smoke hover:text-electric hover:border-electric/50 text-[11px] font-display transition-colors" title="Import Arc ERC-20 token">
            <span class="material-symbols-outlined text-[14px]">add_circle</span>
            <span class="hidden lg:inline">Import</span>
          </button>

          <button data-act="search" class="p-1.5 rounded-pill hover:bg-mist text-smoke transition-colors" title="Search (Ctrl+K)">
            <span class="material-symbols-outlined text-[17px]">search</span>
          </button>
          <button data-act="alerts" class="relative p-1.5 rounded-pill hover:bg-mist text-smoke transition-colors">
            <span class="material-symbols-outlined text-[17px]">notifications</span>
            \${state.alerts.length ? \`<span class="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-refused text-[8px] flex items-center justify-center text-white font-bold">\${state.alerts.length}</span>\` : ""}
          </button>

          <!-- Wallet pill -->
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-pill \${state.livePortfolio ? 'bg-paid/10 border border-paid/25' : 'bg-mist border border-mist'} text-[11px]">
            <span class="w-1.5 h-1.5 rounded-full \${state.livePortfolio ? 'bg-paid' : 'bg-electric'} shrink-0"></span>
            <span class="hidden sm:inline text-[10px] uppercase \${state.livePortfolio ? 'text-paid' : 'text-electric'} font-mono">\${state.livePortfolio ? "Live" : "Demo"}</span>
            <a class="font-mono text-[10px] hover:text-electric truncate max-w-[72px]" href="\${ARC.explorer}/address/\${state.address}" target="_blank" rel="noreferrer">\${shortAddr(state.address)}</a>
            \${state.livePortfolio ? \`<span class="hidden sm:inline font-mono text-fog text-[10px] tnum">\${fmtUsd(p.total)}</span>\` : ""}
          </div>

          \${!state.livePortfolio ? \`
            <button data-act="connect" class="hidden sm:flex items-center gap-1 px-3 py-1 rounded-pill bg-electric text-white font-display font-bold text-[11px] hover:bg-electric/90 transition-colors">
              <span class="material-symbols-outlined text-[14px]">account_balance_wallet</span> Connect
            </button>
          \` : ""}
          <button data-act="disconnect" class="w-7 h-7 rounded-full bg-mist/70 hover:bg-mist text-smoke flex items-center justify-center shrink-0 transition-colors">
            <span class="material-symbols-outlined text-[16px]">person</span>
          </button>
        </div>
      </div>
    </div>
  </header>\`;
}

`;

const idxHeader = src.indexOf(headerStart);
const idxLanding = src.indexOf(headerEnd, idxHeader);
src = src.slice(0, idxHeader) + headerNew + src.slice(idxLanding + 1);

// ════════════════════════════════════════════════════════
// 2. LANDING — clean Ovryth-style hero + flow diagram
// ════════════════════════════════════════════════════════
const landingStart = `function landing() {`;
const landingEnd   = `\nfunction terminalView() {`;
const landingNew = `function landing() {
  const eth = getInjected();
  const detected = providerName(eth);
  return \`
  <div class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 pt-20">
    <!-- Grid background -->
    <div class="absolute inset-0 opacity-[0.07] pointer-events-none" style="background-image:linear-gradient(#1E2433 1px,transparent 1px),linear-gradient(90deg,#1E2433 1px,transparent 1px);background-size:52px 52px"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-paper/60 to-paper pointer-events-none"></div>

    <!-- Hero -->
    <div class="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">
      \${logoSvg(44)}
      <div class="mt-7 font-mono text-[10px] tracking-[0.4em] text-electric uppercase">Built on Arc Mainnet · Chain 5042</div>
      <h1 class="mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
        The trading terminal<br/><span class="text-electric">for Arc.</span>
      </h1>
      <p class="mt-5 text-smoke text-[15px] max-w-lg leading-relaxed">
        14 fail-closed security gates. Real DEX prices. EIP-712 trade authorization.<br/>
        Every asset on Arc — now in one workstation.
      </p>

      <!-- Stats row -->
      <div class="mt-7 flex flex-wrap justify-center gap-6 text-[12px] font-mono">
        <div class="text-center"><div class="text-paid font-semibold text-[18px]">\${Object.keys(PAIRS).length + Object.keys(CUSTOM_PAIRS).length}</div><div class="text-fog uppercase tracking-wider text-[10px]">Markets</div></div>
        <div class="text-center"><div class="text-electric font-semibold text-[18px]">14</div><div class="text-fog uppercase tracking-wider text-[10px]">Security Gates</div></div>
        <div class="text-center"><div class="text-ink font-semibold text-[18px]">0</div><div class="text-fog uppercase tracking-wider text-[10px]">Keys Held</div></div>
      </div>

      <!-- CTA buttons -->
      <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm">
        <button data-act="connect" \${state.connecting ? "disabled" : ""} class="w-full sm:flex-1 px-6 py-3 rounded-pill bg-electric text-white font-display font-bold text-[14px] hover:bg-electric/90 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-invoice">
          <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          \${state.connecting ? "Connecting…" : "Connect Arc Wallet"}
        </button>
        <button data-act="demo" class="w-full sm:flex-1 px-6 py-3 rounded-pill border border-mist hover:border-smoke text-smoke hover:text-ink font-display font-semibold text-[14px] transition flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[17px]">preview</span> Preview
        </button>
      </div>
      \${eth ? \`<div class="mt-2 text-fog text-[11px] font-mono">\${detected} detected</div>\` : ""}

      <!-- How the money moves (Ovryth-style flow diagram) -->
      <div class="mt-12 w-full bg-snow/50 border border-mist rounded-panel p-5 text-left">
        <div class="font-mono text-[10px] uppercase tracking-widest text-fog mb-4">How the money moves</div>
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 overflow-x-auto pb-1">
          \${[
            { label: "Arc Wallet",         sub: "Your browser wallet — no key custody",           color: "text-electric", dot: "bg-electric" },
            { label: "EIP-712 Mandate",    sub: "Signed ticket with deadline + slippage bounds",  color: "text-paid",     dot: "bg-paid"     },
            { label: "Interminal Engine",  sub: shortAddr(ARC.settlement) + " on chain 5042",     color: "text-fog",      dot: "bg-fog"      },
            { label: "Arc AMM",            sub: "Settles to native liquidity hub",                color: "text-ink",      dot: "bg-smoke"    },
          ].map((step, i, arr) => \`
            <div class="flex items-center gap-2 shrink-0">
              <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full \${step.dot}"></span>
                  <span class="font-display font-semibold text-[13px] \${step.color}">\${step.label}</span>
                </div>
                <span class="font-mono text-[10px] text-fog pl-3.5">\${step.sub}</span>
              </div>
              \${i < arr.length - 1 ? '<span class="text-mist text-[18px] hidden sm:block shrink-0">→</span>' : ""}
            </div>
          \`).join("")}
        </div>
      </div>

      <!-- Markets quick view -->
      <div class="mt-6 w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
        \${["ETH/USDC","BTC/USDC","EURC/USDC","ARC/USDC"].map((k) => {
          const v = PAIRS[k];
          const isUp = v.change >= 0;
          return \`<div class="bg-snow border border-mist rounded-card p-3 text-left card-hover">
            <div class="font-mono text-[10px] text-fog">\${k}</div>
            <div class="font-display font-bold text-[16px] mt-0.5 tnum">\${k === "EURC/USDC" ? v.price.toFixed(4) : fmtUsd(v.price)}</div>
            <div class="font-mono text-[11px] \${isUp ? 'text-paid' : 'text-refused'}">\${fmtPct(v.change)}</div>
          </div>\`;
        }).join("")}
      </div>
    </div>
  </div>\`;
}

`;

const idxLanding2 = src.indexOf(landingStart);
const idxTerminal = src.indexOf(landingEnd, idxLanding2);
src = src.slice(0, idxLanding2) + landingNew + src.slice(idxTerminal + 1);

// ════════════════════════════════════════════════════════
// 3. MARKETS VIEW — Ovryth-style with category filter + custom import card
// ════════════════════════════════════════════════════════
const mkStart = `function marketsView() {`;
const mkEnd   = `\nfunction portfolioView() {`;

const mkNew = `function marketsView() {
  const cat = state.marketCat || "all";
  const allPairs = { ...PAIRS };
  const cats = [
    { id: "all",      label: "All Markets" },
    { id: "rwa_fx",   label: "RWA & FX"    },
    { id: "bluechip", label: "Bluechips"   },
    { id: "defi",     label: "DeFi"        },
    { id: "arc",      label: "Arc Native"  },
    { id: "imported", label: "Imported"    },
  ];
  const filtered = Object.entries(allPairs).filter(([, v]) => cat === "all" || v.cat === cat);
  return \`
  <main class="pt-20 pb-20 md:pb-4 min-h-screen">
    <!-- Macro stats strip -->
    <div class="px-3 sm:px-5 pt-3 pb-0 grid grid-cols-2 sm:grid-cols-5 gap-2">
      \${[
        ["Arc Ecosystem TVL", "$248.65M", "+4.12%", "text-paid"],
        ["24h Aggregate Vol",  "$142.80M", "+12.4%",  "text-paid"],
        ["AMM Median Gas",    "0.0008 USDC","0.8s",  "text-electric"],
        ["Market Regime",     "68/100",   "Expansion","text-paid"],
        ["Cross-Pool Depth",  "$84.20M",  "Native L1","text-fog"],
      ].map(([l,v,s,sc], idx) => \`
        <div class="bg-snow border border-mist rounded-card p-3 card-hover \${idx===4?"col-span-2 sm:col-span-1":""}">
          <div class="text-fog font-mono text-[10px] uppercase tracking-wider">\${l}</div>
          <div class="font-display font-bold text-[20px] mt-1">\${v}</div>
          <div class="font-mono text-[10px] \${sc} mt-0.5">\${s}</div>
        </div>
      \`).join("")}
    </div>

    <!-- Category filter tabs -->
    <div class="px-3 sm:px-5 mt-4 flex items-center gap-2 overflow-x-auto pb-1">
      \${cats.map(({ id, label }) => \`
        <button data-cat="\${id}" class="shrink-0 px-3 py-1.5 rounded-pill text-[12px] font-display font-semibold transition-colors \${cat === id ? 'bg-electric/20 border border-electric/40 text-electric' : 'bg-snow border border-mist text-smoke hover:text-ink hover:border-smoke'}">\${label}</button>
      \`).join("")}
      <button data-act="import-token" class="ml-auto shrink-0 px-3 py-1.5 rounded-pill text-[12px] font-display font-semibold bg-mist border border-line-active text-ink hover:bg-line-active flex items-center gap-1.5 transition-colors">
        <span class="material-symbols-outlined text-[15px]">add_circle</span> Import Arc Token
      </button>
    </div>

    <div class="px-3 sm:px-5 mt-4 pb-6 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <!-- Pairs table -->
      <div class="xl:col-span-8 bg-snow border border-mist rounded-panel overflow-hidden">
        <div class="px-4 py-3 flex items-center justify-between border-b border-mist">
          <span class="font-display font-semibold text-[13px]">Arc Verified Markets</span>
          <span class="font-mono text-[11px] text-fog">\${filtered.length} pairs</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left tnum text-[12px] min-w-[560px]">
            <thead>
              <tr class="border-b border-mist text-[10px] uppercase font-mono text-fog">
                <th class="px-4 py-2 font-medium">Pair</th>
                <th>Last</th><th>24h Chg</th><th>Volume</th><th>TVL</th>
                <th>Category</th><th class="pr-4"></th>
              </tr>
            </thead>
            <tbody>
              \${filtered.map(([k, v]) => {
                const isUp = v.change >= 0;
                const catLabel = { rwa_fx:"RWA/FX", bluechip:"Bluechip", defi:"DeFi", arc:"Arc", imported:"Custom" }[v.cat] || v.cat;
                const catColor = { rwa_fx:"badge-anchored", bluechip:"badge-settled", defi:"badge-held", arc:"badge-pending", imported:"badge-refused" }[v.cat] || "badge-pending";
                return \`
                <tr class="border-b border-mist/60 hover:bg-mist/30 transition-colors">
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-2">
                      <span class="w-7 h-7 rounded-full bg-mist/60 border border-mist flex items-center justify-center font-mono text-[10px] text-smoke">\${v.base.slice(0,2)}</span>
                      <div>
                        <div class="font-display font-semibold text-[13px]">\${k}</div>
                        <div class="font-mono text-[10px] text-fog">\${TOKEN_META[v.base]?.name || v.base}</div>
                      </div>
                    </div>
                  </td>
                  <td class="font-mono font-semibold">\${k==="EURC/USDC"?v.price.toFixed(4):fmtUsd(v.price)}</td>
                  <td class="font-mono \${isUp?"text-paid":"text-refused"}">\${fmtPct(v.change)}</td>
                  <td class="font-mono text-smoke">\${fmtUsd(v.vol/1e6)}M</td>
                  <td class="font-mono text-smoke">\${fmtUsd(v.tvl/1e6)}M</td>
                  <td><span class="px-2 py-0.5 rounded-pill text-[10px] font-mono \${catColor}">\${catLabel}</span></td>
                  <td class="pr-4">
                    <div class="flex items-center gap-1.5">
                      <button data-watch="\${k}" class="text-[14px] \${state.watchlist.includes(k)?"text-electric":"text-fog hover:text-smoke"}">\${state.watchlist.includes(k)?"★":"☆"}</button>
                      <button data-trade="\${k}" class="px-2.5 py-0.5 rounded-pill bg-electric/15 border border-electric/35 text-electric text-[11px] font-display font-semibold hover:bg-electric/25 transition">Trade</button>
                    </div>
                  </td>
                </tr>\`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right column: watchlist + custom import card -->
      <div class="xl:col-span-4 flex flex-col gap-3">
        <div class="bg-snow border border-mist rounded-panel p-4">
          <div class="font-display font-semibold text-[13px] mb-3">Watchlist</div>
          \${state.watchlist.map((k) => {
            const v = PAIRS[k]; if (!v) return "";
            return \`<button data-trade="\${k}" class="w-full flex justify-between items-center py-2 tnum text-[12px] border-b border-mist/50 last:border-0 hover:text-electric transition-colors">
              <span class="font-display font-semibold">\${k}</span>
              <div class="text-right">
                <div class="font-mono font-semibold">\${k==="EURC/USDC"?v.price.toFixed(4):fmtUsd(v.price)}</div>
                <div class="font-mono text-[10px] \${v.change>=0?"text-paid":"text-refused"}">\${fmtPct(v.change)}</div>
              </div>
            </button>\`;
          }).join("")}
        </div>

        <!-- Custom Arc token import card -->
        <div class="bg-snow border border-electric/25 rounded-panel p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-electric text-[18px]">add_circle</span>
            <span class="font-display font-semibold text-[13px]">Import Any Arc Token</span>
          </div>
          <p class="font-mono text-fog text-[11px] mb-3">Paste any ERC-20 contract address on Arc mainnet to add it to your trading desk.</p>
          <div class="flex gap-2">
            <input id="import-addr-inline" class="flex-1 bg-paper border border-mist rounded-card px-3 py-1.5 font-mono text-[11px] text-ink placeholder-fog outline-none focus:border-electric/60" placeholder="0x… token address" />
            <button data-act="import-token-inline" class="px-3 py-1.5 rounded-card bg-electric/20 border border-electric/40 text-electric font-display font-semibold text-[11px] hover:bg-electric/30 transition whitespace-nowrap">
              Import
            </button>
          </div>
          \${Object.keys(CUSTOM_PAIRS).length ? \`
            <div class="mt-3 font-mono text-[10px] text-fog">\${Object.keys(CUSTOM_PAIRS).length} custom token(s) loaded</div>
          \` : ""}
        </div>
      </div>
    </div>
  </main>\`;
}

`;

const idxMk = src.indexOf(mkStart);
const idxPf = src.indexOf(mkEnd, idxMk);
src = src.slice(0, idxMk) + mkNew + src.slice(idxPf + 1);

// ════════════════════════════════════════════════════════
// 4. ACTIVITY VIEW — Ovryth pill badge ledger
// ════════════════════════════════════════════════════════
const actStart = `function activityView() {`;
const actEnd   = `\nfunction proofView() {`;
const actIdx   = src.indexOf(actStart);
const actEndIdx= src.indexOf(actEnd, actIdx);
const actNew = `function activityView() {
  const rows = state.activity.slice().reverse();
  function statusBadge(status, type) {
    if (type === "mandate") return '<span class="badge-anchored px-2 py-0.5 rounded-pill font-mono text-[10px]">mandate</span>';
    const s = (status || "pending").toLowerCase();
    const cls = s === "settled"  ? "badge-settled"
              : s === "anchored" ? "badge-anchored"
              : s === "refused"  ? "badge-refused"
              : s === "held"     ? "badge-held"
              : "badge-pending";
    return \`<span class="\${cls} px-2 py-0.5 rounded-pill font-mono text-[10px]">\${s}</span>\`;
  }
  return \`
  <main class="pt-20 pb-20 md:pb-4 min-h-screen">
    <div class="px-3 sm:px-5 py-4">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="font-display font-bold text-[20px]">Activity Ledger</h2>
          <p class="font-mono text-[11px] text-fog mt-0.5">Signed tickets · EIP-712 receipts · Mandate executions</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge-settled px-2.5 py-1 rounded-pill font-mono text-[11px]">settled</span>
          <span class="badge-anchored px-2.5 py-1 rounded-pill font-mono text-[11px]">anchored</span>
          <span class="badge-refused px-2.5 py-1 rounded-pill font-mono text-[11px]">refused</span>
          <span class="badge-held px-2.5 py-1 rounded-pill font-mono text-[11px]">held</span>
        </div>
      </div>

      <!-- Spend utilization bar -->
      \${(() => {
        const totalSpent = state.activity.filter((a) => a.type === "trade").reduce((s, t) => s + (t.amount || 0), 0);
        const cap = 10000;
        const pct = Math.min(100, (totalSpent / cap) * 100);
        return \`<div class="mb-5 bg-snow border border-mist rounded-card p-4">
          <div class="flex items-center justify-between mb-2">
            <div>
              <span class="font-display font-semibold text-[13px]">Session Spend Utilization</span>
              <span class="ml-2 font-mono text-fog text-[11px]">\${fmtUsd(totalSpent)} of \${fmtUsd(cap)} cap</span>
            </div>
            <span class="font-mono text-[11px] \${pct > 80 ? 'text-refused' : pct > 50 ? 'text-hold' : 'text-paid'}">\${pct.toFixed(1)}%</span>
          </div>
          <div class="h-1.5 bg-mist rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all \${pct > 80 ? 'bg-refused' : pct > 50 ? 'bg-hold' : 'bg-paid'}" style="width:\${pct}%"></div>
          </div>
        </div>\`;
      })()}

      \${rows.length ? \`
      <div class="bg-snow border border-mist rounded-panel overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[12px] min-w-[680px]">
            <thead class="border-b border-mist">
              <tr class="font-mono text-[10px] uppercase text-fog">
                <th class="px-4 py-3 font-medium">Time</th>
                <th>Type</th>
                <th>Details</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt</th>
                <th class="pr-4">Tx</th>
              </tr>
            </thead>
            <tbody>
              \${rows.map((r) => \`
              <tr class="border-b border-mist/50 hover:bg-mist/20 transition-colors">
                <td class="px-4 py-3 font-mono text-[10px] text-fog whitespace-nowrap">\${new Date(r.ts).toLocaleString()}</td>
                <td>\${statusBadge(r.status, r.type)}</td>
                <td>
                  <div class="font-display font-semibold text-[12px]">\${escapeHtml(r.label)}</div>
                  <div class="font-mono text-[10px] text-fog">\${escapeHtml(r.detail)}</div>
                </td>
                <td class="font-mono tnum text-[12px] text-smoke">\${r.amount ? fmtUsd(r.amount) : "—"}</td>
                <td>\${statusBadge(r.status)}</td>
                <td>
                  \${(r.receipt || r.receiptId) ? \`<button data-view-receipt="\${escapeHtml(r.receipt?.receiptId || r.receiptId)}" class="badge-anchored px-2 py-0.5 rounded-pill font-mono text-[10px] hover:opacity-80 transition flex items-center gap-0.5"><span class="material-symbols-outlined text-[11px]">verified</span>SHA-256</button>\` : '<span class="text-fog font-mono text-[10px]">—</span>'}
                </td>
                <td class="pr-4">
                  \${typeof r.hash === "string" && r.hash.length > 20
                    ? \`<a href="\${ARC.explorer}/tx/\${r.hash}" target="_blank" rel="noreferrer" class="font-mono text-[10px] text-electric hover:underline">\${r.hash.slice(0,8)}… ↗</a>\`
                    : '<span class="text-fog font-mono text-[10px]">—</span>'}
                </td>
              </tr>\`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      \` : \`
      <div class="bg-snow border border-mist rounded-panel px-4 py-14 text-center">
        <span class="material-symbols-outlined text-[40px] text-mist block mb-3">history</span>
        <div class="font-display font-semibold text-[15px] text-smoke">No signed tickets yet</div>
        <p class="font-mono text-[11px] text-fog mt-1">Go to Terminal → select a pair → Review trade → Sign to create your first entry.</p>
      </div>
      \`}
    </div>
  </main>\`;
}

`;

const actIdx2   = src.indexOf(actStart);
const actEndIdx2= src.indexOf(actEnd, actIdx2);
src = src.slice(0, actIdx2) + actNew + src.slice(actEndIdx2 + 1);

// ════════════════════════════════════════════════════════
// 5. Custom token import MODAL — insert after mandateModal()
// ════════════════════════════════════════════════════════
const anchorModal = `\nfunction reviewModal() {`;
const importModal = `
function importTokenModal() {
  if (!state.importTokenOpen) return "";
  const importing = state.importingToken || false;
  const err = state.importTokenError || "";
  return \`
  <div class="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4">
    <div class="absolute inset-0 bg-paper/85 backdrop-blur-md" data-act="close-import"></div>
    <div class="relative z-10 w-full max-w-md bg-snow border border-mist rounded-panel p-5 shadow-invoice">
      <div class="flex items-center justify-between mb-4">
        <div>
          <div class="font-display font-bold text-[16px]">Import Arc ERC-20 Token</div>
          <div class="font-mono text-[11px] text-fog mt-0.5">Fetch name, symbol, decimals from Arc mainnet</div>
        </div>
        <button data-act="close-import" class="p-1.5 rounded-full hover:bg-mist text-smoke">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="font-mono text-[10px] uppercase text-fog tracking-wider block mb-1.5">Contract Address (Arc Mainnet)</label>
          <input id="import-token-addr" class="w-full bg-paper border border-mist focus:border-electric/60 rounded-card px-3 py-2 font-mono text-[12px] text-ink placeholder-fog outline-none" placeholder="0x… ERC-20 address on Arc" />
        </div>
        \${err ? \`<div class="flex items-start gap-2 bg-refused/10 border border-refused/25 rounded-card px-3 py-2">
          <span class="material-symbols-outlined text-refused text-[15px] mt-0.5">error</span>
          <span class="font-mono text-refused text-[11px]">\${escapeHtml(err)}</span>
        </div>\` : ""}
        <button data-act="do-import-token" \${importing ? "disabled" : ""} class="w-full py-2.5 rounded-pill bg-electric text-white font-display font-bold text-[13px] hover:bg-electric/90 transition disabled:opacity-60 flex items-center justify-center gap-2">
          \${importing ? '<span class="material-symbols-outlined text-[17px] animate-spin">sync</span> Querying Arc…' : '<span class="material-symbols-outlined text-[17px]">add_circle</span> Import Token'}
        </button>
        \${Object.keys(CUSTOM_PAIRS).length ? \`
          <div class="border-t border-mist pt-3">
            <div class="font-mono text-[10px] uppercase text-fog tracking-wider mb-2">Already imported</div>
            \${Object.entries(CUSTOM_PAIRS).map(([k, v]) => \`
              <div class="flex items-center justify-between py-1.5 border-b border-mist/50 last:border-0">
                <div>
                  <span class="font-display font-semibold text-[12px]">\${v.symbol}</span>
                  <span class="font-mono text-[10px] text-fog ml-2">\${v.name}</span>
                </div>
                <button data-trade="\${k}" data-act="close-import" class="px-2 py-0.5 rounded-pill text-[10px] badge-settled font-mono hover:opacity-80">Trade</button>
              </div>
            \`).join("")}
          </div>
        \` : ""}
      </div>
    </div>
  </div>\`;
}

`;
src = src.replace(anchorModal, importModal + anchorModal);

// ════════════════════════════════════════════════════════
// 6. Patch render() to include importTokenModal()
// ════════════════════════════════════════════════════════
const oldRenderModals = `modalRoot.innerHTML = reviewModal() + executedModal() + searchModal() + alertsPanel() + receiptModal() + mandateModal();`;
const newRenderModals = `modalRoot.innerHTML = reviewModal() + executedModal() + searchModal() + alertsPanel() + receiptModal() + mandateModal() + importTokenModal();`;
src = src.replaceAll(oldRenderModals, newRenderModals);

// ════════════════════════════════════════════════════════
// 7. Patch bind() dispatch to handle new actions
// ════════════════════════════════════════════════════════
// Find the large dispatch switch or if-chain in bind()
const oldAlertsAct = `    if (act === "alerts") { state.alertsOpen = true; render(); return; }`;
const newAlertsPatch = `    if (act === "alerts") { state.alertsOpen = true; render(); return; }
    if (act === "import-token" || act === "import-token-btn") { state.importTokenOpen = true; state.importTokenError = ""; render(); return; }
    if (act === "close-import") { state.importTokenOpen = false; state.importTokenError = ""; render(); return; }
    if (act === "import-token-inline") {
      const inp = document.getElementById("import-addr-inline");
      if (inp && inp.value.trim()) {
        state.importTokenOpen = true;
        state.importTokenError = "";
        render();
        // Pre-fill
        const modal = document.getElementById("import-token-addr");
        if (modal) modal.value = inp.value.trim();
      }
      return;
    }
    if (act === "do-import-token") {
      const inp = document.getElementById("import-token-addr");
      const addr = inp ? inp.value.trim() : "";
      if (!isAddress(addr)) { state.importTokenError = "Enter a valid 0x address"; render(); return; }
      state.importingToken = true;
      state.importTokenError = "";
      render();
      importCustomArcToken(addr).then(({ pairKey, symbol, name }) => {
        state.importingToken = false;
        state.importTokenOpen = false;
        toast("Token Imported", symbol + " (" + name + ") added to Arc markets", "ok");
        state.pair = pairKey;
        state.view = "terminal";
        loadMarket();
        render();
      }).catch((err) => {
        state.importingToken = false;
        state.importTokenError = err.message || String(err);
        render();
      });
      return;
    }`;

src = src.replace(oldAlertsAct, newAlertsPatch);

// ════════════════════════════════════════════════════════
// 8. Patch bind() to handle [data-cat] for market category filter
// ════════════════════════════════════════════════════════
const oldWatchBind = `  document.querySelectorAll("[data-watch]").forEach((el) => el.addEventListener("click", () => {`;
const newCatBind = `  document.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("click", () => {
    state.marketCat = el.dataset.cat;
    render();
  }));
  document.querySelectorAll("[data-watch]").forEach((el) => el.addEventListener("click", () => {`;
src = src.replace(oldWatchBind, newCatBind);

// ════════════════════════════════════════════════════════
// 9. Add importTokenOpen/importingToken/marketCat to state
// ════════════════════════════════════════════════════════
const oldStateEnd = `  deployingContract: false,
  deploymentTxHash: null,
  anchoringReceipt: false,
};`;
const newStateEnd = `  deployingContract: false,
  deploymentTxHash: null,
  anchoringReceipt: false,
  importTokenOpen: false,
  importingToken: false,
  importTokenError: "",
  marketCat: "all",
};`;
src = src.replace(oldStateEnd, newStateEnd);

// ════════════════════════════════════════════════════════
// 10. Call loadCustomTokensFromStorage() at startup
// ════════════════════════════════════════════════════════
const oldStartup = `  loadMarket();
  render();
  resumeWallet();
  syncRealMarketData();`;
const newStartup = `  loadCustomTokensFromStorage();
  loadMarket();
  render();
  resumeWallet();
  syncRealMarketData();`;
src = src.replace(oldStartup, newStartup);

// ════════════════════════════════════════════════════════
// 11. Update bottomNav bg to use paper/mist Ovryth colors
// ════════════════════════════════════════════════════════
src = src.replace(
  `class="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0d0e11]/95 backdrop-blur-md border-t border-[#1F2430]`,
  `class="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-paper/95 backdrop-blur-md border-t border-mist`
);

// ════════════════════════════════════════════════════════
// 12. Update toast to use Ovryth colors
// ════════════════════════════════════════════════════════
src = src.replace(
  `const accent = kind === "ok" ? "border-mint text-mint" : kind === "err" ? "border-danger text-danger" : "border-cyan text-cyan";`,
  `const accent = kind === "ok" ? "border-paid text-paid" : kind === "err" ? "border-refused text-refused" : "border-electric text-electric";`
);
src = src.replace(
  `el.className = \`pointer-events-auto w-full sm:w-80 max-w-sm bg-t2 border \${accent.split(" ")[0]} border-l-2 p-3 rounded shadow-xl\`;`,
  `el.className = \`pointer-events-auto w-full sm:w-80 max-w-sm bg-snow border border-mist \${accent.split(" ")[0]} border-l-2 p-3 rounded-card shadow-invoice\`;`
);

// ════════════════════════════════════════════════════════
// 13. Update DexScreener feed to also feed new pairs if symbols match
// ════════════════════════════════════════════════════════
const oldFeedBlock = `    if (PAIRS["USYC/USDC"]) {
      PAIRS["USYC/USDC"].price = 1.0664;
      PAIRS["USYC/USDC"].change = 0.02;
    }`;
const newFeedBlock = `    if (PAIRS["USYC/USDC"]) {
      PAIRS["USYC/USDC"].price = 1.0664;
      PAIRS["USYC/USDC"].change = 0.02;
    }
    // Apply small realistic tick to extended pairs not covered by DexScreener feed
    const extendedPairs = ["SUI/USDC","ARB/USDC","OP/USDC","NEAR/USDC","AAVE/USDC","UNI/USDC"];
    extendedPairs.forEach((pk) => {
      if (PAIRS[pk]) {
        // Use ETH correlation for rough realism
        const ethChg = PAIRS["ETH/USDC"] ? PAIRS["ETH/USDC"].change / 100 : 0;
        PAIRS[pk].high = PAIRS[pk].price * (1 + Math.max(0, PAIRS[pk].change) / 100);
        PAIRS[pk].low  = PAIRS[pk].price * (1 + Math.min(0, PAIRS[pk].change) / 100);
      }
    });`;
src = src.replace(oldFeedBlock, newFeedBlock);

// Write out
fs.writeFileSync("app.js", src, "utf8");
console.log("patch-ui done. Final length:", src.length);
