// Spec 32: a paused bat, fresh starts, and the balance bounds in the data.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level3 } from '../src/levels/level-3.js';
import { run } from './helpers.js';
import { started } from './fast-helpers.js';

const B = level3.enemies.bat;
const batGame = () => started(level3, { waves: [{ bat: 1 }], random: () => 0.5 });

describe('5. paused and fresh starts', () => {
  test('paused, a bat hangs still and goes on from there', () => {
    const game = batGame();
    run(game, 0.5);
    const bat = game.enemies[0];
    const timer = bat.timer;
    game.pressEsc();
    run(game, 3);
    assert.equal(game.screen, 'paused');
    assert.equal(bat.timer, timer);
    game.pressEsc();
    run(game, 0.7);
    assert.equal(bat.diveX, 0);
    assert.equal(game.enemies.length, 1);
  });

  test('a level start and Try again start with none', () => {
    const game = batGame();
    run(game, 2);
    assert.equal(game.flyaways.length, 1);
    game.begin(game.level, 0);
    assert.deepEqual([game.enemies.length, game.flyaways.length], [0, 0]);
    game.end('defeat'); // the scene freezes as it is, a bat in the air stays
    game.restart();
    assert.deepEqual([game.enemies.length, game.flyaways.length], [0, 0]);
  });
});

describe('6. the balance bounds hold in the data', () => {
  test('at most 3 bats a wave, 1 hit, 1.8 seconds from arrival to landing, 1 heart at most', () => {
    for (const wave of level3.waves) assert.ok((wave.bat ?? 0) <= 3);
    assert.equal(B.hits, 1);
    assert.ok(Math.abs(B.circle + B.dive - 1.8) < 1e-9);
    assert.ok((B.hearts ?? 1) <= 1);
    const game = batGame();
    game.player.hearts = 5;
    run(game, 1.8);
    assert.equal(game.player.hearts, 4);
  });
});
