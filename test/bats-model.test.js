// Spec 32: the bat model (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { buildBat } = await import('../src/view/models/bat.js');

const hex = (color) => `#${color.getHexString()}`;
const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const named = (root, name) => all(root, (o) => o.name === name);
const meshes = (root) => all(root, (o) => o instanceof THREE.Mesh);
const close = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} ≈ ${b}`);

describe('4. the model', () => {
  const bat = buildBat();
  const one = (name) => named(bat, name)[0];

  test('a small body, an icosahedron of radius 0.12, and a head in front of it', () => {
    assert.ok(one('body').geometry instanceof THREE.IcosahedronGeometry);
    assert.deepEqual(one('body').geometry.params, [0.12, 0]);
    assert.equal(hex(one('body').material.color), '#34373d');
    assert.equal(one('body').material.flatShading, true);
    assert.ok(one('head').position.z > 0, 'facing +z');
    assert.equal(bat.name, 'bat');
  });

  test('two pointed ears on the head, two unlit red eyes and two fangs, in front', () => {
    const ears = named(bat, 'ear');
    assert.equal(ears.length, 2);
    for (const e of ears) {
      assert.ok(e.geometry instanceof THREE.ConeGeometry);
      assert.deepEqual(e.geometry.params.slice(0, 2), [0.03, 0.08]);
      assert.equal(hex(e.material.color), '#e0a838');
      assert.ok(e.position.y > 0.05, 'on top of the head');
    }
    const eyes = named(bat, 'eye');
    assert.equal(eyes.length, 2);
    for (const e of eyes) {
      assert.ok(e.material instanceof THREE.MeshBasicMaterial);
      assert.equal(hex(e.material.color), '#ff2a1a');
      assert.ok(e.position.z > 0, 'in front');
    }
    const fangs = named(bat, 'fang');
    assert.equal(fangs.length, 2);
    for (const f of fangs) {
      assert.equal(hex(f.material.color), '#e8e0c8');
      assert.ok(f.position.y < 0, 'below the eyes');
    }
    assert.equal(meshes(one('head')).length, 1 + 2 + 2 + 2);
  });

  test('two wings, each a flat fan of three triangles from the shoulder, about 0.5 long', () => {
    const wings = named(bat, 'wing');
    assert.equal(wings.length, 2);
    assert.deepEqual(wings.map((w) => Math.sign(w.position.x)).sort(), [-1, 1]);
    for (const wing of wings) {
      const side = Math.sign(wing.position.x);
      const [fan] = meshes(wing);
      const points = fan.geometry.attributes.position.array;
      const xs = points.filter((_, i) => i % 3 === 0).map((x) => x * side);
      assert.equal(points.length, 3 * 3 * 3, 'three triangles');
      assert.deepEqual([0, 1, 2].map((t) => points.slice(t * 9, t * 9 + 3)), Array(3).fill([0, 0, 0]), 'each from the shoulder');
      for (let i = 2; i < points.length; i += 3) assert.equal(points[i], 0, 'flat, in the plane the bat faces');
      const ys = points.filter((_, i) => i % 3 === 1);
      assert.ok(Math.max(...ys) - Math.min(...ys) > 0.3, 'a fan seen from the front, not edge-on');
      assert.ok(Math.max(...xs) >= 0.45 && Math.max(...xs) <= 0.55, `${Math.max(...xs)} long`);
      assert.ok(xs.every((x) => x >= 0), 'out from the shoulder');
      assert.equal(hex(fan.material.color), '#7a808a');
      assert.equal(fan.material.side, THREE.DoubleSide);
    }
  });

  test('about 1.1 across with the wings out', () => {
    const xs = [];
    for (const wing of named(bat, 'wing')) {
      const points = meshes(wing)[0].geometry.attributes.position.array;
      for (let i = 0; i < points.length; i += 3) xs.push(wing.position.x + points[i]);
    }
    const across = Math.max(...xs) - Math.min(...xs);
    assert.ok(across > 1 && across < 1.2, `${across} across`);
    assert.equal(buildBat({ size: 2 }).scale.x, 2);
  });

  test('the wings beat at sin(t × 18 + seed) × 0.9, mirrored, whether it circles or dives', () => {
    for (const seed of [0, 4, 9.5]) {
      const b = buildBat({ seed });
      const [left, right] = named(b, 'wing');
      for (const t of [0, 0.1, 0.37, 1.2, 5]) {
        for (const options of [undefined, { diving: 0 }, { diving: 1 }]) {
          b.userData.tick(t, options);
          const beat = Math.sin(t * 18 + seed) * 0.9;
          close(left.rotation.z, -beat, `seed ${seed} t ${t}`);
          close(right.rotation.z, beat, `seed ${seed} t ${t}`);
          assert.ok(Math.abs(right.rotation.z) <= 0.9 + 1e-9);
        }
      }
    }
  });
});
