// Spec 36: the hero's look. The new parts of the back view (cape hem and trim, collar, hood seam and pompom,
// shoulder caps, satchel), against test/fake-three.js. Places are in the body's frame before its waist
// shift (0.6), so a part's y here is its `position.y` plus 0.6.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { playing, levelWith } from './helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildPlayer } = await import('../src/view/models/player.js');
const { createStage } = await import('../src/view/stage.js');
const { span: stageSpan } = await import('../src/view/stage-helpers.js');
const { span } = await import('../src/view/models/parts.js');

const WAIST = 0.6;
const near = (a, b, tol = 1e-9, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} ≈ ${b}`);
const hex = (m) => `#${m.material.color.getHexString()}`;
const place = (o) => [o.position.x, o.position.y + WAIST, o.position.z];
const nearAll = (got, want, tol = 1e-9, msg = '') => got.forEach((v, i) => near(v, want[i], tol, `${msg}[${i}]`));

// The body's children that are new: between the original eight (legs, tunic, belt, cape, head, hood, hood tip) and the rig.
function look(params) {
  const root = buildPlayer(params);
  const { body, rig } = root.userData;
  const fresh = body.children.slice(8, body.children.indexOf(rig));
  const ofType = (T) => fresh.filter((c) => c instanceof THREE.Mesh && c.geometry instanceof T);
  return { root, body, rig, fresh, ofType, ...root.userData };
}
const hemVertex = (i) => [0.42 * Math.sin((2 * Math.PI * i) / 7), 0.2, 0.08 + 0.294 * Math.cos((2 * Math.PI * i) / 7)];

test('the cape hem: seven small cones pointing down at the hem vertices', () => {
  const { ofType } = look();
  const cones = ofType(THREE.ConeGeometry).filter((c) => c.geometry.params[2] === 3);
  assert.equal(cones.length, 7);
  cones.forEach((c, i) => {
    assert.deepEqual(c.geometry.params, [0.07, 0.12, 3]);
    assert.equal(hex(c), '#6f1219');
    nearAll(place(c), hemVertex(i), 1e-9, `point ${i}`);
    near(c.rotation.x, Math.PI, 1e-9, 'pointing down');
  });
});

test('the gold trim: a 7-sided torus flat in a group squeezed to 0.7 in z, its corners on the hem', () => {
  const { body, fresh } = look();
  const groups = fresh.filter((c) => c instanceof THREE.Group);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].children.length, 1);
  const [trim] = groups[0].children;
  assert.ok(trim.geometry instanceof THREE.TorusGeometry);
  assert.deepEqual(trim.geometry.params, [0.42, 0.012, 4, 7]);
  assert.equal(hex(trim), '#d9a520');
  assert.deepEqual([trim.scale.x, trim.scale.y, trim.scale.z], [1, 1, 1], 'the torus itself is not squeezed');
  const ring = trim.parent;
  assert.ok(ring instanceof THREE.Group && ring.parent === body);
  assert.equal(ring.scale.z, 0.7);
  assert.deepEqual([ring.scale.x, ring.scale.y], [1, 1]);
  nearAll(place(ring), [0, 0.255, 0.08]);

  // A torus of 7 tubular segments has its vertices at (R cos u, R sin u, 0), u = 2πj/7; turn them by the torus's
  // rotation (order YXZ: about x, then y), squeeze by the group and move by its place.
  const { x: rx, y: ry } = trim.rotation;
  assert.equal(trim.rotation.order, 'YXZ');
  const corners = Array.from({ length: 7 }, (_, j) => {
    const u = (2 * Math.PI * j) / 7;
    const [x, y, z] = [0.42 * Math.cos(u), 0.42 * Math.sin(u), 0];
    const [x1, y1, z1] = [x, y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
    const [x2, z2] = [x1 * Math.cos(ry) + z1 * Math.sin(ry), -x1 * Math.sin(ry) + z1 * Math.cos(ry)];
    return { x: x2, y: y1 + 0.255, z: 0.08 + 0.7 * z2 };
  });
  corners.forEach((c) => near(c.y, 0.255, 1e-9, 'lying flat'));
  for (let i = 0; i < 7; i++) {
    const [hx, , hz] = hemVertex(i);
    const nearest = Math.min(...corners.map((c) => Math.hypot(c.x - hx, c.z - hz)));
    assert.ok(nearest < 0.02, `hem vertex ${i} has a corner ${nearest} away`);
  }
});

test('the collar: a 7-sided open cone at the neck, double-sided', () => {
  const { body, fresh } = look();
  const collar = fresh.find((c) => c.geometry instanceof THREE.ConeGeometry && c.geometry.params[2] === 7);
  assert.deepEqual(collar.geometry.params, [0.2, 0.14, 7, 1, true]);
  assert.equal(hex(collar), '#7a1219');
  assert.equal(collar.material.side, THREE.DoubleSide);
  nearAll(place(collar), [0, 1.02, 0.04]);
  assert.equal(collar.parent, body);
});

