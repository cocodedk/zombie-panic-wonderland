// The hero's four guns, each a group in the gun's own frame: x to the right, y up, the muzzle toward -z.
// Seen from behind and above, so the additions (ribs, sights, brass, wood, flares) sit on the top, rear and sides.
// None reaches in front of its gun's muzzle tip (z -0.34, -0.50, -0.46, -0.66 in this frame).

import * as THREE from 'three';
import { flat, part, group } from './parts.js';

const BRASS = '#b8860b';
const STEEL = '#55555f';
const SIGHT = '#2a2a30';
const WOOD = '#7a5230';
const box = (w, h, d, color, at) => part(new THREE.BoxGeometry(w, h, d), color, at);
const bead = (r, color, at) => part(new THREE.IcosahedronGeometry(r, 0), color, at);
const along = (geo, color, at, rotation = [Math.PI / 2, 0, 0]) => part(geo, color, at, rotation); // a cylinder lying along z

const grip = () => part(new THREE.BoxGeometry(0.07, 0.14, 0.08), '#5a3a22', [0, -0.1, 0.06], [0.3, 0, 0]);
const barrel = (gun, r, length, x, z) => along(new THREE.CylinderGeometry(r, r, length, 6), gun, [x, 0.02, z]);

function buildPopper(gun) {
  const handle = grip();
  handle.add(box(0.075, 0.02, 0.085, BRASS, [0, -0.075, 0])); // the butt cap tilts with the grip
  return group(
    box(0.12, 0.14, 0.26, gun),
    barrel(gun, 0.045, 0.2, 0, -0.2),
    handle,
    box(0.04, 0.02, 0.24, STEEL, [0, 0.08, -0.02]),
    box(0.015, 0.03, 0.015, SIGHT, [0, 0.08, -0.28]),
    box(0.04, 0.025, 0.015, SIGHT, [0, 0.0825, 0.1]),
    part(new THREE.TorusGeometry(0.048, 0.012, 4, 10), BRASS, [0, 0.02, -0.29]),
  );
}

function buildScattergun(gun) {
  return group(
    box(0.16, 0.14, 0.26, gun),
    barrel(gun, 0.035, 0.38, -0.038, -0.31),
    barrel(gun, 0.035, 0.38, 0.038, -0.31),
    grip(),
    box(0.014, 0.014, 0.36, STEEL, [0, 0.058, -0.31]),
    bead(0.012, BRASS, [0, 0.068, -0.47]),
    box(0.1, 0.06, 0.16, WOOD, [0, -0.045, -0.3]),
    box(0.09, 0.11, 0.095, WOOD, [0, -0.02, 0.1675]), // stops at the tunic, z 0.215
    box(0.005, 0.08, 0.1, BRASS, [-0.0825, 0, -0.02]),
    box(0.005, 0.08, 0.1, BRASS, [0.0825, 0, -0.02]),
  );
}

// An open flare along z, double-sided so its inside shows from behind; `top` is the forward (-z) end.
function flare(top, bottom, color, z) {
  const material = flat(color, { side: THREE.DoubleSide });
  return along(new THREE.CylinderGeometry(top, bottom, 0.08, 6, 1, true), material, [0, 0.02, z], [-Math.PI / 2, 0, 0]);
}

function buildLauncher(gun) {
  return group(
    barrel(gun, 0.09, 0.56, 0, -0.18),
    part(new THREE.TorusGeometry(0.09, 0.028, 4, 10), '#e07b24', [0, 0.02, -0.46]),
    grip(),
    flare(0.125, 0.09, '#e07b24', -0.42), // the top is the forward end: wide at the muzzle
    flare(0.09, 0.12, '#3b3b44', 0.14), // narrow at the front, wide at the back
    box(0.03, 0.03, 0.3, STEEL, [0, 0.125, -0.15]),
    part(new THREE.ConeGeometry(0.015, 0.05, 5), '#3f6b2a', [0, 0.16, -0.27]),
  );
}

// Six barrels in a ring on a spinner that turns about the gun's axis, a brass band around them and an
// ammunition box under them. The spinner's own parts turn; the rest of the gun stays still.
function buildGatling() {
  const metal = '#3a3a3a';
  const barrelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.6, 6);
  const spinner = group(...Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return part(barrelGeo, metal, [Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0], [Math.PI / 2, 0, 0]);
  }));
  spinner.position.set(0, 0.02, -0.36);
  const gatling = group(
    box(0.2, 0.2, 0.14, metal, [0, 0.02, 0]),
    spinner,
    along(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 8), BRASS, [0, 0.02, -0.5]),
    box(0.16, 0.14, 0.2, metal, [0, -0.13, -0.05]),
    grip(),
    along(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 8), BRASS, [0, 0.02, -0.3]),
    part(new THREE.TorusGeometry(0.07, 0.012, 6, 8, Math.PI), STEEL, [0, 0.125, -0.02]),
    along(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), STEEL, [0.15, 0.02, 0.02], [0, 0, Math.PI / 2]),
    bead(0.03, BRASS, [0.2, 0.02, 0.02]),
    box(0.02, 0.04, 0.02, SIGHT, [0, 0.14, -0.3]),
  );
  return { gatling, spinner };
}

export function buildGuns({ gun = '#3b3b44' } = {}) {
  const { gatling, spinner } = buildGatling();
  const guns = {
    popper: buildPopper(gun),
    scattergun: buildScattergun(gun),
    launcher: buildLauncher(gun),
    gatling,
  };
  return { guns, spinner };
}
