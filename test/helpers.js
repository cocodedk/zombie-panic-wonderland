import { Game } from '../src/logic/game.js';
import { level1 } from '../src/levels/level-1.js';

export { level1 };

// A game with a fixed random: 0.5 puts every enemy at x = 0, 1 at x = 8.
export function newGame(level = level1, random = () => 0.5) {
  const game = new Game(level, { random });
  game.loaded();
  return game;
}

// Past the title and the intro card: wave 1 has just started.
export function playing(level, random) {
  const game = newGame(level, random);
  click(game); // starts the level
  click(game); // skips the intro card
  return game;
}

export function click(game) {
  game.pointerDown();
  game.pointerUp();
}

export function levelWith(waves, extra = {}) {
  return { ...level1, waves, ...extra };
}

export function run(game, seconds, dt = 0.01) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) game.update(dt);
}

export function kill(game, enemy) {
  game.setAim(enemy.id);
  while (game.enemies.includes(enemy)) game.shoot();
  game.setAim(null);
}

// Lets the whole wave arrive, then shoots it down.
export function clearWave(game) {
  run(game, game.queue.length * game.level.timing.spacing + 0.01);
  for (const e of [...game.enemies]) kill(game, e);
  game.update(0.01);
}

export function kinds(game) {
  const count = {};
  for (const e of game.enemies) count[e.kind] = (count[e.kind] ?? 0) + 1;
  return count;
}
