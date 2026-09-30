// Spec 17 beyond the walk: the others move as before, shots pass through the fence, and pause and
// fresh starts. The walk itself is in fences.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { Game } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { playing, run, click, calm, level1 } from './helpers.js';
import { seeded } from './weather-helpers.js';
import { LEVELS, near, oneZombie } from './fences-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');
const { buildFence } = await import('../src/view/models/scenery.js');

describe('6. the others move as before', () => {
  const noFences = (level) => ({ ...level, scenery: level.scenery.filter((s) => s.model !== 'fence') });
  const started = (level, waves, seed) => {
    const game = new Game({ ...calm(level), waves }, { random: seeded(seed) });
    game.loaded();
    click(game);
    click(game);
    game.player.hearts = 99;
    return game;
  };
  const others = (game) => JSON.stringify([game.enemies.filter((e) => e.kind !== 'zombie'), game.pumpkins]);

  for (const [i, level] of LEVELS.entries()) {
    for (const boss of [false, true]) {
      test(`level ${i + 1}: ${boss ? 'the boss' : 'pumpkin monsters and crows'} with the same seed, with and without fences`, () => {
        const waves = [{ zombie: 3, pumpkinMonster: 2, ...(level.enemies.crow ? { crow: 2 } : {}) }];
        const [a, b] = [level, noFences(level)].map((l) => started(l, waves, 7));
        if (boss) for (const g of [a, b]) g.spawnBoss();
        for (let t = 0; t < 1500; t++) {
          a.update(0.01);
          b.update(0.01);
          assert.equal(others(a), others(b), `at ${t}`);
        }
        assert.ok(others(a).length > 20, 'something moved');
      });
    }
  }
});

describe('7. shots pass through the fence', () => {
  test('the fence\'s meshes ignore rays', () => {
    const meshes = [];
    buildFence({ length: 3 }).traverse((m) => { if (m.geometry) meshes.push(m); });
    assert.ok(meshes.length > 3);
    assert.ok(meshes.every((m) => typeof m.raycast === 'function' && m.raycast() === undefined));
  });

  test('the stage\'s aim and a streak go on through a fence, but a hedge meets the ray', () => {
    const aimed = (model) => {
      const game = playing({ ...oneZombie(level1), scenery: [{ model: 'sky' }, { model, x: 0, z: -2.2, length: 3 }] });
      game.enemies.length = 0;
      const stage = createStage({ appendChild() {} }, game.level);
      const renderer = THREE.renderers.at(-1);
      stage.sync(game, 0.01);
      const backdrop = renderer.scene.children.find((c) => c.name === 'backdrop');
      const hits = THREE.raycasters.at(-1).intersectObjects(backdrop.children.filter((c) => c.name === model), true);
      return { hits, target: stage.aimAt({ x: 0, y: 0 }), game };
    };
    const fence = aimed('fence');
    assert.equal(fence.hits.length, 0, 'no ray meets a fence');
    assert.deepEqual(fence.target, { id: null, point: { x: 0, y: 0, z: -60 } });
    fence.game.setAim(fence.target.id, fence.target.point);
    fence.game.shoot();
    assert.deepEqual(fence.game.effects.streaks.at(-1).to, { x: 0, y: 0, z: -60 });
    assert.equal(aimed('hedge').hits.length, 1, 'a hedge still stops a ray');
  });
});

describe('8. pause and fresh starts', () => {
  const at = (game) => ({ x: game.enemies[0].x, z: game.enemies[0].z });

  test('paused, the walk stands still and goes on from the same place', () => {
    const game = playing(oneZombie(level1), () => 0);
    const twin = playing(oneZombie(level1), () => 0);
    run(game, 3);
    game.pressEsc();
    const held = at(game);
    run(game, 5);
    assert.deepEqual(at(game), held);
    game.pressEsc();
    run(game, 2);
    run(twin, 5);
    near(at(game).x, at(twin).x);
    near(at(game).z, at(twin).z);
  });

  const fresh = { 'a level start': (g) => g.toTitle(), 'Try again': (g) => g.restart(), 'Play again': (g) => g.restart(), 'Next level': (g) => g.nextLevel(), 'Back to title': (g) => g.toTitle() };
  for (const [name, act] of Object.entries(fresh)) {
    test(`${name} starts the walk fresh`, () => {
      const [one, two] = [oneZombie(level1), oneZombie(level2)];
      const game = new Game(one, { random: () => 0, levels: [one, name === 'Next level' ? two : one] });
      game.loaded();
      click(game);
      click(game);
      run(game, 5);
      game.end(name === 'Try again' ? 'defeat' : 'victory');
      act(game);
      if (game.screen === 'title') click(game); // the title's press starts the level
      assert.equal(game.enemies.length, 0);
      click(game);
      assert.deepEqual(at(game), { x: -8, z: -12 });
      run(game, 5);
      const ref = playing(name === 'Next level' ? two : one, () => 0);
      run(ref, 5);
      near(at(game).x, at(ref).x);
      near(at(game).z, at(ref).z);
    });
  }
});
