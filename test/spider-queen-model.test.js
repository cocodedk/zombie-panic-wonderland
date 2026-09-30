// Spec 33: the Spider Queen model and the web ball's look (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { BURSTS } from '../src/logic/effects.js';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { buildSpider } = await import('../src/view/models/spider.js');
const { buildSpiderQueen } = await import('../src/view/models/spider-queen.js');
const { buildWebBall, buildWebTrail, placeWebTrail } = await import('../src/view/models/web-ball.js');

const hex = (color) => `#${color.getHexString()}`;
const all = (root, test) => { const found = []; root.traverse((o) => { if (test(o)) found.push(o); }); return found; };
const named = (root, name) => all(root, (o) => o.name === name);
const ignores = (m) => Object.hasOwn(m, 'raycast');

describe('the model', () => {
  const queen = buildSpiderQueen();

  test('the spider made 3.2 times larger, with a wine abdomen and a white hourglass', () => {
    assert.equal(queen.scale.x, 3.2);
    assert.equal(hex(named(queen, 'abdomen')[0].material.color), '#5a1f3a');
    const cones = named(queen, 'hourglass');
    assert.equal(cones.length, 2);
    for (const c of cones) assert.equal(hex(c.material.color), '#d8e0ea');
  });

  test('the two options default to the spider\'s own colours', () => {
    const spider = buildSpider();
    assert.equal(hex(named(spider, 'abdomen')[0].material.color), '#2a1f2e');
    for (const c of named(spider, 'hourglass')) assert.equal(hex(c.material.color), '#c0182b');
    const custom = buildSpider({ abdomen: '#123456', mark: '#654321' });
    assert.equal(hex(named(custom, 'abdomen')[0].material.color), '#123456');
    assert.equal(hex(named(custom, 'hourglass')[0].material.color), '#654321');
  });

  test('eight glowing red eyes, and a crown of five gold spikes round the head', () => {
    const eyes = named(queen, 'eye');
    assert.equal(eyes.length, 8);
    for (const e of eyes) {
      assert.ok(e.material instanceof THREE.MeshBasicMaterial);
      assert.equal(hex(e.material.color), '#ff2a1a');
    }
    const spikes = named(queen, 'spike');
    assert.equal(spikes.length, 5);
    const [head] = named(queen, 'cephalothorax');
    for (const s of spikes) {
      assert.ok(s.geometry instanceof THREE.ConeGeometry);
      assert.deepEqual(s.geometry.params.slice(0, 2), [0.03, 0.1]);
      assert.equal(hex(s.material.color), '#d9a520');
      assert.equal(s.parent, head);
      assert.ok(ignores(s));
    }
    assert.equal(new Set(spikes.map((s) => `${s.position.x.toFixed(3)},${s.position.z.toFixed(3)}`)).size, 5, 'all round the head');
  });

  test('only the invisible sphere takes the aim, and the model is flat-lit', () => {
    const hits = all(queen, (o) => o instanceof THREE.Mesh && !ignores(o));
    assert.equal(hits.length, 1);
    assert.equal(hits[0].name, 'hit');
    for (const m of all(queen, (o) => o instanceof THREE.Mesh)) {
      assert.equal(m.material.map, undefined);
      if (m.material instanceof THREE.MeshStandardMaterial) assert.equal(m.material.flatShading, true);
    }
  });

  test('the gait is the spider\'s: the legs swing while she walks in, and are still once she stands', () => {
    const plain = buildSpider({ size: 3.2 });
    const legs = (root) => named(root, 'leg').map((l) => l.rotation.y);
    for (const [t, walk] of [[0.3, 1], [1.1, 1], [2, 0.2], [2, 0]]) {
      queen.userData.tick(t, { walk, windup: 0 });
      plain.userData.tick(t, { walk });
      assert.deepEqual(legs(queen), legs(plain), `t ${t} walk ${walk}`);
    }
    assert.ok(legs(queen).every((y) => y === 0));
    queen.userData.tick(0.3, { walk: 1 });
    assert.ok(legs(queen).some((y) => y !== 0));
  });

  test('winding up, the two front legs rise (0 to -1) and the abdomen tilts back 0.15', () => {
    const legs = named(queen, 'leg');
    const [abdomen] = named(queen, 'abdomen');
    for (const windup of [0, 0.5, 1]) {
      queen.userData.tick(0, { walk: 0, windup });
      assert.equal(legs[0].rotation.x, 0 - windup);
      assert.equal(legs[4].rotation.x, 0 - windup);
      for (const i of [1, 2, 3, 5, 6, 7]) assert.equal(legs[i].rotation.x, 0);
      near(abdomen.rotation.x, -0.15 * windup);
    }
    queen.userData.tick(0, { walk: 0 });
    assert.equal(legs[0].rotation.x, 0);
    assert.equal(abdomen.rotation.x, 0);
  });
});

function near(a, b) {
  assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);
}

describe('the web ball and the bursts', () => {
  test('a low-poly ball of radius 0.25, pale and unlit, that a shot can hit', () => {
    const ball = buildWebBall();
    assert.ok(ball.geometry instanceof THREE.IcosahedronGeometry);
    assert.deepEqual(ball.geometry.params, [0.25, 1]);
    assert.ok(ball.material instanceof THREE.MeshBasicMaterial);
    assert.equal(hex(ball.material.color), '#d8e0ea');
    assert.ok(!ignores(ball));
  });

  test('its thread is a thin box, 0.6 long behind it along its flight, that rays pass through', () => {
    const trail = buildWebTrail();
    assert.ok(trail.geometry instanceof THREE.BoxGeometry);
    assert.deepEqual(trail.geometry.params, [0.012, 0.012, 1]);
    assert.equal(hex(trail.material.color), '#d8e0ea');
    assert.equal(trail.material.opacity, 0.7);
    assert.equal(trail.material.transparent, true);
    assert.ok(ignores(trail));
    placeWebTrail(trail, { x: 1, y: 2, z: -3 }, { x: 1, y: 2, z: -4 }); // flying toward +z: the thread trails toward -z
    near(trail.scale.z, 0.6);
    assert.deepEqual([trail.position.x, trail.position.y], [1, 2]);
    near(trail.position.z, -3.3);
  });

  test('BURSTS.spiderQueen and BURSTS.web', () => {
    assert.deepEqual(BURSTS.spiderQueen, { count: 40, life: 1.5, size: 0.35, colors: ['#5a1f3a', '#2a1f2e', '#d8e0ea', '#d9a520'], puff: '#3a2c3f', puffSize: 3 });
    assert.deepEqual(BURSTS.web, { count: 10, life: 0.8, size: 0.16, colors: ['#d8e0ea'], puff: '#d8e0ea', puffSize: 1 });
  });
});
