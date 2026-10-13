import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const componentsRoot = join(here, "..", "components");
const appPath = join(here, "..", "App.tsx");
const storePath = join(here, "..", "store", "useAppStore.ts");

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const componentFiles = walk(componentsRoot).filter((path) => /\.(tsx|ts)$/.test(path));
const componentSource = [
  ...componentFiles.map((path) => readFileSync(path, "utf8")),
  readFileSync(appPath, "utf8"),
].join("\n");

const storeSource = readFileSync(storePath, "utf8");
const actionsSectionStart = storeSource.indexOf("// Actions");
const actionsSectionEnd = storeSource.indexOf("\n}\n\nconst DEMO_ADDRESS", actionsSectionStart);
const actionsSection = storeSource.slice(actionsSectionStart, actionsSectionEnd);
const storeActions = [...actionsSection.matchAll(/^\s{2}([A-Za-z_$][\w$]*):\s*(?:async\s*)?\([^;]*\)\s*=>/gm)].map((match) => match[1]);

describe("React UI wiring", () => {
  it("keeps UI actions connected and retained historical APIs regression-tested", () => {
    // The payment release no longer mounts the old treasury cockpit or token
    // import dialog. These APIs remain for historical regression coverage.
    const historicalActions = ["setStressTestAmount", "importCustomToken", "executeSweepOnchain"];
    const regressionSource = ["typescript-modules.test.ts", "treasury-execution.test.ts"]
      .map((file) => readFileSync(join(here, file), "utf8")).join("\n");
    for (const action of historicalActions) {
      expect(storeActions).toContain(action);
      expect(regressionSource).toMatch(new RegExp("\\b" + action + "\\b"));
    }
    const orphaned = storeActions.filter((action) =>
      !historicalActions.includes(action) && !new RegExp("\\b" + action + "\\b").test(componentSource));
    expect(orphaned).toEqual([]);
  });

  it("keeps every modal on the shared theme-aware wrapper", () => {
    const modalFiles = walk(join(componentsRoot, "modals"))
      .filter((path) => /Modal\.tsx$/.test(path) && !path.endsWith("GlassModalWrapper.tsx"));
    const unwrapped = modalFiles.filter((path) => !readFileSync(path, "utf8").includes("GlassModalWrapper"));
    expect(unwrapped).toEqual([]);
  });
});
