// Spec 13: gas canisters that blow up: when they stand, how shots and blasts treat them, their
// blast, that they are never enemies, and their model, explosion, cue and pause.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { Game } from '../src/logic/game.js';
import { CANISTER, placeCanisters, canisterAt } from '../src/logic/canisters.js';
import { WEAPONS, crateAt } from '../src/logic/weapons.js';
import { pumpkinAt } from '../src/logic/game.js';
import { mix } from '../src/logic/sound.js';
import { level2 } from '../src/levels/level-2.js';
import { level1, playing, levelWith, run, kill, clearWave, click } from './helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');
const { buildCanister } = await import('../src/view/models/canister.js');

const hex = (color) => `#${color.getHexString()}`;
const named = (scene, name) => scene.children.filter((c) => c.name === name);
const cues = (game) => game.cues.map((c) => c.name);
// A seeded random, so the canisters stand somewhere different each wave.
const lcg = (seed) => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

// Wave 2 of a two-wave level has just started, with its canisters and one zombie.
function wave2({ random = () => 0.5, reducedMotion = false, waves = [{ zombie: 1 }, { zombie: 1 }] } = {}) {
  const game = new Game(levelWith(waves), { random, reducedMotion });
  game.loaded();
  click(game);
  click(game);
  kill(game, game.enemies[0]);
  game.update(0.01);
  run(game, game.level.timing.gap);
  assert.equal(game.wave, 2);
  game.cues.length = 0;
  return game;
}

// A zombie that does not fall, standing at `x`, `z`.
function durable(game, x, z) {
  const e = game.spawn('zombie');
  Object.assign(e, { x, z, health: 1e6 });
  return e;
}

function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return { stage, draw: () => { stage.sync(game, 0.01); return renderer.scene; } };
}

describe('1. when canisters stand', () => {
  for (const level of [level1, level2]) {
    test(`${level.name}: 2 when each of waves 2 to 5 starts, in the area and 4 apart; none in wave 1 or the boss fight; gone when their wave is cleared`, () => {
      const game = playing(level, lcg(7));
      game.player.hearts = 1e6;
      for (let n = 1; n <= level.waves.length; n++) {
        assert.equal(game.wave, n);
        assert.equal(game.canisters.length, n === 1 ? 0 : 2, `wave ${n}`);
        for (const c of game.canisters) {
          assert.ok(c.x >= -6 && c.x <= 6 && c.z >= -8 && c.z <= -4, `wave ${n}: ${c.x}, ${c.z}`);
        }
        if (n > 1) {
          const [a, b] = game.canisters;
          assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 4, `wave ${n} apart`);
        }
        clearWave(game);
        assert.equal(game.phase, 'cleared');
        assert.deepEqual(game.canisters, [], `wave ${n} cleared`);
        run(game, level.timing.gap);
      }
      assert.equal(game.phase, 'announce');
      run(game, level.timing.bossBanner);
      assert.equal(game.phase, 'boss');
      assert.deepEqual(game.canisters, []);
    });
  }

  test('placing: inside the area and 4 apart even when the random repeats itself', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const [a, b] = placeCanisters(() => r);
      for (const c of [a, b]) assert.ok(c.x >= -6 && c.x <= 6 && c.z >= -8 && c.z <= -4, `${r}: ${c.x}, ${c.z}`);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 4, `${r}`);
    }
    const random = lcg(3);
    for (let i = 0; i < 200; i++) {
      const [a, b] = placeCanisters(random);
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 4);
    }
  });

  test('every reset clears canisters and their explosions', () => {
    const standing = (game) => {
      game.blowUp(game.canisters[0]);
      assert.equal(game.canisters.length, 1);
      assert.ok(game.effects.chunks.length > 0);
    };
    const cleared = (game, what) => {
      assert.deepEqual(game.canisters, [], what);
      assert.deepEqual([game.effects.chunks, game.effects.puffs], [[], []], what);
    };
    let game = wave2();
    standing(game);
    game.end('defeat');
    game.restart();
    cleared(game, 'Try again');

    game = wave2();
    standing(game);
    game.end('victory');
    game.restart();
    cleared(game, 'Play again');

    const short = levelWith([{ zombie: 1 }, { zombie: 1 }]);
    game = new Game(short, { random: () => 0.5, levels: [short, { ...short, number: 2 }] });
    game.loaded();
    click(game);
    click(game);
    kill(game, game.enemies[0]);
    game.update(0.01);
    run(game, game.level.timing.gap);
    standing(game);
    game.end('victory');
    game.nextLevel();
    cleared(game, 'Next level');
    assert.equal(game.level.number, 2);

    game = wave2();
    standing(game);
    game.end('victory');
    game.toTitle();
    cleared(game, 'Back to title');
    game.pointerDown();
    cleared(game, 'the level start');
    assert.equal(game.screen, 'intro');
  });
});

