// Spec 06: the bosses attack early, wind up before each action, and their stomp is felt.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game, SHAKE, bossWindup } from '../src/logic/game.js';
import { level2 } from '../src/levels/level-2.js';
import { run, clearWave, click, level1 } from './helpers.js';
import { withWaves } from './journey.js';

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} ≈ ${b}`);

// One short wave, then the boss, who has just appeared.
function fight(level, { random = () => 0.5, reducedMotion = false } = {}) {
  const game = new Game(withWaves(level, [{ zombie: 1 }]), { random, reducedMotion });
  game.loaded();
  click(game);
  click(game);
  clearWave(game);
  run(game, level.timing.gap + level.timing.bossBanner);
  assert.equal(game.enemies.length, 1);
  assert.equal(game.enemies[0].kind, 'boss');
  game.cues.length = 0;
  return game;
}

// Each wind-up cue and action over `seconds`, with when it came and where the boss stood.
function timeline(game, seconds) {
  const boss = game.enemies[0];
  const log = [];
  let t = 0;
  for (let i = 0; i < Math.round(seconds / 0.01); i++) {
    const before = boss.next;
    game.update(0.01);
    t += 0.01;
    for (const c of game.cues.splice(0)) if (c.name === 'windup') log.push({ what: 'windup', t });
    if (boss.next !== before) log.push({ what: game.level.boss.actions[before], t, z: boss.z });
  }
  return log;
}

describe('1 and 2. the first action 2 seconds after it appears, then every 3, each after a 0.6-second wind-up', () => {
  for (const [level, first, second] of [[level1, 'stomp', 'summon'], [level2, 'throw', 'summon']]) {
    test(`the ${level.boss.name}: ${first}, then ${second}, in turn`, () => {
      const game = fight(level);
      game.player.hearts = 99; // it lives through the whole rhythm
      const log = timeline(game, 11.5);
      const expected = [
        ['windup', 1.4], [first, 2], ['windup', 4.4], [second, 5], ['windup', 7.4], [first, 8], ['windup', 10.4], [second, 11],
      ];
      assert.deepEqual(log.map((l) => l.what), expected.map(([what]) => what));
      log.forEach((l, i) => near(l.t, expected[i][1], l.what));
      assert.ok(log[1].z < level.boss.standZ - 1, `the first action comes while it walks, at z = ${log[1].z}`);
    });
  }

  test('the wind-up runs from 0 to 1 over the 0.6 seconds, and back to rest after the action', () => {
    const game = fight(level1);
    const boss = game.enemies[0];
    run(game, 1.39);
    assert.equal(bossWindup(boss, level1.boss), 0);
    run(game, 0.31);
    near(bossWindup(boss, level1.boss), 0.5);
    run(game, 0.29);
    assert.ok(bossWindup(boss, level1.boss) > 0.98);
    run(game, 0.01);
    assert.equal(bossWindup(boss, level1.boss), 0);
  });
});

describe('3. the stomp is felt', () => {
  test('a stomp emits stomp; the shake starts when the shockwave reaches the road, for 0.25 seconds', () => {
    const game = fight(level1);
    run(game, 1.99);
    assert.deepEqual(game.cues.splice(0).map((c) => c.name), ['windup']);
    run(game, 0.01);
    assert.deepEqual(game.cues.splice(0).map((c) => c.name), ['stomp']);
    run(game, 0.99);
    assert.equal(game.shake, 0);
    run(game, 0.01);
    assert.equal(game.player.hearts, 4);
    near(game.shake, SHAKE.time);
    assert.deepEqual(SHAKE, { time: 0.25, size: 0.15 });
    run(game, 0.24);
    assert.ok(game.shake > 0);
    run(game, 0.01);
    assert.equal(game.shake, 0);
  });

  test('it shakes whether or not it costs a heart', () => {
    const game = fight(level1);
    run(game, 2.8);
    assert.ok(game.dodge());
    run(game, 0.2);
    assert.equal(game.player.hearts, 5);
    near(game.shake, SHAKE.time);
  });

  test('reduced motion gives no shake', () => {
    const game = fight(level1, { reducedMotion: true });
    run(game, 3);
    assert.equal(game.player.hearts, 4);
    assert.equal(game.shake, 0);
  });

  test('a stomp that takes the last heart shows the defeat card at once, with no shake behind it', () => {
    const game = fight(level1);
    game.player.hearts = 1;
    run(game, 3);
    assert.equal(game.screen, 'defeat');
    assert.equal(game.shake, 0);
  });

  test('pause holds the shake', () => {
    const game = fight(level1);
    run(game, 3.1);
    const left = game.shake;
    game.pressEsc();
    run(game, 1);
    assert.equal(game.shake, left);
  });
});

describe('4. summons come from the boss', () => {
  for (const level of [level1, level2]) {
    test(`the ${level.boss.name}'s ${level.boss.summons}s appear within 2 units of its x, at its z minus 2`, () => {
      for (const r of [0, 0.2, 0.5, 1]) {
        const game = fight(level, { random: () => r });
        game.player.hearts = 99;
        const boss = game.enemies[0];
        boss.x = 1.5; // wherever it stands
        run(game, 5);
        const summoned = game.enemies.filter((e) => e.kind === level.boss.summons);
        assert.equal(summoned.length, level.boss.summon);
        for (const s of summoned) {
          assert.ok(Math.abs(s.x - boss.x) <= 2 + 1e-9, `x = ${s.x}`);
          near(s.z, boss.z - 2, 'z');
        }
        near(summoned[0].x, boss.x + (r * 2 - 1) * 2, 'spread by the random');
      }
    });
  }
});

describe('5. longer fights', () => {
  for (const [level, hits] of [[level1, 200], [level2, 240]]) {
    test(`the ${level.boss.name} falls after ${hits} hits, for the same points`, () => {
      const game = fight(level);
      const boss = game.enemies[0];
      const before = game.score;
      game.setAim(boss.id);
      for (let i = 0; i < hits - 1; i++) game.shoot();
      assert.equal(game.enemies.includes(boss), true);
      game.shoot();
      assert.equal(game.enemies.includes(boss), false);
      assert.equal(game.score, before + level.boss.points);
    });
  }
});
