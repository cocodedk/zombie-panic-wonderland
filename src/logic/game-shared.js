export const EPS = 1e-9;
export const due = (t) => t <= EPS;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const CLICK = 0.25; // seconds: a shorter press is a click

export const SCREENS = ['loading', 'error', 'title', 'intro', 'play', 'paused', 'victory', 'defeat'];
// The screens where the weather runs (light, bolt, sway, sky drift); the rest are still, at clock 0 (loading, error, title).
export const WEATHER_SCREENS = new Set(['intro', 'play', 'paused', 'victory', 'defeat']);

// Where a pumpkin is in its flight: thrown from its owner, arcing down to the road.
export function pumpkinAt(p, roadZ) {
  const f = Math.min(1, p.t / p.flight);
  return { x: p.fromX + (p.x - p.fromX) * f, y: 2.4 * (1 - f) + 0.25 + Math.sin(f * Math.PI) * 4, z: p.fromZ + (roadZ - p.fromZ) * f };
}

// How high a hanging dropper's root is: `from` at the start, lowering evenly to 0 as its `drop` runs out.
export const dropHeight = (e, rule) => (e.drop ? rule.from * (e.drop / rule.time) : 0);

export const CROW_CIRCLE = 1.5; // the radius a crow circles at

// The kinds that fly: circle, then dive, each on the numbers of its own kind.
export const isFlyer = (e) => e.kind === 'crow' || e.kind === 'bat';

// Where a flyer (a crow or a bat) is: flying in from the backdrop, or out from the boss that summoned it, and
// circling, then diving at the road.
export function crowAt(e, level) {
  const c = level.enemies[e.kind];
  if (e.diveX == null) {
    const t = c.circle - e.timer;
    const a = t * (Math.PI * 2) / c.circle;
    const arrive = Math.min(1, t / 0.6);
    const from = e.from ?? { x: e.x, y: c.height + 3, z: level.spawn.z - 8 };
    const at = { x: e.x + Math.cos(a) * CROW_CIRCLE, y: c.height, z: e.z + Math.sin(a) * CROW_CIRCLE };
    return { x: from.x + (at.x - from.x) * arrive, y: from.y + (at.y - from.y) * arrive, z: from.z + (at.z - from.z) * arrive };
  }
  const f = 1 - e.timer / c.dive;
  const x = e.x + CROW_CIRCLE;
  return { x: x + (e.diveX - x) * f, y: c.height + (0.5 - c.height) * f, z: e.z + (level.roadZ - e.z) * f };
}

// How far the boss has wound up for its next action: 0 at rest, 1 as the action comes.
export function bossWindup(e, boss) {
  return e.windup ? clamp(1 - e.action / boss.windup, 0, 1) : 0;
}

// The camera shakes when a stomp's shockwave reaches the road, fading over `time` seconds.
export const SHAKE = { time: 0.25, size: 0.15 };

export const GROAN = 1.5; // seconds: the least time between two zombies' groans

// Shown once per boss fight, at its first wind-up, for `life` seconds.
export const HINT = { text: 'Space: dodge — or step aside!', life: 2 };