describe('2. shooting a canister', () => {
  test('each hit flashes it white for 0.08 seconds with the hit cue; the second blows it up', () => {
    const game = wave2();
    const [c] = game.canisters;
    game.setAim(c.id);
    game.shoot();
    assert.deepEqual(cues(game), ['shot', 'hit']);
    assert.equal(c.flash, CANISTER.flash);
    assert.equal(CANISTER.flash, 0.08);
    run(game, 0.08);
    assert.equal(c.flash, 0);
    assert.ok(game.canisters.includes(c), 'still standing after one hit');
    game.cues.length = 0;
    game.shoot();
    assert.deepEqual(cues(game), ['shot', 'hit', 'gas']);
    assert.ok(!game.canisters.includes(c), 'blown up by the second');
  });

  test('a canister shields what is behind it: a shot on its line hits only the canister', () => {
    const game = wave2();
    const [c] = game.canisters;
    const behind = durable(game, c.x, c.z - 2);
    behind.health = 3;
    game.setAim(c.id);
    game.shoot();
    assert.equal(behind.health, 3, 'the Popper\'s shot stops at the canister');
    c.hits = 0;
    game.weapon = 'scattergun';
    game.ammo.scattergun = 4;
    game.setAim(c.id, { x: c.x, y: 0.5, z: c.z }, [{ id: c.id, point: canisterAt(c) }]);
    game.shoot();
    assert.equal(c.hits, 1, 'a pellet hits the canister');
    assert.equal(behind.health, 3, 'and not what is behind it');

    const { stage, draw } = stageFor(wave2());
    draw();
    assert.equal(named(draw(), 'canister').length, 2);
    assert.ok(stage.pick({ x: 0, y: 0 }) != null, 'a canister can be aimed at');
  });

  test('a launcher blast that reaches it blows it up at once', () => {
    const game = wave2();
    const [c, other] = game.canisters;
    const at = canisterAt(c);
    game.explode({ ...at, x: at.x + WEAPONS.launcher.blast - 0.01 });
    assert.ok(!game.canisters.includes(c));
    assert.ok(game.canisters.includes(other), 'the other, further away, stands');
    assert.deepEqual(cues(game), ['boom', 'gas']);
  });
});

