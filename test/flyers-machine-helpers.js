// Spec 42: what the crow and bat model tests share.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './fake-three.js';

export const hex = (color) => `#${color.getHexString()}`;
export const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
export const named = (root, name) => all(root, (o) => o.name === name);
export const sprites = (root) => all(root, (o) => o instanceof THREE.Sprite);
export const hittable = (root) => all(root, (o) => o instanceof THREE.Mesh && !Object.hasOwn(o, 'raycast'));
export const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
export const at = (o, x, y, z) => near(o.position.x, x) && near(o.position.y, y) && near(o.position.z, z);
export const lines = (file) => readFileSync(new URL(file, import.meta.url), 'utf8').split('\n').length;

// A part's whole transform and geometry: position, rotation, scale and the geometry's parameters.
export function pose(o, params, position, rotation = [0, 0, 0], scale = [1, 1, 1]) {
  if (params) assert.deepEqual(o.geometry.params.slice(0, params.length), params);
  const got = (v) => [v.x, v.y, v.z];
  for (const [what, a, b] of [['position', got(o.position), position], ['rotation', got(o.rotation), rotation], ['scale', got(o.scale), scale]]) {
    assert.ok(a.every((v, i) => near(v, b[i])), `${what} ${a} ≈ ${b}`);
  }
}

export function checkGlows(head, eyes, color, size) {
  const glows = sprites(head);
  assert.equal(glows.length, 2);
  for (const eye of eyes) {
    const g = glows.find((s) => near(s.position.x, eye.position.x));
    assert.ok(g, 'a glow at the eye');
    assert.ok(at(g, eye.position.x, eye.position.y, eye.position.z + 0.01), 'in front of the eye');
    assert.equal(g.parent, head);
    assert.equal(hex(g.material.color), color);
    assert.equal(g.material.transparent, true);
    assert.equal(g.material.opacity, 0.6);
    assert.equal(g.material.blending, THREE.AdditiveBlending);
    assert.equal(g.material.depthWrite, false);
    assert.deepEqual([g.scale.x, g.scale.y, g.scale.z], [size, size, 1]);
    assert.ok(Object.hasOwn(g, 'raycast'), 'ignores rays');
    assert.ok(g.material instanceof THREE.SpriteMaterial);
  }
}
