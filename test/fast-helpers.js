// What spec 18's tests share: games of the real levels (without weather) and waves sent whole.

import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { calm, click, level1 } from './helpers.js';

export const LEVELS = [level1, level2];
export const near = (a, b, tol = 1e-9, msg = '') => {
  if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg} ${a} ≈ ${b}`);
};
// The stage tints skin and shirt by up to 6% of their lightness (spec 20): `actual` [skin, shirt, pants]
// is close to `base`, the pants exact.
const channels = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const closeTo = (actual, base) => actual.forEach((c, i) => {
  if (i === 2) return assert.equal(c, base[i]);
  channels(c).forEach((v, k) => assert.ok(Math.abs(v - channels(base[i])[k]) <= 20, `${c} is not within the tint of ${base[i]}`));
});
// The level's zombies with no fast rule: the game as it played before this spec.
export const ordinary = (level) => ({ ...level, enemies: { ...level.enemies, zombie: { ...level.enemies.zombie, fast: undefined } } });

// A game past the title and the intro card, hearts to spare, wave 1 just started.
export function started(level, { waves = level.waves, random = () => 0.5, spacing, reducedMotion = false, levels } = {}) {
  const timing = spacing == null ? level.timing : { ...level.timing, spacing };
  const shaped = { ...calm(level), waves, timing };
  const game = new Game(shaped, { random, reducedMotion, levels: levels ?? [shaped] });
  game.loaded();
  click(game);
  click(game);
  game.player.hearts = 999;
  return game;
}

// Wave `n` sent whole, each enemy as it appears, in order: { kind, fast, x }.
export function sendWave(game, n) {
  const seen = new Set();
  const order = [];
  const look = () => {
    for (const e of game.enemies) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      order.push({ kind: e.kind, fast: e.fast === true, x: e.x });
    }
  };
  game.enemies = [];
  game.startWave(n);
  look();
  for (let i = 0; i < 5000 && game.queue.length; i++) {
    game.update(0.01);
    look();
  }
  return order;
}

// Wave 2 of a level with a wave 1 of one zombie and a wave 2 of four, all four at once: the fourth is fast.
export function fastAmongFour(level, random, options = {}) {
  const game = started(level, { waves: [{ zombie: 1 }, { zombie: 4 }], random, spacing: 0, ...options });
  game.enemies = [];
  game.startWave(2);
  const zombies = game.enemies.filter((e) => e.kind === 'zombie');
  return { game, zombies, fast: zombies[3] };
}

// Seconds until `e` is on the road.
export function arrival(game, e, dt = 0.01) {
  let t = 0;
  while (e.z < game.level.roadZ - 1e-6 && t < 30) {
    game.update(dt);
    t += dt;
  }
  return t;
}
