// Spec 23: a limp. One leg of each zombie swings 60% as far as the other, behind the `limp` flag of
// ZOMBIE_EXTRAS, on the model and on the stage, against test/fake-three.js. The reference is today's zombie.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { kill, playing, run, clearWave, level1 } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';
import { withWaves } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { ZOMBIE_EXTRAS, NO_EXTRAS, legSwing } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');
const THREE = await import('./fake-three.js');

const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const legsOf = (model) => model.children.slice(0, 2);
const swings = (model, t, pose) => {
  model.userData.tick(t, pose);
  return legsOf(model).map((leg) => leg.rotation.x);
};
const TIMES = [0, 0.3, 0.9, 1.7, 4.2, 11.5];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} is not ${b}`);
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
// Which leg (0 left, 1 right) swings less right now, or -1 when they swing the same.
const limping = (model) => {
  const [a, b] = legsOf(model).map((leg) => Math.abs(leg.rotation.x));
  assert.ok(Math.max(a, b) > 1e-6, 'the legs are at rest: pick another time');
  if (Math.abs(a - b) < 1e-12) return -1;
  close(Math.min(a, b), 0.6 * Math.max(a, b));
  return a < b ? 0 : 1;
};

describe('1. the limp on the model', () => {
  test('ZOMBIE_EXTRAS turns it on and NO_EXTRAS off', () => {
    assert.equal(ZOMBIE_EXTRAS.limp, true);
    assert.equal(NO_EXTRAS.limp, false);
  });

  for (const fast of [false, true]) {
    for (const seed of [0, 1.7, 3.4, 5.1, 0.6]) {
      test(`${fast ? 'fast' : 'ordinary'}, seed ${seed}: off is today's swing, on is 0.6 of it for one leg`, () => {
        const plain = buildZombie({ fast, seed });
        const off = buildZombie({ fast, seed, extras: { limp: false } });
        const on = buildZombie({ fast, seed, extras: { limp: true } });
        const side = Math.round(seed / 1.7) % 2;
        for (const t of TIMES) {
          const today = swings(plain, t, { walk: 1 });
          assert.deepEqual(swings(off, t, { walk: 1 }), today);
          const limp = swings(on, t, { walk: 1 });
          for (const leg of [0, 1]) close(limp[leg], leg === side ? 0.6 * today[leg] : today[leg]);
        }
      });
    }
  }

  test('a model built without extras has no limp', () => {
    const plain = buildZombie({ seed: 1.7 });
    const { x } = legsOf(plain)[0].rotation;
    assert.equal(x, 0);
    const [left, right] = swings(plain, 0.9, { walk: 1 });
    close(left, -right);
  });
});

describe('2. which leg limps', () => {
  test('seeds 1.7 and 5.1 limp on the right leg, 3.4 and the default 0 on the left', () => {
    assert.deepEqual(legSwing(1.7, true), [1, 0.6]);
    assert.deepEqual(legSwing(5.1, true), [1, 0.6]);
    assert.deepEqual(legSwing(3.4, true), [0.6, 1]);
    assert.deepEqual(legSwing(0, true), [0.6, 1]);
    assert.deepEqual(legSwing(0, false), [1, 1]);
    const model = (seed) => buildZombie({ seed, extras: ZOMBIE_EXTRAS });
    assert.equal(limping((() => { const m = model(1.7); m.userData.tick(0.2); return m; })()), 1);
    assert.equal(limping((() => { const m = model(3.4); m.userData.tick(0.2); return m; })()), 0);
    assert.equal(limping((() => { const m = model(); m.userData.tick(0.2); return m; })()), 0);
  });

  test('the same seed always limps the same leg, at any time', () => {
    for (const [seed, side] of [[0, 0], [1.7, 1], [3.4, 0], [5.1, 1]]) {
      const model = buildZombie({ seed, extras: ZOMBIE_EXTRAS });
      for (const t of TIMES) {
        model.userData.tick(t);
        if (Math.abs(Math.sin(t * 3.2 + seed)) > 0.05) assert.equal(limping(model), side);
      }
    }
  });
});

describe('3. standing and the rest of the body', () => {
  const pose = (model) => {
    const { head, torso, jaw, arms } = model.userData;
    return [head, torso, jaw, ...arms].map((o) => ({ ...o.rotation }));
  };

  test('at walk 0 both legs are at rotation 0, limp or not', () => {
    for (const extras of [{}, { limp: false }, ZOMBIE_EXTRAS]) {
      for (const seed of [0, 1.7]) {
        const model = buildZombie({ seed, extras });
        for (const t of TIMES) {
          for (const x of swings(model, t, { walk: 0 })) assert.ok(x === 0, `${x} is not 0`);
        }
      }
    }
  });

  test('the arms, torso, head and jaw move as before', () => {
    for (const fast of [false, true]) {
      const plain = buildZombie({ fast, seed: 3.4, tint: 0.03, extras: { tufts: true } });
      const limp = buildZombie({ fast, seed: 3.4, tint: 0.03, extras: ZOMBIE_EXTRAS });
      for (const [t, p] of [[0, {}], [0.7, { walk: 0 }], [3.1, { windup: 0.6 }], [9.4, { twitch: false }]]) {
        plain.userData.tick(t, p);
        limp.userData.tick(t, p);
        assert.deepEqual(pose(limp), pose(plain));
      }
    }
  });

  test('under reduced motion (twitch false) the limp stays', () => {
    const plain = buildZombie({ seed: 1.7 });
    const limp = buildZombie({ seed: 1.7, extras: { limp: true } });
    const today = swings(plain, 0.9, { walk: 1, twitch: false });
    const now = swings(limp, 0.9, { walk: 1, twitch: false });
    close(now[0], today[0]);
    close(now[1], 0.6 * today[1]);
  });
});

describe('4. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: every shown zombie, fast or not, limps on its own leg`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      assert.ok(zombies.some((z) => z.fast) && zombies.some((z) => !z.fast));
      for (const e of zombies) {
        const model = shownAs(scene, e);
        assert.equal(limping(model), Math.round((e.id * 1.7) / 1.7) % 2);
      }
    });

    test(`level ${i + 1}: under reduced motion the fading copy limps on the fallen zombie's leg`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      for (const e of zombies) {
        kill(game, e);
        const fade = draw().children.filter((c) => c.name === 'fade').at(-1);
        fade.userData.tick(0.3);
        assert.equal(limping(fade), e.id % 2, `zombie ${e.id}`);
      }
    });
  }

  test('the Zombie King is built without it and walks as today', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 999;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    const king = shownAs(draw(), boss);
    assert.equal(king.name, 'zombieKing');
    const plain = buildZombieKing();
    for (const t of TIMES) assert.deepEqual(swings(king, t, { walk: 1 }), swings(plain, t, { walk: 1 }));
  });
});

describe('5. sizes', () => {
  test('zombie.js is at most 6 longer than today (174) and under 200, stage.js at most 3 longer (325), new files under 200', () => {
    assert.ok(lines('src/view/models/zombie.js') <= 174 + 6);
    assert.ok(lines('src/view/models/zombie.js') < 200);
    assert.ok(lines('src/view/stage.js') <= 325 + 3);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('test/zombie-limp.test.js') < 200);
  });
});
