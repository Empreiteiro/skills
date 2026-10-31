"""Build the timeline of LLM context windows (slide 2 of index.html).

    python build_timeline.py            # rewrites the block between the markers in ../../index.html
    python build_timeline.py --check    # only checks that index.html already holds this block

x = release date (linear), y = context window in tokens (log scale, 1K to 10M).
Events (LangChain, ChatGPT, Langflow, Cursor, Claude Code) are marked on the time axis.
Sources for every date and size are in README.md.
"""
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DECK = HERE.parent.parent / 'index.html'
START, END = '<!-- linha-do-tempo:inicio -->', '<!-- linha-do-tempo:fim -->'

# name, release (year, month, day), context in tokens, label position
# pos: 'r' right of the dot, 'l' left, 'a' above, 'b' below, starting at the dot
MODELS = [
    ('GPT-3',           (2020, 6, 11),  2_048,      'r'),
    ('GPT-3.5 Turbo',   (2023, 3, 1),   4_096,      'l'),
    ('GPT-4',           (2023, 3, 14),  8_192,      'r'),
    ('Claude 2',        (2023, 7, 11),  100_000,    'a'),
    ('GPT-4 Turbo',     (2023, 11, 6),  128_000,    'b'),
    ('Gemini 1.5 Pro',  (2024, 2, 15),  1_000_000,  'a'),
    ('Claude 3',        (2024, 3, 4),   200_000,    'a'),
    ('Llama 3.1',       (2024, 7, 23),  128_000,    'r'),
    ('Llama 4 Scout',   (2025, 4, 5),   10_000_000, 'r'),
    ('GPT-4.1',         (2025, 4, 14),  1_000_000,  'l'),
    ('GPT-5',           (2025, 8, 7),   400_000,    'r'),
    ('Claude Opus 4.6', (2026, 2, 5),   1_000_000,  'a'),
]
# events: name, launch, label row (1 or 2), anchor
TOOLS = [
    ('LangChain',   (2022, 10, 25), 1, 'end'),
    ('ChatGPT',     (2022, 11, 30), 2, 'end'),
    ('Langflow',    (2023, 2, 15),  2, 'start'),
    ('Cursor',      (2023, 3, 14),  1, 'start'),
    ('Claude Code', (2025, 2, 24),  1, 'middle'),
]

W, H = 1700, 900
X0, X1 = 130, 1640            # plot area
T0, T1 = 2020.0, 2026.6       # time domain
Y_LO, Y_HI = 700, 70          # y of 1K and 10M
AXIS = 750                    # time axis


def year(d):
    y, m, day = d
    return y + (m - 1) / 12 + (day - 1) / 365


def x(d):
    return X0 + (year(d) - T0) / (T1 - T0) * (X1 - X0)


def y(tokens):
    return Y_LO + (math.log10(tokens) - 3) / 4 * (Y_HI - Y_LO)


def size(tokens):
    if tokens >= 1_000_000:
        return f'{tokens // 1_000_000}M'
    return f'{round(tokens / 1000)}K' if tokens >= 10_000 or tokens % 1000 == 0 else f'{round(tokens / 1024)}K'


def svg():
    out = [f'<svg class="jc-svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet" role="img" '
           f'aria-label="Linha do tempo dos modelos de linguagem e do tamanho da janela de contexto, de 2020 a 2026">']
    # grid (log) with labels on the left
    for e, lab in [(3, '1K'), (4, '10K'), (5, '100K'), (6, '1M'), (7, '10M')]:
        gy = y(10 ** e)
        out.append(f'  <line class="jc-grade" x1="{X0 - 20}" y1="{gy:.0f}" x2="{X1}" y2="{gy:.0f}"/>')
        out.append(f'  <text class="jc-eixo-y" x="{X0 - 34}" y="{gy:.0f}">{lab}</text>')
    # time axis: ticks at each 1 January, year label in the middle of its year
    out.append(f'  <line class="jc-eixo" x1="{X0 - 20}" y1="{AXIS}" x2="{X1}" y2="{AXIS}"/>')
    for yr in range(2020, 2027):
        tx = x((yr, 1, 1))
        out.append(f'  <line class="jc-tick" x1="{tx:.0f}" y1="{AXIS}" x2="{tx:.0f}" y2="{AXIS + 14}"/>')
        mid = x((yr, 7, 1))
        if mid < X1:
            out.append(f'  <text class="jc-ano" x="{mid:.0f}" y="{AXIS + 44}">{yr}</text>')
    # events: diamond on the axis, dashed stem down to the label
    for i, (name, d, row, anchor) in enumerate(TOOLS):
        tx = x(d)
        ly = AXIS + (96 if row == 1 else 132)
        dx = {'end': 4, 'start': -4, 'middle': 0}[anchor]
        out.append(f'  <g class="jc-ferramenta" style="--i:{i}">')
        out.append(f'    <line x1="{tx:.0f}" y1="{AXIS + 10}" x2="{tx:.0f}" y2="{ly - 24}"/>')
        out.append(f'    <path d="M{tx:.0f},{AXIS - 9} l9,9 l-9,9 l-9,-9 z"/>')
        out.append(f'    <text x="{tx + dx:.0f}" y="{ly}" text-anchor="{anchor}">{name}</text>')
        out.append('  </g>')
    # models: faint stem to the axis, dot, name and context size
    for i, (name, d, tokens, pos) in enumerate(MODELS):
        px, py = x(d), y(tokens)
        if pos == 'r':
            lx, ly, anchor = px + 18, py - 2, 'start'
        elif pos == 'l':
            lx, ly, anchor = px - 18, py - 2, 'end'
        elif pos == 'a':
            lx, ly, anchor = px, py - 56, 'middle'
        else:  # below
            lx, ly, anchor = px - 8, py + 46, 'start'
        out.append(f'  <g class="jc-modelo" style="--i:{i}">')
        out.append(f'    <line class="jc-haste" x1="{px:.0f}" y1="{py + 9:.0f}" x2="{px:.0f}" y2="{AXIS}"/>')
        out.append(f'    <circle cx="{px:.0f}" cy="{py:.0f}" r="9"/>')
        out.append(f'    <text x="{lx:.0f}" y="{ly:.0f}" text-anchor="{anchor}">'
                   f'<tspan class="jc-nome">{name}</tspan>'
                   f'<tspan class="jc-ctx" x="{lx:.0f}" dy="30">{size(tokens)}</tspan></text>')
        out.append('  </g>')
    out.append('</svg>')
    return '\n'.join(out)


def main():
    block = f'{START}\n{svg()}\n{END}'
    html = DECK.read_text(encoding='utf-8')
    a, b = html.index(START), html.index(END) + len(END)
    if '--check' in sys.argv:
        ok = html[a:b] == block
        print('index.html contains this block:', 'yes' if ok else 'NO')
        sys.exit(0 if ok else 1)
    DECK.write_text(html[:a] + block + html[b:], encoding='utf-8')
    print(f'wrote {len(MODELS)} models and {len(TOOLS)} events into {DECK.name}')


if __name__ == '__main__':
    main()
