// The zombie's small refinements: a shadow behind each eye, claws on the hands, a dried stain on
// the shirt, and a little variety in the skin and shirt colours. Each is a few shapes made in code.

import * as THREE from 'three';
import { part, seeded } from './parts.js';

export const SOCKET = { size: [0.11, 0.075, 0.03], color: '#1a1512', y: 0.03, z: 0.172 };
export const CLAW = { radius: 0.015, length: 0.09, sides: 3, color: '#2a2622', xs: [-0.035, 0, 0.035], y: -1.005, z: 0.02 };
export const STAIN = { size: [0.16, 0.14, 0.02], color: '#4a1f24', at: [-0.08, 0.2, 0.151], turn: 0.3 };
export const TINT_LIMIT = 0.06;
export const TUFTS = { radius: 0.03, height: 0.12, sides: 4, color: '#2a241c', at: [[-0.07, 0.2, 0.0], [0.0, 0.22, -0.04], [0.08, 0.19, 0.02]], lean: [0.35, 0, -0.4] };

// The optional bits, one flag each. The stage builds zombies (and their fading copies) with these;
// `buildZombie` defaults every flag to off, so a model built without `extras` is the plain zombie.
export const ZOMBIE_EXTRAS = { tufts: true, limp: true };
export const NO_EXTRAS = { tufts: false, limp: false };

// The limp: one leg swings only `LIMP` as far as the other.
export const LIMP = 0.6;

// How far each leg [left, right] swings, as a fraction of the plain swing. With `limp` on, the
// zombie's own leg (`Math.round(seed / 1.7) % 2`, so even ids left, odd ids right) swings less.
export function legSwing(seed, limp) {
  const swing = [1, 1];
  if (limp) swing[Math.abs(Math.round(seed / 1.7) % 2)] = LIMP;
  return swing;
}

// Adds the sockets to the head (behind the eyes at `eyeXs`), the claws to each arm (they swing with
// it) and the stain to the torso; then whatever `extras` switches on (hair tufts on the head).
export function addDetails({ head, arms, torso }, eyeXs, extras = NO_EXTRAS) {
  const socket = new THREE.BoxGeometry(...SOCKET.size);
  head.add(...eyeXs.map((x) => part(socket, SOCKET.color, [x, SOCKET.y, SOCKET.z])));
  const claw = new THREE.ConeGeometry(CLAW.radius, CLAW.length, CLAW.sides);
  for (const arm of arms) arm.add(...CLAW.xs.map((x) => part(claw, CLAW.color, [x, CLAW.y, CLAW.z], [Math.PI, 0, 0])));
  torso.add(part(new THREE.BoxGeometry(...STAIN.size), STAIN.color, STAIN.at, [0, 0, STAIN.turn]));
  if (extras.tufts) {
    const tuft = new THREE.ConeGeometry(TUFTS.radius, TUFTS.height, TUFTS.sides);
    head.add(...TUFTS.at.map((at, i) => {
      const mesh = part(tuft, TUFTS.color, at, [0, 0, TUFTS.lean[i]]);
      mesh.raycast = () => {}; // shots and aim pass through: the zombie is picked as today
      return mesh;
    }));
  }
}

// `color` (a '#rrggbb' string) lighter (positive) or darker (negative) by `tint`, a fraction of its
// lightness in HSL, limited to ±TINT_LIMIT. With tint 0 it is the same colour.
export function tinted(color, tint = 0) {
  const k = Math.max(-TINT_LIMIT, Math.min(TINT_LIMIT, Number(tint) || 0));
  if (k === 0) return color;
  const n = parseInt(color.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const light = Math.min(1, l * (1 + k));
  const c = (1 - Math.abs(2 * light - 1)) * s;
  const m = light - c / 2;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const [R, G, B] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h) % 6];
  return `#${[R + m, G + m, B + m].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}`;
}

// The same tint for the same zombie id, drawn from the id and never from the game's random.
export const zombieTint = (id) => (seeded(id)() * 2 - 1) * TINT_LIMIT;
