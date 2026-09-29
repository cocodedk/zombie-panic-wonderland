// What the weather's tests share: a seeded random, short versions of the real levels (with their
// weather), and a game played on them.

import { Game } from '../src/logic/game.js';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';

// A seeded random in [0, 1).
export function seeded(seed) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 2 ** 32;
  };
}

// The real levels, weather and all, each with one short wave.
export const short1 = { ...level1, waves: [{ zombie: 1 }] };
export const short2 = { ...level2, waves: [{ zombie: 1 }] };

export const click = (game) => { game.pointerDown(); game.pointerUp(); };
export const tick = (game, seconds, dt = 0.01) => { for (let i = 0; i < Math.round(seconds / dt); i++) game.update(dt); };

// A game with the level's weather, past the title (and the intro card unless `intro`), with hearts to spare.
export function storm({ level = short1, weatherSeed = 5, random = () => 0.5, intro = false, ...options } = {}) {
  const game = new Game(level, { random, levels: [level], weatherRandom: seeded(weatherSeed), ...options });
  game.loaded();
  click(game);
  if (!intro) click(game);
  game.player.hearts = 99;
  return game;
}

// Runs until the game's weather has struck; returns the strike.
export function untilStrike(game, dt = 0.01) {
  while (!game.weather.strike) game.update(dt);
  return game.weather.strike;
}
