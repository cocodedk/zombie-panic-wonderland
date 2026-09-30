// Spec 31: the balance bounds hold in the data (there is no bot play-test: how it feels is played by hand).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level3 } from '../src/levels/level-3.js';
import { started } from './fast-helpers.js';

const W = level3.enemies.wolf;

describe('7. the balance bounds', () => {
  test('at most 2 wolves a wave, 4 hits, a 4-second run, 2 of 5 hearts at most every 1.5 seconds', () => {
    for (const wave of level3.waves) assert.ok((wave.wolf ?? 0) <= 2);
    assert.equal(W.hits, 4);
    assert.equal(-level3.spawn.z / W.speed, 4);
    assert.equal(W.hearts, 2);
    assert.equal(level3.player.hearts, 5);
    assert.equal(W.strikeEvery, 1.5);
  });

  test('the Popper fells a wolf in 0.5 seconds or less', () => {
    assert.ok(W.hits / level3.player.fireRate <= 0.5);
    const game = started(level3, { waves: [{ wolf: 1 }] });
    const [wolf] = game.enemies;
    game.setAim(wolf.id);
    game.firing = true;
    let t = 0;
    while (game.enemies.includes(wolf) && t < 5) {
      game.update(0.01);
      t += 0.01;
    }
    assert.ok(t <= 0.5 + 1e-9, `felled after ${t}`);
  });
});
