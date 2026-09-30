// Spec 21, on the stage (against test/fake-three.js): what is built for each level's sky — the
// clouds and the crescent — where it is, that it is the same each time, and the crescent's outline.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level2 } from '../src/levels/level-2.js';
import { TABLE, THREE, setUp, backdropOf, skyIn, hex } from './sky-helpers.js';

const skyFor = (n) => skyIn(setUp({ level: TABLE[n].level }).draw());
const puffsOf = (cloud) => cloud.children;

// A unit icosahedron's corners are on a sphere of radius 1, but along an axis it reaches only 0.8507
// (the golden ratio over its root of one plus its square): a puff's mesh edge is that far from its centre.
const REACH = 0.850651;

// The row runs 4 to 9 units from its first puff's mesh edge to its last's, and each puff overlaps the next.
function assertJoined(cloud) {
  const puffs = [...puffsOf(cloud)].sort((a, b) => a.position.x - b.position.x);
  const row = Math.max(...puffs.map((p) => p.position.x + REACH * p.scale.x)) - Math.min(...puffs.map((p) => p.position.x - REACH * p.scale.x));
  assert.ok(row >= 4 - 1e-5 && row <= 9 + 1e-5, `a row of ${row}`);
  puffs.slice(1).forEach((p, i) => {
    const q = puffs[i];
    const gap = Math.hypot(p.position.x - q.position.x, p.position.y - q.position.y);
    assert.ok(gap < REACH * (p.scale.x + q.scale.x), `puffs ${gap} apart, reaching ${REACH * p.scale.x} and ${REACH * q.scale.x}`);
  });
}

// Every mesh of the cloud, edge to edge, lies inside the ranges: x -70 to 70, y 16 to 38, z -110 to -60.
function assertPlaced(cloud) {
  for (const p of puffsOf(cloud)) {
    for (const [axis, lo, hi] of [['x', -70, 70], ['y', 16, 38], ['z', -110, -60]]) {
      const at = cloud.position[axis] + p.position[axis];
      const reach = REACH * p.scale[axis];
      assert.ok(at - reach >= lo - 1e-9 && at + reach <= hi + 1e-9, `${axis}: ${at - reach} to ${at + reach}`);
    }
  }
}

