// Spec 29: the spider model and its gait (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { buildSpider } = await import('../src/view/models/spider.js');

const hex = (color) => `#${color.getHexString()}`;
const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const named = (root, name) => all(root, (o) => o.name === name);
const meshes = (root) => all(root, (o) => o instanceof THREE.Mesh);
const ignores = (m) => Object.hasOwn(m, 'raycast');

describe('5. the model', () => {
  const spider = buildSpider();
  const [abdomen] = named(spider, 'abdomen');
  const [head] = named(spider, 'cephalothorax');

  test('a body of an abdomen and a smaller cephalothorax, standing 0.3 above the ground', () => {
    assert.deepEqual(abdomen.geometry.params, [0.28, 0]);
    assert.ok(abdomen.geometry instanceof THREE.IcosahedronGeometry);
    assert.deepEqual([abdomen.scale.x, abdomen.scale.y, abdomen.scale.z], [1, 0.8, 1.2]);
    assert.equal(hex(abdomen.material.color), '#2a1f2e');
    assert.deepEqual(head.geometry.params, [0.17, 0]);
    assert.equal(hex(head.material.color), '#3a2c3f');
    assert.equal(abdomen.position.y, 0.3);
    assert.equal(head.position.y, 0.3);
    assert.ok(abdomen.position.z < head.position.z, 'the abdomen is behind');
    assert.ok(head.position.z > 0, 'facing +z');
  });

  test('a red hourglass of two cones tip to tip on the abdomen\'s back', () => {
    const cones = named(spider, 'hourglass');
    assert.equal(cones.length, 2);
    for (const c of cones) {
      assert.ok(c.geometry instanceof THREE.ConeGeometry);
      assert.equal(hex(c.material.color), '#c0182b');
      assert.ok(c.position.y > abdomen.position.y, 'on the back');
    }
    const tips = cones.map((c) => c.position.z + Math.sign(c.rotation.x) * 0.05); // each apex points along its rotation
    assert.ok(Math.abs(tips[0] - tips[1]) < 1e-9, 'tip to tip');
    assert.ok(cones[0].position.z !== cones[1].position.z);
  });

  test('eight unlit red eyes in two rows of four, and two cream fangs', () => {
    const eyes = named(spider, 'eye');
    assert.equal(eyes.length, 8);
    for (const e of eyes) {
      assert.ok(e.geometry instanceof THREE.BoxGeometry);
      assert.deepEqual(e.geometry.params, [0.03, 0.03, 0.03]);
      assert.ok(e.material instanceof THREE.MeshBasicMaterial);
      assert.equal(hex(e.material.color), '#ff2a1a');
    }
    const rows = new Set(eyes.map((e) => e.position.y));
    assert.equal(rows.size, 2);
    for (const y of rows) assert.equal(eyes.filter((e) => e.position.y === y).length, 4);
    const fangs = named(spider, 'fang');
    assert.equal(fangs.length, 2);
    for (const f of fangs) {
      assert.ok(f.geometry instanceof THREE.ConeGeometry);
      assert.deepEqual(f.geometry.params.slice(0, 2), [0.02, 0.08]);
      assert.equal(hex(f.material.color), '#e8e0c8');
    }
  });

  test('eight legs of two segments each, radius 0.025, 0.32 and 0.38 long, in the body colour', () => {
    const legs = named(spider, 'leg');
    assert.equal(legs.length, 8);
    for (const leg of legs) {
      const segments = meshes(leg);
      assert.equal(segments.length, 2);
      assert.deepEqual(segments.map((s) => s.geometry.params.slice(0, 3)), [[0.025, 0.025, 0.32], [0.025, 0.025, 0.38]]);
      for (const s of segments) assert.equal(hex(s.material.color), '#2a1f2e');
    }
    assert.equal(legs.filter((l) => l.position.x > 0).length, 4);
    assert.equal(legs.filter((l) => l.position.x < 0).length, 4);
    assert.ok(legs.every((l) => l.position.y === 0.3), 'pivoting at the body');
  });

  // A foot is the lower segment's far end, in the leg's frame turned by its side and yaw.
  const foot = (leg) => {
    const [segments] = leg.children;
    const [, lower] = segments.children;
    const ox = Math.cos(lower.rotation.z + Math.PI / 2) * (0.38 / 2); // from the lower segment's middle to its foot
    const oy = Math.sin(lower.rotation.z + Math.PI / 2) * (0.38 / 2);
    return {
      x: leg.position.x + (lower.position.x + ox) * Math.cos(segments.rotation.y),
      y: leg.position.y + lower.position.y + oy,
      knee: leg.position.y + lower.position.y - oy,
    };
  };

  test('the whole span is about 0.9 across', () => {
    const feet = named(spider, 'leg').map((leg) => foot(leg).x);
    const span = Math.max(...feet) - Math.min(...feet);
    assert.ok(span > 0.8 && span < 1, `span ${span}`);
  });

  test('every foot stands on the ground, and the knee is above it', () => {
    for (const leg of named(spider, 'leg')) {
      assert.ok(Math.abs(foot(leg).y) < 1e-9, `foot at y = ${foot(leg).y}`);
      assert.ok(foot(leg).knee > 0.3, 'the knee is above the hip');
    }
  });

  test('an invisible sphere of radius 0.45 at the body\'s centre takes the aim; everything else ignores rays', () => {
    const [hit] = named(spider, 'hit');
    assert.ok(hit.geometry instanceof THREE.SphereGeometry);
    assert.equal(hit.geometry.params[0], 0.45);
    assert.ok(hit.material instanceof THREE.MeshBasicMaterial);
    assert.equal(hit.material.visible, false);
    assert.equal(hit.visible, false);
    assert.equal(hit.position.y, 0.3);
    assert.ok(Math.abs(hit.position.z) < 0.35);
    assert.ok(!ignores(hit));
    assert.equal(meshes(spider).filter((m) => !ignores(m)).length, 1);
  });

  // The fake Raycaster ignores the ray's direction, so shots are traced here: the meshes that take rays
  // (only the sphere) are met analytically along the line, the others (`ignoreRays`) never.
  const firstHit = (root, o, dir) => {
    const len = Math.hypot(dir.x, dir.y, dir.z);
    const d = { x: dir.x / len, y: dir.y / len, z: dir.z / len };
    const hits = meshes(root).filter((m) => !ignores(m)).flatMap((m) => {
      assert.ok(m.geometry instanceof THREE.SphereGeometry, 'only the sphere takes rays');
      const c = [m.position.x - o.x, m.position.y - o.y, m.position.z - o.z];
      const b = c[0] * d.x + c[1] * d.y + c[2] * d.z;
      const disc = b * b - (c[0] ** 2 + c[1] ** 2 + c[2] ** 2 - m.geometry.params[0] ** 2);
      return disc >= 0 && b + Math.sqrt(disc) >= 0 ? [m] : [];
    });
    return hits[0] ?? null;
  };
  const toward = { x: 0, y: 0, z: -1 };

  test('a shot through the sphere hits the spider', () => {
    const [hit] = named(spider, 'hit');
    for (const [x, y] of [[0, 0.3], [0.3, 0.3], [-0.4, 0.35], [0, 0.6], [0, 0.0]]) {
      assert.equal(firstHit(spider, { x, y, z: 6 }, toward), hit, `at (${x}, ${y})`);
    }
    // From high in front and to the side, down at the body's centre (0, 0.3, -0.1).
    assert.equal(firstHit(spider, { x: 0.5, y: 3, z: 8 }, { x: -0.5 / 8.1, y: -2.7 / 8.1, z: -1 }), hit);
    // The same line, a metre to the side of it, misses.
    assert.equal(firstHit(spider, { x: 1.5, y: 3, z: 8 }, { x: -0.5 / 8.1, y: -2.7 / 8.1, z: -1 }), null);
  });

  test('a shot through only a leg misses', () => {
    const [hit] = named(spider, 'hit');
    for (const leg of named(spider, 'leg')) {
      const { x, y } = foot(leg);
      assert.ok(Math.hypot(x - hit.position.x, y - hit.position.y) > 0.45, 'the foot is outside the sphere');
      assert.equal(firstHit(spider, { x, y: y + 0.01, z: 6 }, toward), null);
      assert.equal(firstHit(spider, { x: x * 0.9, y: (y + 0.01) * 0.9, z: 6 }, toward), null);
    }
  });

  test('size scales the whole model, and the model is flat-lit without textures', () => {
    assert.equal(buildSpider({ size: 2 }).scale.x, 2);
    assert.equal(spider.scale.x, 1);
    for (const m of meshes(spider)) {
      assert.equal(m.material.map, undefined);
      if (m.material instanceof THREE.MeshStandardMaterial) assert.equal(m.material.flatShading, true);
    }
  });
});

