// What the eye sees of what happened: bullet streaks, the muzzle flash, bursts of chunks and
// puffs, and fades in their place when motion is reduced. Plain data, so Node can test it; the
// stage draws it. Effects only show: they never hit anything.

import { turned } from './turn.js';

export { PIVOT } from './turn.js';

const EPS = 1e-9;

export const GRAVITY = 9.8;
export const MAX_CHUNKS = 300;
export const STREAK = { color: '#fff3b0', life: 0.06, flash: 0.04 };
// The scattergun's pellets: streaks twice as thick that last longer, and a spark where one hits.
export const PELLET = { width: 2, life: 0.1 };
// The Gatling's rounds: thin orange tracers; the muzzle flash lasts half a round's time, so it goes
// dark between rounds, and alternates between two sizes.
export const TRACER = { color: '#ffb347', width: 0.6, life: 0.05, flash: 0.025, flashSizes: [1.4, 1] };
export const SPARK = { color: '#fff3b0', life: 0.15, size: 0.12 };
export const PUFF_LIFE = 0.3;
export const FADE_LIFE = 0.3;

// A point bubble floats up from where something fell and fades in the air, showing the points it gave.
// `still` is when it starts to fade; with reduced motion it only fades, over `reducedLife` seconds.
export const BUBBLE = {
  life: 1.2, still: 0.8, reducedLife: 0.8, grow: 0.15, from: 0.6, rise: 1.6, sway: 0.15, max: 12,
  fill: '#cfe8ff', fillOpacity: 0.35, color: '#ffd24a', fastColor: '#ff9a2a', fastPoints: 200, text: 0.7,
};
const GOLDEN = 2.399963; // radians: each bubble's sway starts at its own phase, from its id, never from `random`

// How across a bubble is by its points, and the colour of its number.
export const bubbleSize = (points) => (points >= 1000 ? 1.4 : points >= 200 ? 1 : 0.8);
export const bubbleColor = (points) => (points === BUBBLE.fastPoints ? BUBBLE.fastColor : BUBBLE.color);

// How a bubble looks at `age`: its `scale` (of its size), how far it has risen and drifted from where it
// began, and its opacity.
export function bubbleLook(b, age = b.age) {
  const gone = age >= b.life - EPS;
  if (b.reduced) return { scale: 1, rise: 0, drift: 0, opacity: gone ? 0 : 1 - age / b.life };
  const k = Math.min(1, age / b.life);
  const fade = (b.life - age) / (b.life - BUBBLE.still);
  return {
    scale: BUBBLE.from + (1 - BUBBLE.from) * Math.min(1, age / BUBBLE.grow),
    rise: BUBBLE.rise * k,
    drift: (BUBBLE.sway / 2) * (Math.sin(b.phase + k * Math.PI * 2) - Math.sin(b.phase)), // one swing, from where it began
    opacity: gone ? 0 : age <= BUBBLE.still ? 1 : fade,
  };
}

// The gun's muzzle in the player model's body, from its waist pivot (0.6 up); the longer guns
// reach further forward.
export const MUZZLE = { x: 0.1, y: 0.3, z: -0.76 };
export const MUZZLES = { popper: MUZZLE, scattergun: { ...MUZZLE, z: -0.92 }, launcher: { ...MUZZLE, z: -0.88 }, gatling: { ...MUZZLE, z: -1.08 } };
export const WAIST = 0.6;
export const EXPLOSION_FLASH = 0.3; // with reduced motion, the explosion's puff alone, this long

// How the player model's body sits at time `t`: it bobs while walking, and through a dodge
// (`roll` 0..1 toward `dir`) it lifts and turns a full circle about z. The model and the muzzle share it.
export function bodyPose({ t = 0, walk = 0, roll = 0, dir = 1 } = {}) {
  const bob = walk ? Math.abs(Math.sin(t * 12)) * 0.05 : 0;
  const lift = roll ? Math.sin(roll * Math.PI) * 0.25 : 0;
  return { y: WAIST + bob + lift, turn: -dir * roll * Math.PI * 2 };
}

