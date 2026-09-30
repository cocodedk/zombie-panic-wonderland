// The Spider Queen: the yard spider made larger and grander: a wine-coloured abdomen with a white
// hourglass, eight glowing red eyes and a crown of five small gold spikes round her head. She gaits as
// the spider does; winding up, her two front legs rise and her abdomen tilts back.

import * as THREE from 'three';
import { buildSpider } from './spider.js';
import { ignoreRays, part } from './parts.js';

export const QUEEN = { size: 3.2, abdomen: '#5a1f3a', mark: '#d8e0ea', gold: '#d9a520', spikes: 5, tilt: 0.15 };
const RAISE = 1; // how far a front leg rises (radians) at the top of the wind-up; the legs' rotation goes 0 to -RAISE
const FRONT = [0, 4]; // the front leg of each side, in the spider's order

const named = (root, name) => {
  const found = [];
  root.traverse((o) => { if (o.name === name) found.push(o); });
  return found;
};

export function buildSpiderQueen({ tint = 0 } = {}) {
  const queen = buildSpider({ seed: tint, size: QUEEN.size, abdomen: QUEEN.abdomen, mark: QUEEN.mark });
  queen.name = 'spiderQueen';
  const [head] = named(queen, 'cephalothorax');
  const [abdomen] = named(queen, 'abdomen');
  const legs = named(queen, 'leg');

  // The crown: five gold cones standing round the top of the head.
  const cone = new THREE.ConeGeometry(0.03, 0.1, 4);
  for (let i = 0; i < QUEEN.spikes; i++) {
    const a = (i / QUEEN.spikes) * Math.PI * 2;
    const spike = ignoreRays(part(cone, QUEEN.gold, [Math.cos(a) * 0.1, 0.15, Math.sin(a) * 0.1], [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]));
    spike.name = 'spike';
    head.add(spike);
  }

  const gait = queen.userData.tick;
  queen.userData.tick = (t, { walk = 1, windup = 0 } = {}) => {
    gait(t, { walk });
    for (const i of FRONT) legs[i].rotation.x = 0 - RAISE * windup; // 0, never -0, at rest
    abdomen.rotation.x = 0 - QUEEN.tilt * windup;
  };
  return queen;
}
