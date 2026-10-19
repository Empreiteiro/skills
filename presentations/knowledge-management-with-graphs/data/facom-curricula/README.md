# FACOM curricula (slide 28)

Mandatory disciplines of every undergraduate course of the four faculties called FACOM, used by the
"O grafo da FACOM" slide. Collected in October 2026 from the official sources listed in each file
(`fontes` of every course).

| File | University | Faculty | Courses | Source of the curricula |
|---|---|---|---|---|
| `ufu.json` | UFU | Faculdade de Computação | Computer Science; Information Systems (Santa Mônica and Monte Carmelo, two curricula); Artificial Intelligence | PPCs, curriculum flowcharts and course sheets on facom.ufu.br |
| `ufms.json` | UFMS | Faculdade de Computação | Computer Science; Computer Engineering; Software Engineering; Information Systems; Artificial Intelligence | PPCs on facom.ufms.br and the academic system (curricula valid from 2026-1) |
| `ufba.json` | UFBA | Faculdade de Comunicação | Journalism; Communication and Culture Production; Film and Audiovisual (a concentration area of the BI in Arts) | SIGAA public pages (structure active since 2025.2) |
| `ufjf.json` | UFJF | Faculdade de Comunicação | Journalism (one curriculum for both shifts); Radio, TV and Internet | SIGA (curriculum 12023) |

## Fields (the files keep the Portuguese keys of the research)

- `cursos[]`: `curso` (course), `campus`, `curriculo` (curriculum version), `fontes` (source URLs), `observacoes` (notes)
- `cursos[].disciplinas[]`: `nome` (name), `codigo` (code), `periodo` (suggested semester), `ch` (hours),
  `unidade` (offering unit), `tipo` (kind of component, when the source gives it)
- `compartilhadas`: disciplines that appear in more than one course, as reported by the research
- `duvidas`: open questions and differences between sources

## From these files to the slide

`build_disciplines.py` applies the rules below, writes `disciplines.js` (git-ignored) and, with `--check`,
confirms that `../../index.html` contains exactly that block:

```bash
python build_disciplines.py --check
```

- One node per discipline per university: same code, or same official name offered by the same unit.
  At UFU each course has its own codes, so the node keeps all of them (`GBC016 · FACOM32105 · GSI505`).
- Different universities are never merged.
- Final projects, internships and graduation projects belong to one course each.
- The offering unit is linked only when it is not the FACOM itself (`mapping.json` maps unit names to nodes).
- Left out: practical-only components of 0h (UFJF), the administrative extension record (UFBA), electives,
  complementary activities.

Result: 350 disciplines, 91 of them shared by more than one course (UFU 34, UFMS 43, UFBA 6, UFJF 8).
