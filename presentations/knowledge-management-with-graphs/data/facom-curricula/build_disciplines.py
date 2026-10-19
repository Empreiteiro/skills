"""Build the course-discipline block of the FACOM graph (slide 28 of index.html) from the official curricula.

Usage:
    python build_disciplines.py              # prints a summary and writes disciplines.js next to this file
    python build_disciplines.py --check      # also checks that index.html contains exactly that block

Rules:
- one node per discipline per university: the same code (or the same official name offered by the same
  unit) in several courses becomes a single node, linked to each course with that course's semester;
- different universities are never merged (UFU's "Banco de Dados" and UFMS's are two nodes);
- final project (TCC), internship and similar components belong to one course, even when the name repeats;
- the offering unit becomes an edge only when it is not the FACOM itself;
- practical-only components (0h, UFJF) and the administrative extension record (UFBA) are left out.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
DECK = HERE.parent.parent / 'index.html'
mapping = json.loads((HERE / 'mapping.json').read_text(encoding='utf-8-sig'))

# course (name in the research file [| campus]) -> node id in index.html
COURSES = {
    'UFU': {'Ciência da Computação': 'ufu_cc', 'Sistemas de Informação': 'ufu_si', 'Inteligência Artificial': 'ufu_ia'},
    'UFMS': {'Ciência da Computação': 'ufms_cc', 'Engenharia de Computação': 'ufms_ec', 'Engenharia de Software': 'ufms_es',
             'Sistemas de Informação': 'ufms_si', 'Inteligência Artificial': 'ufms_ia'},
    'UFBA': {'Jornalismo': 'ufba_jor', 'Produção em Comunicação e Cultura': 'ufba_pcc', 'Cinema e Audiovisual': 'ufba_cine'},
    'UFJF': {'Jornalismo': 'ufjf_jor', 'Rádio, TV e Internet': 'ufjf_rtvi'},
}
for uni, extra in mapping.get('courses', {}).items():
    COURSES.setdefault(uni, {}).update(extra)
UNITS = mapping.get('units', {})  # 'UFMS:INMA' -> node id of the unit
SKIP_TYPES = {'componente prático (0h)'}  # practical part of another discipline, no hours of its own
LOWER = {'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'para', 'com', 'na', 'no', 'nas', 'nos', 'à', 'às',
         'ao', 'aos', 'por', 'pela', 'pelo', 'sobre', 'sem', 'entre', 'ou'}
ACRONYMS = {'i', 'ii', 'iii', 'iv', 'vi', 'vii', 'viii', 'ix', 'tv', 'tcc', 'ti', 'ia', 'ihc', 'web', 'rtvi'}


def key(text):
    text = unicodedata.normalize('NFKD', text or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def spelling(name):
    """ALL-CAPS names (UFJF's SIGA) to normal Portuguese capitalization; other names are kept as they are."""
    if name != name.upper():
        return name
    name = re.sub(r'\s+:', ':', name.strip())
    parts = re.split(r'(\s+|-|/)', name.lower())
    out = []
    for i, p in enumerate(parts):
        bare = p.rstrip(':,.;')
        if not p.strip() or p in '-/':
            out.append(p)
        elif bare in ACRONYMS:
            out.append(bare.upper() + p[len(bare):])
        elif p in LOWER and i > 0:
            out.append(p)
        else:
            out.append(p[0].upper() + p[1:])
    return ''.join(out)


def is_facom(uni, unit):
    return unit == 'FACOM' or any(re.search(rx, unit) for rx in mapping.get('facom_rx', {}).get(uni, []))


def unit_id(uni, unit):
    """'facom' for the FACOM itself, otherwise the node id of the unit (None, with a warning, if unmapped)."""
    if not unit:
        return None
    if is_facom(uni, unit):
        return 'facom'
    uid = UNITS.get(f'{uni}:{unit}')
    for rx, node in mapping.get('units_rx', {}).get(uni, []):
        if not uid and re.search(rx, unit):
            uid = node
    if not uid:
        print('warning: unit without a node', uni, unit, file=sys.stderr)
    return uid


def skip(d):
    return d.get('tipo') in SKIP_TYPES or re.search(r'homologacao de extensao', key(d['nome']))


def per_course(d):
    kind = key(d.get('tipo'))
    return 'nao disciplinar' in kind or kind in ('tcc', 'estagio') or \
        re.search(r'estagio|trabalho de conclusao|\btcc\b|projeto de graduacao', key(d['nome']))


def course_id(uni, c):
    table = COURSES[uni]
    for k in (f"{c['curso']} | {c.get('campus')}", c['curso']):
        if k in table:
            return table[k]
    raise SystemExit(f'course without an id: {uni} / {c["curso"]} / {c.get("campus")}')


def js(v):
    return json.dumps(v, ensure_ascii=False)


lines, summary = [], []
for name in ('ufu', 'ufms', 'ufba', 'ufjf'):
    data = json.loads((HERE / f'{name}.json').read_text(encoding='utf-8-sig'))
    uni = data['universidade']
    nodes, by_code, by_name, order = {}, {}, {}, []
    for c in data['cursos']:
        cid = course_id(uni, c)
        for d in c['disciplinas']:
            if skip(d):
                continue
            # the name only merges disciplines of the same unit (UFBA's "Políticas Culturais" exists at FACOM and IHAC)
            code, nm = d.get('codigo'), key(d['nome']) + '|' + str(unit_id(uni, d.get('unidade')))
            if per_course(d):
                k = f'{cid}:{nm}'
            else:
                k = (code and by_code.get(code)) or by_name.get(nm) or nm
                by_name.setdefault(nm, k)
                if code:
                    by_code.setdefault(code, k)
            if k not in nodes:
                nodes[k] = {'name': spelling(d['nome']), 'codes': [], 'hours': [], 'units': [], 'courses': {}}
                order.append(k)
            n = nodes[k]
            for field, v in (('codes', code), ('hours', d.get('ch')), ('units', d.get('unidade'))):
                if v is not None and v not in n[field]:
                    n[field].append(v)
            if cid in n['courses'] and n['courses'][cid] != d.get('periodo'):
                print('warning: two semesters in the same course', uni, d['nome'], file=sys.stderr)
            n['courses'][cid] = d.get('periodo')
    lines.append(f"  disciplinas('{uni.lower()}', [")
    for k in order:
        n = nodes[k]
        uids = []
        for unit in n['units']:
            uid = unit_id(uni, unit)
            if uid and uid != 'facom' and uid not in uids:
                uids.append(uid)
        if len(uids) > 1:
            print('warning: more than one offering unit', uni, n['name'], uids, file=sys.stderr)
        code = ' · '.join(n['codes']) or None
        hours = n['hours'][0] if len(n['hours']) == 1 else ('/'.join(str(v) for v in n['hours']) or None)
        lines.append(f"    [{js(n['name'])}, {js(code)}, {js(hours)}, {js(uids[0] if uids else None)}, {js(n['courses'])}],")
    lines.append('  ]);')
    shared = sum(1 for n in nodes.values() if len(n['courses']) > 1)
    summary.append(f'{uni}: {len(nodes)} disciplines, {shared} in more than one course')

block = '\n'.join(lines) + '\n'
(HERE / 'disciplines.js').write_text(block, encoding='utf-8')
print('\n'.join(summary))
if '--check' in sys.argv:
    ok = block in DECK.read_text(encoding='utf-8')
    print('index.html contains this block:', 'yes' if ok else 'NO')
    sys.exit(0 if ok else 1)
