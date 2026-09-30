// Spec 31: the wolf model and its gait (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { buildWolf } = await import('../src/view/models/wolf.js');

const hex = (color) => `#${color.getHexString()}`;
const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const named = (root, name) => all(root, (o) => o.name === name);
const meshes = (root) => all(root, (o) => o instanceof THREE.Mesh);
const ignores = (m) => Object.hasOwn(m, 'raycast');
const close = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} ≈ ${b}`);

describe('5. the model', () => {
  const wolf = buildWolf();
  const one = (name) => named(wolf, name)[0];

  test('a torso 0.4 × 0.4 × 0.8 and a lighter chest patch', () => {
    assert.ok(one('torso').geometry instanceof THREE.BoxGeometry);
    assert.deepEqual(one('torso').geometry.params.slice(0, 3), [0.4, 0.4, 0.8]);
    assert.equal(hex(one('torso').material.color), '#6e6e78');
    assert.equal(hex(one('chest').material.color), '#9a9aa4');
  });

  test('a head 0.26 × 0.24 × 0.3 with a cone snout, in front', () => {
    assert.deepEqual(one('head').geometry.params.slice(0, 3), [0.26, 0.24, 0.3]);
    const snout = one('snout');
    assert.ok(snout.geometry instanceof THREE.ConeGeometry);
    assert.deepEqual(snout.geometry.params.slice(0, 2), [0.09, 0.22]);
    assert.equal(hex(snout.material.color), '#5a5a64');
    assert.ok(one('head').position.z > one('torso').position.z && snout.position.z > one('head').position.z, 'facing +z');
  });

  test('two pointed ears, a low full tail behind, and two unlit yellow eyes', () => {
    const ears = named(wolf, 'ear');
    assert.equal(ears.length, 2);
    for (const e of ears) {
      assert.ok(e.geometry instanceof THREE.ConeGeometry);
      assert.deepEqual(e.geometry.params.slice(0, 2), [0.05, 0.14]);
      assert.ok(e.position.y > one('head').position.y, 'on top of the head');
    }
    const [cone] = named(wolf, 'tailCone');
    assert.deepEqual(cone.geometry.params.slice(0, 2), [0.07, 0.4]);
    assert.ok(named(wolf, 'tail')[0].position.z < one('torso').position.z, 'behind');
    assert.ok(cone.position.z < 0 && cone.position.y < 0, 'trailing back and down');
    const eyes = named(wolf, 'eye');
    assert.equal(eyes.length, 2);
    for (const e of eyes) {
      assert.ok(e.material instanceof THREE.MeshBasicMaterial);
      assert.equal(hex(e.material.color), '#ffd34a');
    }
  });

  test('four legs, radius 0.05 and 0.5 long, pivoting at the shoulders and hips', () => {
    const legs = named(wolf, 'leg');
    assert.equal(legs.length, 4);
    for (const leg of legs) {
      const [shaft] = meshes(leg);
      assert.deepEqual(shaft.geometry.params.slice(0, 3), [0.05, 0.05, 0.5]);
      assert.equal(hex(shaft.material.color), '#5a5a64');
      assert.equal(leg.position.y, 0.5, 'the pivot is the top of the leg');
      close(shaft.position.y, -0.25);
    }
    assert.equal(legs.filter((l) => l.position.z > 0).length, 2);
    assert.equal(legs.filter((l) => l.position.z < 0).length, 2);
  });

  test('about 1.4 long and 0.9 high at the shoulder', () => {
    const [torso, head, snout] = ['torso', 'head', 'snout'].map(one);
    const tail = named(wolf, 'tail')[0];
    const front = snout.position.z + 0.11;
    const back = tail.position.z - 0.4 * Math.cos(0.7);
    assert.ok(front - back > 1.3 && front - back < 1.5, `length ${front - back}`);
    close(torso.position.y + 0.2, 0.9);
    assert.ok(head.position.y < 1);
  });

  test('the meshes are the target: no extra sphere; the tail\'s cone, ears and eyes ignore rays', () => {
    assert.equal(all(wolf, (o) => o.geometry instanceof THREE.SphereGeometry).length, 0);
    const ignored = meshes(wolf).filter(ignores);
    assert.equal(ignored.length, 5);
    for (const m of ignored) assert.ok(['tailCone', 'ear', 'eye'].includes(m.name), m.name);
    const taken = meshes(wolf).filter((m) => !ignores(m)).map((m) => m.name);
    assert.deepEqual([...new Set(taken)].sort(), ['chest', 'head', 'shaft', 'snout', 'torso']);
  });

  test('a shot at the body meets it: the torso spans the line', () => {
    const t = one('torso');
    const [w, h] = t.geometry.params;
    assert.ok(Math.abs(0 - t.position.x) <= w / 2 && Math.abs(0.7 - t.position.y) <= h / 2);
    assert.ok(!ignores(t));
  });

  test('size scales the whole model, and the model is flat-lit without textures', () => {
    assert.equal(buildWolf({ size: 2 }).scale.x, 2);
    assert.equal(wolf.scale.x, 1);
    assert.equal(wolf.name, 'wolf');
    for (const m of meshes(wolf)) {
      assert.equal(m.material.map, undefined);
      if (m.material instanceof THREE.MeshStandardMaterial) assert.equal(m.material.flatShading, true);
    }
  });
});

describe('5. the gait', () => {
  const swings = (t, options, seed = 0) => {
    const w = buildWolf({ seed });
    w.userData.tick(t, options);
    return named(w, 'leg').map((l) => l.rotation.x);
  };
  const isFront = (leg) => leg.position.z > 0;

  test('the front legs swing by sin(t × 9 + seed) × 0.6, the hind a quarter turn behind', () => {
    const w = buildWolf({ seed: 0.7 });
    const legs = named(w, 'leg');
    for (const t of [0, 0.05, 0.13, 0.4, 1, 2.71]) {
      w.userData.tick(t);
      legs.forEach((leg, i) => {
        const phase = isFront(leg) ? 0 : -Math.PI / 2;
        close(leg.rotation.x, Math.sin(t * 9 + 0.7 + phase) * 0.6, `t ${t} leg ${i}`);
        assert.ok(Math.abs(leg.rotation.x) <= 0.6 + 1e-9);
      });
    }
  });

  test('the swing reaches 0.6, and the hind legs are a quarter turn behind the front', () => {
    const w = buildWolf();
    const [front] = named(w, 'leg').filter(isFront);
    const [hind] = named(w, 'leg').filter((l) => !isFront(l));
    let peak = 0;
    for (let t = 0; t < 2; t += 0.01) {
      w.userData.tick(t);
      peak = Math.max(peak, front.rotation.x);
    }
    assert.ok(peak > 0.59);
    w.userData.tick(Math.PI / 18); // the front at its peak (sin = 1), the hind at zero
    close(front.rotation.x, 0.6);
    close(hind.rotation.x, 0);
  });

  test('walk scales the swing, and 0 stands still', () => {
    for (const t of [0.13, 0.4, 1]) {
      assert.ok(swings(t, { walk: 0.2 }).every((a, i) => Math.abs(a - swings(t)[i] * 0.2) < 1e-9));
      assert.ok(swings(t, { walk: 0 }).every((a) => a === 0));
    }
    const w = buildWolf();
    w.userData.tick(0.4, { walk: 0 });
    assert.equal(named(w, 'body')[0].position.y, 0);
    assert.equal(named(w, 'tail')[0].rotation.y, 0);
  });

  test('the body bobs by 0.04 and the tail swings by 0.2 at most', () => {
    const w = buildWolf();
    const [body] = named(w, 'body');
    const [tail] = named(w, 'tail');
    const bob = [];
    const swing = [];
    for (let t = 0; t < 2; t += 0.01) {
      w.userData.tick(t);
      bob.push(body.position.y);
      swing.push(tail.rotation.y);
    }
    assert.ok(Math.max(...bob) <= 0.04 + 1e-9 && Math.min(...bob) >= -0.04 - 1e-9 && Math.max(...bob) > 0.039);
    assert.ok(Math.max(...swing) <= 0.2 + 1e-9 && Math.min(...swing) >= -0.2 - 1e-9 && Math.max(...swing) > 0.19);
  });

  test('the same seed gives the same gait, another seed a shifted one', () => {
    assert.deepEqual(swings(0.5, {}, 1), swings(0.5, {}, 1));
    assert.notDeepEqual(swings(0.5, {}, 1), swings(0.5, {}, 2));
  });
});
