import fs from "fs";
const src = fs.readFileSync("app.js", "utf8");

// 1. Check the bind function dispatch area
const bindIdx = src.indexOf("function bind()");
const bindBody = src.slice(bindIdx, bindIdx + 8000);

// Find all data-act clicks
const actIdx = bindBody.indexOf(`if (act === "connect")`);
console.log("=== bind() dispatch (first 800 chars from connect) ===");
console.log(bindBody.slice(actIdx, actIdx + 800));

// 2. Check if 'data-act' click listener exists
const clickListenerIdx = src.indexOf(`data-act`);
console.log("\n=== First data-act occurrence ===");
console.log(src.slice(clickListenerIdx - 50, clickListenerIdx + 200));

// 3. Check the structure of bind() - does it set up click events on data-act?
const clickBindIdx = bindBody.indexOf("querySelectorAll(\"[data-act]\")");
console.log("\n=== querySelectorAll data-act in bind() ===");
console.log(bindBody.slice(clickBindIdx, clickBindIdx + 300));

// 4. Check for syntax issues in the new header/landing template literals
// Look for unbalanced backticks
let backtickCount = 0;
let inStr = false;
let errors = [];
for (let i = 0; i < src.length; i++) {
  if (src[i] === '`' && (i === 0 || src[i-1] !== '\\')) backtickCount++;
}
console.log("\n=== Backtick count (should be even) ===", backtickCount, backtickCount % 2 === 0 ? "OK" : "UNBALANCED!");

// 5. Check for 'body()' function reference in render  
console.log("\n=== body() function defined? ===", src.includes("function body()"));
console.log("=== viewHtml var used? ===", src.includes("viewHtml"));