describe('3. the blast', () => {
  test('12 hits to every enemy within 3 units of its centre, none beyond', () => {
    const game = wave2();
    const [c] = game.canisters;
    const inside = durable(game, c.x + 2.9, c.z); // 0.5 above the centre: 2.94 away
    const outside = durable(game, c.x + 3.1, c.z);
    const above = durable(game, c.x, c.z - 2.9);
    game.blowUp(c);
    assert.equal(1e6 - inside.health, 12);
    assert.equal(1e6 - above.health, 12);
    assert.equal(outside.health, 1e6);
    assert.deepEqual([CANISTER.blast, CANISTER.damage], [3, 12]);
  });

  test('a pumpkin in the air within 3 units is shot down, for its points', () => {
    const game = wave2();
    const [c] = game.canisters;
    const p = { id: game.nextId++, owner: -1, fromX: 0, fromZ: -12, x: 0, t: 0.95 * 1.2, flight: 1.2, hearts: 1, points: 25 };
    game.pumpkins.push(p);
    const at = pumpkinAt(p, game.level.roadZ);
    Object.assign(c, { x: at.x, z: at.z - 1 });
    const score = game.score;
    game.blowUp(c);
    assert.deepEqual(game.pumpkins, []);
    assert.equal(game.score, score + 25);
  });

  test('a crate within 3 units takes one hit', () => {
    const game = wave2();
    const [c] = game.canisters;
    const crate = game.dropCrate('scattergun');
    crate.t = 3;
    const at = crateAt(crate);
    Object.assign(c, { x: at.x, z: at.z });
    game.blowUp(c);
    assert.equal(crate.hits, 1);
    assert.ok(game.crates.includes(crate));
  });

  test('it never hurts the player', () => {
    const game = wave2();
    const [c] = game.canisters;
    Object.assign(c, { x: game.player.x, z: game.level.roadZ });
    const hearts = game.player.hearts;
    game.blowUp(c);
    assert.equal(game.player.hearts, hearts);
    assert.ok(!cues(game).includes('hurt'));
  });

  test('points as for a launcher blast; the canister itself gives none', () => {
    const scored = (blast) => {
      const game = wave2({ waves: [{ zombie: 1 }, { zombie: 2 }] });
      run(game, 1.1); // the second zombie arrives
      const [c] = game.canisters;
      for (const [i, e] of game.enemies.entries()) Object.assign(e, { x: c.x + i, z: c.z });
      const score = game.score;
      blast(game, c);
      assert.equal(game.enemies.length, 0);
      return game.score - score;
    };
    const gas = scored((game, c) => game.blowUp(c));
    const launcher = scored((game, c) => {
      game.canisters = [];
      game.explode(canisterAt(c));
    });
    assert.equal(gas, 200);
    assert.equal(gas, launcher);

    const game = wave2();
    const score = game.score;
    game.setAim(game.canisters[0].id);
    game.shoot();
    game.shoot();
    assert.equal(game.score, score, 'nothing near: no points');
  });
});

describe('4. never enemies', () => {
  test('a wave is cleared while canisters stand, and get_state does not change', () => {
    const game = wave2();
    assert.equal(game.canisters.length, 2);
    assert.deepEqual(game.snapshot(), {
      level: 1, screen: 'play', wave: 2, score: 100, hearts: 5, enemies: 1,
      boss_health: null, weapon: 'popper', ammo: null, reloading: false,
    });
    kill(game, game.enemies[0]);
    game.update(0.01);
    assert.equal(game.phase, 'cleared');
    assert.deepEqual(game.canisters, []);
  });

  test('they never move and never block the player', () => {
    const game = wave2();
    const before = JSON.stringify(game.canisters);
    run(game, 2);
    assert.equal(JSON.stringify(game.canisters), before);
    Object.assign(game.canisters[0], { x: 1, z: game.level.roadZ });
    game.setMove(1);
    run(game, 1);
    assert.ok(game.player.x > 2, `walked through: ${game.player.x}`);
  });
});

