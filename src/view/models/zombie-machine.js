// The zombie's machine body under the torn clothes: steel arms and legs, ball joints at the knees and
// elbows, and a brass chest with a gear in the torn shirt. The head stays a rotting zombie head.
// The legs bend at the knee, and `gait` walks them on an even beat.

import * as THREE from 'three';
import { flat, ignoreRays, part, group } from './parts.js';

export const MACHINE = { steel: '#c4c0b6', darkSteel: '#34373d', brass: '#e0a838' };

// The dark steel's faint glow, on the knee and elbow balls and the gear.
export const JOINT_GLOW = { color: '#ff7a2a', intensity: 0.3 };

// The leg's two halves (radius at the top, at the bottom, length, sides) and the knee group's place in the hip.
export const LEG = { upper: [0.1, 0.09, 0.4, 5], lower: [0.09, 0.08, 0.4, 5], half: -0.2 };
export const KNEE = { radius: 0.13, at: [0, -0.4, 0], foot: [0, -0.4, 0.05] };
export const ELBOW = { radius: 0.09, at: [0, -0.42, 0] };
export const GEAR = { radius: 0.06, length: 0.02, sides: 8, at: [0.1, 0.36, 0.168], turn: Math.PI / 2 };
// The front torn patch grows to a chest plate; its geometry, place and rotation stay.
export const PLATE_SCALE = 1.5;

// The legs, knees and bob: `beat` is t × 4 + seed. A hip swings by `step`; the knee of the leg that
// swings forward bends back, up to 0.5 radians; the torso rises up to 0.03 twice a stride. With `walk`
// 0 everything is straight and still.
export function gait({ legs, torso, swing, walk }, beat) {
  const sin = Math.sin(beat);
  const step = sin * 0.35 * walk;
  legs[0].rotation.x = step * swing[0];
  legs[1].rotation.x = -step * swing[1];
  legs[0].children[1].rotation.x = 0.5 * Math.max(0, -sin) * swing[0] * walk;
  legs[1].children[1].rotation.x = 0.5 * Math.max(0, sin) * swing[1] * walk;
  torso.position.y = 0.92 + 0.03 * Math.abs(sin) * walk;
}

// Re-colours the existing arm cylinders, hands and torn patches (the same meshes, in the same places),
// replaces each leg cylinder by an upper leg and a knee group (the lower leg, the same foot and the
// knee ball), and adds the elbows and the gear after the existing children. Call it once, with the
// torso's children as `buildZombie` made them: the shirt, four hem cones, then the two patches.
export function addMachine({ legs, arms, torso }) {
  const steel = flat(MACHINE.steel);
  const brass = flat(MACHINE.brass);
  const dark = flat(MACHINE.darkSteel, { emissive: new THREE.Color(JOINT_GLOW.color), emissiveIntensity: JOINT_GLOW.intensity });

  for (const arm of arms) {
    arm.children[1].material = steel;
    arm.children[2].material = steel;
  }
  const [plate, side] = torso.children.slice(5, 7);
  plate.material = brass;
  plate.scale.set(PLATE_SCALE, PLATE_SCALE, 1);
  side.material = brass;

  const ball = (radius, at) => ignoreRays(part(new THREE.IcosahedronGeometry(radius, 0), dark, at));
  const half = (dims) => part(new THREE.CylinderGeometry(...dims), steel, [0, LEG.half, 0]);
  for (const leg of legs) {
    const [cylinder, foot] = leg.children;
    leg.remove(cylinder);
    foot.name = 'foot';
    foot.position.set(...KNEE.foot);
    const knee = group(half(LEG.lower), foot, ball(KNEE.radius));
    knee.name = 'knee';
    knee.position.set(...KNEE.at);
    leg.add(half(LEG.upper), knee);
  }
  for (const arm of arms) arm.add(ball(ELBOW.radius, ELBOW.at));

  const cog = new THREE.CylinderGeometry(GEAR.radius, GEAR.radius, GEAR.length, GEAR.sides);
  torso.add(ignoreRays(part(cog, dark, GEAR.at, [GEAR.turn, 0, 0])));
}
