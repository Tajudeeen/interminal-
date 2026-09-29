import fs from "fs";
const src = fs.readFileSync("app.js", "utf8");

// Check if toggle-theme was actually inserted with correct variable name
const toggleIdx = src.indexOf("toggle-theme");
let count = 0;
let pos = 0;
while (true) {
  const next = src.indexOf("toggle-theme", pos);
  if (next === -1) break;
  count++;
  console.log(`[${count}] pos ${next}:`, src.slice(next - 20, next + 80));
  pos = next + 1;
}

// Check what variable name is used in bind dispatcher
const bindStart = src.indexOf(`querySelectorAll("[data-act]")`);
const firstIf = src.indexOf("if (a ===", bindStart);
const firstIfAct = src.indexOf("if (act ===", bindStart);
console.log("\nbind uses 'a':  ", firstIf, src.slice(firstIf, firstIf + 40));
console.log("bind uses 'act':", firstIfAct);

// Check connectInjected vs connectWallet
console.log("\nconnectInjected defined?", src.includes("function connectInjected"));
console.log("connectWallet defined?", src.includes("function connectWallet"));
