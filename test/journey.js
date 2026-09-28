import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { run, kill, clearWave, click, level1 } from './helpers.js';

export const withWaves = (level, waves) => ({ ...level, waves });

// Both levels, each one short wave, as the page plays them.
export const short1 = withWaves(level1, [{ zombie: 1 }]);
export const short2 = withWaves(level2, [{ crow: 1, zombie: 1 }]);

// Past the title and level 1's intro card.
export function journey() {
  const game = new Game(short1, { levels: [short1, short2], random: () => 0.5 });
  game.loaded();
  click(game);
  click(game);
  return game;
}

// Clears the wave, waits for the boss and fells it.
export function win(game) {
  clearWave(game);
  run(game, game.level.timing.gap + game.level.timing.bossBanner + 0.05);
  kill(game, game.enemies.find((e) => e.kind === 'boss'));
  assert.equal(game.screen, 'victory');
}