test('the hood seam runs from A to B, and the pompom sits at the hood tip', () => {
  const { fresh } = look();
  const seam = fresh.find((c) => c.geometry instanceof THREE.BoxGeometry && c.geometry.params[0] === 0.03);
  assert.deepEqual(seam.geometry.params, [0.03, 0.03, 1]);
  assert.equal(hex(seam), '#8f1820');
  const A = [0, 1.365, 0.17], B = [0, 1.12, 0.43];
  const len = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
  near(seam.scale.z, len, 1e-9, 'as long as A to B');
  assert.deepEqual([seam.scale.x, seam.scale.y], [1, 1]);
  const { x: rx, y: ry } = seam.rotation; // a unit z, turned about x then y (order YXZ)
  const dir = [Math.cos(rx) * Math.sin(ry), -Math.sin(rx), Math.cos(rx) * Math.cos(ry)];
  const c = place(seam);
  nearAll(c.map((v, i) => v - (dir[i] * len) / 2), A, 0.02, 'end A');
  nearAll(c.map((v, i) => v + (dir[i] * len) / 2), B, 0.02, 'end B');

  const pompom = fresh.find((o) => o.geometry instanceof THREE.IcosahedronGeometry && o.geometry.params[0] === 0.05);
  assert.deepEqual(pompom.geometry.params, [0.05, 0]);
  assert.equal(hex(pompom), '#f2e3b8');
  nearAll(place(pompom), [0, 1.11, 0.44]);
});

test('span is in parts.js and still importable from stage-helpers', () => {
  assert.equal(stageSpan, span);
  const bar = new THREE.Group();
  span(bar, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -2 });
  assert.deepEqual([bar.position.z, bar.scale.z], [-1, 2]);
});

test('two shoulder caps in the hood colour, not joined to the arms', () => {
  for (const hood of [undefined, '#224466']) {
    const { fresh, rig } = look(hood ? { hood } : {});
    const caps = fresh.filter((c) => c.geometry instanceof THREE.IcosahedronGeometry && c.geometry.params[0] === 0.09);
    assert.equal(caps.length, 2);
    for (const cap of caps) {
      assert.deepEqual(cap.geometry.params, [0.09, 0]);
      assert.equal(hex(cap), hood ?? '#b3202a');
      assert.notEqual(cap.parent, rig);
    }
    assert.deepEqual(caps.map(place).map((p) => p.map((v) => +v.toFixed(9))).sort((a, b) => a[0] - b[0]), [[-0.22, 0.98, -0.02], [0.22, 0.98, -0.02]]);
  }
});

test('the satchel on the right hip, with its flap, at z 0.37', () => {
  const { fresh } = look();
  const boxes = fresh.filter((c) => c.geometry instanceof THREE.BoxGeometry);
  const bag = boxes.find((c) => c.geometry.params[1] === 0.26);
  const flap = boxes.find((c) => c.geometry.params[1] === 0.1);
  assert.deepEqual(bag.geometry.params, [0.22, 0.26, 0.1]);
  assert.deepEqual(flap.geometry.params, [0.22, 0.1, 0.11]);
  assert.equal(hex(bag), '#6b4a2b');
  assert.equal(hex(flap), '#8a5d33');
  nearAll(place(bag), [0.22, 0.45, 0.37]);
  nearAll(place(flap), [0.22, 0.55, 0.37]);
  assert.ok(place(bag)[0] > 0, 'on the right (+x)');
});

test('nothing else is added: no hair, strap, foot, sole or cuff, nothing below y 0.14, and the legs are as before', () => {
  const { fresh, body, ofType } = look();
  // 7 hem points, the trim's group, the collar, the seam, the pompom, 2 caps, the satchel and its flap.
  assert.equal(fresh.length, 7 + 1 + 1 + 1 + 1 + 2 + 2);
  assert.equal(ofType(THREE.ConeGeometry).length, 8);
  assert.equal(ofType(THREE.BoxGeometry).length, 3);
  assert.equal(ofType(THREE.IcosahedronGeometry).length, 3);
  assert.equal(ofType(THREE.CylinderGeometry).length, 0, 'no limb-like part: no foot, sole, cuff or strap');
  const meshes = [];
  fresh.forEach((c) => c.traverse((m) => m instanceof THREE.Mesh && meshes.push(m)));
  for (const m of meshes) {
    const y = m.position.y + (m.parent === body ? 0 : m.parent.position.y) + WAIST;
    const halfHeight = m.geometry instanceof THREE.ConeGeometry && m.geometry.params[2] === 3 ? 0.06 : 0;
    assert.ok(y - halfHeight >= 0.14 - 1e-9, `${m.geometry.constructor.name} at y ${y}`);
  }
  const legs = body.children.slice(0, 2);
  legs.forEach((leg, i) => {
    assert.deepEqual(leg.geometry.params, [0.09, 0.08, 0.45, 5]);
    assert.equal(hex(leg), '#2e2420');
    nearAll(place(leg), [i ? 0.12 : -0.12, 0.22, 0]);
    assert.equal(leg.children.length, 0);
  });
  assert.deepEqual(body.children.slice(2, 8).map((c) => c.geometry.constructor), [
    THREE.CylinderGeometry, THREE.TorusGeometry, THREE.ConeGeometry, THREE.IcosahedronGeometry, THREE.IcosahedronGeometry, THREE.ConeGeometry,
  ]);
});

