// The zombie's machine body under the torn clothes: steel arms and legs, ball joints at the knees and
// elbows, and a brass chest with a gear in the torn shirt. The head stays a rotting zombie head.

import * as THREE from 'three';
import { flat, ignoreRays, part } from './parts.js';

export const MACHINE = { steel: '#8c949e', darkSteel: '#34373d', brass: '#b8862e' };

export const KNEE = { radius: 0.13, at: [0, -0.4, 0] };
export const ELBOW = { radius: 0.09, at: [0, -0.42, 0] };
export const GEAR = { radius: 0.045, length: 0.02, sides: 8, at: [0.1, 0.36, 0.168], turn: Math.PI / 2 };

// Re-colours the existing arm cylinders, hands, leg cylinders and torn patches (the same meshes, in
// the same places) and adds the joints and the gear after the existing children. Call it once, with
// the torso's children as `buildZombie` made them: the shirt, four hem cones, then the two patches.
export function addMachine({ legs, arms, torso }) {
  const steel = flat(MACHINE.steel);
  const brass = flat(MACHINE.brass);
  const dark = flat(MACHINE.darkSteel);

  for (const leg of legs) leg.children[0].material = steel;
  for (const arm of arms) {
    arm.children[1].material = steel;
    arm.children[2].material = steel;
  }
  for (const patch of torso.children.slice(5, 7)) patch.material = brass;

  const ball = (radius, at) => ignoreRays(part(new THREE.IcosahedronGeometry(radius, 0), dark, at));
  for (const leg of legs) leg.add(ball(KNEE.radius, KNEE.at));
  for (const arm of arms) arm.add(ball(ELBOW.radius, ELBOW.at));

  const cog = new THREE.CylinderGeometry(GEAR.radius, GEAR.radius, GEAR.length, GEAR.sides);
  torso.add(ignoreRays(part(cog, dark, GEAR.at, [GEAR.turn, 0, 0])));
}
