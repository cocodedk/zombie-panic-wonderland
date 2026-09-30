// Games for spec 27's tests: the title, and one game on each screen.

import { Game } from '../src/logic/game.js';
import { run, click } from './helpers.js';
import { short1, short2, journey, win } from './journey.js';

// A game on the title, with both levels.
export function titled() {
  const game = new Game(short1, { levels: [short1, short2], random: () => 0.5 });
  game.loaded();
  return game;
}

// One game on each screen, by the screen's name.
export function screens() {
  const loading = new Game(short1, { levels: [short1, short2] });
  const error = new Game(short1, { levels: [short1, short2] });
  error.fail('network');
  const intro = titled();
  click(intro);
  const play = journey();
  const paused = journey();
  paused.pressEsc();
  const victory = journey();
  win(victory);
  const defeat = journey();
  run(defeat, 20);
  return { loading, error, title: titled(), intro, play, paused, victory, defeat };
}
