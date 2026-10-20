#!/usr/bin/env node
/* Contact sheet interativo para seleção de momentos.

   Gera um HTML com tabs (uma por versão), grade de frames com timestamp,
   clique pra selecionar, e export da lista "versão @ M:SS.s" — o formato
   que a fase de montagem final consome.

     node contact-sheet.mjs sheet.html v01=ten/v01-pushcut/out/frames v03=ten/v03/out/frames
     node contact-sheet.mjs sheet.html --step 10 --fps 30 v01=...

   --step N  usa 1 a cada N frames (default 10 → 0.33s a 30fps)
   --fps N   fps do render (default 30)

   Os PNGs são embutidos como <img src> relativos — o sheet.html deve ficar
   num diretório de onde os caminhos de frames sejam alcançáveis. */
import { readdirSync, writeFileSync } from 'node:fs';
import { relative, dirname, resolve, join } from 'node:path';

const argv = process.argv.slice(2);
const out = argv.find(a => a.endsWith('.html'));
if (!out) { console.error('uso: node contact-sheet.mjs sheet.html nome=pasta-de-frames ...'); process.exit(1); }
const opt = (f, d) => { const i = argv.indexOf(f); return i < 0 ? d : Number(argv[i + 1]); };
const STEP = opt('--step', 10);
const FPS = opt('--fps', 30);
const outDir = dirname(resolve(out));

const versions = argv.filter(a => a.includes('=') && !a.startsWith('--')).map(a => {
  const [name, dir] = a.split('=');
  const frames = readdirSync(dir).filter(f => f.endsWith('.png')).sort()
    .filter((_, i) => i % STEP === 0)
    .map(f => {
      const n = Number((f.match(/(\d+)/) || [0, 0])[1]);
      const t = n / FPS;
      const stamp = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;
      return { src: relative(outDir, join(resolve(dir), f)), stamp };
    });
  return { name, frames };
});
if (!versions.length) { console.error('nenhuma versão passada (nome=pasta)'); process.exit(1); }

const html = `<!doctype html><meta charset="utf-8"><title>frame picker</title>
<style>
  body{margin:0;font:13px/1.4 ui-monospace,monospace;background:#111;color:#eee}
  nav{position:sticky;top:0;background:#111;padding:10px;border-bottom:1px solid #333;z-index:2}
  nav button{font:inherit;background:#222;color:#eee;border:1px solid #444;padding:6px 14px;margin-right:6px;cursor:pointer}
  nav button.on{background:#eee;color:#111}
  nav .exp{float:right;background:#c33;border-color:#c33;color:#fff}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px;padding:10px}
  .grid{display:none}.grid.on{display:grid}
  figure{margin:0;cursor:pointer;border:3px solid transparent}
  figure.sel{border-color:#c33}
  img{width:100%;display:block}
  figcaption{padding:2px 4px;color:#999}
  figure.sel figcaption{color:#c33}
</style>
<nav>${versions.map((v, i) => `<button class="tab${i ? '' : ' on'}" data-v="${v.name}">${v.name}</button>`).join('')}
<button class="exp" onclick="exportSel()">exportar seleção</button></nav>
${versions.map((v, i) => `<div class="grid${i ? '' : ' on'}" data-v="${v.name}">
${v.frames.map(f => `<figure data-id="${v.name} @ ${f.stamp}"><img loading="lazy" src="${f.src}"><figcaption>${v.name} @ ${f.stamp}</figcaption></figure>`).join('\n')}
</div>`).join('\n')}
<script>
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    document.querySelectorAll('.tab,.grid').forEach(e => e.classList.remove('on'));
    b.classList.add('on');
    document.querySelector('.grid[data-v="' + b.dataset.v + '"]').classList.add('on');
  });
  document.querySelectorAll('figure').forEach(f => f.onclick = () => f.classList.toggle('sel'));
  function exportSel(){
    const list = [...document.querySelectorAll('figure.sel')].map(f => f.dataset.id).join('\\n');
    const w = window.open('', '_blank');
    w.document.write('<pre>' + (list || '(nada selecionado)') + '</pre>');
  }
</script>`;
writeFileSync(out, html);
console.log(`${out}: ${versions.map(v => `${v.name} ${v.frames.length}f`).join(', ')}`);
