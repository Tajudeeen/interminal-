// fix-bind.mjs — inserts all missing action handlers into bind() with correct variable name 'a'
import fs from "fs";
let src = fs.readFileSync("app.js", "utf8");

// ── 1. Find the correct insertion point in bind() dispatcher ──
// The dispatcher uses variable 'a' from el.dataset.act
// We'll insert our new handlers right before the closing of the forEach block
// Anchor: the last known handler before our stuff
const ANCHOR = `if (a === "alerts") { state.alertsOpen = !state.alertsOpen; render(); }`;
const NEW_HANDLERS = `if (a === "alerts") { state.alertsOpen = !state.alertsOpen; render(); }
    if (a === "toggle-theme") { applyTheme(state.theme === "dark" ? "light" : "dark"); render(); return; }
    if (a === "import-token" || a === "import-token-btn") { state.importTokenOpen = true; state.importTokenError = ""; render(); return; }
    if (a === "close-import") { state.importTokenOpen = false; state.importTokenError = ""; render(); return; }
    if (a === "import-token-inline") {
      const inp = document.getElementById("import-addr-inline");
      if (inp && inp.value.trim()) {
        state.importTokenOpen = true;
        state.importTokenError = "";
        render();
        setTimeout(() => {
          const modal = document.getElementById("import-token-addr");
          if (modal) modal.value = inp.value.trim();
        }, 50);
      }
      return;
    }
    if (a === "do-import-token") {
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

if (!src.includes(ANCHOR)) {
  console.error("ANCHOR NOT FOUND — cannot patch bind");
  process.exit(1);
}
src = src.replace(ANCHOR, NEW_HANDLERS);
console.log("✓ Inserted toggle-theme + import handlers into bind()");

// ── 2. Also remove the old broken patches that used wrong variable 'act' ──
// These were inserted by patch-ui.mjs and patch-theme.mjs but never work
// since the dispatcher already uses 'a'. Clean them up.
const brokenPatch1 = `    if (act === "connect") { connectWallet(); return; }
    if (act === "toggle-theme") { applyTheme(state.theme === "dark" ? "light" : "dark"); render(); return; }`;
if (src.includes(brokenPatch1)) {
  src = src.replace(brokenPatch1, `    if (act === "connect") { connectWallet(); return; }`);
  console.log("✓ Removed duplicate broken toggle-theme with 'act' variable");
}

const brokenPatch2 = `    if (act === "alerts") { state.alertsOpen = true; render(); return; }
    if (act === "import-token" || act === "import-token-btn") { state.importTokenOpen = true; state.importTokenError = ""; render(); return; }
    if (act === "close-import") { state.importTokenOpen = false; state.importTokenError = ""; render(); return; }
    if (act === "import-token-inline") {`;
if (src.includes(brokenPatch2)) {
  // Find and remove this whole broken block up to the matching closing
  const start = src.indexOf(brokenPatch2);
  // Find end of this broken block (ends just before 'if (act === "do-import-token")')
  const endMarker = `    if (act === "do-import-token") {`;
  const endOfDo = src.indexOf(`    };`, src.indexOf(endMarker)) + 6;
  src = src.slice(0, start) + src.slice(endOfDo);
  console.log("✓ Removed broken 'act' import handlers block");
}

// ── 3. Ensure the data-nav dispatcher also handles nav items properly ──
const navDispatch = src.indexOf(`querySelectorAll("[data-nav]")`);
if (navDispatch !== -1) {
  const navSnip = src.slice(navDispatch, navDispatch + 200);
  console.log("✓ data-nav dispatcher found:", navSnip.slice(0, 120));
} else {
  console.warn("⚠ data-nav dispatcher not found!");
}

// ── 4. Ensure data-cat dispatcher is wired ──
const catDispatch = src.indexOf(`querySelectorAll("[data-cat]")`);
if (catDispatch !== -1) {
  console.log("✓ data-cat dispatcher found at:", catDispatch);
} else {
  // Add it
  const watchBind = `document.querySelectorAll("[data-watch]").forEach`;
  const catBind = `document.querySelectorAll("[data-cat]").forEach((el) => el.addEventListener("click", () => {
    state.marketCat = el.dataset.cat;
    render();
  }));
  document.querySelectorAll("[data-watch]").forEach`;
  src = src.replace(watchBind, catBind);
  console.log("✓ Added missing data-cat dispatcher");
}

// ── 5. Fix toast to use correct CSS-var-aware string (not broken template) ──
// The patch-theme.mjs had a template literal bug in the toast el.className
// Check current state
const toastEl = src.indexOf(`el.className = `);
const toastSnip = src.slice(toastEl, toastEl + 200);
console.log("Toast el.className:", toastSnip);

// ── 6. Fix landing page connect button - header uses connectInjected not connectWallet ──
// The new header() calls "connect" action and bind uses connectInjected() — that's correct
// But landing also had connectWallet in patch - make sure it doesn't exist
if (src.includes("connectWallet()")) {
  src = src.replaceAll("connectWallet()", "connectInjected()");
  console.log("✓ Fixed connectWallet() → connectInjected()");
}

// ── 7. Fix the theme body class — body should be bg-themed text-themed ──
// Make sure the theme class toggle also updates body background directly
const oldApplyTheme = `function applyTheme(t) {
  state.theme = t;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", t === "dark");
    try { localStorage.setItem("interminal_theme", t); } catch {}
  }
}`;
const newApplyTheme = `function applyTheme(t) {
  state.theme = t;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.body.style.background = t === "dark" ? "#0A0A0A" : "#FFFFFF";
    document.body.style.color = t === "dark" ? "#F0F0F0" : "#0A0A0A";
    try { localStorage.setItem("interminal_theme", t); } catch {}
  }
}`;
if (src.includes(oldApplyTheme)) {
  src = src.replace(oldApplyTheme, newApplyTheme);
  console.log("✓ Updated applyTheme to set body bg/color directly");
}

// ── 8. Verify importTokenModal function exists ──
console.log("importTokenModal defined?", src.includes("function importTokenModal()"));
console.log("loadCustomTokensFromStorage defined?", src.includes("function loadCustomTokensFromStorage()"));
console.log("importCustomArcToken defined?", src.includes("function importCustomArcToken("));
console.log("applyTheme defined?", src.includes("function applyTheme("));

fs.writeFileSync("app.js", src, "utf8");
console.log("\n✓ fix-bind done. Length:", src.length);