// Where the muzzle of the gun in hand is for a player at `x` in the pose `pose` (see bodyPose, `yaw`, `pitch`).
export function muzzleAt(x, roadZ, pose = {}) {
  const { y, turn } = bodyPose(pose);
  const m = turned(MUZZLES[pose.weapon ?? 'popper'], pose.yaw, pose.pitch);
  return {
    x: x + m.x * Math.cos(turn) - m.y * Math.sin(turn),
    y: y + m.x * Math.sin(turn) + m.y * Math.cos(turn),
    z: roadZ + m.z,
  };
}

// A fast zombie's darker skin, shirt and pants: its model and its chunks.
export const FAST_ZOMBIE = { skin: '#4a5c40', shirt: '#2e2a3a', pants: '#22201d' };

// What each thing bursts into: chunks in its model's colours, and a puff (or none).
export const BURSTS = {
  zombie: { count: 12, life: 1, size: 0.18, colors: ['#7d9a6a', '#5b5270', '#3d3a35'], puff: '#9fd18b', puffSize: 1 },
  fastZombie: { count: 12, life: 1, size: 0.18, colors: [FAST_ZOMBIE.skin, FAST_ZOMBIE.shirt, FAST_ZOMBIE.pants], puff: '#9fd18b', puffSize: 1 },
  spider: { count: 10, life: 1, size: 0.14, colors: ['#2a1f2e', '#3a2c3f', '#c0182b'], puff: '#3a2c3f', puffSize: 1 },
  wolf: { count: 12, life: 1, size: 0.18, colors: ['#6e6e78', '#9a9aa4', '#5a5a64'], puff: '#8a8a94', puffSize: 1 },
  pumpkinMonster: { count: 12, life: 1, size: 0.18, colors: ['#e0762b', '#3f6b2a', '#5f8f3a'], puff: '#e07b24', puffSize: 1 },
  crow: { count: 12, life: 1, size: 0.18, colors: ['#16161c', '#c99a2e'], puff: '#3a3a3a', puffSize: 1 },
  bat: { count: 10, life: 1, size: 0.14, colors: ['#2b1b3a', '#5a3f6b', '#ff2a1a'], puff: '#3a2a4a', puffSize: 1 },
  zombieKing: { count: 40, life: 1.5, size: 0.35, colors: ['#7d9a6a', '#5a1f3a', '#3d3a35', '#d9a520'], puff: '#9fd18b', puffSize: 3 },
  scarecrowKing: { count: 40, life: 1.5, size: 0.35, colors: ['#9c8456', '#3d2f22', '#3f2a4a', '#d8c070'], puff: '#e07b24', puffSize: 3 },
  spiderQueen: { count: 40, life: 1.5, size: 0.35, colors: ['#5a1f3a', '#2a1f2e', '#d8e0ea', '#d9a520'], puff: '#3a2c3f', puffSize: 3 },
  web: { count: 10, life: 0.8, size: 0.16, colors: ['#d8e0ea'], puff: '#d8e0ea', puffSize: 1 }, // a web ball landing or shot down
  pumpkin: { count: 6, life: 0.6, size: 0.14, colors: ['#e07b24'], puff: null },
  explosion: { count: 16, life: 0.6, size: 0.2, colors: ['#e07b24', '#ff9a3c', '#ffd35a'], puff: '#ff9a3c', puffSize: 2, puffLife: 0.6 },
  gas: { count: 20, life: 0.7, size: 0.22, colors: ['#ff8c1a', '#9acd32'], puff: '#9acd32', puffSize: 3, puffLife: 0.7 }, // a gas canister's fireball
  crate: { count: 4, life: 0.3, size: 0.08, colors: ['#8b5a2b'], puff: null }, // wood chips from a hit
};

export class Effects {
  constructor({ random = Math.random, reducedMotion = false } = {}) {
    this.random = random;
    this.reducedMotion = reducedMotion;
    this.nextId = 1;
    this.clear();
  }

  clear() {
    this.streaks = [];
    this.chunks = [];
    this.puffs = [];
    this.fades = [];
    this.sparks = [];
    this.bubbles = [];
    this.flash = 0; // seconds of muzzle flash left
    this.flashSize = 1;
  }

