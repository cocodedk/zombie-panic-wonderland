// What spec 28's tests share: the three levels each with one short wave, and games on them.

import { readFileSync } from 'node:fs';
import { Game } from '../src/logic/game.js';
import { level3 } from '../src/levels/level-3.js';
import { click } from './helpers.js';
import { withWaves, short1, short2, win } from './journey.js';

export const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
export const short3 = withWaves(level3, [{ crow: 1, zombie: 1 }]);

// The three levels, each one short wave: past the title and level 1's intro card.
export function journey3() {
  const game = new Game(short1, { levels: [short1, short2, short3], random: () => 0.5 });
  game.loaded();
  click(game);
  click(game);
  return game;
}

// On level 3's intro card, by Next level from level 2's victory.
export function atLevel3() {
  const game = journey3();
  win(game);
  game.nextLevel();
  click(game);
  win(game);
  game.nextLevel();
  return game;
}
