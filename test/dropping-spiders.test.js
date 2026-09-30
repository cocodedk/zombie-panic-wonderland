// Spec 30: the dropping spider's rule, its lowering, and where it is hit.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { level3 } from '../src/levels/level-3.js';
import { dropHeight } from '../src/logic/game.js';
import { run } from './helpers.js';
import { started, arrival, near } from './fast-helpers.js';

const S = level3.enemies.spider;
const D = S.drop;

// Wave `n` sent whole (all at once, in order), with the game's `random` counted.
function sent(waves, n, { level = level3, reducedMotion = false } = {}) {
  let calls = 0;
  const game = started(level, { waves, random: () => (calls++, 0.5), spacing: 0, reducedMotion });
  game.enemies = [];
  calls = 0;
  game.startWave(n);
  return { game, wave: [...game.enemies], calls: () => calls };
}
const flags = (wave) => wave.filter((e) => e.kind === 'spider').map((e) => e.drop !== undefined);

// A game holding one hanging dropper, alone: wave 2's third spider, x = 0.
function hanging(options = {}) {
  const { game, wave } = sent([{ spider: 1 }, { spider: 3 }], 2, options);
  const dropper = wave[2];
  game.enemies = [dropper];
  game.canisters = []; // wave 2's gas canister would go off in a blast test
  return { game, dropper };
}

describe('1. every 3rd spider of a wave from wave 2 is a dropper', () => {
  test('level 3\'s data', () => {
    assert.deepEqual(D, { fromWave: 2, every: 3, at: -5, from: 5, time: 1.2 });
  });

  test('wave 1 has none; each later wave has its 3rd spider only, the counts and order unchanged', () => {
    const expected = [[4, 2, 0, 0, 1, 0], [5, 3, 0, 0, 2, 1], [5, 3, 1, 1, 2, 2], [6, 4, 2, 2, 3, 2], [6, 5, 2, 2, 3, 3]];
    expected.forEach(([zombie, spider, wolf, pumpkinMonster, crow, bat], i) => {
      const { wave } = sent(level3.waves, i + 1);
      const kinds = [['zombie', zombie], ['spider', spider], ['wolf', wolf], ['pumpkinMonster', pumpkinMonster], ['crow', crow], ['bat', bat]].flatMap(([k, n]) => Array(n).fill(k));
      assert.deepEqual(wave.map((e) => e.kind), kinds, `wave ${i + 1}`);
      assert.deepEqual(flags(wave), Array.from({ length: spider }, (_, k) => i >= 1 && k === 2), `wave ${i + 1}`);
      assert.ok(wave.filter((e) => e.kind !== 'spider').every((e) => e.drop === undefined), `wave ${i + 1}`);
    });
  });

  test('the count counts spiders only, and starts again each wave (the 3rd and 6th of 7)', () => {
    const waves = [{ spider: 3 }, { zombie: 2, spider: 7, crow: 1 }, { spider: 2 }, { spider: 4 }];
    const dropperIndexes = (n) => flags(sent(waves, n).wave).flatMap((f, i) => (f ? [i] : []));
    assert.deepEqual([1, 2, 3, 4].map(dropperIndexes), [[], [2, 5], [], [2]]);
  });

  test('a dropper is placed at z -5, hanging 5 up at its usual x, with a spider\'s health and strike', () => {
    const { wave } = sent([{ spider: 1 }, { spider: 3 }], 2);
    wave.forEach((e, i) => {
      assert.equal(e.health, 2);
      assert.equal(e.strike, 1.2);
      assert.equal(e.x, 0);
      assert.deepEqual([e.z, e.drop], i === 2 ? [-5, 1.2] : [-12, undefined]);
    });
    assert.equal(dropHeight(wave[2], D), 5);
    assert.equal(dropHeight(wave[0], D), 0);
  });

  test('the game\'s random is not used for it, and nothing else about a wave changes', () => {
    const plain = { ...level3, enemies: { ...level3.enemies, spider: { ...S, drop: undefined } } };
    for (let n = 1; n <= 5; n++) {
      const a = sent(level3.waves, n);
      const b = sent(level3.waves, n, { level: plain });
      assert.equal(a.calls(), b.calls(), `wave ${n}`);
      assert.deepEqual(a.wave.map((e) => [e.kind, e.x, e.health]), b.wave.map((e) => [e.kind, e.x, e.health]), `wave ${n}`);
    }
  });
});

