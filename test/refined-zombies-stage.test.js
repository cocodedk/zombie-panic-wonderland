// Spec 20 on the stage: each zombie's tint is drawn from its id (never the game's random), and the
// fading copy under reduced motion is the same refined model with the same tint.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { kill, playing, run, clearWave, level1 } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';
import { withWaves } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { zombieTint } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');

const hex = (color) => `#${color.getHexString()}`;
const colours = (m) => [m.userData.head.children[0], m.userData.torso.children[0]].map((x) => hex(x.material.color));
const count = (model, params) => {
  let n = 0;
  model.traverse((m) => { if (m.geometry && JSON.stringify(m.geometry.params) === JSON.stringify(params)) n += 1; });
  return n;
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

describe('4. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: a shown zombie has the tint of its id, and the game's random is not called`, () => {
      let calls = 0;
      const { game, zombies } = fastAmongFour(level, () => { calls += 1; return 0.5; });
      const draw = stageFor(game);
      calls = 0;
      const scene = draw();
      draw();
      assert.equal(calls, 0);
      for (const e of zombies) {
        const expected = buildZombie({ fast: e.fast, tint: zombieTint(e.id) });
        assert.deepEqual(colours(shownAs(scene, e)), colours(expected));
      }
    });
  }
});

describe('4. the Zombie King', () => {
  test('is tinted by its id like any zombie, and has the new parts', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 99;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    const king = shownAs(draw(), boss);
    assert.equal(king.name, 'zombieKing');
    const tint = zombieTint(boss.id);
    assert.notEqual(tint, 0);
    assert.deepEqual(colours(king), colours(buildZombieKing({ tint })));
    assert.notDeepEqual(colours(king), colours(buildZombieKing()));
    assert.equal(count(king, [0.015, 0.09, 3]), 6);
  });
});

describe('6. the fading copy', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: under reduced motion it has the tint of the zombie it copies, and the new parts`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      const victim = zombies[1];
      const shown = colours(shownAs(draw(), victim));
      kill(game, victim);
      assert.equal(game.effects.fades[0].enemyId, victim.id);
      const [fade] = draw().children.filter((c) => c.name === 'fade');
      assert.deepEqual(colours(fade), shown);
      assert.equal(count(fade, [0.015, 0.09, 3]), 6);
      assert.equal(count(fade, [0.11, 0.075, 0.03]), 2);
      assert.equal(count(fade, [0.16, 0.14, 0.02]), 1);
    });
  }
});
