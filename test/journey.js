import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { run, kill, clearWave, click, level1, calm } from './helpers.js';

// The level with these waves and no weather: these tests list cues, and no thunder comes into them.
export const withWaves = (level, waves) => ({ ...calm(level), waves });

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

// Clears the wave, waits for the boss, fells it and waits out its 1.5-second burst.
export function win(game) {
  clearWave(game);
  run(game, game.level.timing.gap + game.level.timing.bossBanner + 0.05);
  kill(game, game.enemies.find((e) => e.kind === 'boss'));
  run(game, 1.5);
  assert.equal(game.screen, 'victory');
}