test('every new part is a child of the body and none is in the aim rig or a leg', () => {
  const { fresh, body, rig } = look();
  assert.ok(fresh.every((c) => c.parent === body));
  assert.equal(rig.parent, body);
  // the rig holds what it held: two arms, the guns' group and the flash
  assert.equal(rig.children.length, 4);
  assert.ok(body.children.slice(0, 2).every((leg) => leg.children.length === 0));
});

test('the walk, the dodge and the aim turn are as before, and the new parts stay still', () => {
  const root = buildPlayer();
  const { body, rig, flash, tick } = root.userData;
  const fresh = body.children.slice(8, body.children.indexOf(rig));
  const still = () => JSON.stringify(fresh.map((c) => [c.position, c.rotation, c.scale]));
  const before = still();
  tick(0.5, { walk: 1, roll: 0.3, dir: -1, weapon: 'scattergun', yaw: 0.4, pitch: -0.2 });
  const [l, r] = body.children;
  near(l.rotation.x, Math.sin(0.5 * 12) * 0.5);
  near(r.rotation.x, -Math.sin(0.5 * 12) * 0.5);
  assert.equal(rig.rotation.y, 0.4);
  assert.equal(rig.rotation.x, -0.2);
  assert.ok(body.rotation.z !== 0 && body.position.y !== 0.6, 'the roll turns the body');
  assert.equal(flash.parent, rig);
  assert.equal(still(), before, 'no new part moves on its own');
  tick(0, {});
  assert.equal(l.rotation.x, 0);
  assert.equal(still(), before);
});

test('the model parameters colour and size the hero as before; only the caps follow the hood', () => {
  const colours = { hood: '#111111', cape: '#222222', skin: '#333333', tunic: '#444444', boots: '#555555', gun: '#666666' };
  const plain = look();
  const custom = look({ ...colours, size: 2 });
  assert.equal(custom.root.scale.x, 2);
  assert.equal(plain.root.scale.x, 1);
  const [legs, tunic, , cape, skin, hood, tip] = [custom.body.children.slice(0, 2), ...custom.body.children.slice(2, 8)];
  assert.deepEqual(legs.map(hex), ['#555555', '#555555']);
  assert.deepEqual([tunic, cape, skin, hood, tip].map(hex), ['#444444', '#222222', '#333333', '#111111', '#111111']);
  const fixed = (l) => l.fresh.map((c) => (c instanceof THREE.Mesh ? hex(c) : c.children.map(hex).join()));
  const caps = (l) => l.fresh.filter((c) => c.geometry?.params?.[0] === 0.09);
  assert.deepEqual(caps(custom).map(hex), ['#111111', '#111111']);
  assert.deepEqual(fixed(custom).filter((_, i) => ![11, 12].includes(i)), fixed(plain).filter((_, i) => ![11, 12].includes(i)));
  assert.deepEqual(caps(plain).map(hex), ['#b3202a', '#b3202a']);
});

test('the hero is not pickable: rays never get the hero or its parts', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  const offered = [];
  const cast = THREE.Raycaster.prototype.intersectObjects;
  THREE.Raycaster.prototype.intersectObjects = function (objects, ...rest) { offered.push(...objects); return cast.call(this, objects, ...rest); };
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  stage.sync(game, 0.01);
  stage.aimAt({ x: 0, y: 0 });
  const hero = renderer.scene.children.find((c) => c.userData.rig);
  assert.ok(hero && hero.userData.entityId == null);
  const inHero = (o) => { let hit = false; hero.traverse((m) => { if (m === o) hit = true; }); return hit; };
  assert.ok(offered.length > 0);
  assert.ok(!offered.some(inHero));
});

test('the new file is under 200 lines, and so is player.js, which is at most 6 lines longer', () => {
  const lines = (f) => readFileSync(new URL(`../src/view/models/${f}`, import.meta.url), 'utf8').split('\n').length;
  assert.ok(lines('hero-details.js') < 200);
  assert.ok(lines('player.js') <= 112 + 6); // 112 (with the trailing newline) before this spec
});
