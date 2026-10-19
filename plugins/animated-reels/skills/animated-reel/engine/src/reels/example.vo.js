// example · voice-over script of the kit's demo reel (not a deliverable).
// The character speaks in their own voice (cast/cast.json); the brand closes in VOICE.
// `node tools/vo.mjs --reel example` synthesizes every line, checks it with Whisper and rewrites example.vo.json
// (the shipped .vo.json has hand-estimated timings so the demo renders before any TTS is installed).
export const VOICE = { voice: 'en-US-AndrewMultilingualNeural', rate: '+10%' };
const HOST = { voice: 'en-US-AvaMultilingualNeural', rate: '+4%' };
export const LINES = [
  { id: 'l1', t: 0.25, text: 'My recipe says two cups. It means one.', ...HOST },
  { id: 'l2', t: 4.2, text: 'A note in the margin, one tap, and only that line changes.', ...HOST },
  { id: 'l3', t: 8.75, text: 'Small fixes. Nothing else moves.' },
  { id: 'l4', gap: 0.3, text: 'Learn more. The link is in the first comment.' },
];
