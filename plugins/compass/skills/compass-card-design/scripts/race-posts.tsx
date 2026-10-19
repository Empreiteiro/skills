/*
 * Renders the race-analysis posts to PNG without starting the app: the same
 * analysis the page builds, the same `paineisDe` and the same `CardProva` as
 * the `api/cards/prova` route.
 *
 *   node --no-warnings --import ./tests/register.mjs \
 *     "${CLAUDE_SKILL_DIR}/scripts/race-posts.tsx" \
 *     --race badwater-135 --panel idadeTaxa,abandonos --theme papel --out $DIR
 *
 * Run it from the root of the Compass checkout: `@/` and the npm packages
 * resolve from the working directory, wherever this file is installed.
 *
 * Options: --race <slug,...> (default: all), --panel <key,...> (default: all),
 * --theme, --texture, --lang pt|en, --phrase mono|serifa|manchete|olho and
 * --out <dir>. Files come out as `<race>-<panel>.png`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { getTheme } from "@/lib/cards/themes";
import { estiloDoTexto } from "@/lib/cards/instagram";
import { renderPost } from "@/lib/cards/render/respond";
import { CardProva } from "@/lib/cards/render/Prova";
import { ANALISES } from "@/components/provas/analises";
import { PROVAS, rotaDaProva } from "@/lib/provas";
import { paineisDe } from "@/lib/provas/paineis";
import { SITE_URL } from "@/lib/site";
import type { Locale } from "@/lib/i18n/locale";

// `createElement` instead of JSX: the JSX runtime would be looked up next to
// this file, which, installed as a plugin, lives outside the checkout.
const { createElement } = createRequire(path.join(process.cwd(), "package.json"))(
  "react"
) as typeof import("react");

const args = process.argv.slice(2);
function option(name: string): string | null {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  const value = args[i + 1];
  return value === undefined || value.startsWith("--") ? "" : value;
}
const list = (value: string | null) => (value ? value.split(",").map((s) => s.trim()).filter(Boolean) : null);

const theme = getTheme(option("theme"), option("texture"));
const locale: Locale = option("lang") === "en" ? "en" : "pt";
const style = estiloDoTexto(new URLSearchParams(option("phrase") ? { frase: option("phrase")! } : {}));
const out = path.resolve(option("out") || ".");
const races = list(option("race")) ?? PROVAS.map((p) => p.slug);
const panels = list(option("panel"));

mkdirSync(out, { recursive: true });
for (const slug of races) {
  const race = PROVAS.find((p) => p.slug === slug);
  const analysis = ANALISES[slug];
  if (!race || !analysis) {
    console.error(`unknown race: ${slug}`);
    continue;
  }
  for (const panel of paineisDe(analysis(locale))) {
    if (panels && !panels.includes(panel.chave)) continue;
    const response = await renderPost(
      createElement(CardProva, {
        theme,
        estilo: style,
        prova: race.nome,
        painel: panel,
        titulo: panel.titulo,
        pe: `${SITE_URL.replace(/^https?:\/\/(www\.)?/, "")}${rotaDaProva(slug)}`,
      })
    );
    const file = path.join(out, `${slug}-${panel.chave}.png`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    console.log(file);
  }
}
