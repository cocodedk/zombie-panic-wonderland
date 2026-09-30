// Spec 19: point bubbles. The curve of one bubble, reduced motion, the cap of 12, pause and the end
// screens, and the clears.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Effects, BUBBLE, bubbleLook } from '../src/logic/effects.js';
import { Game } from '../src/logic/game.js';
import { level1, run, kill, click, clearWave } from './helpers.js';
import { started, near } from './fast-helpers.js';
import { short1, journey, win } from './journey.js';

const points = (game) => game.effects.bubbles.map((b) => b.points);
const AT = { x: 1, y: 1.5, z: 2 };

test('2. the bubble\'s curve: 60% at first, full at 0.15 s, risen 1.6 and gone at 1.2 s', () => {
  const fx = new Effects();
  fx.bubble(100, AT);
  const [b] = fx.bubbles;
  near(bubbleLook(b).scale, 0.6);
  near(bubbleLook(b).drift, 0, 1e-12, 'it starts exactly where the enemy fell');
  let swung = 0;
  let last = 0;
  for (let step = 1; step <= 24; step++) {
    fx.update(0.05);
    const age = step * 0.05;
    if (step === 24) assert.deepEqual(fx.bubbles, [], 'gone from the list at 1.2 s');
    const look = bubbleLook(b, age);
    if (age >= 0.15 - 1e-9) near(look.scale, 1, 1e-9, `size at ${age}`);
    if (age <= 0.8 + 1e-9) near(look.opacity, 1, 1e-9, `opacity at ${age}`);
    assert.ok(Math.abs(look.drift) <= 0.15 + 1e-9, `drift at ${age}`);
    assert.ok(look.rise >= last - 1e-9, 'it only rises');
    last = look.rise;
    swung = Math.max(swung, Math.abs(look.drift));
  }
  const end = bubbleLook(b, BUBBLE.life);
  near(end.rise, 1.6);
  near(end.opacity, 0);
  near(end.drift, 0, 1e-9, 'one swing over its life');
  for (let id = 1; id <= 12; id++) {
    const other = { phase: (id * 2.399963) % (Math.PI * 2), life: BUBBLE.life, age: 0 };
    for (let age = 0; age <= 1.2; age += 0.01) assert.ok(Math.abs(bubbleLook(other, age).drift) <= 0.15 + 1e-9, `phase ${id} at ${age}`);
  }
  assert.ok(swung > 0.05, 'it drifts sideways');
  assert.ok(bubbleLook(b, 1.0).opacity < 1 && bubbleLook(b, 1.0).opacity > 0, 'fading between 0.8 and 1.2 s');
});

test('2. two bubbles do not move together, and no random is read for them', () => {
  const fx = new Effects({ random: () => { throw new Error('random'); } });
  fx.bubble(100, AT);
  fx.bubble(100, AT);
  fx.update(0.3);
  const [a, b] = fx.bubbles;
  assert.notEqual(bubbleLook(a).drift, bubbleLook(b).drift);
});

test('3. with reduced motion a bubble stays put at full size and fades over 0.8 s', () => {
  const fx = new Effects({ reducedMotion: true });
  fx.bubble(100, AT);
  const [b] = fx.bubbles;
  assert.deepEqual(b.pos, AT);
  for (let step = 0; step < 8; step++) {
    const look = bubbleLook(b);
    assert.deepEqual([look.scale, look.rise, look.drift], [1, 0, 0]);
    near(look.opacity, 1 - (step * 0.1) / 0.8, 1e-9);
    fx.update(0.1);
  }
  assert.deepEqual(fx.bubbles, [], 'gone at 0.8 s');
  near(bubbleLook({ reduced: true, life: 0.8 }, 0.8).opacity, 0);
});

test('3. the game hands its reduced-motion flag to its bubbles', () => {
  for (const reducedMotion of [false, true]) {
    const game = started(level1, { waves: [{ zombie: 1 }], spacing: 0, reducedMotion });
    kill(game, game.enemies[0]);
    assert.equal(game.effects.bubbles[0].reduced, reducedMotion);
  }
});

test('4. no more than 12 bubbles; the oldest goes first', () => {
  const fx = new Effects();
  for (let p = 1; p <= 15; p++) fx.bubble(p, AT);
  assert.equal(fx.bubbles.length, 12);
  assert.deepEqual(fx.bubbles.map((b) => b.points), [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
});

test('5. paused, the bubbles stand still and go on from the same age', () => {
  const game = started(level1, { waves: [{ zombie: 1 }], spacing: 0 });
  kill(game, game.enemies[0]);
  game.update(0.3);
  const [b] = game.effects.bubbles;
  const seen = { ...b, pos: { ...b.pos } };
  game.pressEsc();
  run(game, 5);
  assert.equal(game.screen, 'paused');
  assert.deepEqual(game.effects.bubbles, [seen]);
  game.pressEsc();
  game.update(0.1);
  near(b.age, 0.4);
});

test('5. on defeat and victory the bubbles stand still', () => {
  const lost = journey();
  lost.effects.bubble(100, AT);
  lost.update(0.2);
  lost.player.hearts = 1;
  lost.hurt();
  assert.equal(lost.screen, 'defeat');
  run(lost, 3);
  assert.equal(lost.effects.bubbles.length, 1);
  near(lost.effects.bubbles[0].age, 0.2);

  const won = journey();
  clearWave(won);
  run(won, won.level.timing.gap + won.level.timing.bossBanner + 0.05);
  kill(won, won.enemies.find((e) => e.kind === 'boss'));
  assert.deepEqual(points(won), [level1.boss.points]);
  run(won, 1.1);
  assert.equal(won.effects.bubbles.length, 1, 'the boss\'s own bubble is still rising');
  won.effects.bubble(100, AT);
  run(won, 0.4);
  assert.equal(won.screen, 'victory');
  assert.deepEqual(points(won), [100], 'the boss\'s bubble is gone before the card');
  const age = won.effects.bubbles[0].age;
  run(won, 3);
  assert.deepEqual(points(won), [100]);
  assert.equal(won.effects.bubbles[0].age, age);
});

test('5. a level start, Try again, Play again, Next level and Back to title clear them', () => {
  const game = new Game(short1, { levels: [short1, short1], random: () => 0.5 });
  game.loaded();
  game.effects.bubble(100, AT);
  click(game);
  assert.equal(game.screen, 'intro');
  assert.deepEqual(game.effects.bubbles, [], 'a level start');

  click(game);
  game.player.hearts = 1;
  game.hurt();
  assert.equal(game.screen, 'defeat');
  game.effects.bubble(100, AT);
  game.restart();
  assert.deepEqual(game.effects.bubbles, [], 'Try again');

  for (const [name, leave] of [['Play again', (g) => g.restart()], ['Next level', (g) => g.nextLevel()], ['Back to title', (g) => g.toTitle()]]) {
    const won = journey();
    win(won);
    won.effects.bubble(100, AT);
    leave(won);
    assert.deepEqual(won.effects.bubbles, [], name);
  }
});
