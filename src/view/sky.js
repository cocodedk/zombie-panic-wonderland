// The sky's clouds and crescent moon: built with the backdrop from the level's `sky` data, then
// drifted and coloured from the weather's clock, so they stand still whenever the weather does. Only
// scenery: none of it is pickable, and it goes with the backdrop when the level changes.

import * as THREE from 'three';
import { seeded } from './models/parts.js';
import { buildCloud, buildCrescent, CLOUD } from './models/sky-details.js';

const COUNT = 21;
const WRAP = 75; // a cloud leaving at x 75 comes back in at x -75
const WIND = 0.5; // a cloud drifts this much faster at wind 1
const SHOWN = new Set(['intro', 'play', 'paused', 'victory', 'defeat']); // as the weather; the rest are still, at clock 0
const lerp = (a, b, k) => a + (b - a) * k;

// The colour `phase` (in cycles) round `palette`: cosine-eased from each entry to the next, and from the last to the first.
export function cycleColor(palette, phase) {
  const at = (((phase % 1) + 1) % 1) * palette.length;
  const i = Math.floor(at);
  const k = (1 - Math.cos(Math.PI * (at - i))) / 2;
  return palette[i].clone().lerp(palette[(i + 1) % palette.length], k);
}

// The clouds and the moon at `clock` seconds into the cycle.
function paint({ cycle, clouds, moon, cloudColors, moonColors }, clock) {
  for (const c of clouds) c.userData.material.color = cycleColor(cloudColors, clock / cycle + c.userData.shift);
  moon.material.color = cycleColor(moonColors, clock / cycle);
}

// The sky as a group for the backdrop (unnamed: the backdrop's named children are its scenery); what
// drives it is in `userData.sky`. Its own seeded random makes the clouds the same every time.
export function makeSky({ cycle, clouds: data, moon: moonData }) {
  const rand = seeded(data.seed);
  const group = new THREE.Group();
  const clouds = Array.from({ length: COUNT }, () => {
    const cloud = buildCloud(rand);
    // The whole cloud, meshes and all, lies inside the ranges: no piece nearer than z -60.
    const { x, y, z } = cloud.userData.half;
    const inside = ([lo, hi], reach) => lerp(lo + reach, hi - reach, rand());
    cloud.position.set(inside(CLOUD.x, x), inside(CLOUD.y, y), inside(CLOUD.z, z));
    // Flagged as the weather's drifting leaves are: the rest of the backdrop's objects only sway.
    Object.assign(cloud.userData, { leaves: true, x0: cloud.position.x, speed: lerp(...CLOUD.speed, rand()), shift: rand() * CLOUD.shift });
    return cloud;
  });
  const moon = buildCrescent(moonData);
  group.add(...clouds, moon);
  const palette = (list) => list.map((c) => new THREE.Color(c));
  group.userData.sky = { cycle, clouds, moon, cloudColors: palette(data.colors), moonColors: palette(moonData.colors) };
  paint(group.userData.sky, 0);
  return group;
}

export function createSkyView() {
  let current = null; // the sky in the backdrop on show: its `userData.sky`
  let seen = null; // { w, clock }: the weather last drawn on this sky, and its clock

  return {
    // Draws the sky in `backdrop` for the game's weather clock and wind, building it there first if the
    // backdrop is new; it goes, and is disposed, with the backdrop.
    sync(game, backdrop) {
      let group = backdrop.children.find((c) => c.userData.sky);
      if (!group && game.level.sky) {
        group = makeSky(game.level.sky);
        backdrop.add(group);
      }
      const sky = group?.userData.sky;
      if (sky !== current) seen = null;
      current = sky;
      if (!sky) return;
      const w = game.weather;
      const moving = SHOWN.has(game.screen) && !game.reducedMotion;
      const fresh = !moving || seen?.w !== w || w.clock < seen.clock; // a new weather starts the clouds over
      const dt = !moving ? 0 : w.clock - (fresh ? 0 : seen.clock);
      const speedUp = 1 + WIND * w.wind;
      for (const c of sky.clouds) {
        const { x0, speed } = c.userData;
        const x = (fresh ? x0 : c.position.x) + (moving ? speed * speedUp * dt : 0);
        c.position.x = x < WRAP ? x : ((x + WRAP) % (2 * WRAP)) - WRAP;
      }
      paint(sky, moving ? w.clock : 0);
      seen = moving ? { w, clock: w.clock } : null;
    },
  };
}
