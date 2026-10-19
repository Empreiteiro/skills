/*
 * Demo seed for reviewing screens: a SQLite database with three athletes and
 * the session of one of them already encrypted, printed to stdout.
 *
 *   SQLITE_PATH=/tmp/x/demo.db SESSION_SECRET=... \
 *     node --no-warnings --import ./tests/register.mjs \
 *     "${CLAUDE_SKILL_DIR}/scripts/seed.ts" > cookie.txt
 *
 * Run it from the root of the Compass checkout: the schema, `@/` and the npm
 * packages are read from the working directory, wherever this file lives.
 *
 * The logged-in athlete owns a coaching team the other two train with, plus an
 * athlete without Strava, a coach on the staff and an open staff invite: that
 * way the coach's screens — Team included — have something to show. The
 * workouts follow a runner's week — long run on Sunday, intervals on Tuesday,
 * an easy run on Thursday, a recovery run on Saturday, gym and walks in
 * between — for 14 months, with the pace slowly improving. Every eight weeks
 * the long run becomes a race — half marathon and 10 km, alternating — so
 * Compare has something to read with "Races". The 12 most recent days have no
 * measured per-km pace, which is the real state of someone who just synced.
 *
 * The numbers are drawn from a fixed seed: the same screen comes out the same
 * on every run, so the before and after screenshots can be compared.
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import path from "node:path";
import crypto from "node:crypto";
import type { StravaActivity, StravaAthlete } from "@/types/strava";

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, "src/lib/db/schema.sql");
if (!existsSync(SCHEMA)) {
  throw new Error("Run from the root of the Compass checkout (src/lib/db/schema.sql not found).");
}
const FILE = process.env.SQLITE_PATH;
const SECRET = process.env.SESSION_SECRET;
if (!FILE || !SECRET) {
  throw new Error("Set SQLITE_PATH and SESSION_SECRET (see SKILL.md).");
}

// From the project, not from next to this file: installed as a plugin, the
// script lives outside the checkout and its node_modules.
const polyline = createRequire(path.join(ROOT, "package.json"))(
  "@mapbox/polyline"
) as typeof import("@mapbox/polyline");

rmSync(FILE, { force: true });
const raw = new DatabaseSync(FILE);
raw.exec(readFileSync(SCHEMA, "utf8"));
raw.close();

const db = await import("@/lib/db");

let seed = 7;
const draw = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const between = (a: number, b: number) => a + (b - a) * draw();

const DAY = 86_400_000;
const today = Date.now();
let nextId = 100_000;

/*
 * A route for each run: a park loop with two to four lobes, near Ibirapuera,
 * bigger the longer the run. It comes from the id, not from the draw, so the
 * numbers in the rest of the seed stay the same as before — and the last
 * workout's card has a trace to draw.
 */
function route(activityId: number, km: number): string {
  const lobes = 2 + (activityId % 3);
  const turn = (activityId % 7) * 0.9;
  const radius = 0.004 + Math.min(km, 25) * 0.00025;
  const points: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const r = radius * (1 + 0.28 * Math.sin(lobes * a + turn) + 0.08 * Math.cos(5 * a));
    points.push([-23.5874 + r * Math.sin(a), -46.6576 + r * Math.cos(a) * 1.3]);
  }
  return polyline.encode(points);
}

interface Plan {
  /** Easy-run pace at the start, in s/km. */
  base: number;
  /** How much the pace improves over the 14 months, in s/km. */
  improvement: number;
  /** Multiplies the distances. */
  volume: number;
}

interface Session {
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  hr: number;
  elev?: number;
  /** Marked as a race on Strava. */
  race?: boolean;
}

