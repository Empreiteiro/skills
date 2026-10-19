/*
 * Screenshots of one page of a running web app, for every width and theme
 * asked, with the page's console errors and any horizontal overflow.
 *
 *   node "${CLAUDE_SKILL_DIR}/scripts/capture.mjs" \
 *     --url http://localhost:3000/settings --widths 1440,390 --themes light,dark \
 *     --cookie-file session=$DEMO/cookie.txt --out $DEMO/shots
 *
 * Files come out as <name>-<width>-<theme>.png (the name defaults to the URL
 * path), and one JSON line per screenshot is printed: the file, the steps that
 * could not run, the console errors, the requests that failed (status 400 or
 * more) and, when the page scrolls sideways, by how much and which elements
 * stick out.
 *
 * Page:      --url (required), --name, --out <dir> (default .)
 * Sizes:     --widths 1440,390; --height (default 900, or 844 below
 *            --mobile-below); --mobile-below 768 (narrower widths also emulate a
 *            touch phone); --scale (device pixel ratio, default 1); --full-page
 * Themes:    --themes light,dark (light and dark also emulate
 *            prefers-color-scheme); --theme-storage <key> writes the theme into
 *            localStorage[key]; --theme-cookie <name> sets it as a cookie
 * Session:   --cookie name=value, --cookie-file name=path (value read from the
 *            file), --storage-state state.json (Playwright), --local-storage
 *            key=value, --locale en-US — all repeatable except the last two
 * Steps:     --click <selector> and --key <key> run in the order given, each
 *            followed by --settle ms (default 400); then --scroll <selector>
 *            and --wait-for <selector>
 *
 * Playwright is not a dependency of this script: it uses the `playwright` or
 * `playwright-core` installed in the project or globally (`npm root -g`).
 * Chromium is Playwright's own, or `CHROMIUM_PATH`, or the one found under
 * `PLAYWRIGHT_BROWSERS_PATH` when Playwright's version does not match it.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: op, tokens } = parseArgs({
  tokens: true,
  options: {
    url: { type: "string" },
    name: { type: "string" },
    out: { type: "string", default: "." },
    widths: { type: "string", default: "1440,390" },
    height: { type: "string" },
    "mobile-below": { type: "string", default: "768" },
    scale: { type: "string", default: "1" },
    "full-page": { type: "boolean", default: false },
    themes: { type: "string", default: "light,dark" },
    "theme-storage": { type: "string" },
    "theme-cookie": { type: "string" },
    cookie: { type: "string", multiple: true, default: [] },
    "cookie-file": { type: "string", multiple: true, default: [] },
    "storage-state": { type: "string" },
    "local-storage": { type: "string", multiple: true, default: [] },
    locale: { type: "string" },
    click: { type: "string", multiple: true, default: [] },
    key: { type: "string", multiple: true, default: [] },
    settle: { type: "string", default: "400" },
    scroll: { type: "string" },
    "wait-for": { type: "string" },
  },
});
if (!op.url) throw new Error("--url is required, e.g. --url http://localhost:3000/dashboard");

const url = new URL(op.url);
const list = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);
const pair = (text, option) => {
  const i = text.indexOf("=");
  if (i < 1) throw new Error(`${option} takes name=value, not "${text}".`);
  return [text.slice(0, i), text.slice(i + 1)];
};
const name =
  op.name ??
  (url.pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-") || "home");
const settle = Number(op.settle);

const cookies = [
  ...op.cookie.map((c) => pair(c, "--cookie")),
  ...op["cookie-file"].map((c) => {
    const [cookie, file] = pair(c, "--cookie-file");
    return [cookie, readFileSync(file, "utf8").trim()];
  }),
];
const storage = op["local-storage"].map((s) => pair(s, "--local-storage"));
// --click and --key, in the order they were given.
const steps = tokens
  .filter((t) => t.kind === "option" && (t.name === "click" || t.name === "key"))
  .map((t) => ({ kind: t.name, value: t.value }));

function playwright() {
  const places = [process.cwd(), execSync("npm root -g").toString().trim()];
  for (const place of places) {
    const load = createRequire(path.join(place, "noop.js"));
    for (const pkg of ["playwright", "playwright-core"]) {
      try {
        return load(pkg);
      } catch {
        // try the next one
      }
    }
  }
  throw new Error("Playwright not found: `npm i --no-save playwright-core` (or install it globally).");
}

function bundledChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  for (const folder of readdirSync(root).filter((f) => /^chromium-\d+$/.test(f))) {
    for (const exe of ["chrome-linux/chrome", "chrome-linux64/chrome"]) {
      const file = path.join(root, folder, exe);
      if (existsSync(file)) return file;
    }
  }
  return undefined;
}

async function launch(browserType) {
  if (process.env.CHROMIUM_PATH) return browserType.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    return await browserType.launch();
  } catch (error) {
    const fallback = bundledChromium();
    if (!fallback) throw error;
    return browserType.launch({ executablePath: fallback });
  }
}

/* How far the page scrolls sideways, and the outermost elements that cause it. */
function overflow() {
  const width = document.documentElement.clientWidth;
  const amount = document.documentElement.scrollWidth - width;
  if (amount <= 0) return { amount: 0, elements: [] };
  const scrolls = (el) => /(auto|scroll|hidden|clip)/.test(getComputedStyle(el).overflowX);
  const describe = (el) =>
    el.tagName.toLowerCase() +
    (el.id ? `#${el.id}` : "") +
    [...el.classList].slice(0, 3).map((c) => `.${c}`).join("");
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0 || box.right <= width + 1) continue;
    if (getComputedStyle(el).position === "fixed") continue;
    let parent = el.parentElement;
    let inside = false;
    while (parent && parent !== document.body) {
      const pbox = parent.getBoundingClientRect();
      if (scrolls(parent) || pbox.right > width + 1) {
        inside = true; // clipped by a scroller, or already reported through a parent
        break;
      }
      parent = parent.parentElement;
    }
    if (!inside) out.push({ element: describe(el), right: Math.round(box.right) });
  }
  return { amount, elements: out.slice(0, 8) };
}

