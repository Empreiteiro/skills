/*
 * Renders cards and posts to PNG without starting the app: the same builder,
 * the same drawing and the same `ImageResponse` as the `/api/cards` routes,
 * over made-up, fixed data.
 *
 *   node --no-warnings --import ./tests/register.mjs \
 *     "${CLAUDE_SKILL_DIR}/scripts/render.tsx" \
 *     --card semanal,splits --theme papel --texture grao --out $DIR
 *
 * Run it from the root of the Compass checkout: `@/` and the npm packages
 * resolve from the working directory, wherever this file is installed.
 *
 * Options (the card's query-string parameters, with English names; the values
 * are the app's own ids):
 *
 *   --card <id,id,...> | --all     which cards (the 36 ids in `cards/types`);
 *                                  `texto` is the text-only post
 *   --theme <id>                   ?tema=     noite (default), brasa, gelo, papel, ...
 *   --texture <id>                 ?textura=  lisa, grao, papel, grade, hachura
 *   --lang pt|en                   ?idioma=   default pt
 *   --units imperial               ?medida=   miles and feet (default: metric)
 *   --show <parts>                 ?mostrar=  olho,titulo,legenda,nota,valores,eixos
 *                                             (empty = only the drawing)
 *   --format card|instagram        ?formato=  default card
 *   --phrase mono|serifa|manchete|olho   ?frase=  the post's phrase (Instagram only)
 *   --out <dir>                    where to write the PNGs (default: .)
 *
 * The workout is a 21 km long run that starts in the dark, with climbing,
 * heart-rate drift and a shortening stride; the period is the landing page's
 * (`cards/demo`), plus the previous period and the pace profiles, so the
 * towers, the running total and the orbits exist. Nothing is random: the same
 * call always comes out the same, so before and after renders can be compared.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { buildActivityCard } from "@/lib/cards/builders/activity";
import { buildPeriodCard, type PerfilDeTreino } from "@/lib/cards/builders/period";
import { periodoExemplo } from "@/lib/cards/demo";
import { applyParts, parseParts } from "@/lib/cards/overrides";
import { linhasDaFrase, linhasDoTexto, parseEstilo, estiloDoTexto } from "@/lib/cards/instagram";
import { renderCard, renderInstagram, renderTexto, renderUnavailable } from "@/lib/cards/render/respond";
import { getTheme } from "@/lib/cards/themes";
import { CARD_NUMBER } from "@/lib/cards/meta";
import {
  ACTIVITY_CARDS,
  PERIOD_CARDS,
  type ActivityCardId,
  type CardId,
  type PeriodCardId,
} from "@/lib/cards/types";
import type { ActivityStreams } from "@/lib/cards/series";
import { cardsText } from "@/lib/i18n/cards";
import { parseUnits } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { StravaActivity, StravaActivityDetail, StravaSplit } from "@/types/strava";

// From the project, not from next to this file: installed as a plugin, the
// script lives outside the checkout and its node_modules.
const polyline = createRequire(path.join(process.cwd(), "package.json"))(
  "@mapbox/polyline"
) as typeof import("@mapbox/polyline");

/* --- arguments ------------------------------------------------------------- */

const args = process.argv.slice(2);
function option(name: string): string | null {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  const value = args[i + 1];
  return value === undefined || value.startsWith("--") ? "" : value;
}

const ALL: (CardId | "texto")[] = [...ACTIVITY_CARDS, ...PERIOD_CARDS];
const requested = args.includes("--all")
  ? ALL
  : (option("card") ?? "semanal").split(",").map((s) => s.trim()).filter(Boolean);

/* The query the route would read: each option becomes its parameter. */
const PARAMETERS = {
  theme: "tema",
  texture: "textura",
  lang: "idioma",
  units: "medida",
  show: "mostrar",
  format: "formato",
  phrase: "frase",
} as const;
const query = new URLSearchParams();
for (const [name, parameter] of Object.entries(PARAMETERS)) {
  const value = option(name);
  if (value !== null) query.set(parameter, value);
}

const theme = getTheme(query.get("tema"), query.get("textura"));
const locale: Locale = query.get("idioma") === "en" ? "en" : "pt";
const units = parseUnits(query.get("medida"));
const instagram = query.get("formato") === "instagram";
const out = path.resolve(option("out") || ".");
mkdirSync(out, { recursive: true });

/* --- the workout ----------------------------------------------------------- */

/** Fixed noise: the same value for the same index, on every machine. */
const noise = (i: number) => Math.sin(i * 12.9898) * 0.5 + Math.sin(i * 0.731) * 0.5;

const KM = 21.1;
const POINTS = 2400;

