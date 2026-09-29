// The weather of a level: when lightning strikes, how it flashes, when its thunder is due and how
// hard the wind blows. No three.js and no Web Audio, so Node can test it. The stage draws it and the
// audio module sounds it; it has its own random streams and never touches the game's.

const lerp = (a, b, k) => a + (b - a) * k;

export const LIGHTNING = {
  first: [4, 8], // seconds after the level starts until the first strike
  // A strike's flash, in seconds from its start: a peak at once, dark at `dark`, a second peak of
  // `second` of the first at `secondAt`, and out by `end`.
  flash: { dark: 0.1, secondAt: 0.18, second: 0.6, end: 0.5 },
  hemisphere: 2.5, // the most the hemisphere light gains at the peak
  shift: 0.6, // the most the sky and the fog move toward `color`
  color: '#dfe8ff',
  reduced: { peak: 0.8, time: 0.6 }, // one gentle brightening, and no colour shift
  bolt: { time: 0.2, segments: [6, 9], top: 40, bottom: 8, x: [-45, 45], z: [-90, -50], jag: 4, color: '#f4f7ff' },
  thunderSpeed: 50, // units a second: thunder is due distance / 50 seconds after the strike
};

export const GUST = { time: [6, 14] }; // seconds a gust swells and dies over

export const SWAY = { rate: [0.6, 1.2], tilt: 0.03, tree: 0.06 }; // swings a second; radians at wind 1

export const LEAVES = {
  count: 30,
  size: 0.15,
  speed: [2, 8], // units a second along +x, faster with the wind
  x: [-25, 25], // they wrap around from the far end
  y: [0.3, 3],
  z: [-30, -14], // behind where enemies appear (z -12)
};

// The flash's strength from 0 to 1, `age` seconds after the strike starts.
export function flashAt(age) {
  const { dark, secondAt, second, end } = LIGHTNING.flash;
  if (age < 0 || age >= end) return 0;
  if (age < dark) return 1 - age / dark;
  if (age < secondAt) return second * ((age - dark) / (secondAt - dark));
  return second * (1 - (age - secondAt) / (end - secondAt));
}

// With reduced motion: one brightening from 0 up to 1 and back over `time` seconds.
export function gentleAt(age) {
  const { time } = LIGHTNING.reduced;
  return age < 0 || age >= time ? 0 : Math.sin((Math.PI * age) / time);
}

// A small seeded random from one draw of `random`, so each part of the weather has a stream of its own.
function stream(random) {
  let a = Math.floor(random() * 2 ** 32) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random of the game's weather, sharing nothing with Math.random: a game whose Math.random is
// seeded or stubbed plays out as it would without weather, whatever the weather draws.
export function ownRandom() {
  const crypto = globalThis.crypto;
  if (!crypto?.getRandomValues) return stream(() => (Date.now() % 2 ** 32) / 2 ** 32);
  const one = new Uint32Array(1);
  return () => crypto.getRandomValues(one)[0] / 2 ** 32;
}

export class Weather {
  // `data` is the level's `weather`; without it the sky stays calm.
  constructor(data, random = Math.random, reducedMotion = false) {
    this.data = data ?? null;
    this.reducedMotion = reducedMotion;
    this.clock = 0; // seconds it has run: the game's clock, while the game is live
    this.strike = null; // { at, distance, bolt } while a strike lasts
    this.waiting = []; // the thunder still to sound: the clock time each is due
    this.strikes = stream(random);
    this.bolts = stream(random);
    this.gusts = stream(random);
    this.next = this.data ? this.between(LIGHTNING.first) : Infinity; // when the next strike is due
    this.gust = this.data ? this.newGust(0) : null;
  }

  between([lo, hi], rand = this.strikes) {
    return lerp(lo, hi, rand());
  }

  newGust(start) {
    const len = this.between(GUST.time, this.gusts);
    return { start, len, size: this.gusts() * this.data.gusts };
  }

  // Moves on by `dt` seconds; returns the thunder that has come due in them.
  update(dt) {
    this.clock += dt;
    if (!this.data) return [];
    while (this.clock >= this.next) {
      this.begin(this.next);
      this.next += this.between(this.data.between);
    }
    while (this.clock >= this.gust.start + this.gust.len) this.gust = this.newGust(this.gust.start + this.gust.len);
    if (this.strike && this.clock - this.strike.at >= this.end) this.strike = null;
    const thunder = this.waiting.filter((at) => this.clock >= at);
    this.waiting = this.waiting.filter((at) => this.clock < at);
    return thunder;
  }

  // The seconds a strike's light lasts.
  get end() {
    return this.reducedMotion ? LIGHTNING.reduced.time : LIGHTNING.flash.end;
  }

  begin(at) {
    const bolt = this.newBolt();
    this.strike = { at, distance: -bolt.z, bolt };
    this.waiting.push(at + this.strike.distance / LIGHTNING.thunderSpeed);
  }

  // A jagged line of 6 to 9 segments from the top of the sky to the bottom, at one distance.
  newBolt() {
    const { segments, top, bottom, x, z, jag } = LIGHTNING.bolt;
    const n = Math.floor(lerp(segments[0], segments[1] + 1, this.bolts()));
    const depth = this.between(z, this.bolts);
    let across = this.between(x, this.bolts);
    const points = [];
    for (let i = 0; i <= n; i++) {
      points.push({ x: across, y: lerp(top, bottom, i / n), z: depth });
      across = Math.min(x[1], Math.max(x[0], across + (this.bolts() * 2 - 1) * jag));
    }
    return { z: depth, points };
  }

  // How many seconds into the strike now, or null with none.
  get age() {
    return this.strike ? this.clock - this.strike.at : null;
  }

  // What the hemisphere light gains now.
  get light() {
    if (!this.strike) return 0;
    return this.reducedMotion ? LIGHTNING.reduced.peak * gentleAt(this.age) : LIGHTNING.hemisphere * flashAt(this.age);
  }

  // How far the sky and the fog have moved toward the flash's colour, 0 to `LIGHTNING.shift`.
  get shift() {
    return this.strike && !this.reducedMotion ? LIGHTNING.shift * flashAt(this.age) : 0;
  }

  // The bolt while it shows: its points, else null.
  get bolt() {
    return this.strike && !this.reducedMotion && this.age < LIGHTNING.bolt.time ? this.strike.bolt : null;
  }

  // The wind from 0 to 1: at rest, plus a gust that swells and dies. Smooth in the clock.
  get wind() {
    if (!this.data) return 0;
    const { start, len, size } = this.gust;
    const swell = Math.sin((Math.PI * Math.min(1, (this.clock - start) / len))) ** 2;
    return Math.min(1, this.data.rest + size * swell);
  }
}
