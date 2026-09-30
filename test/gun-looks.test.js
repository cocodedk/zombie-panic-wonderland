// Spec 37: the guns' looks. The additions to the four guns, in each gun's own frame, against test/fake-three.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { MUZZLES } from '../src/logic/effects.js';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { buildGuns } = await import('../src/view/models/guns.js');
const { buildPlayer } = await import('../src/view/models/player.js');

const EXISTING = { popper: 3, scattergun: 4, launcher: 3, gatling: 5 }; // the parts each gun had before
const hex = (m) => `#${m.material.color.getHexString()}`;
const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} ≈ ${b}`);
const nearAll = (got, want, msg = '') => want.forEach((v, i) => near(got[i], v, `${msg}[${i}]`));
const fresh = (guns, w) => guns[w].children.slice(EXISTING[w]);
const at = (m) => [m.position.x, m.position.y, m.position.z];

// One new part: its geometry class, parameters, colour and place; `rotation` where it is turned.
function expectPart(m, Geo, params, color, place, rotation) {
  assert.ok(m instanceof THREE.Mesh && m.geometry instanceof Geo, `${Geo.name}, got ${m.geometry.constructor.name}`);
  assert.deepEqual(m.geometry.params, params);
  assert.equal(hex(m), color);
  nearAll(at(m), place, 'place');
  if (rotation) nearAll([m.rotation.x, m.rotation.y, m.rotation.z], rotation, 'rotation');
}

test('the Popper: a rib, two sights, a brass muzzle ring and a brass butt cap on the grip', () => {
  const { guns } = buildGuns({ gun: '#3b3b44' });
  const add = fresh(guns, 'popper');
  assert.equal(add.length, 4);
  expectPart(add[0], THREE.BoxGeometry, [0.04, 0.02, 0.24], '#55555f', [0, 0.08, -0.02]);
  expectPart(add[1], THREE.BoxGeometry, [0.015, 0.03, 0.015], '#2a2a30', [0, 0.08, -0.28]);
  expectPart(add[2], THREE.BoxGeometry, [0.04, 0.025, 0.015], '#2a2a30', [0, 0.0825, 0.1]);
  expectPart(add[3], THREE.TorusGeometry, [0.048, 0.012, 4, 10], '#b8860b', [0, 0.02, -0.29], [0, 0, 0]);
  const grip = guns.popper.children[2];
  assert.equal(grip.rotation.x, 0.3);
  assert.equal(grip.children.length, 1);
  expectPart(grip.children[0], THREE.BoxGeometry, [0.075, 0.02, 0.085], '#b8860b', [0, -0.075, 0]);
});

test('the Scattergun: a rib, a brass bead, a forend, a stock that stops at the tunic and two side plates', () => {
  const { guns } = buildGuns({});
  const add = fresh(guns, 'scattergun');
  assert.equal(add.length, 6);
  expectPart(add[0], THREE.BoxGeometry, [0.014, 0.014, 0.36], '#55555f', [0, 0.058, -0.31]);
  expectPart(add[1], THREE.IcosahedronGeometry, [0.012, 0], '#b8860b', [0, 0.068, -0.47]);
  expectPart(add[2], THREE.BoxGeometry, [0.1, 0.06, 0.16], '#7a5230', [0, -0.045, -0.3]);
  expectPart(add[3], THREE.BoxGeometry, [0.09, 0.11, 0.095], '#7a5230', [0, -0.02, 0.1675]);
  near(add[3].position.z - 0.095 / 2, 0.12, 'the stock starts at the body');
  near(add[3].position.z + 0.095 / 2, 0.215, 'and stops at the tunic');
  expectPart(add[4], THREE.BoxGeometry, [0.005, 0.08, 0.1], '#b8860b', [-0.0825, 0, -0.02]);
  expectPart(add[5], THREE.BoxGeometry, [0.005, 0.08, 0.1], '#b8860b', [0.0825, 0, -0.02]);
});

test('the launcher: a flared muzzle and rear, both double-sided and open, a sight rail and a pumpkin stem', () => {
  const { guns } = buildGuns({});
  const add = fresh(guns, 'launcher');
  assert.equal(add.length, 4);
  // A cylinder turned by -π/2 about x has its top (the first radius) toward -z, the front.
  expectPart(add[0], THREE.CylinderGeometry, [0.125, 0.09, 0.08, 6, 1, true], '#e07b24', [0, 0.02, -0.42], [-Math.PI / 2, 0, 0]);
  expectPart(add[1], THREE.CylinderGeometry, [0.09, 0.12, 0.08, 6, 1, true], '#3b3b44', [0, 0.02, 0.14], [-Math.PI / 2, 0, 0]);
  for (const flare of add.slice(0, 2)) {
    assert.equal(flare.material.side, THREE.DoubleSide);
    assert.equal(flare.material.flatShading, true);
  }
  expectPart(add[2], THREE.BoxGeometry, [0.03, 0.03, 0.3], '#55555f', [0, 0.125, -0.15]);
  expectPart(add[3], THREE.ConeGeometry, [0.015, 0.05, 5], '#3f6b2a', [0, 0.16, -0.27]);
});

test('the Gatling: a second band, a half-torus handle, a crank with a brass knob and a front sight bar', () => {
  const { guns, spinner } = buildGuns({});
  const add = fresh(guns, 'gatling');
  assert.equal(add.length, 5);
  expectPart(add[0], THREE.CylinderGeometry, [0.115, 0.115, 0.05, 8], '#b8860b', [0, 0.02, -0.3], [Math.PI / 2, 0, 0]);
  expectPart(add[1], THREE.TorusGeometry, [0.07, 0.012, 6, 8, Math.PI], '#55555f', [0, 0.125, -0.02], [0, 0, 0]);
  expectPart(add[2], THREE.CylinderGeometry, [0.012, 0.012, 0.1, 6], '#55555f', [0.15, 0.02, 0.02], [0, 0, Math.PI / 2]);
  expectPart(add[3], THREE.IcosahedronGeometry, [0.03, 0], '#b8860b', [0.2, 0.02, 0.02]);
  expectPart(add[4], THREE.BoxGeometry, [0.02, 0.04, 0.02], '#2a2a30', [0, 0.14, -0.3]);
  assert.ok(guns.gatling.children.includes(spinner));
  assert.ok(add.every((m) => m.parent === guns.gatling), 'not on the spinner');
});

// The z of the frontmost point of a new part, from its own size (none is turned except the cylinders).
function front(m) {
  const p = m.geometry.params;
  const z = m.position.z;
  if (m.geometry instanceof THREE.BoxGeometry) return z - p[2] / 2;
  if (m.geometry instanceof THREE.CylinderGeometry) return z - (m.rotation.x ? p[2] / 2 : p[0]);
  if (m.geometry instanceof THREE.TorusGeometry) return z - p[1];
  return z - p[0]; // an icosahedron or a cone upright: its radius
}

test('no new part reaches in front of its gun\'s muzzle tip; the existing parts are as before', () => {
  const { guns } = buildGuns({});
  for (const w of Object.keys(MUZZLES)) {
    const tip = MUZZLES[w].z + 0.42;
    for (const m of fresh(guns, w)) assert.ok(front(m) >= tip - 1e-9, `${w}: ${m.geometry.constructor.name} reaches ${front(m)} past ${tip}`);
  }
  near(MUZZLES.popper.z + 0.42, -0.34);
  near(MUZZLES.gatling.z + 0.42, -0.66);
  // Every old part whole: its class, size, colour, place and turn, as `player.js` built it.
  const kind = (g) => ['BoxGeometry', 'CylinderGeometry', 'TorusGeometry'].find((k) => g instanceof THREE[k]);
  const row = (m) => [kind(m.geometry), m.geometry.params, hex(m), at(m), [m.rotation.x, m.rotation.y, m.rotation.z]];
  const old = (w) => guns[w].children.slice(0, EXISTING[w]).map((m) => (m.geometry ? row(m) : ['Group', at(m), m.children.map(row)]));
  const gun = '#3b3b44';
  const box = (size, color, place, turn = [0, 0, 0]) => ['BoxGeometry', size, color, place, turn];
  const pipe = (size, color, place) => ['CylinderGeometry', size, color, place, [Math.PI / 2, 0, 0]];
  const grip = box([0.07, 0.14, 0.08], '#5a3a22', [0, -0.1, 0.06], [0.3, 0, 0]);
  assert.deepEqual(old('popper'), [box([0.12, 0.14, 0.26], gun, [0, 0, 0]), pipe([0.045, 0.045, 0.2, 6], gun, [0, 0.02, -0.2]), grip]);
  assert.deepEqual(old('scattergun'), [
    box([0.16, 0.14, 0.26], gun, [0, 0, 0]),
    pipe([0.035, 0.035, 0.38, 6], gun, [-0.038, 0.02, -0.31]),
    pipe([0.035, 0.035, 0.38, 6], gun, [0.038, 0.02, -0.31]),
    grip,
  ]);
  assert.deepEqual(old('launcher'), [
    pipe([0.09, 0.09, 0.56, 6], gun, [0, 0.02, -0.18]),
    ['TorusGeometry', [0.09, 0.028, 4, 10], '#e07b24', [0, 0.02, -0.46], [0, 0, 0]],
    grip,
  ]);
  const metal = '#3a3a3a';
  const barrels = Array.from({ length: 6 }, (_, i) => pipe([0.028, 0.028, 0.6, 6], metal, [Math.cos((i * Math.PI) / 3) * 0.075, Math.sin((i * Math.PI) / 3) * 0.075, 0]));
  assert.deepEqual(old('gatling'), [
    box([0.2, 0.2, 0.14], metal, [0, 0.02, 0]),
    ['Group', [0, 0.02, -0.36], barrels],
    pipe([0.115, 0.115, 0.06, 8], '#b8860b', [0, 0.02, -0.5]),
    box([0.16, 0.14, 0.2], metal, [0, -0.13, -0.05]),
    grip,
  ]);
});

test('buildGuns returns the four groups by weapon and the spinner, and `gun` colours the bodies and barrels', () => {
  const { guns, spinner } = buildGuns({ gun: '#123456' });
  assert.deepEqual(Object.keys(guns), ['popper', 'scattergun', 'launcher', 'gatling']);
  assert.ok(Object.values(guns).every((g) => g instanceof THREE.Group));
  assert.equal(spinner.children.length, 6);
  assert.ok(guns.gatling.children.includes(spinner));
  const first = (w) => guns[w].children.slice(0, 2).map(hex);
  assert.deepEqual(first('popper'), ['#123456', '#123456']);
  assert.deepEqual(first('scattergun'), ['#123456', '#123456']);
  assert.equal(hex(guns.launcher.children[0]), '#123456');
  assert.equal(hex(buildGuns({}).guns.popper.children[0]), '#3b3b44', 'the default gun colour');
});

test('in the hero only the weapon in hand shows; the aim rig, flash and muzzles are as before', () => {
  const root = buildPlayer({ gun: '#123456' });
  const { guns, rig, flash, spinner, tick } = root.userData;
  assert.equal(hex(guns.popper.children[0]), '#123456');
  for (const weapon of Object.keys(MUZZLES)) {
    tick(0, { weapon });
    assert.deepEqual(Object.entries(guns).filter(([, g]) => g.visible).map(([w]) => w), [weapon]);
    near(flash.position.z + rig.position.z, MUZZLES[weapon].z, weapon);
  }
  assert.equal(rig.children.length, 4, 'two arms, the guns and the flash');
  assert.ok(guns.gatling.children.includes(spinner));
});

test('the Gatling\'s spin turns only the spinner; the new parts stay still', () => {
  const { guns, spinner, tick } = buildPlayer().userData;
  const stills = guns.gatling.children.filter((c) => c !== spinner);
  const look = () => JSON.stringify(stills.map((c) => [c.position, c.rotation, c.scale]));
  const before = look();
  const barrels = JSON.stringify(spinner.children.map((c) => [c.position, c.rotation]));
  tick(0, { weapon: 'gatling', spin: 0.3 });
  near(spinner.rotation.z, 0.3 * Math.PI * 2);
  assert.equal(look(), before);
  assert.equal(JSON.stringify(spinner.children.map((c) => [c.position, c.rotation])), barrels, 'the barrels turn with the spinner, not alone');
});

test('the files stay under 200 lines and player.js is at least 25 lines shorter than before (113 lines)', () => {
  const lines = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').split('\n').length - 1;
  assert.ok(lines('../src/view/models/guns.js') < 200);
  assert.ok(lines('./gun-looks.test.js') < 200);
  assert.ok(lines('../src/view/models/player.js') <= 113 - 25);
});
