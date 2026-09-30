// What the eye sees of what happened: bullet streaks, the muzzle flash, bursts of chunks and
// puffs, and fades in their place when motion is reduced. Plain data, so Node can test it; the
// stage draws it. Effects only show: they never hit anything.

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

// Where the muzzle of the gun in hand is for a player at `x` in the pose `pose` (see bodyPose).
export function muzzleAt(x, roadZ, pose = {}) {
  const { y, turn } = bodyPose(pose);
  const m = MUZZLES[pose.weapon ?? 'popper'];
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
  pumpkinMonster: { count: 12, life: 1, size: 0.18, colors: ['#e0762b', '#3f6b2a', '#5f8f3a'], puff: '#e07b24', puffSize: 1 },
  crow: { count: 12, life: 1, size: 0.18, colors: ['#16161c', '#c99a2e'], puff: '#3a3a3a', puffSize: 1 },
  zombieKing: { count: 40, life: 1.5, size: 0.35, colors: ['#7d9a6a', '#5a1f3a', '#3d3a35', '#d9a520'], puff: '#9fd18b', puffSize: 3 },
  scarecrowKing: { count: 40, life: 1.5, size: 0.35, colors: ['#9c8456', '#3d2f22', '#3f2a4a', '#d8c070'], puff: '#e07b24', puffSize: 3 },
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
  }
}
