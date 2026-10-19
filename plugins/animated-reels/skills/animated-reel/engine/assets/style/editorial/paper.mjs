#!/usr/bin/env node
// Generates the editorial style's paper texture: paper.png next to this script (1080x1920, BLACK with alpha only in
// the troughs). Laid over the skin's #f4eee4 ground, it darkens by paper × (1 − alpha): the pulp (a broad cloud,
// 2–4%) and the fiber (fine grain, 1–3%). Pre-rendered because a live feTurbulence filter is re-rasterized on every
// frame and cost about 40% of the render time. Deterministic (hash noise, no Math.random): every run gives the same PNG.
// The PNG is written directly (zlib + CRC32), so no ImageMagick is needed.
//   node assets/style/editorial/paper.mjs [--pulp 0.04] [--fiber 0.06]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf(`--${n}`); return i === -1 ? d : Number(argv[i + 1]); };
const PULP = flag('pulp', 0.04), FIBER = flag('fiber', 0.06);
const W = 1080, H = 1920;
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const smooth = t => t * t * (3 - 2 * t);
/** value noise with smooth interpolation, period in px */
const value = (x, y, per, s) => {
  const gx = x / per, gy = y / per, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = smooth(gx - x0), fy = smooth(gy - y0);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const px = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  // pulp: three broad octaves (periods 420, 210, 105 px)
  const p = (value(x, y, 420, 11) * 0.55 + value(x, y, 210, 12) * 0.3 + value(x, y, 105, 13) * 0.15);
  // fiber: fine grain (period ~2 px) with a thread slightly stretched horizontally
  const f = value(x, y * 1.6, 1.6, 21) * 0.7 + hash(x, y, 22) * 0.3;
  const a = Math.max(0, (0.5 - p) * 4 * PULP) + Math.max(0, (0.5 - f) * 4 * FIBER);
  const o = (y * W + x) * 4;
  px[o] = px[o + 1] = px[o + 2] = 0;
  px[o + 3] = Math.min(255, Math.round(a * 255));
}

// PNG: 8-bit RGBA (colour type 6), each row prefixed with filter byte 0, one zlib-deflated IDAT
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  len.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; // compression, filter, interlace: 0
const rows = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) px.copy(rows, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'paper.png');
fs.writeFileSync(out, png);
console.log(`ok ${out} (pulp ${PULP}, fiber ${FIBER})`);
