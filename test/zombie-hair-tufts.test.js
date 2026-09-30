// Spec 22: three hair tufts on the head, behind the `tufts` flag of ZOMBIE_EXTRAS, on the model and on
// the stage, against test/fake-three.js. The reference is today's zombie.

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
const { ZOMBIE_EXTRAS } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');
const THREE = await import('./fake-three.js');

const hex = (color) => `#${color.getHexString()}`;
const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const TUFT = [0.03, 0.12, 4];
const tuftsOf = (model) => {
  const found = [];
  model.traverse((m) => { if (m.geometry && JSON.stringify(m.geometry.params) === JSON.stringify(TUFT)) found.push(m); });
  return found;
};
const PLACES = [[-0.07, 0.2, 0.0, 0.35], [0.0, 0.22, -0.04, 0], [0.08, 0.19, 0.02, -0.4]];
const everything = (model) => {
  const all = [];
  model.traverse((m) => all.push([m.geometry?.params, m.material && hex(m.material.color), { ...m.position }, { ...m.rotation }, { ...m.scale }]));
  return all;
};
const poses = (model) => {
  const { head, torso, arms } = model.userData;
  return [head, torso, ...arms, ...model.children.slice(0, 2)].map((o) => ({ ...o.rotation }));
};
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);

describe('1. the tufts on the model', () => {
  test('ZOMBIE_EXTRAS is an object of flags, all false except tufts', () => {
    assert.deepEqual(ZOMBIE_EXTRAS, { tufts: true });
  });

  for (const fast of [false, true]) {
    test(`${fast ? 'fast' : 'ordinary'}: no tufts without extras, or with the flag off`, () => {
      assert.equal(tuftsOf(buildZombie({ fast })).length, 0);
      assert.equal(tuftsOf(buildZombie({ fast, extras: {} })).length, 0);
      assert.equal(tuftsOf(buildZombie({ fast, extras: { tufts: false } })).length, 0);
      assert.deepEqual(everything(buildZombie({ fast, extras: { tufts: false } })), everything(buildZombie({ fast })));
    });

    test(`${fast ? 'fast' : 'ordinary'}: with the flag on the head has three tufts, as sized, coloured, placed and leaning`, () => {
      const model = buildZombie({ fast, extras: ZOMBIE_EXTRAS });
      const tufts = tuftsOf(model);
      assert.equal(tufts.length, 3);
      assert.deepEqual(tufts.map((t) => [t.position.x, t.position.y, t.position.z, t.rotation.z]), PLACES);
      for (const t of tufts) {
        assert.equal(hex(t.material.color), '#2a241c');
        assert.equal(t.parent, model.userData.head);
        assert.deepEqual([t.rotation.x, t.rotation.y], [0, 0]);
      }
    });
  }
});

describe('1b. picking is as today', () => {
  test('the tufts ignore rays, so the meshes a shot can meet are the plain zombie\'s', () => {
    const pickable = (model) => {
      const found = [];
      model.traverse((m) => { if (m.geometry && !Object.hasOwn(m, 'raycast')) found.push([m.geometry.params, { ...m.position }]); });
      return found;
    };
    const tufted = buildZombie({ extras: ZOMBIE_EXTRAS });
    for (const t of tuftsOf(tufted)) {
      assert.ok(Object.hasOwn(t, 'raycast'));
      assert.equal(t.raycast(), undefined);
    }
    assert.deepEqual(pickable(tufted), pickable(buildZombie()));
  });
});

describe('2. they are part of the head', () => {
  test('a twitch turns the tufts with the head', () => {
    const model = buildZombie({ seed: 2, extras: ZOMBIE_EXTRAS });
    const { head, tick } = model.userData;
    let turned = false;
    for (let t = 0; t < 12; t += 0.05) {
      tick(t);
      if (head.rotation.y !== 0) turned = true;
      for (const tuft of tuftsOf(model)) assert.equal(tuft.parent, head);
    }
    assert.ok(turned);
  });

  test('the Zombie King, built without extras, has none', () => {
    assert.equal(tuftsOf(buildZombieKing()).length, 0);
  });
});

describe('3. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: every shown zombie, fast or not, has three tufts`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      assert.ok(zombies.some((z) => z.fast) && zombies.some((z) => !z.fast));
      for (const e of zombies) assert.equal(tuftsOf(shownAs(scene, e)).length, 3);
    });

    test(`level ${i + 1}: under reduced motion the fading copy has three tufts too`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      kill(game, zombies[1]);
      const [fade] = draw().children.filter((c) => c.name === 'fade');
      assert.equal(tuftsOf(fade).length, 3);
    });
  }

  test('the Zombie King has none', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 99;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    const king = shownAs(draw(), boss);
    assert.equal(king.name, 'zombieKing');
    assert.equal(tuftsOf(king).length, 0);
  });
});

describe('4. nothing else changed', () => {
  for (const fast of [false, true]) {
    test(`${fast ? 'fast' : 'ordinary'}: the same rotations from tick, and the same shapes and colours but the tufts`, () => {
      const plain = buildZombie({ fast, seed: 3, tint: 0.04 });
      const tufted = buildZombie({ fast, seed: 3, tint: 0.04, extras: ZOMBIE_EXTRAS });
      for (const [t, pose] of [[0, {}], [0.7, { walk: 0 }], [3.1, { windup: 0.6 }], [9.4, { twitch: false }]]) {
        plain.userData.tick(t, pose);
        tufted.userData.tick(t, pose);
        assert.deepEqual(poses(tufted), poses(plain));
      }
      const rest = everything(tufted);
      const without = rest.filter(([params]) => JSON.stringify(params) !== JSON.stringify(TUFT));
      assert.equal(rest.length - without.length, 3);
      assert.deepEqual(without, everything(plain));
    });
  }
});

describe('5. sizes', () => {
  test('zombie.js stays under 200 lines, stage.js is at most 4 longer than today (325), new files are under 200', () => {
    assert.ok(lines('src/view/models/zombie.js') < 200);
    assert.ok(lines('src/view/stage.js') <= 325 + 4);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('test/zombie-hair-tufts.test.js') < 200);
  });
});
