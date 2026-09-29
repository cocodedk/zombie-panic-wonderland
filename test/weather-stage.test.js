// Spec 16, on the stage (against test/fake-three.js): where the weather does not show — reduced
// motion, and the screens with no weather.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { short1, seeded, untilStrike } from './weather-helpers.js';
import { THREE, createStage, named, leavesOf, hemisphere, swayers, setUp, looks } from './weather-stage-helpers.js';

describe('7. the stage: without weather', () => {
  test('with reduced motion: one gentle brightening of at most 0.8, and no bolt, colour shift, sway or leaves', () => {
    const { game, draw, run } = setUp({ reducedMotion: true });
    const before = looks(draw());
    untilStrike(game);
    let top = 0;
    for (let i = 0; i < 80; i++) {
      run(0.01);
      const scene = draw();
      top = Math.max(top, hemisphere(scene).intensity - 1.2);
      assert.equal(named(scene, 'bolt').length, 0);
      assert.deepEqual([looks(scene).fog, looks(scene).sky], [before.fog, before.sky]);
      assert.equal(leavesOf(scene).length, 0);
      assert.ok(swayers(scene).every((s) => s.rotation.z === 0));
    }
    assert.ok(top > 0.7 && top <= 0.8 + 1e-9, `brightened by ${top}`);
    const after = looks(draw());
    assert.equal(after.light, before.light, 'and back to what it was');
    assert.ok(after.backdrop.every((c, i) => c === before.backdrop[i]) && after.children.every((c, i) => c === before.children[i]));
  });

  test('no weather on the title, or on the error screen, whatever the weather is doing', () => {
    for (const screen of ['title', 'error']) {
      const game = new Game(short1, { weatherRandom: seeded(1) });
      if (screen === 'title') game.loaded();
      else game.fail('webgl');
      const stage = createStage({ appendChild() {} }, game.level);
      const renderer = THREE.renderers.at(-1);
      game.weather.update(100); // it would be strewn with strikes, but the game is not live
      game.weather.strike = { at: game.weather.clock, distance: 60, bolt: { z: -60, points: [{ x: 0, y: 40, z: -60 }, { x: 1, y: 8, z: -60 }] } };
      stage.sync(game, 0.01);
      const scene = renderer.scene;
      assert.equal(game.screen, screen);
      assert.equal(hemisphere(scene).intensity, 1.2);
      assert.equal(named(scene, 'bolt').length + leavesOf(scene).length, 0);
      assert.ok(swayers(scene).every((s) => s.rotation.z === 0));
    }
  });
});
