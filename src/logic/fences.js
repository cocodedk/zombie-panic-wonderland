// The fences that hold the zombies back. The level's `fence` scenery is the one source: the stage draws
// it and these rules read it. No three.js, so Node can test it.

export const HALF_WIDTH = 0.3; // a zombie's half-width, so a fence's span is wider than its pickets
export const STOP_Z = -2.6; // 0.4 in front of the fences, which stand at z -2.2

// The level's fences as x ranges (`from` to `to`) and spans (`lo` to `hi`), left to right.
export function fences(level) {
  return (level.scenery ?? [])
    .filter((s) => s.model === 'fence')
    .map((s) => ({ from: s.x - s.length / 2, to: s.x + s.length / 2, lo: s.x - s.length / 2 - HALF_WIDTH, hi: s.x + s.length / 2 + HALF_WIDTH }))
    .sort((a, b) => a.from - b.from);
}

// The gaps between two fences a zombie can walk through: from one span's edge to the next one's.
export function gaps(level) {
  const f = fences(level);
  return f.slice(1).map((next, i) => ({ lo: f[i].hi, hi: next.lo })).filter((g) => g.lo <= g.hi);
}

// Strictly inside a span; exactly on its edge, a zombie is free.
export function behindFence(level, x) {
  return fences(level).some((f) => f.lo < x && x < f.hi);
}

// The usable gap edge nearest to `x` in x: where a held zombie goes, at the stop line.
export function entryPoint(level, x) {
  let best = null;
  for (const g of gaps(level)) for (const edge of [g.lo, g.hi]) if (best == null || Math.abs(edge - x) < Math.abs(best - x)) best = edge;
  return best == null ? null : { x: best, z: STOP_Z };
}

// Moves zombie `e` one step of `dt` seconds at `speed` before the road. Held (before the stop line and
// behind a fence) it walks straight to the entry point; free, straight toward the road.
export function stepZombie(e, level, speed, dt) {
  const entry = e.z < STOP_Z && behindFence(level, e.x) ? entryPoint(level, e.x) : null;
  if (!entry) {
    e.z = Math.min(level.roadZ, e.z + speed * dt);
    return;
  }
  const dx = entry.x - e.x;
  const dz = entry.z - e.z;
  const dist = Math.hypot(dx, dz);
  const step = speed * dt;
  if (dist <= step) {
    e.x = entry.x;
    e.z = entry.z;
  } else {
    e.x += (dx / dist) * step;
    e.z += (dz / dist) * step;
  }
}
