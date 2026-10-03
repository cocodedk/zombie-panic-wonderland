// Spec 39: the machine zombie's lighter steel, brighter brass, bigger chest plate and gear and glowing
// joints, on the model and on the stage, against test/fake-three.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { kill, playing, run, clearWave, level1 } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';
import { withWaves } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { MACHINE } = await import('../src/view/models/zombie-machine.js');
const { createStage } = await import('../src/view/stage.js');
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { ZOMBIE_EXTRAS } = await import('../src/view/models/zombie-details.js');
const { hex, at, legsOf, kneeOf, plateOf, gearOf, modelsOf } = await import('./gait-helpers.js');

const MODELS = modelsOf(buildZombie, buildZombieKing, ZOMBIE_EXTRAS);

const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);

// The corners of a rectangle (centre, half sizes, turn about z), and the distance between two that do not touch.
const corners = ([cx, cy], [hx, hy], a) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
const pointToSegment = ([px, py], [ax, ay], [bx, by]) => {
  const k = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(px - (ax + k * (bx - ax)), py - (ay + k * (by - ay)));
};
const gap = (p, q) => Math.min(...[[p, q], [q, p]].flatMap(([a, b]) => a.flatMap((pt) => b.map((c, i) => pointToSegment(pt, c, b[(i + 1) % 4])))));

describe('1. the colours', () => {
  test('MACHINE has the lighter steel and the brighter brass', () => {
    assert.deepEqual(MACHINE, { steel: '#c4c0b6', darkSteel: '#34373d', brass: '#e0a838' });
  });

  for (const [name, build] of Object.entries(MODELS)) {
    test(`${name}: a bigger plate clear of the stain and on the shirt's front, a bigger gear`, () => {
      const m = build();
      const plate = plateOf(m);
      assert.deepEqual(plate.geometry.params, [0.14, 0.12, 0.02]);
      assert.deepEqual([at(plate), plate.rotation.z], [[0.1, 0.36, 0.151], 0.4]);
      assert.deepEqual([plate.scale.x, plate.scale.y, plate.scale.z], [1.5, 1.5, 1]);
      assert.equal(hex(plate.material.color), '#e0a838');
      const big = corners([0.1, 0.36], [0.105, 0.09], 0.4);
      const stain = corners([-0.08, 0.2], [0.08, 0.07], 0.3);
      assert.ok(gap(big, stain) >= 0.03, `${gap(big, stain)} apart`);
      for (const [x, y] of big) assert.ok(x > -0.25 && x < 0.25 && y > 0 && y < 0.62);
      const xs = big.map((c) => c[0]);
      assert.ok(Math.min(...xs) > -0.04 && Math.max(...xs) < 0.24);
      const gear = gearOf(m);
      assert.deepEqual(gear.geometry.params, [0.06, 0.06, 0.02, 8]);
      assert.deepEqual(at(gear), [0.1, 0.36, 0.168]);
    });

    test(`${name}: the knee balls, elbow balls and gear glow faintly, and nothing else`, () => {
      const m = build();
      const glowing = [];
      m.traverse((o) => { if (o instanceof THREE.Mesh && o.material.emissive) glowing.push(o); });
      const expected = [...legsOf(m).map((l) => kneeOf(l).children[2]), ...m.userData.arms.map((a) => a.children.at(-1)), gearOf(m)];
      assert.equal(glowing.length, expected.length);
      for (const o of expected) {
        assert.ok(glowing.includes(o));
        assert.equal(hex(o.material.emissive), '#ff7a2a');
        assert.equal(o.material.emissiveIntensity, 0.3);
        assert.equal(hex(o.material.color), MACHINE.darkSteel);
        assert.equal(o.material.roughness, 0.9);
        assert.equal(o.material.metalness, 0);
      }
    });
  }
});

describe('2. on the stage', () => {
  const check = (model, label) => {
    assert.equal(kneeOf(legsOf(model)[0]).name, 'knee', label);
    assert.equal(hex(legsOf(model)[0].children[0].material.color), MACHINE.steel, label);
    assert.equal(plateOf(model).scale.x, 1.5, label);
    assert.equal(hex(plateOf(model).material.color), MACHINE.brass, label);
    assert.equal(gearOf(model).geometry.params[0], 0.06, label);
    model.userData.tick(0.9, { walk: 1 });
    assert.equal(model.userData.torso.rotation.z, 0, label);
    assert.ok(model.userData.torso.position.y > 0.92, label);
    assert.ok(legsOf(model).some((l) => kneeOf(l).rotation.x > 0), label);
  };

  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: shown zombies and their fading copies have the knees, the walk and the colours`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      const scene = draw();
      for (const e of zombies) check(shownAs(scene, e), `zombie ${e.id}`);
      kill(game, zombies[1]);
      check(draw().children.filter((c) => c.name === 'fade').at(-1), 'fade');
    });
  }

  test('the Zombie King has them too', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 99;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    check(shownAs(draw(), boss), 'king');
  });
});

describe('3. file sizes', () => {
  test('the model files are within their caps and the new tests under 200 lines', () => {
    assert.ok(lines('src/view/models/zombie-machine.js') < 200);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('src/view/models/zombie.js') <= 183);
    for (const f of ['zombie-gait', 'zombie-colours', 'gait-helpers']) assert.ok(lines(`test/${f}${f === 'gait-helpers' ? '' : '.test'}.js`) < 200);
  });
});
