// Spec 38 on the stage: shown zombies, their fading copies and the Zombie King have the machine body,
// and the files stay within their caps.

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

const hex = (color) => `#${color.getHexString()}`;
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
const patchesOf = (m) => m.userData.torso.children.filter((c) => ['0.14,0.12,0.02', '0.1,0.16,0.02'].includes(c.geometry?.params.join()));
function assertMachine(model, label) {
  for (const leg of model.children.slice(0, 2)) assert.equal(hex(leg.children[0].material.color), MACHINE.steel, label);
  for (const arm of model.userData.arms) {
    assert.equal(hex(arm.children[1].material.color), MACHINE.steel, label);
    assert.equal(hex(arm.children[2].material.color), MACHINE.steel, label);
  }
  assert.equal(patchesOf(model).length, 2, label);
  for (const patch of patchesOf(model)) assert.equal(hex(patch.material.color), MACHINE.brass, label);
}

describe('6. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: shown zombies and their fading copies have the machine body`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      const scene = draw();
      for (const e of zombies) assertMachine(shownAs(scene, e), `zombie ${e.id}`);
      kill(game, zombies[1]);
      const [fade] = draw().children.filter((c) => c.name === 'fade');
      assertMachine(fade, 'fade');
    });
  }

  test('the Zombie King has it too', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 99;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    assertMachine(shownAs(draw(), boss), 'king');
  });
});

describe('7. file sizes', () => {
  test('the new file and zombie-details.js are under 200 lines and zombie.js is at most 183', () => {
    assert.ok(lines('src/view/models/zombie-machine.js') < 200);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('src/view/models/zombie.js') <= 183);
    assert.ok(lines('test/zombie-machine.test.js') < 200);
    assert.ok(lines('test/zombie-machine-stage.test.js') < 200);
  });
});
