// What the stage draws of the weather: a strike's light on the hemisphere light, the sky and the fog,
// its bolt, the swaying of trees, corn, hedges and scarecrows, and the drifting leaves. Everything is
// worked out from the backdrop as built and the game's weather, so once a strike ends it is all back
// as it was. The bolt hangs in the scene and the leaves in the backdrop, so they go with it when the
// level changes; neither is pickable, and no ray from the crosshair meets them.

import * as THREE from 'three';
import { LIGHTNING, SWAY, LEAVES } from '../logic/weather.js';
import { flat, ignoreRays, seeded } from './models/parts.js';
import { lerp } from '../logic/game-shared.js';

export const SHOWN = new Set(['intro', 'play', 'paused', 'victory', 'defeat']); // no weather on loading, error, title
const SWAYS = new Set(['tree', 'cornRows', 'hedge', 'scarecrow']);
const CHANNELS = ['r', 'g', 'b'];
const TWO_PI = Math.PI * 2;

// The backdrop as built: what a strike changes, remembered to return to.
function capture(scene, backdrop) {
  const rand = seeded(5);
  const light = backdrop.children.find((c) => c instanceof THREE.HemisphereLight);
  const sky = backdrop.children.find((c) => c.name === 'sky')?.geometry.attributes.color;
  const { r, g, b } = scene.fog.color;
  return {
    backdrop,
    light,
    intensity: light.intensity,
    sky,
    skyBase: Array.from(sky.array),
    fog: scene.fog,
    fogBase: [r, g, b],
    shift: 0,
    swayers: backdrop.children.filter((c) => SWAYS.has(c.name)).map((obj) => ({
      obj, base: obj.rotation.z, tilt: obj.name === 'tree' ? SWAY.tree : SWAY.tilt, rate: lerp(...SWAY.rate, rand()), phase: rand(),
    })),
    leaves: null,
  };
}

function makeLeaves(color) {
  const rand = seeded(11);
  const group = new THREE.Group();
  group.userData.leaves = true; // unnamed: the backdrop's named children are its scenery
  const geo = new THREE.PlaneGeometry(LEAVES.size, LEAVES.size);
  const mat = flat(color, { side: THREE.DoubleSide });
  const leaves = Array.from({ length: LEAVES.count }, () => {
    const mesh = ignoreRays(new THREE.Mesh(geo, mat));
    group.add(mesh);
    return { mesh, x: lerp(...LEAVES.x, rand()), y: lerp(LEAVES.y[0] + 0.3, LEAVES.y[1] - 0.3, rand()), z: lerp(...LEAVES.z, rand()), drift: lerp(0.5, 1, rand()), turn: lerp(1, 3, rand()), phase: rand() * TWO_PI };
  });
  return { group, leaves };
}

export function createWeatherView(scene) {
  const boltGeo = new THREE.BoxGeometry(0.3, 1, 0.3);
  const boltMat = new THREE.MeshBasicMaterial({ color: LIGHTNING.bolt.color, fog: false });
  const flashTo = new THREE.Color(LIGHTNING.color);
  let rig = null;
  let shown = null; // { bolt, group }: the bolt on show
  let seen = null; // { w, clock }: the game's weather last drawn, and its clock

  function hideBolt() {
    if (shown) scene.remove(shown.group);
    shown = null;
  }

  // A jagged line of thin boxes, each from one point of the bolt to the next.
  function drawBolt(w, on) {
    const now = on ? w.bolt : null;
    if (now === (shown?.bolt ?? null)) return;
    hideBolt();
    if (!now) return;
    const group = new THREE.Group();
    group.name = 'bolt';
    for (let i = 1; i < now.points.length; i++) {
      const [a, b] = [now.points[i - 1], now.points[i]];
      const seg = new THREE.Mesh(boltGeo, boltMat);
      seg.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, a.z);
      seg.rotation.z = -Math.atan2(b.x - a.x, b.y - a.y);
      seg.scale.y = Math.hypot(b.x - a.x, b.y - a.y);
      group.add(seg);
    }
    scene.add(group);
    shown = { bolt: now, group };
  }

  // The light, and the sky and the fog toward the flash's colour, from the values as built.
  function light(w, on) {
    rig.light.intensity = rig.intensity + (on ? w.light : 0);
    const k = on ? w.shift : 0;
    if (k === rig.shift) return;
    rig.shift = k;
    CHANNELS.forEach((c, i) => { rig.fog.color[c] = lerp(rig.fogBase[i], flashTo[c], k); });
    const { array } = rig.sky;
    for (let i = 0; i < array.length; i++) array[i] = lerp(rig.skyBase[i], flashTo[CHANNELS[i % 3]], k);
    rig.sky.needsUpdate = true;
  }

  function sway(w, on) {
    const { wind, clock } = w; // a getter and a clock, read once for every swayer
    for (const s of rig.swayers) s.obj.rotation.z = s.base + (on ? s.tilt * wind * Math.sin(TWO_PI * (s.rate * clock + s.phase)) : 0);
  }

  // The leaves drift on the weather's clock, so they stand still whenever it does.
  function drift(w, on) {
    if (!on) {
      if (rig.leaves) rig.backdrop.remove(rig.leaves.group);
      return;
    }
    rig.leaves ??= makeLeaves(w.data?.leaf ?? '#8a6a2f');
    const { group, leaves } = rig.leaves;
    if (group.parent !== rig.backdrop) rig.backdrop.add(group);
    const { wind, clock } = w; // a getter and a clock, read once for every leaf
    const dt = seen?.w === w ? Math.max(0, clock - seen.clock) : 0;
    const [x0, x1] = LEAVES.x;
    for (const l of leaves) {
      const speed = lerp(LEAVES.speed[0], LEAVES.speed[1], wind * l.drift);
      l.x = ((l.x - x0 + speed * dt) % (x1 - x0)) + x0;
      l.mesh.position.set(l.x, l.y + 0.3 * Math.sin(clock * 1.3 + l.phase), l.z);
      l.mesh.rotation.set(clock * l.turn + l.phase, clock * l.turn * 0.7, l.phase);
    }
  }

  return {
    // Draws the game's weather on `backdrop`, which the stage has just built or kept.
    sync(game, backdrop) {
      if (rig?.backdrop !== backdrop) {
        hideBolt();
        rig = capture(scene, backdrop);
      }
      const w = game.weather;
      const on = SHOWN.has(game.screen);
      const motion = on && !game.reducedMotion;
      light(w, on);
      drawBolt(w, on);
      sway(w, motion);
      drift(w, motion);
      seen = { w, clock: w.clock };
    },
  };
}
