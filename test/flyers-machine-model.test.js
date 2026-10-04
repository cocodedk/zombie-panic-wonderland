// Spec 42: the machine crow model (against test/fake-three.js); the bat is in flyers-machine-bat.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { hex, hittable, near, at, pose, checkGlows } from './flyers-machine-helpers.js';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { buildCrow } = await import('../src/view/models/crow.js');

describe('the machine crow', () => {
  const crow = buildCrow();
  const head = crow.children[1];
  const eyes = head.children.filter((c) => c.material instanceof THREE.MeshBasicMaterial);
  const wings = crow.children.slice(3, 5);

  test('new default colours, and colours passed still apply', () => {
    const colours = (c) => [hex(c.children[0].material.color), hex(c.children[1].children[1].material.color), hex(c.children[1].children[2].material.color)];
    assert.deepEqual(colours(crow), ['#2c3038', '#e0a838', '#ff3b1a']);
    assert.deepEqual(colours(buildCrow({ feathers: '#111111', beak: '#222222', eyes: '#333333' })), ['#111111', '#222222', '#333333']);
  });

  test('each eye has a red glow of 0.14, 0.01 in front of it, in the head', () => {
    assert.equal(eyes.length, 2);
    checkGlows(head, eyes, '#ff3b1a', 0.14);
    checkGlows(buildCrow({ eyes: '#00ff00' }).children[1], eyes, '#00ff00', 0.14);
  });

  test('a brass rod on each wing feather, turning with it', () => {
    for (const wing of wings) {
      const [feather] = wing.children;
      assert.equal(feather.children.length, 1);
      const [rod] = feather.children;
      assert.deepEqual(rod.geometry.params, [0.7, 0.03, 0.03]);
      assert.equal(hex(rod.material.color), '#e0a838');
      assert.ok(at(rod, 0, 0.02, 0.16));
      assert.ok(Object.hasOwn(rod, 'raycast'));
      assert.equal(rod.parent, feather);
      assert.equal(feather.parent, wing);
    }
  });

  test('a gear of 8 sides on its back that does not turn', () => {
    const c = buildCrow();
    const gear = c.children.at(-1);
    assert.ok(gear.geometry instanceof THREE.CylinderGeometry);
    assert.deepEqual(gear.geometry.params, [0.06, 0.06, 0.02, 8]);
    assert.equal(hex(gear.material.color), '#34373d');
    pose(gear, undefined, [0, 0.205, 0]);
    assert.ok(Object.hasOwn(gear, 'raycast'));
    assert.equal(gear.parent, c);
    c.userData.tick(0.4, { diving: 0 });
    pose(gear, undefined, [0, 0.205, 0]);
  });

  test('every mesh it had keeps its geometry, place and rotation, and only those can be hit', () => {
    const c = buildCrow();
    assert.equal(hittable(c).length, 10);
    const [body, headGroup, tail, left, right, gear] = c.children;
    assert.equal(c.children.length, 6);
    assert.ok(gear);
    pose(body, [0.28, 0], [0, 0, 0], [0, 0, 0], [0.8, 0.7, 1.4]);
    pose(headGroup, undefined, [0, 0.1, 0.38]);
    const [skull, beak, ...eyeMeshes] = headGroup.children;
    pose(skull, [0.16, 0], [0, 0, 0]);
    pose(beak, [0.06, 0.24, 4], [0, -0.02, 0.2], [Math.PI / 2, 0, 0]);
    pose(eyeMeshes[0], [0.04, 0.04, 0.02], [-0.08, 0.05, 0.1]);
    pose(eyeMeshes[1], [0.04, 0.04, 0.02], [0.08, 0.05, 0.1]);
    assert.equal(headGroup.children.length, 4 + 2);
    pose(tail, [0.16, 0.4, 3], [0, 0, -0.45], [-Math.PI / 2, 0, 0], [1, 0.3, 1]);
    [left, right].forEach((wing, i) => {
      const side = [-1, 1][i];
      const [feather, tip] = wing.children;
      pose(wing, undefined, [side * 0.12, 0, 0]);
      pose(feather, [0.7, 0.04, 0.34], [side * 0.38, 0, 0], [0, side * 0.2, 0]);
      pose(tip, [0.15, 0.4, 3], [side * 0.85, 0, -0.08], [0, 0, side * Math.PI / 2]);
      assert.equal(wing.children.length, 2);
    });
  });

  test('the wings beat and dive as before; the rods go with them', () => {
    for (const seed of [0, 3]) {
      const c = buildCrow({ seed });
      const [l, r] = c.children.slice(3, 5);
      for (const t of [0, 0.2, 1.1]) {
        c.userData.tick(t);
        assert.ok(near(l.rotation.z, -Math.sin(t * 14 + seed) * 0.7));
        assert.ok(near(r.rotation.z, Math.sin(t * 14 + seed) * 0.7));
        c.userData.tick(t, { diving: 1 });
        assert.ok(near(l.rotation.z, 0.9) && near(r.rotation.z, -0.9));
        assert.ok(l.children[0].children[0].parent.parent === l, 'the rod hangs from the feather on the wing');
      }
    }
  });
});
