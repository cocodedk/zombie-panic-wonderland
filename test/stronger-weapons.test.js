// Spec 10: weapons that are stronger and clearly different: their numbers, the Scattergun's tight
// cone, hits a second against a durable target, crosshairs, notices, and pellets you can see.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { WEAPONS, NOTICE_LIFE, CRATE, pelletDirs } from '../src/logic/weapons.js';
import { STREAK, PELLET, SPARK } from '../src/logic/effects.js';
import { screenView } from '../src/logic/screens.js';
import { pumpkinAt } from '../src/logic/game.js';
import { createHud } from '../src/view/hud.js';
import { playing, levelWith, run } from './helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const ROAD = 9.5; // units from the camera to the road
const ZOMBIE = 0.8; // units wide
const one = () => levelWith([{ zombie: 1 }]);
const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-6, `${msg} ${a} ≈ ${b}`);

// Collects a crate of `weapon` with three Popper shots, then clears the cues and the shot count.
function give(game, weapon) {
  game.weapon = 'popper';
  const crate = game.dropCrate(weapon);
  game.setAim(crate.id);
  for (let i = 0; i < CRATE.hits; i++) game.shoot();
  game.setAim(null);
  game.cues.length = 0;
  game.shots = 0;
  return game;
}

// How far each pellet passes from the aim point `ROAD` units along the aim `d`.
const misses = (d) => pelletDirs(d).map((v) => {
  const along = ROAD * (d.x * v.x + d.y * v.y + d.z * v.z);
  return Math.hypot(ROAD * d.x - along * v.x, ROAD * d.y - along * v.y, ROAD * d.z - along * v.z);
});

// A zombie at the road that does not fall, aimed at, and the pellet lines that pass through it.
function durable(game) {
  const z = game.enemies[0];
  z.health = 1e6;
  const lines = misses({ x: 0, y: 0, z: -1 }).map((m) => ({ id: m <= ZOMBIE / 2 ? z.id : null, point: { x: 0, y: 1, z: -ROAD } }));
  game.setAim(z.id, { x: z.x, y: 1, z: z.z }, lines);
  return z;
}

describe('1. the new numbers, and the Popper\'s unchanged', () => {
  test('Scattergun: 8 pellets in a 4° cone, 2 blasts a second, 2 hits a pellet, 16 shells', () => {
    const s = WEAPONS.scattergun;
    assert.deepEqual([s.pellets, s.cone, s.rate, s.hits, s.ammo], [8, 4, 2, 2, 16]);
  });

  test('Pumpkin launcher: 1.5 shots a second, a 0.35-second flight, a 2.5-unit blast of 12 hits, 8 rounds', () => {
    const l = WEAPONS.launcher;
    assert.deepEqual([l.rate, l.flight, l.blast, l.hits, l.ammo], [1.5, 0.35, 2.5, 12, 8]);
  });

  test('the Popper: 8 shots a second of 1 hit, never running out', () => {
    assert.deepEqual(WEAPONS.popper, { key: 1, name: 'Popper', ammo: null });
    const game = playing(one());
    assert.equal(game.level.player.fireRate, 8);
    const z = game.enemies[0];
    z.health = 1000;
    game.setAim(z.id);
    game.pointerDown();
    run(game, 0.99);
    assert.equal(1000 - z.health, 8);
  });

  test('a pumpkin in the air within the blast is still shot down', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    run(game, 2.6);
    const score = game.score;
    const at = pumpkinAt(game.pumpkins[0], game.level.roadZ);
    game.explode({ ...at, x: at.x + 2.4 });
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.score, score + 25);
  });
});

describe('2. the Scattergun\'s cone at the road', () => {
  test('at 9.5 units at least 6 of the 8 pellets pass within 0.4 units of the aim point', () => {
    for (const d of [{ x: 0, y: 0, z: -1 }, { x: 0.28, y: -0.19, z: -0.94 }]) {
      const l = Math.hypot(d.x, d.y, d.z);
      const m = misses({ x: d.x / l, y: d.y / l, z: d.z / l });
      assert.equal(m.length, 8);
      assert.ok(m.filter((x) => x <= 0.4).length >= 6, `${m}`);
    }
  });
});

