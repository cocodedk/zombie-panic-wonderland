// Spec 25: one bare foot. The foot of the limping side has the skin's colour instead of the shoe's,
// behind the `bareFoot` flag of ZOMBIE_EXTRAS, on the model and on the stage, against test/fake-three.js.

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
const { ZOMBIE_EXTRAS, NO_EXTRAS, limpSide, tinted } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');
const THREE = await import('./fake-three.js');

const SHOE = '#2a2622';
const SKIN = { ordinary: '#7d9a6a', fast: '#4a5c40' };
const hex = (color) => `#${color.getHexString()}`;
const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const feetOf = (model) => model.children.slice(0, 2).map((leg) => leg.children[1].children[1]); // the foot is in the knee group
const shoes = (model) => feetOf(model).map((foot) => hex(foot.material.color));
const skinOf = (model) => hex(model.userData.head.children[0].material.color);
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
// [left, right] colours with one bare foot on `side` in `skin`.
const expected = (side, skin) => [0, 1].map((leg) => (leg === side ? skin : SHOE));
const everything = (model) => {
  const all = [];
  model.traverse((m) => all.push([m.geometry?.params, m.material && hex(m.material.color), { ...m.position }, { ...m.rotation }, { ...m.scale }]));
  return all;
};

describe('1. the bare foot on the model', () => {
  test('ZOMBIE_EXTRAS turns it on and NO_EXTRAS off', () => {
    assert.equal(ZOMBIE_EXTRAS.bareFoot, true);
    assert.equal(NO_EXTRAS.bareFoot, false);
  });

  for (const fast of [false, true]) {
    const name = fast ? 'fast' : 'ordinary';
    for (const seed of [0, 1.7, 3.4, 5.1, 0.6]) {
      test(`${name}, seed ${seed}: off is two shoes, on is one bare foot on the limping side`, () => {
        const side = Math.round(seed / 1.7) % 2;
        assert.deepEqual(shoes(buildZombie({ fast, seed })), [SHOE, SHOE]);
        assert.deepEqual(shoes(buildZombie({ fast, seed, extras: {} })), [SHOE, SHOE]);
        assert.deepEqual(shoes(buildZombie({ fast, seed, extras: { bareFoot: false } })), [SHOE, SHOE]);
        const on = buildZombie({ fast, seed, extras: { bareFoot: true } });
        assert.deepEqual(shoes(on), expected(side, SKIN[name]));
        assert.equal(skinOf(on), SKIN[name]);
      });
    }

    test(`${name}: the bare foot has the skin's colour with its tint`, () => {
      for (const tint of [-0.06, -0.03, 0.02, 0.06]) {
        const model = buildZombie({ fast, seed: 1.7, tint, extras: { bareFoot: true } });
        assert.equal(skinOf(model), tinted(SKIN[name], tint));
        assert.deepEqual(shoes(model), expected(1, tinted(SKIN[name], tint)));
      }
    });
  }

  test('an explicit skin colour is followed too', () => {
    const model = buildZombie({ skin: '#a0b0c0', seed: 3.4, extras: { bareFoot: true } });
    assert.deepEqual(shoes(model), expected(0, '#a0b0c0'));
  });
});

describe('2. which foot is bare', () => {
  test('limpSide is the limp\'s side: seeds 0 and 3.4 left, 1.7 and 5.1 right', () => {
    assert.deepEqual([0, 3.4, 1.7, 5.1].map(limpSide), [0, 0, 1, 1]);
  });

  test('the same seed always has the same bare foot; seeds 1.7 and 3.4 have different ones', () => {
    const bare = (seed) => shoes(buildZombie({ seed, extras: ZOMBIE_EXTRAS })).map((c) => c !== SHOE);
    for (const seed of [0, 1.7, 3.4, 5.1]) assert.deepEqual(bare(seed), bare(seed));
    assert.deepEqual(bare(1.7), [false, true]);
    assert.deepEqual(bare(3.4), [true, false]);
    assert.notDeepEqual(bare(1.7), bare(3.4));
  });

  test('the bare foot is the limping leg: the one that swings less', () => {
    for (const seed of [0, 1.7, 3.4, 5.1]) {
      const model = buildZombie({ seed, extras: ZOMBIE_EXTRAS });
      model.userData.tick(0.2, { walk: 1 });
      const [a, b] = model.children.slice(0, 2).map((leg) => Math.abs(leg.rotation.x));
      assert.equal(shoes(model).findIndex((c) => c !== SHOE), a < b ? 0 : 1);
    }
  });
});

describe('3. nothing else changed', () => {
  for (const fast of [false, true]) {
    test(`${fast ? 'fast' : 'ordinary'}: the same shapes, places, rotations and colours but the bare foot's colour`, () => {
      const plain = buildZombie({ fast, seed: 3.4, tint: 0.04, extras: { ...ZOMBIE_EXTRAS, bareFoot: false } });
      const bare = buildZombie({ fast, seed: 3.4, tint: 0.04, extras: ZOMBIE_EXTRAS });
      for (const [t, pose] of [[0, {}], [0.7, { walk: 0 }], [3.1, { windup: 0.6 }], [9.4, { twitch: false }]]) {
        plain.userData.tick(t, pose);
        bare.userData.tick(t, pose);
      }
      const rest = everything(bare);
      const before = everything(plain);
      assert.equal(rest.length, before.length);
      const differing = rest.map((row, i) => i).filter((i) => JSON.stringify(rest[i]) !== JSON.stringify(before[i]));
      assert.equal(differing.length, 1);
      assert.deepEqual(rest[differing[0]].slice(0, 1), before[differing[0]].slice(0, 1));
      assert.deepEqual(rest[differing[0]].slice(2), before[differing[0]].slice(2));
      assert.deepEqual(feetOf(bare)[0].geometry.params, [0.16, 0.08, 0.26]);
      assert.deepEqual([feetOf(bare)[0].position.x, feetOf(bare)[0].position.y, feetOf(bare)[0].position.z], [0, -0.4, 0.05]);
    });
  }
});

describe('4. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: every shown zombie, fast or not, has its bare foot`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      assert.ok(zombies.some((z) => z.fast) && zombies.some((z) => !z.fast));
      for (const e of zombies) {
        const model = shownAs(scene, e);
        assert.deepEqual(shoes(model), expected(e.id % 2, skinOf(model)));
        assert.notEqual(skinOf(model), SHOE);
      }
    });

    test(`level ${i + 1}: under reduced motion the fading copy has the fallen zombie's bare foot`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      for (const e of zombies) {
        kill(game, e);
        const fade = draw().children.filter((c) => c.name === 'fade').at(-1);
        assert.deepEqual(shoes(fade), expected(e.id % 2, skinOf(fade)), `zombie ${e.id}`);
      }
    });
  }

  test('the Zombie King has both shoes', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 999;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    const king = shownAs(draw(), boss);
    assert.equal(king.name, 'zombieKing');
    assert.deepEqual(shoes(king), [SHOE, SHOE]);
    assert.deepEqual(shoes(buildZombieKing()), [SHOE, SHOE]);
  });
});

describe('5. sizes', () => {
  test('zombie.js is at most 6 longer than before this spec (181) and under 200, new files under 200', () => {
    assert.ok(lines('src/view/models/zombie.js') <= 181 + 6);
    assert.ok(lines('src/view/models/zombie.js') < 200);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('test/zombie-bare-foot.test.js') < 200);
  });
});
