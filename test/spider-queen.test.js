// Spec 33: the Spider Queen's fight: her data, her actions, the web ball and the web (game rules, no three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level3 } from '../src/levels/level-3.js';
import { run, kill } from './helpers.js';
import { started, near } from './fast-helpers.js';
import { fight, untilSpit } from './spider-queen-helpers.js';

describe('1. the boss', () => {
  test('her data and the announcement are as specified', () => {
    assert.deepEqual(level3.boss, {
      name: 'Spider Queen', model: 'spiderQueen', hits: 260, points: 4000, speed: 1.2, standZ: -3.5, firstAction: 2, actionEvery: 3, windup: 0.6,
      actions: ['spit', 'summon'], spit: { hearts: 1, points: 25, flight: 1.2, splash: 1, slow: 0.5, slowTime: 2 },
      summon: 3, summons: 'spider', summonNear: 2, summonBack: 2,
    });
    assert.equal(level3.text.boss, 'The Spider Queen descends!');
    assert.ok(!('stompDelay' in level3.boss) && !('stompReach' in level3.boss), 'she does not stomp');
  });

  test('she appears after wave 5, with the announcement and the bar', () => {
    const game = started(level3);
    game.player.hearts = 999;
    while (game.phase !== 'announce') {
      run(game, 0.5);
      for (const e of [...game.enemies]) kill(game, e);
    }
    assert.equal(game.wave, 5);
    assert.equal(game.banner, 'The Spider Queen descends!');
    assert.equal(game.enemies.length, 0);
    run(game, level3.timing.bossBanner);
    assert.equal(game.enemies.length, 1);
    assert.equal(game.enemies[0].kind, 'boss');
    assert.equal(game.bossHealth, 260);
  });

  test('she winds up 0.6 s before each action, and spits then summons every 3 s, the first after 2', () => {
    const game = fight();
    game.player.hearts = 999; // the spiders she summons strike
    const boss = game.enemies[0];
    const log = [];
    let t = 0;
    for (let i = 0; i < 1200; i++) {
      const next = boss.next;
      game.update(0.01);
      t += 0.01;
      if (game.cues.splice(0).some((c) => c.name === 'windup')) log.push(['windup', t]);
      if (boss.next !== next) log.push([level3.boss.actions[next], t]);
    }
    const expected = [['windup', 1.4], ['spit', 2], ['windup', 4.4], ['summon', 5], ['windup', 7.4], ['spit', 8], ['windup', 10.4], ['summon', 11]];
    assert.deepEqual(log.map(([what]) => what), expected.map(([what]) => what));
    log.forEach(([, at], i) => near(at, expected[i][1], 0.02, `event ${i}`));
    assert.equal(game.hint, null, 'the hint of the first wind-up has gone by 12 s');
  });

  test('she walks in to 3.5 behind the road, and stands there', () => {
    const game = fight();
    const boss = game.enemies[0];
    run(game, 3);
    near(boss.z, level3.spawn.z + 3 * 1.2, 1e-6);
    run(game, 10);
    assert.equal(boss.z, -3.5);
  });

  test('she falls after 260 hits for 4000 points, everything else bursts for none, and the victory card follows', () => {
    const game = fight();
    game.spawn('wolf');
    game.spawn('spider');
    const boss = game.enemies[0];
    run(game, 2.5); // her web ball is in the air
    assert.equal(game.pumpkins.length, 1);
    const score = game.score;
    game.setAim(boss.id);
    for (let i = 0; i < 259; i++) game.shoot();
    assert.equal(game.enemies.includes(boss), true);
    assert.equal(game.bossHealth, 1);
    game.shoot();
    assert.equal(game.score - score, 4000);
    assert.equal(game.bossHealth, 0);
    assert.deepEqual([game.enemies.length, game.pumpkins.length], [0, 0]);
    assert.notEqual(game.winTimer, null);
    run(game, 1.6);
    assert.equal(game.screen, 'victory');
    assert.equal(game.score - score, 4000);
  });
});

describe('2. the web ball', () => {
  test('it flies 1.2 s to the player\'s x at the throw, costing 1 heart and webbing for 2 s', () => {
    const game = fight();
    game.setMove(1);
    run(game, 0.5);
    game.setMove(0);
    const ball = untilSpit(game);
    assert.equal(ball.web, true);
    assert.equal(ball.flaming, false);
    assert.deepEqual([ball.flight, ball.hearts, ball.points], [1.2, 1, 25]);
    assert.equal(ball.x, game.player.x);
    assert.ok(game.cues.some((c) => c.name === 'throw'));
    run(game, 1.19);
    assert.equal(game.pumpkins.length, 1);
    assert.equal(game.player.hearts, 5);
    run(game, 0.01);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 4);
    assert.equal(game.player.webbed, 2);
  });

  test('within 1 of it costs, farther costs nothing and webs no one', () => {
    for (const [dx, hurt] of [[1, true], [1.01, false], [-1, true], [5, false]]) {
      const game = fight();
      const ball = untilSpit(game);
      run(game, 1.19);
      game.player.x = ball.x + dx;
      run(game, 0.01);
      assert.equal(game.player.hearts, hurt ? 4 : 5, `at ${dx}`);
      assert.equal(game.player.webbed, hurt ? 2 : 0, `at ${dx}`);
    }
  });

  test('a player who is dodging when it lands loses nothing and is not webbed', () => {
    const game = fight();
    untilSpit(game);
    run(game, 1.19);
    game.player.dodging = 0.3;
    run(game, 0.02);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.player.webbed, 0);
  });

  test('it can be shot down for 25 points, and then webs no one', () => {
    const game = fight();
    const ball = untilSpit(game);
    const score = game.score;
    run(game, 0.5);
    game.setAim(ball.id);
    game.shoot();
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.score - score, 25);
    run(game, 2);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.player.webbed, 0);
  });

  test('being hit by a web ball that kills does not need a web to end the game', () => {
    const game = fight();
    game.player.hearts = 1;
    untilSpit(game);
    run(game, 1.25);
    assert.equal(game.screen, 'defeat');
  });
});

describe('3. summon', () => {
  test('3 ordinary spiders appear within 2 of her x and 2 behind her z, and walk in', () => {
    for (const [random, x] of [[() => 0, -2], [() => 1, 2], [() => 0.5, 0]]) {
      const game = fight({ random });
      const boss = game.enemies[0];
      for (let i = 0; i < 600 && !game.enemies.some((e) => e.kind === 'spider'); i++) game.update(0.01);
      const spiders = game.enemies.filter((e) => e.kind === 'spider');
      assert.equal(spiders.length, 3);
      for (const s of spiders) {
        assert.ok(Math.abs(s.x - boss.x) <= 2 + 1e-9);
        assert.equal(s.x, boss.x + x);
        near(s.z, boss.z - 2, 0.05);
        assert.equal(s.drop, undefined, 'not a dropper');
        assert.equal(s.health, 2);
      }
      const z = spiders[0].z;
      run(game, 1);
      assert.ok(game.enemies.filter((e) => e.kind === 'spider')[0].z > z);
    }
  });
});