const { chromium } = playwright();
const browser = await launch(chromium);
mkdirSync(op.out, { recursive: true });

for (const width of list(op.widths).map(Number)) {
  const mobile = width < Number(op["mobile-below"]);
  const height = Number(op.height ?? (mobile ? 844 : 900));
  for (const theme of list(op.themes)) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: Number(op.scale),
      isMobile: mobile,
      hasTouch: mobile,
      locale: op.locale,
      colorScheme: theme === "light" || theme === "dark" ? theme : undefined,
      storageState: op["storage-state"],
    });
    const themeCookie = op["theme-cookie"] ? [[op["theme-cookie"], theme]] : [];
    await ctx.addCookies(
      [...cookies, ...themeCookie].map(([cookie, value]) => ({ name: cookie, value, url: url.origin }))
    );
    const entries = [...storage, ...(op["theme-storage"] ? [[op["theme-storage"], theme]] : [])];
    if (entries.length) {
      await ctx.addInitScript((pairs) => {
        try {
          for (const [k, v] of pairs) localStorage.setItem(k, v);
        } catch {
          // no storage: the app's defaults stay
        }
      }, entries);
    }

    const page = await ctx.newPage();
    const errors = [];
    const failed = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("response", (r) => {
      if (r.status() < 400) return;
      const where = new URL(r.url());
      failed.push(`${r.status()} ${r.request().method()} ${where.origin === url.origin ? where.pathname : r.url()}`);
    });

    await page.goto(url.href, { waitUntil: "networkidle" });
    // A step that cannot run (the element is not on this width, say) is
    // reported, and the screenshot is still taken.
    const skipped = [];
    const attempt = async (label, action) => {
      try {
        await action();
      } catch (error) {
        skipped.push(`${label}: ${String(error.message).split("\n")[0]}`);
      }
    };
    for (const step of steps) {
      if (step.kind === "click") await attempt(`--click ${step.value}`, () => page.click(step.value, { timeout: 5000 }));
      else await attempt(`--key ${step.value}`, () => page.keyboard.press(step.value));
      await page.waitForTimeout(settle);
    }
    if (op.scroll) {
      await attempt(`--scroll ${op.scroll}`, () =>
        page.locator(op.scroll).first().scrollIntoViewIfNeeded({ timeout: 5000 })
      );
    }
    if (op["wait-for"]) {
      await attempt(`--wait-for ${op["wait-for"]}`, () => page.waitForSelector(op["wait-for"], { timeout: 10000 }));
    }

    const file = path.join(op.out, `${name}-${width}-${theme}.png`);
    const sideways = await page.evaluate(overflow);
    await page.screenshot({ path: file, fullPage: op["full-page"] });
    console.log(JSON.stringify({ file, width, theme, skipped, errors, failed, overflow: sideways }));
    await ctx.close();
  }
}
await browser.close();