async function athlete(id: number, firstname: string, lastname: string, city: string, plan: Plan) {
  await db.upsertAthlete(
    {
      id,
      firstname,
      lastname,
      profile: "",
      profile_medium: "",
      city,
      state: "SP",
      country: "Brazil",
    } as StravaAthlete,
    { access_token: "fake", refresh_token: "fake", expires_at: 1893456000 }
  );
  const userId = await db.getOrCreateUser(id);
  const activities: StravaActivity[] = [];
  const measured: [number, number][] = [];

  for (let d = 420; d >= 0; d--) {
    const day = new Date(today - d * DAY);
    const weekday = day.getUTCDay();
    const base = plan.base - plan.improvement * ((420 - d) / 420);
    const hasSplits = d > 12;

    const record = (s: Session, spread?: number) => {
      const activityId = nextId++;
      const local = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 6 + Math.floor(draw() * 3), 10)
      );
      activities.push({
        id: activityId,
        name: s.name,
        type: s.type,
        sport_type: s.type,
        distance: s.distance,
        moving_time: Math.round(s.moving_time),
        elapsed_time: Math.round(s.moving_time * 1.05),
        total_elevation_gain: s.elev ?? 0,
        start_date: new Date(local.getTime() + 3 * 3600_000).toISOString(),
        start_date_local: local.toISOString(),
        average_speed: s.distance / s.moving_time,
        max_speed: 5,
        average_heartrate: s.hr,
        max_heartrate: s.hr + 20,
        map: {
          id: "",
          summary_polyline: s.type === "Run" ? route(activityId, s.distance / 1000) : null,
        },
        workout_type: s.race ? 1 : 0,
      } as unknown as StravaActivity);
      if (spread !== undefined && hasSplits) measured.push([activityId, spread]);
    };

    if (weekday === 0) {
      // The same draws, in the same order, with a race or without: the seed
      // for the rest of the screen does not change because of them.
      const km = between(15, 24) * plan.volume;
      const slack = between(15, 35);
      const hr = between(142, 152);
      const grade = between(4, 9);
      const spread = between(10, 20);
      if (Math.floor(d / 7) % 8 === 2) {
        const half = Math.floor(d / 56) % 2 === 0;
        const dist = half ? 21.1 : 10;
        record(
          { name: half ? "Half Marathon" : "10K", type: "Run", distance: dist * 1000, moving_time: dist * (base - (half ? 12 : 24)), hr: hr + 14, elev: dist * grade, race: true },
          spread
        );
      } else {
        record(
          { name: "Sunday long run", type: "Run", distance: km * 1000, moving_time: km * (base + slack), hr, elev: km * grade },
          spread
        );
      }
    } else if (weekday === 2) {
      const km = between(7, 10);
      record(
        { name: "Track intervals", type: "Run", distance: km * 1000, moving_time: km * (base - between(18, 30)), hr: between(158, 168), elev: 10 },
        between(50, 75)
      );
    } else if (weekday === 4) {
      const km = between(8, 12) * plan.volume;
      record(
        { name: "Easy run", type: "Run", distance: km * 1000, moving_time: km * (base + between(-8, 8)), hr: between(146, 156), elev: km * between(5, 12) },
        between(8, 25)
      );
    } else if (weekday === 6 && draw() > 0.3) {
      const km = between(5, 7);
      record(
        { name: "Recovery run", type: "Run", distance: km * 1000, moving_time: km * (base * 1.2 + between(0, 15)), hr: between(128, 138), elev: 20 },
        between(5, 15)
      );
    } else if ((weekday === 1 || weekday === 3) && draw() > 0.2) {
      record({ name: "Gym", type: "WeightTraining", distance: 0, moving_time: between(40, 65) * 60, hr: between(100, 120) });
    } else if (weekday === 5 && draw() > 0.6) {
      const km = between(4, 7);
      record({ name: "Walk", type: "Walk", distance: km * 1000, moving_time: km * 600, hr: between(95, 110) });
    }
  }

  await db.upsertActivities(activities, id);
  for (const [activityId, spread] of measured) {
    // Eight kilometers alternating around 5:00: the spread comes out equal to
    // the one drawn, and no extra draw changes the rest of the seed.
    const paces = Array.from({ length: 8 }, (_, i) => 300 + (i % 2 ? -spread : spread));
    await db.recordSplitPaces(activityId, id, paces);
  }
  await db.recordSync(id, true);
  return userId;
}

const me = await athlete(1001, "Ana", "Demo", "São Paulo", { base: 335, improvement: 25, volume: 1 });
const bruno = await athlete(1002, "Bruno", "Demo", "Campinas", { base: 310, improvement: 2, volume: 1.2 });
const carla = await athlete(1003, "Carla", "Demo", "Santos", { base: 360, improvement: 30, volume: 0.8 });
const noStrava = await db.getOrCreateGarminUser("demo-no-strava");

const { assessoria: team } = await db.createAssessoria(me, "Demo Coaching");
await db.linkAthleteToAssessoria(team.id, bruno);
await db.linkAthleteToAssessoria(team.id, carla);
await db.linkAthleteToAssessoria(team.id, noStrava);

// A coach on the staff, with no history of her own — she only shows up in
// Team —, and an invite still open, so the invite list is not empty.
const duda = await db.getOrCreateUser(1004);
await db.upsertAthlete(
  { id: 1004, firstname: "Duda", lastname: "Demo", city: "Santos" } as StravaAthlete,
  { access_token: "demo", refresh_token: "demo", expires_at: 4102444800 }
);
// Synced, otherwise the app would hold her on the welcome screen when logging in as her.
await db.recordSync(1004, true);
const invite = await db.createTeamInvite(team.id, me);
await db.acceptTeamInvite(invite.code, duda);
await db.createTeamInvite(team.id, me);

// The session, encrypted the way `src/lib/auth.ts` does it: AES-256-GCM, iv + tag + data.
const key = crypto.createHash("sha256").update(SECRET).digest();
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const data = Buffer.concat([
  cipher.update(JSON.stringify({ user_id: me, athlete_id: 1001 }), "utf8"),
  cipher.final(),
]);
console.log(Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64"));
await db.resetDb();
