/*
 * One screenshot of a Compass screen, logged in with the seed's session.
 *
 *   node "${CLAUDE_SKILL_DIR}/scripts/capture.mjs" \
 *     --cookie cookie.txt --route /compass/comparar \
 *     --width 1440 --theme paper --out web-paper.png
 *
 * Options: --height (default 900), --lang (pt|en, default pt), --port (42195),
 * --scroll ".selector", --action drawer (opens the right panel on mobile),
 * --rail open|closed (the web panel; the app's default is collapsed) and
 * --key Tab (presses a key before capturing — Tab opens and closes the panel).
 * --theme is paper (default) or dark.
 *
 * Playwright is not a dependency of the project: the script uses whatever is
 * installed — in the project, or globally (`npm root -g`), which is the case in
 * the Claude Code cloud environment. Chromium comes from
 * `PLAYWRIGHT_BROWSERS_PATH`, or from `CHROMIUM_PATH` when the version does not
 * match.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: op } = parseArgs({
  options: {
    cookie: { type: "string" },
    route: { type: "string", default: "/compass" },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "900" },
    theme: { type: "string", default: "paper" },
    lang: { type: "string", default: "pt" },
    port: { type: "string", default: "42195" },
    scroll: { type: "string" },
    action: { type: "string" },
    rail: { type: "string" },
    key: { type: "string" },
    out: { type: "string", default: "capture.png" },
  },
});
if (!op.cookie) throw new Error("--cookie is required (the output of seed.ts).");

// The app's own names for the two design directions (`lib/design/direction.ts`).
const DIRECTIONS = { paper: "papel", dark: "escuro" };
const direction = DIRECTIONS[op.theme];
if (!direction) throw new Error(`--theme must be paper or dark, not "${op.theme}".`);

function playwright() {
  const places = [process.cwd(), execSync("npm root -g").toString().trim()];
  for (const place of places) {
    const load = createRequire(path.join(place, "noop.js"));
    for (const name of ["playwright-core", "playwright"]) {
      try {
        return load(name);
      } catch {
        // try the next one
      }
    }
  }
  throw new Error("Playwright not found: `npm i --no-save playwright-core`.");
}

function chromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  const folder = readdirSync(root).find((name) => /^chromium-\d+$/.test(name));
  const exe = folder && path.join(root, folder, "chrome-linux", "chrome");
  return exe && existsSync(exe) ? exe : undefined;
}

const { chromium: browserType } = playwright();
const browser = await browserType.launch({ executablePath: chromium() });
const width = Number(op.width);
const ctx = await browser.newContext({ viewport: { width, height: Number(op.height) } });
await ctx.addCookies([
  { name: "strava_session", value: readFileSync(op.cookie, "utf8").trim(), domain: "localhost", path: "/" },
  { name: "compass-idioma", value: op.lang, domain: "localhost", path: "/" },
]);
// The theme is a browser preference (see `lib/design/direction.ts`).
await ctx.addInitScript(
  ({ direction }) => {
    try {
      localStorage.setItem("compass-direcao", direction);
    } catch {
      // no storage: the default stays
    }
  },
  { direction }
);

const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`http://localhost:${op.port}${op.route}`, { waitUntil: "networkidle" });
// The web panel is not remembered (see `lib/design/trilho.ts`): every visit
// starts collapsed, and open is a click on the strip.
if (op.rail === "open") {
  await page.click(".pm-lateral-faixa");
  await page.waitForTimeout(400);
}
if (op.action === "drawer") {
  await page.click(".pm-lateral-gatilho");
  await page.waitForTimeout(400);
}
if (op.key) {
  await page.keyboard.press(op.key);
  await page.waitForTimeout(400);
}
if (op.scroll) await page.locator(op.scroll).first().scrollIntoViewIfNeeded();
await page.screenshot({ path: op.out });

console.log(JSON.stringify({ out: op.out, errors }));
await browser.close();
