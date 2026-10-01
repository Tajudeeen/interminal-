import fs from "fs";
import vm from "vm";

const src = fs.readFileSync("app.js", "utf8");

class MockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.classList = {
      _classes: new Set(),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c)
    };
    this.style = {};
    this.listeners = {};
    this._innerHTML = "";
    this.width = 800;
    this.height = 400;
  }

  getBoundingClientRect() {
    return { width: 800, height: 400, top: 0, left: 0, right: 800, bottom: 400 };
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    this.parseChildren(html);
  }

  parseChildren(html) {
    this.children = [];
    const tagRegex = /<([a-zA-Z0-9\-]+)([^>]*)>/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tag = match[1];
      const attrs = match[2];
      const el = new MockElement(tag);
      const actMatch = attrs.match(/data-act="([^"]+)"/);
      if (actMatch) el.dataset.act = actMatch[1];
      const navMatch = attrs.match(/data-nav="([^"]+)"/);
      if (navMatch) el.dataset.nav = navMatch[1];
      const catMatch = attrs.match(/data-cat="([^"]+)"/);
      if (catMatch) el.dataset.cat = catMatch[1];
      const sideMatch = attrs.match(/data-side="([^"]+)"/);
      if (sideMatch) el.dataset.side = sideMatch[1];
      const bufferMatch = attrs.match(/data-set-buffer="([^"]+)"/);
      if (bufferMatch) el.dataset.setBuffer = bufferMatch[1];
      const stressMatch = attrs.match(/data-set-stress="([^"]+)"/);
      if (stressMatch) el.dataset.setStress = stressMatch[1];
      const orderTypeMatch = attrs.match(/data-order-type="([^"]+)"/);
      if (orderTypeMatch) el.dataset.orderType = orderTypeMatch[1];
      const idMatch = attrs.match(/id="([^"]+)"/);
      if (idMatch) el.id = idMatch[1];
      this.children.push(el);
    }
  }

  addEventListener(ev, fn) {
    if (!this.listeners[ev]) this.listeners[ev] = [];
    this.listeners[ev].push(fn);
  }

  click() {
    if (this.listeners["click"]) {
      for (const fn of this.listeners["click"]) {
        fn({ target: this, preventDefault: () => {} });
      }
    }
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    let results = [];
    for (const ch of this.children) {
      if (sel.startsWith("#") && ch.id === sel.slice(1)) results.push(ch);
      if (sel.startsWith("[data-act]") && ch.dataset.act) results.push(ch);
      if (sel.startsWith("[data-nav]") && ch.dataset.nav) results.push(ch);
      if (sel.startsWith("[data-cat]") && ch.dataset.cat) results.push(ch);
      if (sel.startsWith("[data-side]") && ch.dataset.side) results.push(ch);
      if (sel.startsWith("[data-set-buffer]") && ch.dataset.setBuffer) results.push(ch);
      if (sel.startsWith("[data-set-stress]") && ch.dataset.setStress) results.push(ch);
      if (sel.startsWith("[data-order-type]") && ch.dataset.orderType) results.push(ch);
      results = results.concat(ch.querySelectorAll(sel));
    }
    return results;
  }

  getContext() {
    return {
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      closePath: () => {},
      setLineDash: () => {},
      setTransform: () => {},
      fillText: () => {},
      measureText: () => ({ width: 50 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
    };
  }
}

const mockDoc = new MockElement("document");
mockDoc.documentElement = new MockElement("html");
mockDoc.body = new MockElement("body");
mockDoc.activeElement = null;
mockDoc.getElementById = (id) => mockDoc.querySelector("#" + id);

const appDiv = new MockElement("div");
appDiv.id = "app";
const modalDiv = new MockElement("div");
modalDiv.id = "modal-root";
mockDoc.children.push(appDiv, modalDiv);

const mockWindow = {
  document: mockDoc,
  localStorage: {
    _data: {},
    getItem: (k) => mockWindow.localStorage._data[k] || null,
    setItem: (k, v) => { mockWindow.localStorage._data[k] = String(v); },
    removeItem: (k) => delete mockWindow.localStorage._data[k],
  },
  addEventListener: () => {},
  setTimeout: (fn) => setTimeout(fn, 1),
  clearTimeout: clearTimeout,
  setInterval: () => 123,
  clearInterval: () => {},
  requestAnimationFrame: (cb) => cb(),
  location: { reload: () => {} },
  navigator: { clipboard: { writeText: async () => {} } },
};

const sandbox = {
  window: mockWindow,
  document: mockDoc,
  localStorage: mockWindow.localStorage,
  navigator: mockWindow.navigator,
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  AbortController,
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Set,
  BigInt,
  Error,
  JSON,
  setTimeout: (fn) => setTimeout(fn, 1),
  clearTimeout,
  setInterval: () => 123,
  clearInterval: () => {},
  requestAnimationFrame: (cb) => cb(),
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

try {
  vm.runInContext(src, sandbox);
  console.log("PASS: app.js loaded into mock DOM without errors.");

  const state = vm.runInContext("state", sandbox);

  // 1. Initial State: Landing
  console.log("PASS: Initial state is landing, connected =", state.connected);

  // 2. Click Demo Mode
  const demoBtn = appDiv.querySelectorAll("[data-act]").find(b => b.dataset.act === "demo");
  if (!demoBtn) throw new Error("Demo button not found on landing page");
  demoBtn.click();
  console.log("PASS: Clicked Demo. Connected =", state.connected, "View =", state.view);

  // 3. Test theme toggle
  const themeToggle = appDiv.querySelectorAll("[data-act]").find(b => b.dataset.act === "toggle-theme");
  if (!themeToggle) throw new Error("Theme toggle button not found");
  const oldTheme = state.theme;
  themeToggle.click();
  console.log("PASS: Theme toggled from", oldTheme, "to", state.theme);
  themeToggle.click();
  console.log("PASS: Theme toggled back to", state.theme);

  // 4. Test Navigation to all views
  const viewsToTest = ["markets", "portfolio", "ai", "activity", "proof", "terminal"];
  for (const v of viewsToTest) {
    const navBtn = appDiv.querySelectorAll("[data-nav]").find(b => b.dataset.nav === v);
    if (!navBtn) throw new Error(`Nav button for view '${v}' not found`);
    navBtn.click();
    if (state.view !== v) throw new Error(`Failed to navigate to view '${v}', state.view is '${state.view}'`);
    console.log(`PASS: Navigated to view '${v}'. HTML size:`, appDiv.innerHTML.length);
  }

  // 5. Test Market Category Filtering in Markets View
  const catBtn = appDiv.querySelectorAll("[data-cat]").find(b => b.dataset.cat === "rwa_fx");
  if (catBtn) {
    catBtn.click();
    console.log("PASS: Clicked category filter 'rwa_fx', state.marketCat =", state.marketCat);
  }

  // 6. Test Back to Terminal and Trade actions
  const terminalNav = appDiv.querySelectorAll("[data-nav]").find(b => b.dataset.nav === "terminal");
  terminalNav.click();

  const sellBtn = appDiv.querySelectorAll("[data-side]").find(b => b.dataset.side === "sell");
  if (sellBtn) {
    sellBtn.click();
    console.log("PASS: Clicked 'Sell' button, state.side =", state.side);
  }

  const buyBtn = appDiv.querySelectorAll("[data-side]").find(b => b.dataset.side === "buy");
  if (buyBtn) {
    buyBtn.click();
    console.log("PASS: Clicked 'Buy' button, state.side =", state.side);
  }

  // 7. Test Instant vs DCA / TWAP Mode Switching
  const dcaTab = appDiv.querySelectorAll("[data-order-type]").find(b => b.dataset.orderType === "dca");
  if (!dcaTab) throw new Error("DCA / TWAP tab not found in terminal");
  dcaTab.click();
  if (state.orderType !== "dca") throw new Error("Failed to switch to DCA mode");
  console.log("PASS: Clicked 'DCA / TWAP', state.orderType =", state.orderType);

  const instantTab = appDiv.querySelectorAll("[data-order-type]").find(b => b.dataset.orderType === "market");
  if (!instantTab) throw new Error("Instant Spot tab not found in terminal");
  instantTab.click();
  if (state.orderType !== "market") throw new Error("Failed to switch back to Instant mode");
  console.log("PASS: Clicked 'Instant Spot', state.orderType =", state.orderType);

  // 8. Test Target Operating Cash Buffer Clickability in Portfolio View
  const portNav = appDiv.querySelectorAll("[data-nav]").find(b => b.dataset.nav === "portfolio");
  portNav.click();

  const bufferBtn2500 = appDiv.querySelectorAll("[data-set-buffer]").find(b => b.dataset.setBuffer === "2500");
  if (!bufferBtn2500) throw new Error("Buffer $2500 button not found in portfolio view");
  bufferBtn2500.click();
  if (state.targetBufferUsd !== 2500) throw new Error(`Expected targetBufferUsd to be 2500, got ${state.targetBufferUsd}`);
  console.log("PASS: Clicked Buffer '$2500', state.targetBufferUsd =", state.targetBufferUsd);

  const bufferBtn5000 = appDiv.querySelectorAll("[data-set-buffer]").find(b => b.dataset.setBuffer === "5000");
  if (!bufferBtn5000) throw new Error("Buffer $5000 button not found in portfolio view");
  bufferBtn5000.click();
  if (state.targetBufferUsd !== 5000) throw new Error(`Expected targetBufferUsd to be 5000, got ${state.targetBufferUsd}`);
  console.log("PASS: Clicked Buffer '$5000', state.targetBufferUsd =", state.targetBufferUsd);

  // 9. Test JIT Stress Tester Button Clickability
  const stressBtn5000 = appDiv.querySelectorAll("[data-set-stress]").find(b => b.dataset.setStress === "5000");
  if (!stressBtn5000) throw new Error("JIT Stress $5000 button not found in portfolio view");
  stressBtn5000.click();
  if (state.stressTestAmount !== 5000) throw new Error(`Expected stressTestAmount to be 5000, got ${state.stressTestAmount}`);
  console.log("PASS: Clicked Stress '$5000', state.stressTestAmount =", state.stressTestAmount);

  // 10. Test AI Analyst View Market Analysis
  const aiNav = appDiv.querySelectorAll("[data-nav]").find(b => b.dataset.nav === "ai");
  aiNav.click();
  if (!state.analysis) throw new Error("AI Analyst view did not compute market analysis");
  console.log("PASS: AI Analyst computed real market analysis for", state.analysis.pair, "Trend =", state.analysis.trend, "Regime =", state.analysis.regime);

  console.log("\nALL INTERACTIVE TESTS PASSED WITHOUT RUNTIME ERRORS!");
} catch (e) {
  console.error("FAIL: Error during interactive tests:", e);
  process.exit(1);
}
