// patch-theme.mjs — adds dark/light toggle, B&W palette, footer, bottom nav improvements
import fs from "fs";

// ── index.html ──────────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html class="dark" lang="en" id="html-root">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdn.vercel-insights.com 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src https://fonts.gstatic.com; connect-src 'self' https://rpc.mainnet.arc.io https://api.dexscreener.com https://vitals.vercel-insights.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'none'" />
  <meta name="referrer" content="no-referrer" />
  <title>INTERMINAL — Arc Trading Terminal</title>
  <link rel="icon" type="image/svg+xml" href="./logo.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Persist theme before paint to avoid flash
    (function() {
      const t = localStorage.getItem("interminal_theme") || "dark";
      document.documentElement.classList.toggle("dark", t === "dark");
    })();

    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            /* Dark mode surfaces */
            "dm-bg":      "#0A0A0A",
            "dm-surface": "#111111",
            "dm-card":    "#1A1A1A",
            "dm-border":  "#2A2A2A",
            "dm-muted":   "#666666",
            "dm-sub":     "#999999",
            "dm-text":    "#F0F0F0",
            /* Light mode surfaces */
            "lm-bg":      "#FFFFFF",
            "lm-surface": "#F8F8F8",
            "lm-card":    "#F0F0F0",
            "lm-border":  "#E0E0E0",
            "lm-muted":   "#999999",
            "lm-sub":     "#666666",
            "lm-text":    "#0A0A0A",
            /* Accent — same in both modes */
            accent:       "#000000",
            "accent-inv": "#FFFFFF",
            positive:     "#16A34A",
            negative:     "#DC2626",
            warning:      "#D97706",
            /* Legacy aliases kept for old code */
            paper:    "#0A0A0A",
            snow:     "#111111",
            mist:     "#2A2A2A",
            ink:      "#F0F0F0",
            smoke:    "#999999",
            fog:      "#666666",
            paid:     "#16A34A",
            refused:  "#DC2626",
            electric: "#0A0A0A",
            hold:     "#D97706",
            void:     "#000000",
            "t1":     "#0D0D0D",
            "t2":     "#141414",
            "t3":     "#1A1A1A",
            "line":   "#2A2A2A",
            "line-active": "#3A3A3A",
            cyan:     "#E0E0E0",
            "cyan-dim": "#C0C0C0",
            mint:     "#16A34A",
            danger:   "#DC2626",
            warn:     "#D97706",
            mute:     "#999999",
          },
          fontFamily: {
            display: ["Manrope", "sans-serif"],
            body:    ["IBM Plex Sans", "sans-serif"],
            mono:    ["IBM Plex Mono", "monospace"],
          },
          borderRadius: {
            pill:  "9999px",
            panel: "16px",
            card:  "12px",
          },
          boxShadow: {
            invoice: "0 2px 20px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.06) inset",
            "invoice-lm": "0 2px 20px rgba(0,0,0,0.08)",
          },
        }
      }
    };
  </script>
  <style>
    /* ── CSS variables for dark/light theming ────────────────── */
    :root {
      --bg:      #FFFFFF;
      --surface: #F8F8F8;
      --card:    #F0F0F0;
      --border:  #E0E0E0;
      --text:    #0A0A0A;
      --sub:     #666666;
      --muted:   #999999;
      --accent:  #000000;
      --acc-inv: #FFFFFF;
      --pos:     #16A34A;
      --neg:     #DC2626;
      --warn:    #D97706;
    }
    .dark {
      --bg:      #0A0A0A;
      --surface: #111111;
      --card:    #1A1A1A;
      --border:  #2A2A2A;
      --text:    #F0F0F0;
      --sub:     #999999;
      --muted:   #666666;
      --accent:  #FFFFFF;
      --acc-inv: #0A0A0A;
      --pos:     #22C55E;
      --neg:     #EF4444;
      --warn:    #F59E0B;
    }

    html, body { margin: 0; background: var(--bg); color: var(--text); }
    body { font-family: "IBM Plex Sans", sans-serif; overscroll-behavior: none; transition: background 0.2s, color 0.2s; }
    .font-display  { font-family: Manrope, sans-serif; }
    .font-mono-num { font-family: "IBM Plex Mono", monospace; }
    .tnum { font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "zero" 1; }

    /* Theme-aware utility classes */
    .bg-themed        { background: var(--bg); }
    .surface-themed   { background: var(--surface); }
    .card-themed      { background: var(--card); }
    .border-themed    { border-color: var(--border); }
    .text-themed      { color: var(--text); }
    .text-sub         { color: var(--sub); }
    .text-muted       { color: var(--muted); }

    /* Status pill badges — same shape, theme-aware border */
    .badge-settled  { background:rgba(22,163,74,0.12);  border:1px solid rgba(22,163,74,0.3);  color:var(--pos); }
    .badge-anchored { background:rgba(10,10,10,0.08);   border:1px solid var(--border);         color:var(--sub); }
    .badge-refused  { background:rgba(220,38,38,0.12);  border:1px solid rgba(220,38,38,0.3);   color:var(--neg); }
    .badge-held     { background:rgba(217,119,6,0.12);  border:1px solid rgba(217,119,6,0.3);   color:var(--warn); }
    .badge-pending  { background:rgba(153,153,153,0.12);border:1px solid var(--border);          color:var(--muted); }
    .dark .badge-anchored { background:rgba(255,255,255,0.06); }

    /* Header pill card */
    .pill-bar { background: var(--surface); border: 1px solid var(--border); }
    .dark .pill-bar { background: rgba(17,17,17,0.95); }

    /* Nav active state */
    .pill-nav-active { background: var(--card); color: var(--text); }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }

    /* Positive / negative */
    .text-pos { color: var(--pos); }
    .text-neg { color: var(--neg); }

    /* Card hover */
    .card-hover { transition: border-color 0.15s, box-shadow 0.15s; }
    .card-hover:hover { border-color: var(--sub); box-shadow: 0 0 0 1px rgba(128,128,128,0.12); }

    kbd { font-family: "IBM Plex Mono", monospace; }
    .material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 20; vertical-align: middle; }
    canvas { display: block; }
    .view { display: none; }
    .view.active { display: block; }
    #toast-stack { pointer-events: none; }
    #toast-stack > * { pointer-events: auto; }
    .safe-bottom { padding-bottom: max(0.375rem, env(safe-area-inset-bottom, 0px)); }
    .keyline     { border-left: 2px solid var(--sub); }
    .keyline-pos { border-left: 2px solid var(--pos); }
  </style>
  <script defer src="https://cdn.vercel-insights.com/v1/script.js"></script>
