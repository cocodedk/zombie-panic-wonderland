// What spec 33's tests share: a game on level 3 with the Spider Queen in it.

import assert from 'node:assert/strict';
import { level3 } from '../src/levels/level-3.js';
import { started } from './fast-helpers.js';

// A game on level 3 with the Queen just arrived (5 hearts), the waves skipped.
export function fight({ random = () => 0.5, level = level3, ...options } = {}) {
  const game = started(level, { waves: [{ zombie: 1 }], random, ...options });
  game.enemies = [];
  game.queue = [];
  game.spawnBoss();
  game.player.hearts = 5;
  return game;
}

// Runs until the Queen's web ball is in the air; returns it.
export function untilSpit(game) {
  for (let i = 0; i < 300 && !game.pumpkins.length; i++) game.update(0.01);
  assert.equal(game.pumpkins.length, 1);
  return game.pumpkins[0];
}