describe('2. it lowers evenly over 1.2 seconds, then walks as a spider', () => {
  test('5 up at first, level with the ground after 1.2 seconds, evenly, staying at z -5', () => {
    const { game, dropper } = hanging();
    for (let step = 1; step <= 119; step++) {
      game.update(0.01);
      near(dropHeight(dropper, D), 5 * (1 - step / 120), 1e-9, `step ${step}`);
      assert.equal(dropper.z, -5);
      assert.equal(dropper.x, 0);
    }
    game.update(0.01);
    assert.equal(dropper.drop, undefined, 'landed: its drop is absent');
    assert.equal(dropHeight(dropper, D), 0);
    assert.equal(dropper.z, -5);
  });

  test('while it lowers it neither walks nor strikes, though the road and the player are in reach', () => {
    const { game, dropper } = hanging();
    dropper.z = game.level.roadZ; // hung over the road, at the player
    run(game, 1.1);
    assert.equal(dropper.z, game.level.roadZ);
    assert.equal(dropper.x, game.player.x);
    assert.equal(dropper.strike, 1.2);
    assert.equal(game.player.hearts, 999);
    run(game, 0.1); // lands; a landed spider then strikes 1.2 seconds on
    run(game, 1.1);
    assert.equal(game.player.hearts, 999);
    run(game, 0.2);
    assert.equal(game.player.hearts, 998);
  });

  test('landed, it walks from z -5 and reaches the road in 5 / 2.2 seconds', () => {
    const { game, dropper } = hanging();
    run(game, 1.2);
    assert.equal(dropper.drop, undefined);
    const took = arrival(game, dropper);
    assert.ok(Math.abs(took - 5 / S.speed) <= 0.02, `reached the road after ${took}`);
  });

  test('paused, a hanging dropper stays where it is and goes on from there', () => {
    const { game, dropper } = hanging();
    run(game, 0.5);
    const drop = dropper.drop;
    game.pressEsc();
    run(game, 3);
    assert.equal(dropper.drop, drop);
    game.pressEsc();
    run(game, 0.2);
    near(dropper.drop, drop - 0.2, 1e-9);
  });

  test('Try again, and a wave sent again, start with none hanging', () => {
    const { game } = hanging();
    game.player.hearts = 1;
    game.enemies[0].z = game.level.roadZ;
    game.end('defeat');
    game.restart();
    assert.deepEqual(game.enemies, []);
    assert.equal(game.sentSpiders, 0);
  });
});

describe('3. it is hit and felled while hanging, at its airborne place', () => {
  const lowered = (options) => {
    const made = hanging(options);
    run(made.game, 0.6); // half way: root 2.5 up, body 2.8
    return made;
  };

  test('its centre is its root\'s height plus 0.3; a landed one is at 0.3', () => {
    const { game, dropper } = lowered();
    near(dropHeight(dropper, D), 2.5, 1e-9);
    near(game.centre(dropper).y, 2.8, 1e-9);
    run(game, 0.6);
    assert.equal(game.centre(dropper).y, 0.3);
  });

  test('2 hits and 150 points, with the burst and the score bubble in the air', () => {
    const { game, dropper } = lowered();
    const score = game.score;
    game.setAim(dropper.id);
    game.shoot();
    assert.equal(game.enemies.length, 1);
    game.shoot();
    assert.equal(game.enemies.length, 0);
    assert.equal(game.score, score + 150);
    assert.ok(game.effects.chunks.length > 0);
    for (const c of game.effects.chunks) near(c.pos.y, 2.8, 1e-9);
    for (const p of game.effects.puffs) near(p.pos.y, 2.8, 1e-9);
    assert.equal(game.effects.puffs.length, 1);
    const [bubble] = game.effects.bubbles;
    assert.equal(bubble.points, 150);
    near(bubble.pos.y, 2.8 + 0.5, 1e-9);
    assert.deepEqual([bubble.pos.x, bubble.pos.z], [0, -5]);
  });

  test('the launcher\'s blast reaches its airborne centre, not the ground under it', () => {
    const near2 = (y) => {
      const { game, dropper } = lowered();
      game.explode({ x: 0, y, z: -5 });
      return game.enemies.includes(dropper);
    };
    assert.equal(near2(2.8 - 2.4), false, 'a blast 2.4 below its body fells it');
    assert.equal(near2(0), true, 'a blast on the ground, 2.8 from its body, does not');
  });

  test('under reduced motion a fading copy is drawn from its root in the air', () => {
    const { game, dropper } = lowered({ reducedMotion: true });
    game.setAim(dropper.id);
    game.shoot();
    game.shoot();
    assert.equal(game.enemies.length, 0);
    const [fade] = game.effects.fades;
    assert.equal(fade.kind, 'spider');
    assert.equal(fade.drop, undefined, 'a copy carries no drop, so no thread');
    near(fade.y, 2.5, 1e-9);
    assert.deepEqual([fade.x, fade.z], [0, -5]);
    near(game.effects.bubbles[0].pos.y, 2.8 + 0.5, 1e-9);
  });
});