describe('5. what the player sees and hears', () => {
  test('the model: a flat-shaded red cylinder, a yellow band, a dark grey valve, about 0.5 by 1', () => {
    const c = buildCanister();
    const [body, band, valve] = c.children;
    assert.deepEqual([body, band, valve].map((m) => hex(m.material.color)), ['#c0392b', '#f1c40f', '#444444']);
    c.traverse((m) => { if (m.material) assert.equal(m.material.flatShading, true); });
    assert.ok([body, band, valve].every((m) => m.geometry instanceof THREE.CylinderGeometry));
    assert.equal(body.geometry.params[0] * 2, 0.5);
    const top = valve.position.y + valve.geometry.params[2] / 2;
    const bottom = body.position.y - body.geometry.params[2] / 2;
    assert.ok(Math.abs(top - 1) < 1e-9 && Math.abs(bottom) < 1e-9, `${bottom}..${top}`);
    assert.ok(Math.abs(band.position.y - body.position.y) < 1e-9, 'the band around its middle');
  });

  test('the builder takes its colours and sizes as parameters', () => {
    const c = buildCanister({ body: '#112233', band: '#445566', valve: '#778899', width: 1, height: 2 });
    const [body, band, valve] = c.children;
    assert.deepEqual([body, band, valve].map((m) => hex(m.material.color)), ['#112233', '#445566', '#778899']);
    assert.equal(body.geometry.params[0] * 2, 1);
    assert.ok(Math.abs(valve.position.y + valve.geometry.params[2] / 2 - 2) < 1e-9);
  });

  test('drawn standing where it is, flashing white while hit; paused, the flash holds', () => {
    const game = wave2();
    const { draw } = stageFor(game);
    const [c] = game.canisters;
    const drawn = () => named(draw(), 'canister').find((o) => o.position.x === c.x && o.position.z === c.z);
    assert.deepEqual({ ...drawn().position }, { x: c.x, y: 0, z: c.z });
    const color = () => hex(drawn().children[0].material.color);
    assert.equal(color(), '#c0392b');
    game.setAim(c.id);
    game.shoot();
    assert.equal(color(), '#ffffff');
    game.pressEsc();
    run(game, 1);
    assert.equal(color(), '#ffffff', 'paused, it stays white');
    assert.equal(named(draw(), 'canister').length, 2, 'shown while paused');
    game.pressEsc();
    run(game, 0.08);
    assert.equal(color(), '#c0392b');
    game.end('defeat');
    assert.equal(named(draw(), 'canister').length, 2, 'lost during a wave, the scene keeps them');
  });

  test('the explosion: 20 chunks of orange and gas green and a 3-unit puff, over 0.7 seconds; paused, it holds', () => {
    const game = wave2();
    const [c] = game.canisters;
    game.effects.clear();
    game.blowUp(c);
    const fx = game.effects;
    assert.equal(fx.chunks.length, 20);
    assert.deepEqual([...new Set(fx.chunks.map((k) => k.color))].sort(), ['#9acd32', '#ff8c1a']);
    assert.ok(fx.chunks.every((k) => k.life === 0.7));
    assert.deepEqual(fx.puffs.map((p) => [p.size, p.life, p.pos]), [[3, 0.7, canisterAt(c)]]);
    const { draw } = stageFor(game);
    assert.equal(named(draw(), 'chunk').length, 20);
    game.pressEsc();
    const held = JSON.stringify([fx.chunks, fx.puffs]);
    run(game, 1);
    assert.equal(JSON.stringify([fx.chunks, fx.puffs]), held);
    game.pressEsc();
    run(game, 0.69);
    assert.equal(fx.puffs.length, 1);
    run(game, 0.01);
    assert.deepEqual([fx.chunks, fx.puffs], [[], []]);
  });

  test('with reduced motion, a 0.3-second flash of the puff and no chunks', () => {
    const game = wave2({ reducedMotion: true });
    const [c] = game.canisters;
    game.blowUp(c);
    const fx = game.effects;
    assert.equal(fx.chunks.length, 0);
    assert.deepEqual(fx.puffs.map((p) => [p.size, p.life, p.color]), [[3, 0.3, '#9acd32']]);
    run(game, 0.3);
    assert.equal(fx.puffs.length, 0);
  });

  test('the gas cue waits while paused and is dropped with the sound off', () => {
    const game = wave2();
    game.blowUp(game.canisters[0]);
    game.pressEsc();
    assert.deepEqual(mix(game).cues, []);
    game.pressEsc();
    assert.deepEqual(mix(game).cues.map((c) => c.name), ['gas']);
    game.toggleSound();
    game.blowUp(game.canisters[0]);
    assert.deepEqual(mix(game).cues, []);
  });
});
