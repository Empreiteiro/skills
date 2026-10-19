// Opens an A/B test's results board in a real browser and fails if it did not
// render. Run it against a local or staging server after building a board, and
// again after archiving a test. Saves one full-page screenshot per URL.
//
//   OUT=<dir> [PROJECT_DIR=<repo>] [CREDS_FILE=<file>] [NAV_SELECTOR=<css>] \
//     node check-board.mjs <board url> [<board url> ...]
//
// Pass every URL the board is served at (the same page mounted under two
// consoles, say), each with the test's key in its query string.
//
// Fails when a page does not answer 200, when it draws fewer than MIN_ARMS arm
// cards, and, with NAV_SELECTOR set, when no tab of the test switcher is
// aria-current="page" or a switcher link leads off the page it was opened on.
//
// Environment:
//   OUT           directory for the screenshots (required)
//   PROJECT_DIR   project whose node_modules has playwright (default: cwd)
//   CREDS_FILE    KEY=VALUE file with the console login, read only when a
//                 password field appears. A throwaway login, never production's:
//                 reading production is read-board.mjs, in ab-test-promote-winner.
//   USER_KEY      key of the user name in CREDS_FILE (default ADMIN_USER)
//   PASS_KEY      key of the password in CREDS_FILE (default ADMIN_PASSWORD)
//   USER_FIELD    CSS of the user-name input (default: name user, username or
//                 email, or type email; skipped when the form has none)
//   ARM_SELECTOR  one element per arm card (default [data-arm])
//   MIN_ARMS      fewest arm cards that pass (default 1)
//   NAV_SELECTOR  the test switcher (optional)
//
// Never prints a credential.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const urls = process.argv.slice(2);
const OUT = process.env.OUT;
if (!OUT || !urls.length) {
  console.error('usage: OUT=<dir> node check-board.mjs <board url> [<board url> ...]');
  process.exit(2);
}
const ARM = process.env.ARM_SELECTOR || '[data-arm]';
const NAV = process.env.NAV_SELECTOR;
const MIN_ARMS = Number(process.env.MIN_ARMS || 1);
const USER_FIELD =
  process.env.USER_FIELD || 'input[name=user], input[name=username], input[name=email], input[type=email]';
const PASSWORD = 'input[type=password]';

function loadChromium() {
  const require = createRequire(join(process.env.PROJECT_DIR || process.cwd(), 'package.json'));
  for (const name of ['playwright', '@playwright/test']) {
    try {
      return require(name).chromium;
    } catch {
      // try the next package
    }
  }
  console.error('playwright not found: install it in the project, or point PROJECT_DIR at one that has it');
  process.exit(2);
}

function readCreds(file) {
  const kv = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1);
  }
  return kv;
}

// Consoles often redirect to their own login screen instead of answering a
// Basic-auth challenge, so sign in through the form when a password field shows.
async function open(page, url) {
  let res = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  if (!(await page.locator(PASSWORD).count())) return res;
  if (!process.env.CREDS_FILE) throw new Error('the page asks for a login: set CREDS_FILE');
  const kv = readCreds(process.env.CREDS_FILE);
  const user = page.locator(USER_FIELD).first();
  if (await user.count()) await user.fill(kv[process.env.USER_KEY || 'ADMIN_USER'] ?? '');
  await page.locator(PASSWORD).first().fill(kv[process.env.PASS_KEY || 'ADMIN_PASSWORD'] ?? '');
  await page.locator('button[type=submit], input[type=submit]').first().click();
  await page
    .waitForFunction((sel) => !document.querySelector(sel), PASSWORD, { timeout: 20000 })
    .catch(() => page.waitForLoadState('networkidle'));
  res = await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  if (await page.locator(PASSWORD).count()) throw new Error('sign-in failed: check the keys in CREDS_FILE');
  return res;
}

const chromium = loadChromium();
mkdirSync(OUT, { recursive: true });
const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log('  FAIL', msg);
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1100 } })).newPage();
try {
  for (const [i, url] of urls.entries()) {
    const { pathname: home, search } = new URL(url);
    console.log(`\n${url}`);
    try {
      const res = await open(page, url);
      if (res && res.status() !== 200) fail(`${home}: status ${res.status()}`);

      const arms = await page.$$eval(ARM, (els) =>
        els.map(
          (el) =>
            el.getAttribute('data-arm') ||
            el.querySelector('h1, h2, h3, h4')?.textContent.replace(/\s+/g, ' ').trim() ||
            '(unnamed)',
        ),
      );
      console.log(`  arms: ${arms.join(' | ') || '(none)'}`);
      if (arms.length < MIN_ARMS) fail(`${home}: ${arms.length} arm card(s) match ${ARM}, expected at least ${MIN_ARMS}`);

      if (NAV) {
        const links = await page.locator(NAV).locator('a[href]').evaluateAll((as) =>
          as.map((a) => ({
            text: a.textContent.replace(/\s+/g, ' ').trim(),
            href: a.getAttribute('href'),
            current: a.getAttribute('aria-current') === 'page',
          })),
        );
        if (!links.length) fail(`${home}: no link inside ${NAV}`);
        else if (!links.some((l) => l.current)) fail(`${home}: no tab is aria-current="page" (is the test registered?)`);
        for (const l of links) {
          const to = new URL(l.href, url).pathname;
          console.log(`  ${to === home ? 'ok  ' : 'FAIL'} ${l.text} -> ${l.href}`);
          if (to !== home) fail(`${home}: "${l.text}" leads to ${l.href}`);
        }
      }

      const name = `${home}${search}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      const shot = join(OUT, `${i + 1}-${name || 'board'}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      console.log(`  screenshot: ${shot}`);
    } catch (err) {
      fail(`${home}: ${err.message}`);
    }
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} failure(s)` : '\nevery board drew its arms');
process.exit(failures.length ? 1 : 0);
