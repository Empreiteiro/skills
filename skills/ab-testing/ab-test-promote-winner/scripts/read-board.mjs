// Reads an A/B results board in a real browser and saves what each arm card
// shows, for the frozen snapshot of a finished test.
//
//   PROJECT_DIR=<repo> CREDS_FILE=<scratch>/console.kv \
//     node read-board.mjs '<board url with the test key and the whole date range>' <out.json>
//
// Environment:
//   CREDS_FILE     KEY=VALUE file with the console login, read only when a
//                  password field appears. Write it straight from the secret
//                  store into a scratch directory; never echo it or put it on a
//                  command line.
//   USER_KEY       key of the user name in CREDS_FILE (default ADMIN_USER)
//   PASS_KEY       key of the password in CREDS_FILE (default ADMIN_PASSWORD)
//   USER_FIELD     CSS of the user-name input (default: name user, username or
//                  email, or type email; skipped when the form has none)
//   CARD_SELECTOR  the cards to read (default [data-arm]; when none match,
//                  every <section> that has a heading)
//   PROJECT_DIR    project whose node_modules has playwright (default: cwd)
//
// Never prints a credential. Reads the DOM, never the raw HTML: a
// server-rendered page can carry what is not on screen (the e-mail behind every
// funnel step, say) in its payload, so the HTML is neither saved nor printed.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: CREDS_FILE=<file> node read-board.mjs '<board url>' <out.json>");
  process.exit(2);
}
const CARDS = process.env.CARD_SELECTOR || '[data-arm]';
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
async function open(page, target) {
  let res = await page.goto(target, { waitUntil: 'networkidle', timeout: 120000 });
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
  res = await page.goto(target, { waitUntil: 'networkidle', timeout: 120000 });
  if (await page.locator(PASSWORD).count()) throw new Error('sign-in failed: check the keys in CREDS_FILE');
  return res;
}

const chromium = loadChromium();
const browser = await chromium.launch();
let cards = [];
try {
  const page = await (await browser.newContext({ viewport: { width: 1600, height: 1200 } })).newPage();
  const res = await open(page, url);
  console.log('status', res ? res.status() : '(none)', new URL(page.url()).pathname);

  cards = await page.evaluate((sel) => {
    const clean = (s) => s.replace(/\s+/g, ' ').trim();
    let els = [...document.querySelectorAll(sel)];
    if (!els.length) els = [...document.querySelectorAll('section')].filter((s) => s.querySelector('h1, h2, h3, h4'));
    return els.map((el) => {
      const h = el.querySelector('h1, h2, h3, h4');
      return {
        arm: el.getAttribute('data-arm'),
        heading: h ? clean(h.innerText) : null,
        lines: el.innerText.split('\n').map(clean).filter(Boolean),
      };
    });
  }, CARDS);
} finally {
  await browser.close();
}

writeFileSync(out, JSON.stringify({ url, readAt: new Date().toISOString(), cards }, null, 2));
for (const c of cards) {
  console.log(`\n## ${c.heading ?? '(no heading)'}${c.arm ? ` [${c.arm}]` : ''}`);
  for (const line of c.lines) console.log('  ', line);
}
console.log(`\n${cards.length} card(s) -> ${out}`);
process.exit(cards.length ? 0 : 1);
