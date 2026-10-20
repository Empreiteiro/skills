#!/usr/bin/env node
// Validates a reel caption (English) against the rules in references/caption.md.
//   node validate-caption.mjs <file.md|file.txt> [--first-line "first spoken line"] [--cover "cover text"] [--forbid "a,b,c"]
// In a .md it reads the first ```text block after "## Caption" and, unless given as flags, the first spoken line, the
// cover text and the forbidden terms from the header fields. Exits with code 1 if anything BLOCKS.
import fs from 'node:fs';

const argv = process.argv.slice(2);
const file = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const opt = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
if (!file) { console.error('usage: node validate-caption.mjs <file> [--first-line "..."] [--cover "..."] [--forbid "a,b"]'); process.exit(2); }
const raw = fs.readFileSync(file, 'utf8');
let t = raw;
const field = name => { const m = raw.match(new RegExp('^- \\*\\*' + name + '\\*\\*: [“"]?([^”"\\n]+)[”"]?', 'm')); return m ? m[1].trim() : null; };
if (file.endsWith('.md')) {
  const m = raw.match(/##\s*Caption[\s\S]*?```(?:text)?\n([\s\S]*?)```/i);
  if (!m) { console.error('no ```text block found after "## Caption"'); process.exit(2); }
  t = m[1];
}
t = t.trim();
const blocks = t.split(/\n\s*\n/);
const hook = blocks[0] || '';
const tagLine = blocks[blocks.length - 1] || '';
const tags = tagLine.startsWith('#') ? tagLine.split(/\s+/) : [];
const cta = tags.length ? blocks[blocks.length - 2] : blocks[blocks.length - 1];
const body = blocks.slice(1, tags.length ? -2 : -1).join(' ');
const words = s => s.replace(/[.,:;!?()"“”]/g, ' ').split(/\s+/).filter(Boolean);
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").replace(/[“”"]/g, '');
let blockers = 0;
const res = (level, ok, msg) => {
  const tag = ok ? '✓' : level === 'B' ? '✗ BLOCKS' : '⚠ warning';
  if (!ok && level === 'B') blockers++;
  console.log(`${tag}  ${msg}`);
};

res('B', t.length <= 2200, `total ${t.length}/2200 characters`);
res('B', hook.length > 0, 'hook present');
res('A', hook.length <= 125, `hook ${hook.length}/125 characters`);
const hw = words(hook).length;
res('A', hw >= 14 && hw <= 18, `hook has ${hw} words (14–18)`);
const first7 = words(hook).slice(0, 7).join(' ');
// a number, a name (a proper noun mid-sentence, a quoted term) or a contrast word in the first 7 words
const named = /\d/.test(first7)
  || /\b(never|every|only|one|two|three|four|five|six|seven|not|no|instead|without|but|vs|versus|still|already)\b/i.test(first7)
  || /(^|\s)“|(\s)[A-Z][a-z]+/.test(hook.split(/\s+/).slice(0, 7).join(' '));
res('A', named, `first 7 words carry a number/name/contrast: "${first7}"`);
res('A', !/^(discover|learn|check out|here'?s|everything about|the truth about|\d+\s+(tips|mistakes|steps|ways|reasons|things))\b/i.test(hook), 'opening is not a worn formula');
res('A', !/^(i|my|me)\b/i.test(hook), 'hook does not open with I/my/me');
res('A', !/\?\s*$/.test(hook) || /\d/.test(hook), 'a question in the hook only with a number/name');
const firstLine = opt('--first-line') || field('First line'), cover = opt('--cover') || field('Cover text');
if (firstLine) res('A', !norm(hook).includes(norm(firstLine).slice(0, 30)), 'hook does not repeat the first spoken line');
if (cover) res('A', !norm(hook).includes(norm(cover).slice(0, 25)), 'hook does not repeat the cover');
res('A', !/[—–]/.test(t), 'no dashes');
const emojis = (t.match(/\p{Extended_Pictographic}/gu) || []).length;
res('A', emojis <= 2 && !/\p{Extended_Pictographic}/u.test(hook), `emoji: ${emojis} (max 2, never in the hook)`);
res('A', (t.match(/!/g) || []).length <= 1, 'at most one "!"');
res('B', !/\b[\w-]+\.(com|ai|io|app|net|org|dev|co|so|me)\b/i.test(t) && !/https?:\/\//i.test(t), 'no URL/domain in the caption');
res('B', /^(comment|save|send|tap|click|open|reply|book|download|try|call|join)\b/i.test(cta), `directive CTA: "${cta}"`);
res('B', !/(thank you|thanks for|hope (this|you)|don'?t forget|like and share|if this helped|save this (reel|post|video)|let me know|tell me in the comments|drop a comment|what do you think)/i.test(t), 'no polite/robotic CTA');
res('A', !/link/i.test(cta) || /link in the first comment/i.test(cta), 'link → "link in the first comment"');
res('B', !/link in (the )?bio/i.test(t), 'no "link in bio" (video post)');
res('A', !/(^|[.!?]\s+)(comment|save|send|share|click|tap|download|subscribe|sign up|join|reply|follow)\b/i.test(body), 'body has no second CTA');
const nSentences = (body.match(/[.!?](\s|$)/g) || []).length;
res('A', nSentences >= 1 && nSentences <= 3, `body has ${nSentences} sentence(s) (1–3)`);
res('B', tags.every(h => /^#[\p{L}\p{N}_]+$/u.test(h)) && tags.length <= 30, `${tags.length} valid hashtags`);
res('A', tags.length >= 3 && tags.length <= 5, '3 to 5 hashtags');
const generic = ['#fyp', '#foryou', '#foryoupage', '#viral', '#viralvideo', '#explore', '#explorepage', '#instagood', '#instadaily', '#love', '#follow', '#followme', '#like4like', '#likeforlike', '#reels', '#reelsinstagram', '#trending', '#trend'];
res('A', !tags.some(h => generic.includes(h.toLowerCase())), 'no generic hashtag');
const forbidRaw = opt('--forbid') || field('Forbidden terms') || '';
const forbid = forbidRaw.includes('<') ? [] : forbidRaw.split(',').map(s => s.trim()).filter(Boolean);   // a template placeholder is ignored
if (forbid.length) {
  const hit = forbid.filter(f => norm(t).includes(norm(f)));
  res('B', !hit.length, `no forbidden term${hit.length ? ` (found: ${hit.join(', ')})` : ` (${forbid.length} checked)`}`);
}
res('A', !/\b(delve|unlock|elevate|game[- ]changer|seamless|leverage|robust|harness|supercharge|tapestry|realm|beacon|transformative|empower|streamline|cutting-edge|in today'?s|fast-paced|let'?s dive in|here'?s the thing|at the end of the day|it'?s worth noting)\b/i.test(t), 'no AI/inflated lexicon');
res('A', !/\b(it'?s|this is|that'?s) not [^,.]+, (it'?s|but)\b/i.test(t), 'no "it’s not X, it’s Y" formula');
const nums = [...new Set(t.match(/\d[\d.,]*/g) || [])];
console.log(`ℹ  numbers used: ${nums.join(' ') || '—'}. Check each one is backed by the video or the product's copy.`);
console.log(blockers ? `\n${blockers} blocker(s): the caption FAILS.` : '\nNo blockers.');
process.exit(blockers ? 1 : 0);