function workout(): { detail: StravaActivityDetail; streams: ActivityStreams } {
  const time: number[] = [];
  const distance: number[] = [];
  const altitude: number[] = [];
  const heartrate: number[] = [];
  const cadence: number[] = [];
  const velocity: number[] = [];

  let t = 0;
  for (let i = 0; i < POINTS; i++) {
    const f = i / (POINTS - 1);
    const meters = f * KM * 1000;
    // A 5:40/km pace that tightens in the middle and gives in at the end, with GPS noise.
    const pace = 340 - 18 * Math.sin(f * Math.PI) + 22 * Math.max(0, f - 0.75) * 4 + 6 * noise(i);
    if (i > 0) t += ((meters - distance[i - 1]) / 1000) * pace;
    time.push(Math.round(t));
    distance.push(meters);
    altitude.push(760 + 45 * Math.sin(f * Math.PI * 3) + 30 * f + 2 * noise(i * 3));
    heartrate.push(138 + 18 * f + 4 * Math.sin(f * Math.PI * 3) + 2 * noise(i * 5));
    cadence.push(88 - 5 * f + 1.5 * noise(i * 7));
    velocity.push(1000 / pace);
  }

  const splits: StravaSplit[] = [];
  for (let km = 1; km <= Math.floor(KM); km++) {
    const a = distance.findIndex((d) => d >= (km - 1) * 1000);
    const b = distance.findIndex((d) => d >= km * 1000);
    const seconds = time[b] - time[a];
    splits.push({
      split: km,
      distance: 1000,
      elapsed_time: seconds,
      moving_time: seconds,
      elevation_difference: altitude[b] - altitude[a],
      average_speed: 1000 / seconds,
      average_heartrate: heartrate[b],
    });
  }

  // A park loop with three lobes, so the signature has something to draw.
  const center: [number, number] = [-23.5874, -46.6576];
  const route: [number, number][] = [];
  for (let i = 0; i <= 180; i++) {
    const angle = (i / 180) * Math.PI * 2;
    const r = 0.012 * (1 + 0.35 * Math.sin(angle * 3));
    route.push([center[0] + r * Math.sin(angle), center[1] + r * 1.3 * Math.cos(angle)]);
  }

  const total = time[time.length - 1];
  const detail = {
    id: 4242,
    name: "Long run",
    type: "Run",
    sport_type: "Run",
    distance: KM * 1000,
    moving_time: total,
    elapsed_time: total + 90,
    total_elevation_gain: 210,
    // 05:10 on the wall clock: the workout starts in the dark and ends in daylight.
    start_date: "2026-09-13T08:10:00Z",
    start_date_local: "2026-09-13T05:10:00Z",
    average_speed: (KM * 1000) / total,
    max_speed: 4.1,
    average_heartrate: 150,
    max_heartrate: 172,
    description: null,
    calories: 1400,
    splits_metric: splits,
    map: { id: "", summary_polyline: polyline.encode(route), polyline: null },
  } as StravaActivityDetail;

  return {
    detail,
    streams: { time, distance, altitude, heartrate, cadence, velocity_smooth: velocity },
  };
}

/* --- the period ------------------------------------------------------------ */

const DAY = 86_400_000;

/** The same block, sixteen weeks earlier and a bit slower and shorter. */
function previous(current: StravaActivity[], shift: number): StravaActivity[] {
  return current.map((a, i) => {
    const when = (iso: string) => new Date(new Date(iso).getTime() - shift).toISOString();
    const factor = 0.86 + 0.04 * noise(i);
    return {
      ...a,
      id: a.id + 1_000_000,
      start_date: when(a.start_date),
      start_date_local: when(a.start_date_local),
      distance: a.distance * factor,
      moving_time: a.moving_time * factor * 1.04,
      total_elevation_gain: a.total_elevation_gain * 0.8,
    };
  });
}

/** The pace inside each long run, slice by slice: it opens strong and gives in. */
function profiles(current: StravaActivity[]): PerfilDeTreino[] {
  return current
    .filter((a) => a.distance >= 8000)
    .slice(-6)
    .map((a, k) => {
      const averagePace = a.moving_time / (a.distance / 1000);
      return {
        id: a.id,
        quando: new Date(a.start_date).getTime(),
        km: a.distance / 1000,
        ritmos: Array.from({ length: 50 }, (_, i) => {
          const f = i / 49;
          return averagePace - 12 + 24 * f * f + 8 * Math.sin(f * Math.PI * (2 + k)) + 3 * noise(i + k * 50);
        }),
      };
    });
}

function period() {
  const base = periodoExemplo(new Date());
  const window = base.to.getTime() - base.from.getTime() + DAY;
  return {
    ...base,
    anteriores: previous(base.activities, window),
    perfis: profiles(base.activities),
  };
}

/* --- drawing --------------------------------------------------------------- */

const t = cardsText(locale, units);
const oneWorkout = workout();
const onePeriod = period();

function fileName(id: string): string {
  const n = (CARD_NUMBER as Record<string, string>)[id] ?? "00";
  const suffix = [theme.id, query.get("textura"), instagram ? "instagram" : null, locale, units]
    .filter(Boolean)
    .join("-");
  return path.join(out, `${n}-${id}-${suffix}.png`);
}

for (const request of requested) {
  let image: Response;

  if (request === "texto") {
    image = await renderTexto(theme, estiloDoTexto(query), linhasDoTexto(query, t.instagram.texto));
  } else if ((ACTIVITY_CARDS as string[]).includes(request) || (PERIOD_CARDS as string[]).includes(request)) {
    const id = request as CardId;
    const result = (ACTIVITY_CARDS as string[]).includes(id)
      ? buildActivityCard(id as ActivityCardId, oneWorkout.detail, oneWorkout.streams, { maxHeartrate: 186 }, locale, units)
      : buildPeriodCard(id as PeriodCardId, onePeriod, locale, units);

    if (!result.ok) {
      console.log(`${request}: unavailable — ${result.reason}`);
      image = await renderUnavailable(result.reason, theme, t.indisponivel);
    } else if (instagram) {
      const style = parseEstilo(query);
      const phrases = t.instagram.frases as Record<CardId, string>;
      const phrase = style ? { estilo: style, linhas: linhasDaFrase(query, phrases[id]) } : null;
      image = await renderInstagram(result.spec, theme, phrase);
    } else {
      image = await renderCard(applyParts(result.spec, parseParts(query)), theme);
    }
  } else {
    console.log(`${request}: unknown card (see ACTIVITY_CARDS and PERIOD_CARDS in cards/types)`);
    continue;
  }

  const file = fileName(request);
  writeFileSync(file, Buffer.from(await image.arrayBuffer()));
  console.log(file);
}