describe('3. against a durable zombie-sized target at the road', () => {
  test('the Scattergun deals at least 16 hits a second, more than the Popper\'s 8', () => {
    const game = give(playing(one()), 'scattergun');
    const z = durable(game);
    const before = z.health;
    game.pointerDown();
    run(game, 0.99);
    const hits = before - z.health;
    assert.ok(hits >= 16 && hits > 8, `${hits} hits a second`);
  });

  test('the launcher deals at least 12 hits a shot, more than the Popper\'s 8 a second', () => {
    const game = give(playing(one()), 'launcher');
    const z = durable(game);
    const before = z.health;
    game.shoot();
    run(game, WEAPONS.launcher.flight);
    const hits = before - z.health;
    assert.ok(hits >= 12 && hits > 8, `${hits} hits a shot`);
  });
});

describe('4. crosshairs and notices', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const rule = (sel) => {
    const m = css.match(new RegExp(`${sel.replace(/[.#:]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `a rule for ${sel}`);
    return m[1];
  };
  const px = (body, prop) => Number(body.match(new RegExp(`(?:^|[\\s;])${prop}:\\s*(-?[\\d.]+)px`))[1]);
  const border = Number(rule('#crosshair').match(/border: (\d+)px/)[1]);

  test('the crosshair shape follows the weapon in hand', () => {
    const el = () => ({ hidden: false, textContent: '', className: '', style: {}, addEventListener() {} });
    const els = {};
    const doc = { querySelector: (s) => (els[s] ??= el()), body: { classList: { toggle() {} } } };
    const game = playing(one());
    const hud = createHud(doc, game);
    const shape = () => { hud.render(); return els['#crosshair'].className; };
    assert.equal(shape(), 'popper');
    give(game, 'scattergun');
    assert.equal(shape(), 'scattergun');
    give(game, 'launcher');
    assert.equal(shape(), 'launcher');
    game.selectWeapon('popper');
    assert.equal(shape(), 'popper');
  });

  test('Popper: today\'s 32 px ring; Scattergun: 44 px; launcher: a dashed 52 px circle; one colour, one stroke, one centre dot', () => {
    const base = rule('#crosshair');
    assert.equal(px(base, 'width') + 2 * border, 32);
    assert.match(base, /border: 2px solid #fff4d0/);
    assert.match(rule('#crosshair::after'), /background: #fff4d0/);
    assert.equal(px(rule('#crosshair.scattergun'), 'width') + 2 * border, 44);
    const launcher = rule('#crosshair.launcher');
    assert.equal(px(launcher, 'width') + 2 * border, 52);
    assert.match(launcher, /border-style: dashed/);
    assert.doesNotMatch(css, /#crosshair\.\w+::after/, 'the centre dot is the same for all');
  });

  test('the Scattergun\'s 7 dots sit evenly on its ring, the first to its right, like the pellets', () => {
    const dots = rule('#crosshair.scattergun::before');
    assert.equal((dots.match(/radial-gradient\(circle, #fff4d0/g) ?? []).length, 7);
    const size = px(dots, 'background-size');
    const inset = px(dots, 'left'); // from the padding box, inside the border
    const centre = 44 / 2 - border - inset; // the ring's centre in the ::before box
    const radius = 44 / 2 - border / 2; // the middle of the ring's stroke
    const [, list] = dots.match(/background-position:([^;]*);/);
    const at = list.split(',').map((p) => p.trim().split(/\s+/).map((v) => parseFloat(v) + size / 2 - centre));
    assert.equal(at.length, 7);
    at.forEach(([x, y], i) => {
      assert.ok(Math.abs(Math.hypot(x, y) - radius) < 0.02, `dot ${i} on the ring`);
      const deg = ((Math.atan2(-y, x) * 180) / Math.PI + 360) % 360;
      assert.ok(Math.abs(deg - (i * 360) / 7) < 0.1, `dot ${i} at ${deg}°`);
    });
  });

  test('pickup notices say what the weapon does, for 2.5 seconds', () => {
    assert.equal(NOTICE_LIFE, 2.5);
    for (const [weapon, notice] of [
      ['scattergun', 'Scattergun! 8 pellets a blast — best up close'],
      ['launcher', 'Pumpkin launcher! Explodes — hits every enemy nearby'],
    ]) {
      const game = playing(one());
      const c = game.dropCrate(weapon);
      game.setAim(c.id);
      for (let i = 0; i < CRATE.hits; i++) game.shoot();
      assert.equal(screenView(game).hud.notice, notice);
      run(game, 2.49);
      assert.equal(screenView(game).hud.notice, notice);
      run(game, 0.01);
      assert.equal(screenView(game).hud.notice, null);
    }
  });
});

describe('5. pellets you can see', () => {
  const named = (scene, name) => scene.children.filter((c) => c.name === name);
  const hex = (color) => `#${color.getHexString()}`;

  test('Scattergun streaks are twice as thick as the Popper\'s and last 0.1 seconds', () => {
    assert.deepEqual([PELLET.width, PELLET.life, STREAK.life], [2, 0.1, 0.06]);
    const game = give(playing(one()), 'scattergun');
    game.effects.clear();
    game.setAim(null, { x: 0, y: 1, z: -12 });
    game.shoot();
    game.weapon = 'popper';
    game.shoot();
    const pellets = game.effects.streaks.slice(0, 8);
    const [popper] = game.effects.streaks.slice(8);
    assert.ok(pellets.every((s) => s.width === 2 * popper.width && s.life === 0.1));
    assert.deepEqual([popper.width, popper.life], [1, 0.06]);
    run(game, 0.09);
    assert.equal(game.effects.streaks.length, 8);
    run(game, 0.01);
    assert.equal(game.effects.streaks.length, 0);

    const stage = createStage({ appendChild() {} }, game.level);
    game.weapon = 'scattergun';
    game.shoot();
    game.weapon = 'popper';
    game.shoot();
    stage.sync(game, 0.01);
    const drawn = named(THREE.renderers.at(-1).scene, 'streak');
    assert.deepEqual(drawn.map((s) => s.scale.x), [...Array(8).fill(2), 1]);
    assert.deepEqual(drawn.map((s) => s.scale.y), [...Array(8).fill(2), 1]);
  });

  test('each pellet that hits shows a #fff3b0 spark where it lands, for 0.15 seconds', () => {
    const game = give(playing(levelWith([{ pumpkinMonster: 1 }])), 'scattergun');
    const m = game.enemies[0];
    m.health = 100;
    const at = (i) => ({ x: i, y: 1, z: -12 });
    const lines = [m.id, m.id, null, m.id, null, null, null, null].map((id, i) => ({ id, point: at(i) }));
    game.effects.clear();
    game.setAim(m.id, at(0), lines);
    game.shoot();
    assert.equal(SPARK.color, '#fff3b0');
    assert.deepEqual(game.effects.sparks.map((s) => [s.pos, s.life]), [0, 1, 3].map((i) => [at(i), 0.15]));

    const stage = createStage({ appendChild() {} }, game.level);
    stage.sync(game, 0.01);
    const sparks = named(THREE.renderers.at(-1).scene, 'spark');
    assert.deepEqual(sparks.map((s) => ({ ...s.position })), [0, 1, 3].map(at));
    assert.ok(sparks.every((s) => hex(s.material.color) === '#fff3b0'));
    run(game, 0.14);
    assert.equal(game.effects.sparks.length, 3);
    run(game, 0.01);
    assert.equal(game.effects.sparks.length, 0);
    stage.sync(game, 0.01);
    assert.equal(named(THREE.renderers.at(-1).scene, 'spark').length, 0);
  });

  test('the Popper makes no sparks; pause freezes them and a restart clears them', () => {
    const game = playing(one());
    game.setAim(game.enemies[0].id, { x: 0, y: 1, z: -12 });
    game.shoot();
    assert.equal(game.effects.sparks.length, 0);
    give(game, 'scattergun');
    game.setAim(game.enemies[0].id, { x: 0, y: 1, z: -12 });
    game.shoot();
    game.pressEsc();
    const sparks = JSON.stringify(game.effects.sparks);
    run(game, 1);
    assert.equal(JSON.stringify(game.effects.sparks), sparks);
    game.pressEsc();
    game.end('defeat');
    game.restart();
    assert.deepEqual(game.effects.sparks, []);
  });
});
