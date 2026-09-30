// Spec 19: point bubbles. The awards: one bubble for each, with its points and where it starts;
// a score the bubbles never touch; and the size limits.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Effects } from '../src/logic/effects.js';
import { Game, pumpkinAt } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { level1, kill, click } from './helpers.js';
import { started, fastAmongFour } from './fast-helpers.js';
import { short1, win } from './journey.js';

const points = (game) => game.effects.bubbles.map((b) => b.points);
const pumpkin = (id, extra = {}) => ({ id, owner: 1, fromX: 0, fromZ: -20, x: 0, t: 0.3, flight: 1.2, hearts: 1, points: 25, ...extra });

// A game whose only wave is `kind`, sent at once, with the first enemy.
function fightOne(level, kind, options = {}) {
  const game = started(level, { waves: [{ [kind]: 1 }], spacing: 0, ...options });
  return { game, enemy: game.enemies[0] };
}

test('1. each award makes one bubble with the points it gave', () => {
  const { game, enemy } = fightOne(level1, 'zombie');
  kill(game, enemy);
  assert.deepEqual(points(game), [100]);
  assert.equal(game.score, 100);

  const { game: fastGame, fast } = fastAmongFour(level1, () => 0.5);
  kill(fastGame, fast);
  assert.deepEqual(points(fastGame), [200], 'double a zombie\'s');

  const monster = fightOne(level1, 'pumpkinMonster');
  kill(monster.game, monster.enemy);
  assert.deepEqual(points(monster.game), [250]);

  const crow = fightOne(level2, 'crow');
  kill(crow.game, crow.enemy);
  assert.deepEqual(points(crow.game), [level2.enemies.crow.points]);

  const { game: shot } = fightOne(level1, 'zombie');
  shot.pumpkins.push(pumpkin(99));
  shot.hit(99);
  assert.deepEqual(points(shot), [25]);
  assert.equal(shot.score, 25);
});

test('1. the bubble starts 1.5 above where it fell, a crow\'s 0.5 above its height, a pumpkin\'s 1.5 above it', () => {
  const { game, enemy } = fightOne(level1, 'zombie');
  kill(game, enemy);
  assert.deepEqual(game.effects.bubbles[0].pos, { x: enemy.x, y: 1.5, z: enemy.z });

  const crow = fightOne(level2, 'crow');
  const at = crow.game.centre(crow.enemy);
  kill(crow.game, crow.enemy);
  assert.deepEqual(crow.game.effects.bubbles[0].pos, { x: at.x, y: at.y + 0.5, z: at.z });

  const { game: shot } = fightOne(level1, 'zombie');
  const p = pumpkin(99);
  shot.pumpkins.push(p);
  const air = pumpkinAt(p, level1.roadZ);
  shot.hit(99);
  assert.deepEqual(shot.effects.bubbles[0].pos, { x: air.x, y: air.y + 1.5, z: air.z });
});

test('1. every weapon and an explosion: one bubble per award', () => {
  for (const weapon of ['popper', 'scattergun', 'gatling']) {
    const { game, enemy } = fightOne(level1, 'zombie');
    game.owned[weapon] = true;
    game.ammo[weapon] = 999;
    game.take(weapon);
    kill(game, enemy);
    assert.deepEqual(points(game), [100], weapon);
  }
  const { game, enemy } = fightOne(level1, 'zombie');
  game.pumpkins.push(pumpkin(99, { x: enemy.x }));
  game.explode({ x: enemy.x, y: 1, z: enemy.z }, { blast: 999, hits: 3 });
  assert.deepEqual(points(game), [25, 100], 'the pumpkin shot down, the zombie felled');
  assert.equal(game.score, 125);
});

test('1. the boss shows its points; what bursts with it shows none', () => {
  const game = started(level1, { waves: [{ zombie: 1 }] });
  game.enemies = [];
  game.spawnBoss();
  const boss = game.enemies[0];
  const other = game.spawn('zombie');
  game.pumpkins.push(pumpkin(99, { owner: boss.id }), pumpkin(98, { owner: other.id }));
  kill(game, boss);
  assert.deepEqual(points(game), [level1.boss.points]);
  assert.equal(game.score, level1.boss.points);
  assert.equal(game.effects.bubbles[0].pos.y, 1.5);
});

test('7. the score and the game\'s random are the same with and without the bubbles', () => {
  const play = () => {
    let calls = 0;
    const game = new Game(short1, { levels: [short1], random: () => (calls++, 0.5) });
    game.loaded();
    click(game);
    click(game);
    win(game);
    return { score: game.score, calls, state: game.snapshot() };
  };
  const shown = play();
  const bubble = Effects.prototype.bubble;
  Effects.prototype.bubble = () => {};
  try {
    assert.deepEqual(play(), shown);
  } finally {
    Effects.prototype.bubble = bubble;
  }
  assert.equal(shown.score, 100 + level1.boss.points);
});

test('8. the new files and the changed ones stay within their limits', async () => {
  const { readFileSync } = await import('node:fs');
  const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
  for (const path of ['src/logic/effects.js', 'src/view/bubbles.js', 'test/point-bubbles.test.js', 'test/point-bubbles-curve.test.js', 'test/point-bubbles-view.test.js']) {
    assert.ok(lines(path) < 200, `${path}: ${lines(path)}`);
  }
  assert.ok(lines('src/logic/game.js') <= 852 + 10, `${lines('src/logic/game.js')}`);
  assert.ok(lines('src/view/stage.js') <= 316 + 10, `${lines('src/view/stage.js')}`);
});