</head>
<body class="bg-themed text-themed antialiased min-h-screen">
  <div id="app"></div>
  <div id="modal-root"></div>
  <div id="toast-stack" class="fixed bottom-20 sm:bottom-4 right-2 sm:right-4 left-2 sm:left-auto z-[80] flex flex-col items-center sm:items-end gap-2"></div>
  <script src="./contractArtifact.js"></script>
  <script src="./app.js"></script>
</body>
</html>
`;

fs.writeFileSync("index.html", html, "utf8");
console.log("index.html written");

// ── app.js patches ──────────────────────────────────────────────────────────
let src = fs.readFileSync("app.js", "utf8");

// 1. Add theme state + toggle function + persistence after state declaration end
const oldStateEnd = `  importTokenOpen: false,
  importingToken: false,
  importTokenError: "",
  marketCat: "all",
};`;
const newStateEnd = `  importTokenOpen: false,
  importingToken: false,
  importTokenError: "",
  marketCat: "all",
  theme: (typeof localStorage !== "undefined" && localStorage.getItem("interminal_theme")) || "dark",
};

function applyTheme(t) {
  state.theme = t;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", t === "dark");
    try { localStorage.setItem("interminal_theme", t); } catch {}
  }
}`;
src = src.replace(oldStateEnd, newStateEnd);

// 2. Overhaul header() with theme-aware classes + theme toggle button
const headerFnStart = src.indexOf("function header() {");
const headerFnEnd   = src.indexOf("\nfunction landing() {", headerFnStart);
const newHeader = `function header() {
  const p = portfolioSnapshot();
  const navItems = [
    { id: "terminal",  label: "Terminal"   },
    { id: "markets",   label: "Markets"    },
    { id: "portfolio", label: "Portfolio"  },
    { id: "ai",        label: "AI"         },
    { id: "activity",  label: "Activity"   },
    { id: "proof",     label: "Proof"      },
  ];
  const isDark = state.theme === "dark";
  const chainOk = state.proof?.live?.chainOk;
  const statusLabel = chainOk && state.livePortfolio ? "ARC · LIVE"
    : state.livePortfolio ? "ARC · WALLET" : "ARC · RPC";
  const statusColor = state.livePortfolio ? "text-pos" : "text-sub";

  return \`
  <header class="fixed top-0 left-0 right-0 z-50 px-3 sm:px-4 pt-3 pointer-events-none">
    <div class="max-w-[1080px] mx-auto pointer-events-auto">
      <div class="pill-bar flex items-center justify-between gap-2 rounded-pill px-3 py-2" style="backdrop-filter:blur(12px)">
        <!-- Logo + status -->
        <div class="flex items-center gap-2 shrink-0">
          \${logoSvg(22)}
          <div class="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-pill card-themed border border-themed">
            <span class="w-1.5 h-1.5 rounded-full \${state.livePortfolio ? 'bg-green-500' : 'bg-gray-500'} \${state.livePortfolio ? 'animate-pulse' : ''}"></span>
            <span class="font-mono text-[10px] \${statusColor} tracking-wider font-semibold">\${statusLabel}</span>
            <span class="font-mono text-[10px] text-muted tnum">#\${state.block.toLocaleString()}</span>
          </div>
        </div>

        <!-- Pill navigation -->
        <nav class="hidden md:flex items-center gap-0.5 card-themed rounded-pill px-1 py-1 border border-themed">
          \${navItems.map(({ id, label }) => \`
            <button data-nav="\${id}" class="px-3 py-1 text-[12px] font-display font-semibold rounded-pill transition-all \${state.view === id ? 'pill-nav-active shadow-sm' : 'text-muted hover:text-themed hover:bg-themed/50'}">\${label}</button>
          \`).join("")}
        </nav>

        <!-- Right cluster -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Live ticker -->
          <div class="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-pill card-themed border border-themed tnum text-[11px]">
            <span class="text-muted">ETH</span>
            <span class="font-mono font-semibold">\${fmtUsd(PAIRS["ETH/USDC"].price)}</span>
            <span class="\${PAIRS["ETH/USDC"].change >= 0 ? 'text-pos' : 'text-neg'}">\${fmtPct(PAIRS["ETH/USDC"].change)}</span>
            <span class="text-muted opacity-40">|</span>
            <span class="text-muted">ARC</span>
            <span class="font-mono font-semibold">\${fmtUsd(PAIRS["ARC/USDC"].price)}</span>
            <span class="\${PAIRS["ARC/USDC"].change >= 0 ? 'text-pos' : 'text-neg'}">\${fmtPct(PAIRS["ARC/USDC"].change)}</span>
          </div>

          <!-- Import token -->
          <button data-act="import-token" class="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-pill card-themed border border-themed text-sub hover:text-themed text-[11px] font-display transition-colors" title="Import Arc ERC-20">
            <span class="material-symbols-outlined text-[14px]">add_circle</span>
            <span class="hidden lg:inline">Import</span>
          </button>

          <!-- Search -->
          <button data-act="search" class="p-1.5 rounded-pill card-themed border border-themed text-sub hover:text-themed transition-colors" title="Search (Ctrl+K)">
            <span class="material-symbols-outlined text-[17px]">search</span>
          </button>

          <!-- Alerts -->
          <button data-act="alerts" class="relative p-1.5 rounded-pill card-themed border border-themed text-sub hover:text-themed transition-colors">
            <span class="material-symbols-outlined text-[17px]">notifications</span>
            \${state.alerts.length ? \`<span class="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-600 text-[8px] flex items-center justify-center text-white font-bold">\${state.alerts.length}</span>\` : ""}
          </button>

          <!-- Theme toggle -->
          <button data-act="toggle-theme" class="p-1.5 rounded-pill card-themed border border-themed text-sub hover:text-themed transition-colors" title="\${isDark ? 'Switch to light mode' : 'Switch to dark mode'}">
            <span class="material-symbols-outlined text-[17px]">\${isDark ? 'light_mode' : 'dark_mode'}</span>
          </button>

          <!-- Wallet pill -->
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-pill card-themed border border-themed text-[11px]">
            <span class="w-1.5 h-1.5 rounded-full \${state.livePortfolio ? 'bg-green-500 animate-pulse' : 'bg-gray-500'} shrink-0"></span>
            <span class="hidden sm:inline font-mono text-[10px] text-sub uppercase">\${state.livePortfolio ? "Live" : "Demo"}</span>
            <a class="font-mono text-[10px] hover:underline truncate max-w-[72px]" href="\${ARC.explorer}/address/\${state.address}" target="_blank" rel="noreferrer">\${shortAddr(state.address)}</a>
            \${state.livePortfolio ? \`<span class="hidden sm:inline font-mono text-muted text-[10px] tnum">\${fmtUsd(p.total)}</span>\` : ""}
          </div>

          \${!state.livePortfolio ? \`
            <button data-act="connect" class="hidden sm:flex items-center gap-1 px-3 py-1 rounded-pill text-[11px] font-display font-bold transition-colors" style="background:var(--text);color:var(--bg)">
              <span class="material-symbols-outlined text-[14px]">account_balance_wallet</span> Connect
            </button>
          \` : ""}

          <button data-act="disconnect" class="w-7 h-7 rounded-full card-themed border border-themed text-sub flex items-center justify-center shrink-0 hover:text-themed transition-colors">
            <span class="material-symbols-outlined text-[16px]">person</span>
          </button>
        </div>
      </div>
    </div>
  </header>\`;
}

`;
src = src.slice(0, headerFnStart) + newHeader + src.slice(headerFnEnd + 1);

// 3. Overhaul bottomNav() with theme-aware classes
const bnStart = src.indexOf("function bottomNav() {");
const bnEnd   = src.indexOf("\nfunction header() {", bnStart);
const newBN = `function bottomNav() {
  const nav = [
    { id: "terminal",  icon: "candlestick_chart",    label: "Terminal"  },
    { id: "markets",   icon: "query_stats",           label: "Markets"   },
    { id: "portfolio", icon: "account_balance_wallet",label: "Portfolio" },
    { id: "ai",        icon: "auto_awesome",          label: "AI"        },
    { id: "activity",  icon: "history",               label: "Activity"  },
  ];
  return \`
  <nav class="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-bottom" style="background:var(--surface);border-top:1px solid var(--border);backdrop-filter:blur(12px)">
    <div class="flex items-center justify-around px-1 py-2">
      \${nav.map(({ id, icon, label }) => \`
        <button data-nav="\${id}" class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-card transition-colors \${state.view === id ? '' : 'opacity-50 hover:opacity-75'}" style="\${state.view === id ? 'color:var(--text)' : 'color:var(--muted)'}">
          <span class="material-symbols-outlined text-[20px]">\${icon}</span>
          <span class="text-[9px] font-display font-semibold tracking-tight">\${label}</span>
        </button>
      \`).join("")}
      <button data-act="toggle-theme" class="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-card opacity-50 hover:opacity-75 transition-colors" style="color:var(--muted)">
        <span class="material-symbols-outlined text-[20px]">\${state.theme === "dark" ? "light_mode" : "dark_mode"}</span>
        <span class="text-[9px] font-display font-semibold tracking-tight">\${state.theme === "dark" ? "Light" : "Dark"}</span>
      </button>
    </div>
  </nav>\`;
}

`;
src = src.slice(0, bnStart) + newBN + src.slice(bnEnd + 1);

// 4. Add footer() function — insert before function bottomNav
const footerFn = `function footer() {
  if (state.view === "landing") return "";
  const year = new Date().getFullYear();
  return \`
  <footer class="hidden md:block border-t" style="border-color:var(--border);background:var(--surface)">
    <div class="max-w-[1080px] mx-auto px-5 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        \${logoSvg(20)}
        <div>
          <div class="font-mono text-[11px] font-semibold" style="color:var(--text)">INTERMINAL</div>
          <div class="font-mono text-[10px]" style="color:var(--muted)">Arc-native trading terminal · Chain 5042</div>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-6 font-mono text-[11px]" style="color:var(--muted)">
        <a href="\${ARC.explorer}/address/\${ARC.settlement}" target="_blank" rel="noreferrer" class="hover:underline hover:opacity-80 transition">Settlement ↗</a>
        <a href="https://github.com/Tajudeeen/interminal-" target="_blank" rel="noreferrer" class="hover:underline hover:opacity-80 transition">GitHub ↗</a>
        <a href="\${ARC.explorer}" target="_blank" rel="noreferrer" class="hover:underline hover:opacity-80 transition">Arc Explorer ↗</a>
        <button data-nav="proof" class="hover:underline hover:opacity-80 transition text-left">Proof</button>
      </div>
      <div class="text-right">
        <div class="font-mono text-[10px]" style="color:var(--muted)">© \${year} Interminal</div>
        <div class="font-mono text-[10px] flex items-center gap-1 justify-end mt-0.5" style="color:var(--muted)">
          <span class="w-1.5 h-1.5 rounded-full \${state.marketFeedStatus?.live ? 'bg-green-500 animate-pulse' : 'bg-gray-500'} inline-block"></span>
          \${state.marketFeedStatus?.live ? 'DEX feed live' : 'DEX feed offline'}
          <span class="opacity-40 mx-1">·</span>
          14 security gates · Zero key custody
        </div>
      </div>
    </div>
  </footer>\`;
}

`;
src = src.slice(0, bnStart) + footerFn + src.slice(bnStart);

// 5. Patch render() to include footer()
const oldRenderInner = `  root.innerHTML = header() + viewHtml + bottomNav() + (state.connected && state.view !== "landing" ? "" : "");`;
// Try to find how root.innerHTML is set
const renderIdx = src.indexOf("function render() {");
const renderSnip = src.slice(renderIdx, renderIdx + 2000);
console.log("render snip:", renderSnip.slice(0, 500));

// 6. Add toggle-theme to bind()
const oldConnAct = `    if (act === "connect") { connectWallet(); return; }`;
const newConnAct = `    if (act === "connect") { connectWallet(); return; }
    if (act === "toggle-theme") { applyTheme(state.theme === "dark" ? "light" : "dark"); render(); return; }`;
src = src.replace(oldConnAct, newConnAct);

// 7. Theme-aware landing()
const landStart = src.indexOf("function landing() {");
const landEnd   = src.indexOf("\nfunction terminalView() {", landStart);
const newLanding = `function landing() {
  const eth = getInjected();
  const detected = providerName(eth);
  const isDark = state.theme === "dark";
  return \`
  <div class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 pt-16 pb-8">
    <!-- Grid background -->
    <div class="absolute inset-0 pointer-events-none opacity-[0.04]" style="background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:48px 48px"></div>

    <!-- Hero -->
    <div class="relative z-10 flex flex-col items-center text-center max-w-2xl w-full">
      \${logoSvg(48)}
      <div class="mt-6 font-mono text-[10px] tracking-[0.45em] font-semibold" style="color:var(--muted)">BUILT ON ARC MAINNET · CHAIN 5042</div>
      <h1 class="mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
        The trading terminal<br/>for Arc.
      </h1>
      <p class="mt-5 text-[15px] max-w-lg leading-relaxed" style="color:var(--sub)">
        14 fail-closed security gates. Real DEX prices. EIP-712 authorization.<br/>
        Every asset on Arc — one workstation.
      </p>

      <!-- Stats -->
      <div class="mt-8 flex flex-wrap justify-center gap-8">
        \${[
          [Object.keys(PAIRS).length + Object.keys(CUSTOM_PAIRS).length, "Markets"],
          ["14", "Security Gates"],
          ["0",  "Keys Held"],
        ].map(([n, l]) => \`<div class="text-center">
          <div class="font-display font-extrabold text-[28px]">\${n}</div>
          <div class="font-mono text-[10px] uppercase tracking-wider mt-0.5" style="color:var(--muted)">\${l}</div>
        </div>\`).join("")}
      </div>

      <!-- CTA -->
      <div class="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <button data-act="connect" \${state.connecting ? "disabled" : ""} class="w-full sm:flex-1 px-6 py-3 rounded-pill font-display font-bold text-[14px] transition disabled:opacity-60 flex items-center justify-center gap-2" style="background:var(--text);color:var(--bg)">
          <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          \${state.connecting ? "Connecting…" : "Connect Arc Wallet"}
        </button>
        <button data-act="demo" class="w-full sm:flex-1 px-6 py-3 rounded-pill font-display font-semibold text-[14px] transition flex items-center justify-center gap-2 card-themed border border-themed" style="color:var(--sub)">
          <span class="material-symbols-outlined text-[17px]">preview</span> Preview
        </button>
      </div>
      \${eth ? \`<div class="mt-2 font-mono text-[11px]" style="color:var(--muted)">\${detected} detected</div>\` : ""}

      <!-- Theme toggle on landing -->
      <button data-act="toggle-theme" class="mt-6 flex items-center gap-1.5 font-mono text-[11px] px-3 py-1.5 rounded-pill card-themed border border-themed transition-colors" style="color:var(--muted)">
        <span class="material-symbols-outlined text-[15px]">\${isDark ? 'light_mode' : 'dark_mode'}</span>
        \${isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </button>

      <!-- How the money moves -->
      <div class="mt-10 w-full card-themed border border-themed rounded-panel p-5 text-left">
        <div class="font-mono text-[10px] uppercase tracking-widest mb-4" style="color:var(--muted)">How the money moves</div>
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 overflow-x-auto pb-1">
          \${[
            { label: "Arc Wallet",        sub: "Your browser wallet — no key custody"           },
            { label: "EIP-712 Mandate",   sub: "Signed ticket with deadline + slippage bounds"  },
            { label: "Interminal Engine", sub: shortAddr(ARC.settlement) + " on chain 5042"     },
            { label: "Arc AMM",           sub: "Settles to native liquidity hub"                },
          ].map((step, i, arr) => \`
            <div class="flex items-center gap-3 shrink-0">
              <div>
                <div class="font-display font-bold text-[13px]">\${step.label}</div>
                <div class="font-mono text-[10px] mt-0.5" style="color:var(--muted)">\${step.sub}</div>
              </div>
              \${i < arr.length - 1 ? \`<span class="text-[20px] hidden sm:block shrink-0" style="color:var(--border)">→</span>\` : ""}
            </div>
          \`).join("")}
        </div>
      </div>

      <!-- Market preview cards -->
      <div class="mt-6 w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
        \${["ETH/USDC","BTC/USDC","EURC/USDC","ARC/USDC"].map((k) => {
          const v = PAIRS[k];
          const isUp = v.change >= 0;
          return \`<div class="card-themed border border-themed rounded-card p-3 text-left card-hover">
            <div class="font-mono text-[10px]" style="color:var(--muted)">\${k}</div>
            <div class="font-display font-bold text-[16px] mt-0.5 tnum">\${k === "EURC/USDC" ? v.price.toFixed(4) : fmtUsd(v.price)}</div>
            <div class="font-mono text-[11px] \${isUp ? 'text-pos' : 'text-neg'}">\${fmtPct(v.change)}</div>
          </div>\`;
        }).join("")}
      </div>
    </div>
  </div>
  \${footer()}\`;
}

`;
src = src.slice(0, landStart) + newLanding + src.slice(landEnd + 1);

// 8. Theme-aware marketsView() — replace palette-specific color classes with CSS-var classes
// Apply systematic replacements on the full file for common old classes
const colorReplacements = [
  // surfaces
  ['bg-\\[#0d0e11\\]',         'surface-themed'],
  ['bg-\\[#0D0E11\\]',         'surface-themed'],
  ['bg-\\[#1b1b1f\\]',         'card-themed'],
  ['bg-\\[#1B1B1F\\]',         'card-themed'],
  ['bg-\\[#12151D\\]',         'card-themed'],
  ['bg-\\[#121316\\]',         'card-themed'],
  ['bg-\\[#292a2d\\]',         'card-themed'],
  ['bg-\\[#1f1f23\\]',         'card-themed'],
  // borders
  ['border-\\[#1F2430\\]',     'border-themed'],
  ['border-\\[#343538\\]',     'border-themed'],
  ['border-\\[#3b494b\\]',     'border-themed'],
  // text
  ['text-\\[#94A3B8\\]',       'text-muted'],
  ['text-\\[#b9cacb\\]',       'text-sub'],
  ['text-\\[#e3e2e6\\]',       'text-themed'],
  ['text-\\[#F8FAFC\\]',       'text-themed'],
  ['text-\\[#dbfcff\\]',       'text-themed'],
  // positive green
  ['text-\\[#70ffba\\]',       'text-pos'],
  ['text-\\[#01e599\\]',       'text-pos'],
  ['text-\\[#00E599\\]',       'text-pos'],
  // negative red
  ['text-\\[#ffb4ab\\]',       'text-neg'],
  ['text-\\[#FF3B57\\]',       'text-neg'],
];

// Simple string replacements in class attributes (not regex-safe for all, do targeted ones)
src = src
  .replaceAll('text-[#70ffba]', 'text-pos')
  .replaceAll('text-[#01e599]', 'text-pos')
  .replaceAll('text-[#00E599]', 'text-pos')
  .replaceAll('text-[#ffb4ab]', 'text-neg')
  .replaceAll('text-[#FF3B57]', 'text-neg')
  .replaceAll('text-[#94A3B8]', 'text-muted')
  .replaceAll('text-[#b9cacb]', 'text-sub')
  .replaceAll('text-[#e3e2e6]', 'text-themed')
  .replaceAll('text-[#F8FAFC]', 'text-themed')
  .replaceAll('text-[#dbfcff]', 'text-themed');

// 9. Patch render() to include footer and bottom nav
// Find where root.innerHTML is set
const renderPatch = src.indexOf("function render() {");
const renderBody = src.slice(renderPatch, renderPatch + 3000);
// Check if footer is already in render
if (!src.includes("footer()")) {
  // Find the main view render assignment
  src = src.replace(
    `root.innerHTML = header() + viewHtml + bottomNav()`,
    `root.innerHTML = header() + viewHtml + footer() + bottomNav()`
  );
}

// 10. Make sure toast uses CSS-var colors
src = src
  .replaceAll(
    `const accent = kind === "ok" ? "border-paid text-paid" : kind === "err" ? "border-refused text-refused" : "border-electric text-electric";`,
    `const accent = kind === "ok" ? "border-green-500 text-pos" : kind === "err" ? "border-red-500 text-neg" : "border-gray-400 text-sub";`
  )
  .replaceAll(
    `el.className = \`pointer-events-auto w-full sm:w-80 max-w-sm bg-snow border border-mist \${accent.split(" ")[0]} border-l-2 p-3 rounded-card shadow-invoice\`;`,
    `el.className = \`pointer-events-auto w-full sm:w-80 max-w-sm card-themed border-themed \${accent.split(" ")[0]} border-l-2 p-3 rounded-card\` + (state.theme === "dark" ? " shadow-invoice" : " shadow-invoice-lm");`
  );

// 11. Chart background should adapt to theme
src = src.replace(
  `ctx.fillStyle = "#0D0E11";`,
  `ctx.fillStyle = state.theme === "dark" ? "#0D0D0D" : "#FAFAFA";`
);
src = src.replace(
  `ctx.fillStyle = "#08090C";`,
  `ctx.fillStyle = state.theme === "dark" ? "#0A0A0A" : "#FFFFFF";`
);
src = src.replace(
  `ctx.strokeStyle = "#1F2430";`,
  `ctx.strokeStyle = state.theme === "dark" ? "#2A2A2A" : "#E8E8E8";`
);
// Chart text color
src = src.replace(
  `ctx.fillStyle = "#94A3B8";`,
  `ctx.fillStyle = state.theme === "dark" ? "#888888" : "#666666";`
);
// Chart candle up/down
src = src
  .replaceAll(`ctx.fillStyle = "#00E599";`, `ctx.fillStyle = state.theme === "dark" ? "#22C55E" : "#16A34A";`)
  .replaceAll(`ctx.fillStyle = "#FF3B57";`, `ctx.fillStyle = state.theme === "dark" ? "#EF4444" : "#DC2626";`)
  .replaceAll(`ctx.strokeStyle = "#00F0FF";`, `ctx.strokeStyle = state.theme === "dark" ? "#AAAAAA" : "#333333";`)
  .replaceAll(`ctx.strokeStyle = "#00f0ff";`, `ctx.strokeStyle = state.theme === "dark" ? "#AAAAAA" : "#333333";`);

// 12. spark chart background
src = src
  .replaceAll(`ctx.fillStyle = "#0D0E11"`, `ctx.fillStyle = state.theme === "dark" ? "#0D0D0D" : "#FAFAFA"`)
  .replaceAll(`ctx.strokeStyle = "#00F0FF"`, `ctx.strokeStyle = state.theme === "dark" ? "#AAAAAA" : "#333333"`);

// 13. Fix the body/html bg in the app entry point to respect theme
src = src.replace(
  `document.body.style.background = "#08090C";`,
  `document.body.style.background = state.theme === "dark" ? "#0A0A0A" : "#FFFFFF";`
);

// 14. Add footer to view renders that don't have it (all main views)
// Already handled by wrapping in render(), but also ensure landing has it (done above)

fs.writeFileSync("app.js", src, "utf8");
console.log("patch-theme done. Final length:", src.length);
