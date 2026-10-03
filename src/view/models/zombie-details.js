// The zombie's small refinements: a shadow behind each eye, claws on the hands, a dried stain on
// the shirt, a rag that dangles from the hem, and a little variety in the skin and shirt colours.
// Each is a few shapes made in code.

import * as THREE from 'three';
import { group, ignoreRays, part, seeded } from './parts.js';
import { addMachine, MACHINE } from './zombie-machine.js';

export const SOCKET = { size: [0.11, 0.075, 0.03], color: '#1a1512', y: 0.03, z: 0.172 };
export const CLAW = { radius: 0.015, length: 0.09, sides: 3, color: '#2a2622', xs: [-0.035, 0, 0.035], y: -1.005, z: 0.02 };
export const STAIN = { size: [0.16, 0.14, 0.02], color: '#8a4a1e', at: [-0.08, 0.2, 0.151], turn: 0.3 };
export const TINT_LIMIT = 0.06;
export const TUFTS = { radius: 0.03, height: 0.12, sides: 4, color: '#2a241c', at: [[-0.07, 0.2, 0.0], [0.0, 0.22, -0.04], [0.08, 0.19, 0.02]], lean: [0.35, 0, -0.4] };

// The optional bits, one flag each. The stage builds zombies (and their fading copies) with these;
// `buildZombie` defaults every flag to off, so a model built without `extras` is the plain zombie.
export const ZOMBIE_EXTRAS = { tufts: true, limp: true, flicker: true, bareFoot: true, rag: true };
export const NO_EXTRAS = { tufts: false, limp: false, flicker: false, bareFoot: false, rag: false };

// The hanging cable: a cable hung by its top from a pivot on the torso, with a brass plug at its end.
// The pivot sways by `sway` radians at most.
export const RAG = { pivot: [0.2, -0.02, 0.13], sway: 0.15 };
export const CABLE = { radius: 0.012, length: 0.16, sides: 5, color: '#1c1c1f', at: [0, -0.08, 0] };
export const PLUG = { size: [0.03, 0.04, 0.03], at: [0, -0.18, 0] };

// The piston behind the heel of the limping leg, in its knee group.
export const PISTON = { radius: 0.025, length: 0.16, sides: 6, at: [0, -0.3, -0.115] };

// The pivot's rotation about z for the walk's own phase `s` (t × 3.2 + seed); 0 when `steady`.
export const ragSway = (s, steady = false) => (steady ? 0 : RAG.sway * Math.sin(s * 1.3 + 1));

// The zombie's limping side, from its seed: 0 the left leg, 1 the right (even ids left, odd right).
export const limpSide = (seed) => Math.abs(Math.round(seed / 1.7) % 2);

// The piston foot: the limping side's foot has no shoe, so its box is steel.
export const SHOE = '#2a2622';
export const footColor = (leg, seed, bareFoot) => (bareFoot && leg === limpSide(seed) ? MACHINE.steel : SHOE);

// The eye flicker: the eyes' glow breathes between `low` and 1 of their base colour, once every
// `period` seconds, shifted by the zombie's seed so a crowd does not flicker in step.
export const FLICKER = { period: 1.7, low: 0.85, phase: 2.3 };

// The brightness at time `t` for a zombie of `seed`: from FLICKER.low to 1.
export const flickerK = (t, seed = 0) =>
  FLICKER.low + (1 - FLICKER.low) * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / FLICKER.period + seed * FLICKER.phase));

const BLACK = new THREE.Color('#000000');

// Returns `(t, steady)` that sets each of `materials` to its colour now times flickerK, or exactly
// to that colour when `steady` (reduced motion).
export function flickering(materials, seed) {
  const base = materials.map((m) => m.color.clone());
  return (t, steady) => {
    const k = steady ? 1 : flickerK(t, seed);
    materials.forEach((m, i) => { m.color = base[i].clone().lerp(BLACK, 1 - k); });
  };
}

// The limp: one leg swings only `LIMP` as far as the other.
export const LIMP = 0.6;

// How far each leg [left, right] swings, as a fraction of the plain swing. With `limp` on, the
// zombie's own leg (`Math.round(seed / 1.7) % 2`, so even ids left, odd ids right) swings less.
export function legSwing(seed, limp) {
  const swing = [1, 1];
  if (limp) swing[limpSide(seed)] = LIMP;
  return swing;
}

// Adds the sockets to the head (behind the eyes at `eyeXs`), the claws to each arm (they swing with
// it) and the rust patch to the torso; then whatever `extras` switches on (hair tufts on the head, the
// cable on the torso); then the machine body (see zombie-machine.js) and, with `bareFoot`, the piston
// on the limping leg's knee. Returns the cable's pivot, or null without one.
export function addDetails({ head, legs, arms, torso, seed = 0 }, eyeXs, extras = NO_EXTRAS) {
  const socket = new THREE.BoxGeometry(...SOCKET.size);
  head.add(...eyeXs.map((x) => part(socket, SOCKET.color, [x, SOCKET.y, SOCKET.z])));
  const claw = new THREE.ConeGeometry(CLAW.radius, CLAW.length, CLAW.sides);
  for (const arm of arms) arm.add(...CLAW.xs.map((x) => part(claw, CLAW.color, [x, CLAW.y, CLAW.z], [Math.PI, 0, 0])));
  torso.add(part(new THREE.BoxGeometry(...STAIN.size), STAIN.color, STAIN.at, [0, 0, STAIN.turn]));
  if (extras.tufts) {
    const tuft = new THREE.ConeGeometry(TUFTS.radius, TUFTS.height, TUFTS.sides);
    head.add(...TUFTS.at.map((at, i) => ignoreRays(part(tuft, TUFTS.color, at, [0, 0, TUFTS.lean[i]]))));
  }
  let pivot = null;
  if (extras.rag) {
    const cable = new THREE.CylinderGeometry(CABLE.radius, CABLE.radius, CABLE.length, CABLE.sides);
    pivot = group(
      ignoreRays(part(cable, CABLE.color, CABLE.at)),
      ignoreRays(part(new THREE.BoxGeometry(...PLUG.size), MACHINE.brass, PLUG.at)),
    );
    pivot.position.set(...RAG.pivot);
    torso.add(pivot);
  }
  addMachine({ legs, arms, torso }); // last, so its new parts follow every existing child
  if (extras.bareFoot) {
    const rod = new THREE.CylinderGeometry(PISTON.radius, PISTON.radius, PISTON.length, PISTON.sides);
    legs[limpSide(seed)].children[1].add(ignoreRays(part(rod, MACHINE.brass, PISTON.at)));
  }
  return pivot;
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