  shot(from, to, { width = 1, life = STREAK.life, color = STREAK.color, flash = STREAK.flash, flashSize = 1 } = {}) {
    this.streaks.push({ id: this.nextId++, from, to, age: 0, life, width, color });
    this.flash = flash;
    this.flashSize = flashSize;
  }

  // The scattergun: a thick streak to each pellet's end `to`, a spark where one `hit` something,
  // and a larger flash.
  blast(from, pellets) {
    for (const { to, hit } of pellets) {
      this.shot(from, to, PELLET);
      if (hit) this.sparks.push({ id: this.nextId++, pos: { ...to }, age: 0, life: SPARK.life });
    }
    this.flashSize = 2;
  }

  // A bubble showing `points`, starting at `at`; over BUBBLE.max, the oldest goes.
  bubble(points, at, reduced = this.reducedMotion) {
    const id = this.nextId++;
    const life = reduced ? BUBBLE.reducedLife : BUBBLE.life;
    this.bubbles.push({ id, points, pos: { ...at }, phase: (id * GOLDEN) % (Math.PI * 2), reduced, age: 0, life });
    if (this.bubbles.length > BUBBLE.max) this.bubbles.shift();
  }

  // The points of an award, for the score to take, and a bubble showing them `lift` above `at`; none for no points.
  award(points, at, lift) {
    if (points > 0) this.bubble(points, { x: at.x, y: at.y + lift, z: at.z });
    return points;
  }

  // The launcher's pumpkin exploding, or a gas canister (`kind` 'gas'); with reduced motion, only a flash of its puff.
  explode(at, kind = 'explosion') {
    if (!this.reducedMotion) return this.burst(kind, at);
    const b = BURSTS[kind];
    this.puffs.push({ id: this.nextId++, pos: { ...at }, color: b.puff, size: b.puffSize, age: 0, life: EXPLOSION_FLASH });
  }

  // `kind` bursts at `at`. With reduced motion, `fade` (the fallen enemy) fades out instead.
  burst(kind, at, fade = null) {
    if (this.reducedMotion) {
      if (fade) this.fades.push({ ...fade, id: this.nextId++, age: 0, life: FADE_LIFE });
      return;
    }
    const b = BURSTS[kind];
    const r = this.random;
    for (let i = 0; i < b.count; i++) {
      const speed = 3 + 3 * r();
      const turn = r() * Math.PI * 2;
      const up = 0.3 + r() * 1.1; // out and up
      this.chunks.push({
        id: this.nextId++,
        color: b.colors[i % b.colors.length],
        size: b.size,
        pos: { ...at },
        vel: { x: speed * Math.cos(up) * Math.cos(turn), y: speed * Math.sin(up), z: speed * Math.cos(up) * Math.sin(turn) },
        spin: { x: (r() - 0.5) * 12, y: (r() - 0.5) * 12, z: (r() - 0.5) * 12 },
        rot: { x: 0, y: 0, z: 0 },
        age: 0,
        life: b.life,
      });
    }
    if (this.chunks.length > MAX_CHUNKS) this.chunks.splice(0, this.chunks.length - MAX_CHUNKS);
    if (b.puff) this.puffs.push({ id: this.nextId++, pos: { ...at }, color: b.puff, size: b.puffSize, age: 0, life: b.puffLife ?? PUFF_LIFE });
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    const alive = (f) => (f.age += dt) < f.life - EPS;
    for (const c of this.chunks) {
      c.vel.y -= GRAVITY * dt;
      for (const k of ['x', 'y', 'z']) {
        c.pos[k] += c.vel[k] * dt;
        c.rot[k] += c.spin[k] * dt;
      }
    }
    this.streaks = this.streaks.filter(alive);
    this.chunks = this.chunks.filter(alive);
    this.puffs = this.puffs.filter(alive);
    this.fades = this.fades.filter(alive);
    this.sparks = this.sparks.filter(alive);
    this.bubbles = this.bubbles.filter(alive);
  }
}
