// Spec 24: eyes that flicker, behind the `flicker` flag of ZOMBIE_EXTRAS, on the model and on the
// stage, against test/fake-three.js. The reference is today's zombie.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { playing, run, clearWave, level1, kill } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';
import { withWaves } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { ZOMBIE_EXTRAS, NO_EXTRAS, flickerK } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');
const THREE = await import('./fake-three.js');

const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const TIMES = [0, 0.2, 0.425, 0.9, 1.7, 3.3, 11.5];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const isEye = (m) => m.geometry?.params?.[0] === 0.06 && m.geometry.params[1] === 0.04 && m.geometry.params[2] === 0.02;
const eyesOf = (model) => {
  const found = [];
  model.traverse((m) => { if (m.geometry && m.material && isEye(m)) found.push(m); });
  return found;
};
const halosOf = (model) => {
  const found = [];
  model.traverse((m) => { if (m.name === 'halo') found.push(m); });
  return found;
};
const colourOf = (m) => [m.material.color.r, m.material.color.g, m.material.color.b];
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
const BASE = { ordinary: '#ff3b30', fast: '#ff2a1a' };

describe('1. the flag', () => {
  test('ZOMBIE_EXTRAS turns it on and NO_EXTRAS off', () => {
    assert.equal(ZOMBIE_EXTRAS.flicker, true);
    assert.equal(NO_EXTRAS.flicker, false);
  });

  for (const fast of [false, true]) {
    const name = fast ? 'fast' : 'ordinary';
    test(`${name}: with the flag off (or no extras) the eye colour is today's at every t`, () => {
      for (const extras of [undefined, {}, { flicker: false }, { tufts: true, limp: true }]) {
        const model = buildZombie({ fast, seed: 1.7, extras });
        assert.equal(eyesOf(model).length, 2);
        for (const t of TIMES) {
          model.userData.tick(t);
          for (const eye of eyesOf(model)) assert.deepEqual(colourOf(eye), rgb(BASE[name]));
        }
      }
    });

    test(`${name}: with it on the eye colour is the base colour times k, k in [0.85, 1]`, () => {
      for (const seed of [0, 0.5, 1.7, 3.4, 5.1]) {
        const model = buildZombie({ fast, seed, extras: ZOMBIE_EXTRAS });
        for (const t of TIMES) {
          model.userData.tick(t);
          const k = flickerK(t, seed);
          assert.ok(k >= 0.85 - 1e-12 && k <= 1 + 1e-12, `k ${k}`);
          for (const eye of eyesOf(model)) colourOf(eye).forEach((v, i) => close(v, rgb(BASE[name])[i] * k));
        }
      }
    });

    test(`${name}: the eyes flicker around ${BASE[name]}, and the halos do not change`, () => {
      const plain = buildZombie({ fast, seed: 2 });
      const model = buildZombie({ fast, seed: 2, extras: ZOMBIE_EXTRAS });
      const seen = new Set();
      for (const t of TIMES) {
        plain.userData.tick(t);
        model.userData.tick(t);
        seen.add(model.userData.tick && eyesOf(model)[0].material.color.r);
        assert.equal(halosOf(model).length, fast ? 2 : 0);
        halosOf(model).forEach((h, i) => {
          const today = halosOf(plain)[i].material;
          assert.deepEqual(colourOf(h), [today.color.r, today.color.g, today.color.b]);
          assert.equal(h.material.opacity, today.opacity);
        });
      }
      assert.ok(seen.size > 1, 'the eyes stay steady');
    });
  }
});

describe('2. the formula', () => {
  test('k(0) for seed 0 is 0.925 and it repeats every 1.7 seconds', () => {
    close(flickerK(0, 0), 0.925);
    for (const [t, seed] of [[0, 0], [0.31, 1], [2.2, 3.4]]) close(flickerK(t + 1.7, seed), flickerK(t, seed));
  });

  test('k follows 0.85 + 0.15 × (0.5 + 0.5 × sin(2πt/1.7 + seed × 2.3))', () => {
    for (const seed of [0, 0.7, 1.7]) {
      for (const t of TIMES) close(flickerK(t, seed), 0.85 + 0.15 * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / 1.7 + seed * 2.3)));
    }
    close(flickerK(0.425, 0), 1);
    close(flickerK(1.275, 0), 0.85);
  });

  test('two seeds differing by 0.5 have different k at the same t', () => {
    for (const t of TIMES) assert.notEqual(flickerK(t, 1), flickerK(t, 1.5));
  });
});

describe('3. reduced motion', () => {
  test('with twitch false the eyes are exactly their base colour at every t', () => {
    for (const fast of [false, true]) {
      const model = buildZombie({ fast, seed: 1.7, extras: ZOMBIE_EXTRAS });
      for (const t of TIMES) {
        model.userData.tick(t, { twitch: true });
        model.userData.tick(t, { twitch: false });
        for (const eye of eyesOf(model)) assert.deepEqual(colourOf(eye), rgb(BASE[fast ? 'fast' : 'ordinary']));
      }
    }
  });
});

describe('4. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: every shown zombie, fast or not, flickers around its own base colour`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      assert.ok(zombies.some((z) => z.fast) && zombies.some((z) => !z.fast));
      for (const e of zombies) {
        const model = shownAs(scene, e);
        model.userData.tick(0.3);
        const k = flickerK(0.3, e.id * 1.7);
        for (const eye of eyesOf(model)) colourOf(eye).forEach((v, j) => close(v, rgb(BASE[e.fast ? 'fast' : 'ordinary'])[j] * k));
      }
    });

    test(`level ${i + 1}: under reduced motion the fading copy has the bit too, and is steady`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      for (const e of zombies) {
        kill(game, e);
        const fade = draw().children.filter((c) => c.name === 'fade').at(-1);
        fade.userData.tick(0.3, { twitch: false });
        for (const eye of eyesOf(fade)) assert.deepEqual(colourOf(eye), rgb(BASE[e.fast ? 'fast' : 'ordinary']));
      }
    });
  }

  test('the Zombie King is built without it: its eyes are steady', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 999;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    const king = shownAs(draw(), boss);
    assert.equal(king.name, 'zombieKing');
    assert.equal(eyesOf(king).length, 2);
    for (const t of TIMES) {
      king.userData.tick(t);
      for (const eye of eyesOf(king)) assert.deepEqual(colourOf(eye), colourOf(eyesOf(buildZombieKing())[0]));
    }
  });
});

describe('5. sizes', () => {
  test('zombie.js is at most 6 longer than 177 and under 200, new files under 200', () => {
    assert.ok(lines('src/view/models/zombie.js') <= 177 + 6);
    assert.ok(lines('src/view/models/zombie.js') < 200);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('test/zombie-eye-flicker.test.js') < 200);
  });
});
