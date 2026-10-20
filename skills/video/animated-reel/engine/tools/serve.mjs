// Minimal static server (ES modules do not load over file://).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.json':'application/json',
  '.ttf':'font/ttf', '.woff2':'font/woff2', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.wav':'audio/wav', '.css':'text/css', '.svg':'image/svg+xml',
  '.jpeg':'image/jpeg', '.avif':'image/avif', '.gif':'image/gif' };
export function serve(root, port = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      const rel = path.relative(root, p);   // on Windows a decoded %5c is a separator: keep requests inside root
      if (rel.startsWith('..') || path.isAbsolute(rel)) { rsp.writeHead(404); rsp.end(); return; }
      fs.readFile(p, (err, buf) => {
        if (err) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        rsp.end(buf);
      });
    }).listen(port, '127.0.0.1', () => res(srv));
  });
}