describe('1. what is built', () => {
  test('each level makes 21 clouds of 3 to 5 flattened icosahedrons in a row 4 to 9 units long', () => {
    for (const n of [1, 2]) {
      const { clouds } = skyFor(n);
      assert.equal(clouds.length, 21);
      const materials = new Set();
      for (const cloud of clouds) {
        const puffs = puffsOf(cloud);
        assert.ok(puffs.length >= 3 && puffs.length <= 5, `${puffs.length} puffs`);
        for (const p of puffs) {
          assert.ok(p.geometry instanceof THREE.IcosahedronGeometry);
          assert.deepEqual(p.geometry.params, [1, 0]);
          assert.ok(Math.abs(p.scale.y - 0.6 * p.scale.x) < 1e-9, 'squashed to 60% in y');
          assert.ok(p.material instanceof THREE.MeshBasicMaterial && p.material.fog === false, 'unlit, no fog');
          assert.equal(p.material, puffs[0].material, 'one material a cloud');
        }
        assertJoined(cloud);
        materials.add(puffs[0].material);
      }
      assert.equal(materials.size, 21, 'a material for each cloud');
    }
  });

  test('the puffs are joined: neighbours overlap, and the row is 4 to 9 units long, edge to edge', async () => {
    const { buildCloud } = await import('../src/view/models/sky-details.js');
    const { seeded } = await import('../src/view/models/parts.js');
    const counts = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      const cloud = buildCloud(seeded(seed));
      counts.add(cloud.children.length);
      assertJoined(cloud);
    }
    assert.deepEqual([...counts].sort(), [3, 4, 5]);
  });

  test('they are spread x -70 to 70, y 16 to 38, z -110 to -60, none nearer than z -60', () => {
    for (const n of [1, 2]) {
      const { clouds } = skyFor(n);
      clouds.forEach(assertPlaced);
      assert.ok(new Set(clouds.map((c) => c.position.x)).size === 21, 'not in one place');
    }
  });

  test('they are the same every time, and differ from level to level', () => {
    const look = (sky) => sky.clouds.map((c) => [c.position.x, c.position.y, c.position.z, c.userData.speed, c.userData.shift, c.children.length]);
    assert.deepEqual(look(skyFor(1)), look(skyFor(1)));
    assert.deepEqual(look(skyFor(2)), look(skyFor(2)));
    assert.notDeepEqual(look(skyFor(1)), look(skyFor(2)));
  });

  test('the shifts differ, at least 5 of them among the 21, within 0 to 25% of the cycle', () => {
    for (const n of [1, 2]) {
      const shifts = skyFor(n).clouds.map((c) => c.userData.shift);
      assert.ok(new Set(shifts).size >= 5);
      assert.ok(shifts.every((s) => s >= 0 && s <= 0.25));
    }
  });

  test('one crescent at the level\'s place and radius, unlit and unfogged, tilted 0.35, facing the camera', () => {
    for (const [n, r, at] of [[1, 3, [-20, 22, -75]], [2, 4, [18, 26, -70]]]) {
      const { moon } = skyFor(n);
      const meshes = [];
      backdropOf(setUp({ level: TABLE[n].level }).draw()).traverse((o) => { if (o.name === 'crescent') meshes.push(o); });
      assert.equal(meshes.length, 1, 'one only');
      assert.deepEqual([moon.position.x, moon.position.y, moon.position.z], at);
      assert.ok(moon.geometry instanceof THREE.ShapeGeometry);
      assert.ok(moon.material instanceof THREE.MeshBasicMaterial && moon.material.fog === false);
      assert.equal(moon.rotation.z, 0.35);
      assert.equal(moon.geometry.params[0].arcs[0].radius, r, 'the disc\'s radius');
    }
  });

  test('its Shape is one closed outline, no holes: x from -r to 0.5333 r, 0.6 r thick, tips at y = +-0.8459 r', () => {
    for (const [n, r] of [[1, 3], [2, 4]]) {
      const shape = skyFor(n).moon.geometry.params[0];
      assert.ok(shape instanceof THREE.Shape);
      assert.equal(shape.holes.length, 0);
      assert.equal(shape.arcs.length, 2, 'the outer arc and the bite\'s');
      const pts = shape.getPoints();
      assert.ok(Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) < 1e-9, 'closed');
      const near = (a, b) => Math.abs(a - b) < 1e-3 * r;
      assert.ok(near(Math.min(...pts.map((p) => p.x)), -r));
      assert.ok(near(Math.max(...pts.map((p) => p.x)), 0.5333 * r));
      const { radius, to } = shape.arcs[0]; // the outer arc ends at the lower tip; the outline starts at the upper
      assert.ok(near(pts[0].x, 0.5333 * r) && near(pts[0].y, 0.8459 * r), 'the upper tip');
      assert.ok(near(radius * Math.cos(to), 0.5333 * r) && near(radius * Math.sin(to), -0.8459 * r), 'the lower tip');
      assert.ok(near(Math.max(...pts.map((p) => p.y)), r), 'the outer arc rises to the top of the disc');
      const middle = pts.filter((p) => Math.abs(p.y) < 1e-9).map((p) => p.x).sort((a, b) => a - b);
      assert.equal(middle.length, 2);
      assert.ok(near(middle[0], -r) && near(middle[1], -0.4 * r), 'through (-r, 0) and (-0.4 r, 0)');
      assert.ok(near(middle[1] - middle[0], 0.6 * r), '0.6 r thick');
    }
  });

  test('level 2\'s scenery no longer has a moon, and level 2\'s backdrop builds none', () => {
    assert.ok(!level2.scenery.some((s) => s.model === 'moon'));
    assert.ok(!backdropOf(setUp({ level: TABLE[2].level }).draw()).children.some((c) => c.name === 'moon'));
    assert.equal(hex(skyFor(2).moon.material.color), '#e8ecd1');
  });
});
