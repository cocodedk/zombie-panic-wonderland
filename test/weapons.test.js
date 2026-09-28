// Spec 07: three weapons, picked up from crates, in the game logic, the screens, the input and
// the HUD.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game, pumpkinAt } from '../src/logic/game.js';
import { WEAPONS, CRATE, pelletDirs, crateAt, shellAt } from '../src/logic/weapons.js';
import { MUZZLES, STREAK, PELLET } from '../src/logic/effects.js';
import { screenView, TEXT } from '../src/logic/screens.js';
import { registerWebMcp } from '../src/logic/webmcp.js';
import { bindInput } from '../src/view/input.js';
import { createHud } from '../src/view/hud.js';
import { newGame, playing, levelWith, run, kill, clearWave, click, level1 } from './helpers.js';
import { journey, win } from './journey.js';

const names = (game) => game.cues.splice(0).map((c) => c.name);
const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-6, `${msg} ${a} ≈ ${b}`);
const one = () => levelWith([{ zombie: 1 }]);

// Collects a crate of `weapon` with three Popper shots, then clears the cues and the shot count.
function give(game, weapon) {
  game.weapon = 'popper';
  const crate = game.dropCrate(weapon);
  game.setAim(crate.id);
  for (let i = 0; i < CRATE.hits; i++) game.shoot();
  game.setAim(null);
  assert.equal(game.weapon, weapon);
  game.cues.length = 0;
  game.shots = 0;
  return game;
}

// The same pellets on every line: `id` and its point.
const pellets = (...ids) => ids.map((id) => ({ id, point: { x: 0, y: 1, z: -12 } }));

describe('1. each weapon\'s fire rate, damage and ammo', () => {
  test('the Popper: 8 shots a second held, 1 hit on what is under the crosshair, never runs out', () => {
    const game = playing(one());
    const z = game.enemies[0];
    z.health = 1000;
    game.setAim(z.id);
    game.pointerDown();
    run(game, 0.99);
    assert.equal(game.shots, 8);
    assert.equal(z.health, 992);
    run(game, 10);
    assert.equal(game.shots, 88);
    assert.equal(game.weapon, 'popper');
    assert.equal(game.snapshot().ammo, null);
  });

  test('the Scattergun: 2 blasts a second held, 4 shells, 1 a blast', () => {
    const game = give(playing(one()), 'scattergun');
    assert.equal(game.ammo.scattergun, 4);
    game.pointerDown();
    run(game, 0.45); // the first blast at once
    assert.equal(game.shots, 1);
    run(game, 0.1); // the second half a second after the first
    assert.equal(game.shots, 2);
    run(game, 0.35);
    assert.equal(game.shots, 2);
    run(game, 0.1);
    assert.equal(game.shots, 3);
    assert.equal(game.ammo.scattergun, 1);
    assert.deepEqual(names(game).filter((n) => n === 'scatter'), ['scatter', 'scatter', 'scatter']);
  });

  test('each of the 8 pellets hits the first enemy or pumpkin on its line for 2 hits', () => {
    const game = playing(levelWith([{ pumpkinMonster: 3 }]));
    run(game, 2.6); // all three stand; the first has thrown a pumpkin
    give(game, 'scattergun');
    const [a, b, c] = game.enemies;
    const [pumpkin] = game.pumpkins;
    game.setAim(a.id, null, pellets(a.id, a.id, b.id, pumpkin.id, null, null, null, null));
    game.shoot();
    assert.deepEqual([a.health, b.health, c.health], [1, 3, 5]);
    assert.equal(game.pumpkins.length, 0);
    assert.equal(game.score, 25);
    assert.deepEqual(names(game), ['scatter', 'hit', 'hit', 'hit', 'hit']);
    game.setAim(b.id, null, pellets(...Array(8).fill(b.id)));
    game.shoot();
    assert.ok(!game.enemies.includes(b), 'eight pellets fell a pumpkin monster, for its points');
    assert.equal(game.score, 25 + 250);
  });

  test('without pellet lines from the stage, every pellet follows the crosshair', () => {
    const game = give(playing(levelWith([{ pumpkinMonster: 1 }])), 'scattergun');
    const m = game.enemies[0];
    m.health = 20;
    game.setAim(m.id);
    game.shoot();
    assert.equal(m.health, 4);
  });

  test('the cone: one pellet on the crosshair, seven evenly around it 2° away, 4° in all', () => {
    for (const d of [{ x: 0, y: 0, z: -1 }, { x: 0.3, y: -0.2, z: -0.93 }]) {
      const l = Math.hypot(d.x, d.y, d.z);
      const aim = { x: d.x / l, y: d.y / l, z: d.z / l };
      const dirs = pelletDirs(aim);
      assert.equal(dirs.length, 8);
      const deg = (u, v) => (Math.acos(Math.min(1, u.x * v.x + u.y * v.y + u.z * v.z)) * 180) / Math.PI;
      dirs.forEach((v) => near(Math.hypot(v.x, v.y, v.z), 1, 'unit'));
      near(deg(dirs[0], aim), 0, 'on the crosshair');
      const ring = dirs.slice(1);
      ring.forEach((v) => near(deg(v, aim), 2, 'around it'));
      ring.forEach((v, i) => near(deg(v, ring[(i + 1) % 7]), deg(ring[0], ring[1]), 'evenly'));
    }
  });

  test('a blast draws its 8 pellets as streaks from the Scattergun\'s muzzle, with a larger flash', () => {
    const game = give(playing(one()), 'scattergun');
    const lines = pellets(...Array(8).fill(null)).map((p, i) => ({ ...p, point: { x: i, y: 1, z: -12 } }));
    game.setAim(null, { x: 0, y: 1, z: -12 }, lines);
    game.shoot();
    const fx = game.effects;
    const blast = fx.streaks.slice(CRATE.hits); // after the Popper's shots at the crate
    assert.deepEqual(blast.map((s) => s.to), lines.map((p) => p.point));
    assert.ok(blast.every((s) => s.life === PELLET.life));
    near(blast[0].from.z, game.level.roadZ + MUZZLES.scattergun.z);
    assert.equal(fx.flash, STREAK.flash);
    assert.equal(fx.flashSize, 2);
    game.weapon = 'popper';
    game.shoot();
    assert.equal(fx.flashSize, 1);
    near(fx.streaks.at(-1).from.z, game.level.roadZ + MUZZLES.popper.z);
  });

  test('the Pumpkin launcher: 1.5 shots a second held, 2 rounds, 1 a shot', () => {
    const game = give(playing(one()), 'launcher');
    assert.equal(game.ammo.launcher, 2);
    game.pointerDown();
    run(game, 0.6);
    assert.equal(game.shots, 1);
    run(game, 0.1); // the second 2/3 of a second after the first
    assert.equal(game.shots, 2);
    assert.equal(game.ammo.launcher, 0);
    assert.deepEqual(names(game).filter((n) => n === 'launch'), ['launch', 'launch']);
  });

  test('its pumpkin flies in an arc from the muzzle to the aim point in 0.35 seconds', () => {
    const game = give(playing(one()), 'launcher');
    const to = { x: 3, y: 0, z: -8 };
    game.setAim(null, to);
    game.shoot();
    const [s] = game.shells;
    near(s.from.z, game.level.roadZ + MUZZLES.launcher.z);
    assert.deepEqual(shellAt(s), s.from);
    run(game, 0.17);
    const mid = shellAt(s);
    assert.ok(mid.y > (s.from.y + to.y) / 2 + 1, 'it arcs');
    run(game, 0.17);
    assert.equal(game.shells.length, 1);
    assert.ok(!names(game).includes('boom'));
    run(game, 0.01);
    assert.equal(game.shells.length, 0);
    assert.deepEqual(names(game), ['boom']);
  });

  test('it explodes there: every enemy within 2.5 units takes 12 hits, bosses included', () => {
    const game = playing(one());
    clearWave(game);
    run(game, 3 + 2); // the Zombie King has appeared
    const king = game.enemies[0];
    const [close, small, far] = [2, -1, 3].map((dx) => Object.assign(game.spawn('zombie'), { x: king.x + dx, z: king.z }));
    close.health = far.health = 20;
    give(game, 'launcher');
    const score = game.score;
    game.setAim(king.id, { x: king.x, y: 2, z: king.z }); // all walk 0.42 closer while it flies
    game.shoot();
    run(game, 0.35);
    assert.equal(king.health, 200 - 12);
    assert.equal(game.bossHealth, 188);
    assert.equal(close.health, 8);
    assert.ok(!game.enemies.includes(small), 'a zombie falls, for its points');
    assert.equal(game.score, score + 100);
    assert.equal(far.health, 20, 'out of the blast');
  });

  test('the explosion shoots down every pumpkin in the air within 2.5 units, for its points', () => {
    const game = playing(levelWith([{ pumpkinMonster: 1 }]));
    run(game, 2.6);
    const [p] = game.pumpkins;
    game.throwPumpkin({ id: 99, x: 7, z: -12 }, { hearts: 1, points: 25 }); // far away
    game.cues.length = 0;
    const at = pumpkinAt(p, game.level.roadZ);
    game.explode({ ...at, x: at.x + 2.4 });
    assert.equal(game.pumpkins.length, 1, 'the far one flies on');
    assert.equal(game.score, 25);
    assert.deepEqual(names(game), ['boom']);
  });

  test('the explosion: an orange burst of 16 chunks and a puff of 2 units, over 0.6 seconds', () => {
    const game = playing(one());
    game.explode({ x: 0, y: 1, z: -6 });
    const fx = game.effects;
    assert.equal(fx.chunks.length, 16);
    assert.ok(fx.chunks.every((c) => c.life === 0.6));
    assert.deepEqual(fx.puffs.map((p) => [p.color, p.size, p.life]), [['#ff9a3c', 2, 0.6]]);
  });

  test('reduced motion: the explosion is a 0.3-second flash of its puff, with no chunks', () => {
    const game = new Game(one(), { random: () => 0.5, reducedMotion: true });
    game.loaded();
    click(game);
    click(game);
    game.explode({ x: 0, y: 1, z: -6 });
    assert.equal(game.effects.chunks.length, 0);
    assert.deepEqual(game.effects.puffs.map((p) => [p.size, p.life]), [[2, 0.3]]);
  });

  test('points, falls and bursts follow the existing rules from any weapon', () => {
    const game = give(playing(one()), 'scattergun');
    kill(game, game.enemies[0]); // one blast of 6 pellets
    assert.equal(game.shots, 1);
    assert.equal(game.score, 100);
    assert.equal(game.effects.chunks.filter((c) => c.color !== '#8b5a2b').length, 12);
  });
});

describe('2. crates', () => {
  // Level 1 at the start of wave `n`.
  function atWave(n, random) {
    const game = playing(level1, random);
    for (let w = 1; w < n; w++) {
      clearWave(game);
      run(game, 3);
    }
    assert.equal(game.wave, n);
    return game;
  }

  test('a Scattergun crate 2 seconds after wave 2 starts, a launcher crate 2 seconds after wave 4 starts', () => {
    const game = playing(level1);
    run(game, 5);
    assert.equal(game.crates.length, 0, 'none in wave 1');
    const two = atWave(2);
    run(two, 1.99);
    assert.equal(two.crates.length, 0);
    run(two, 0.01);
    assert.deepEqual(two.crates.map((c) => c.weapon), ['scattergun']);
    const four = atWave(4);
    run(four, 1.99);
    assert.equal(four.crates.length, 0);
    run(four, 0.01);
    assert.deepEqual(four.crates.map((c) => c.weapon), ['launcher']);
  });

  test('it appears above the field at a random x between -6 and 6, at z = -6', () => {
    for (const [random, x] of [[() => 0, -6], [() => 0.5, 0], [() => 1, 6]]) {
      const game = atWave(2, random);
      run(game, 2);
      const [c] = game.crates;
      near(c.x, x);
      const at = crateAt(c);
      assert.equal(at.z, -6);
      assert.ok(at.y > 5, `above the field: ${at.y}`);
    }
  });

  test('it floats down over 3 seconds to a height of 1.5, hovers bobbing, and leaves 10 seconds after it appears, over 1 second', () => {
    const game = playing(one());
    const c = game.dropCrate('scattergun');
    const heights = [];
    for (let i = 0; i < 30; i++) {
      run(game, 0.1);
      heights.push(crateAt(c).y);
    }
    heights.slice(1).forEach((y, i) => assert.ok(y < heights[i], 'falling'));
    near(heights.at(-1), 1.5, 'at 3 seconds');
    const hover = [];
    for (let i = 0; i < 69; i++) {
      run(game, 0.1);
      hover.push(crateAt(c).y);
    }
    assert.ok(hover.every((y) => Math.abs(y - 1.5) <= CRATE.bob + 1e-9), 'hovering near 1.5');
    assert.ok(Math.max(...hover) - Math.min(...hover) > 0.1, 'bobbing');
    run(game, 0.1); // 10 seconds: it leaves
    assert.equal(game.crates.length, 1);
    const leaving = crateAt(c).y;
    run(game, 0.5);
    assert.ok(crateAt(c).y > leaving, 'up and away');
    run(game, 0.49);
    assert.equal(game.crates.length, 1);
    run(game, 0.01);
    assert.equal(game.crates.length, 0, 'gone at 11 seconds');
  });

  test('3 hits collect it: the weapon with full ammo, in hand at once, with pickup and the notice for 2.5 seconds', () => {
    for (const [weapon, notice, ammo] of [
      ['scattergun', 'Scattergun! 8 pellets a blast — best up close', 4],
      ['launcher', 'Pumpkin launcher! Explodes — hits every enemy nearby', 2],
    ]) {
      const game = playing(one());
      const c = game.dropCrate(weapon);
      game.setAim(c.id);
      game.shoot();
      game.shoot();
      assert.equal(game.weapon, 'popper');
      assert.equal(game.crates.length, 1);
      assert.deepEqual(names(game), ['shot', 'hit', 'shot', 'hit']);
      game.shoot();
      assert.deepEqual(names(game), ['shot', 'hit', 'pickup']);
      assert.equal(game.crates.length, 0);
      assert.equal(game.weapon, weapon);
      assert.equal(game.ammo[weapon], ammo);
      assert.equal(game.notice, notice);
      assert.equal(screenView(game).hud.notice, notice);
      run(game, 2.49);
      assert.equal(game.notice, notice);
      run(game, 0.01);
      assert.equal(game.notice, null);
    }
  });

  test('each pellet counts as a hit, and an explosion as one', () => {
    const game = give(playing(one()), 'scattergun');
    const c = game.dropCrate('launcher');
    game.setAim(c.id, null, pellets(c.id, c.id, c.id, null, null, null, null, null));
    game.shoot();
    assert.equal(game.weapon, 'launcher', 'three pellets collect it');
    const d = game.dropCrate('scattergun');
    game.explode(crateAt(d));
    assert.equal(d.hits, 1);
  });

  test('each hit flashes the crate white for 0.08 seconds and throws 4 wood chips that fall away in 0.3 seconds', () => {
    const game = playing(one());
    const c = game.dropCrate('scattergun');
    game.setAim(c.id);
    game.shoot();
    assert.equal(c.flash, 0.08);
    const chips = game.effects.chunks;
    assert.deepEqual(chips.map((k) => [k.color, k.life]), Array(4).fill(['#8b5a2b', 0.3]));
    run(game, 0.07);
    assert.ok(c.flash > 0);
    run(game, 0.01);
    assert.ok(c.flash < 1e-9);
    run(game, 0.22);
    assert.equal(game.effects.chunks.length, 0);
  });

  test('a leaving crate cannot be hit or collected; shots pass through', () => {
    const game = playing(one());
    const c = game.dropCrate('scattergun');
    run(game, 10);
    game.setAim(c.id);
    for (let i = 0; i < 3; i++) game.shoot();
    assert.equal(c.hits, 0);
    assert.equal(game.weapon, 'popper');
    assert.deepEqual(names(game), ['groan', 'shot', 'shot', 'shot']); // the zombie reached the road
    game.explode(crateAt(c));
    assert.equal(c.hits, 0);
  });

  test('full ammo, or a refill of a weapon already owned', () => {
    const game = give(playing(one()), 'scattergun');
    for (let i = 0; i < 2; i++) game.shoot();
    assert.equal(game.ammo.scattergun, 2);
    give(game, 'scattergun');
    assert.equal(game.ammo.scattergun, 4);
  });

  test('crates never hurt, block or count as enemies: a wave clears while one floats', () => {
    const game = playing(one());
    game.dropCrate('scattergun');
    run(game, 9);
    assert.equal(game.player.hearts, 5);
    assert.equal(game.snapshot().enemies, 1);
    kill(game, game.enemies[0]);
    game.update(0.01);
    assert.equal(game.phase, 'cleared');
    assert.equal(game.crates.length, 1);
  });
});

describe('3. switching', () => {
  function keys(game) {
    const win = new EventTarget();
    win.innerWidth = 800;
    win.innerHeight = 600;
    bindInput(win, game, { crosshairAt() {} });
    return {
      key: (n) => win.dispatchEvent(Object.assign(new Event('keydown'), { code: `Digit${n}` })),
      wheel: (deltaY) => win.dispatchEvent(Object.assign(new Event('wheel'), { deltaY })),
    };
  }

  test('keys 1, 2 and 3 take an owned weapon; a key for one not owned does nothing', () => {
    const game = playing(one());
    const { key } = keys(game);
    key(2);
    key(3);
    assert.equal(game.weapon, 'popper');
    give(game, 'launcher');
    key(1);
    assert.equal(game.weapon, 'popper');
    key(2);
    assert.equal(game.weapon, 'popper');
    key(3);
    assert.equal(game.weapon, 'launcher');
    give(game, 'scattergun');
    key(2);
    assert.equal(game.weapon, 'scattergun');
    game.pressEsc();
    key(1);
    assert.equal(game.weapon, 'scattergun', 'not while paused');
  });

  test('the wheel steps through the owned weapons in order, and wraps around', () => {
    const game = playing(one());
    const { wheel } = keys(game);
    wheel(100);
    assert.equal(game.weapon, 'popper', 'only the Popper');
    give(game, 'launcher');
    game.weapon = 'popper';
    wheel(100);
    assert.equal(game.weapon, 'launcher', 'past the Scattergun, not owned');
    wheel(100);
    assert.equal(game.weapon, 'popper', 'wraps');
    give(game, 'scattergun');
    game.weapon = 'popper';
    const seen = [];
    for (let i = 0; i < 4; i++) {
      wheel(100);
      seen.push(game.weapon);
    }
    assert.deepEqual(seen, ['scattergun', 'launcher', 'popper', 'scattergun']);
    wheel(-100);
    wheel(-100);
    assert.equal(game.weapon, 'launcher', 'backwards, wrapping');
  });

  test('a switch is instant, and each weapon keeps its own reload', () => {
    const game = give(playing(one()), 'scattergun');
    game.weapon = 'popper';
    game.pointerDown();
    game.update(0.01);
    assert.equal(game.shots, 1, 'the Popper at once');
    game.selectWeapon('scattergun');
    game.update(0.01);
    assert.equal(game.shots, 2, 'the Scattergun at once: it has not fired yet');
    game.selectWeapon('popper');
    game.update(0.01);
    assert.equal(game.shots, 2, 'the Popper waits for its own 1/8 second');
    run(game, 0.1);
    assert.equal(game.shots, 3);
    game.selectWeapon('scattergun');
    run(game, 0.35);
    assert.equal(game.shots, 3, 'the Scattergun waits for its own 1/2 second');
    run(game, 0.1);
    assert.equal(game.shots, 4);
  });

  test('running empty keeps the weapon in hand and owned, with no click (spec 12)', () => {
    for (const weapon of ['scattergun', 'launcher']) {
      const game = give(playing(one()), weapon);
      for (let i = 0; i < WEAPONS[weapon].ammo; i++) game.shoot();
      assert.ok(!names(game).includes('click'));
      assert.equal(game.weapon, weapon);
      assert.equal(game.owns(weapon), true);
      assert.equal(game.selectWeapon('popper'), true);
      assert.equal(game.selectWeapon(weapon), true);
    }
  });
});

describe('4. the HUD and the title', () => {
  const line = (game) => screenView(game).hud.weapons.map((w) => w.text).join(' · ');

  test('bottom left, one line lists all four: in hand, owned, not owned', () => {
    const game = playing(one());
    assert.equal(line(game), '1 Popper ∞ · 2 Scattergun — · 3 Launcher — · 4 Gatling —');
    give(game, 'scattergun');
    for (let i = 0; i < 3; i++) game.shoot();
    assert.equal(line(game), '1 Popper ∞ · 2 Scattergun 1/4 · 3 Launcher — · 4 Gatling —');
    assert.deepEqual(screenView(game).hud.weapons.map((w) => w.state), ['owned', 'hand', 'none', 'none']);
    game.selectWeapon('popper');
    assert.deepEqual(screenView(game).hud.weapons.map((w) => w.state), ['hand', 'owned', 'none', 'none']);
  });

  test('it shows wherever the HUD does, and not on loading, error or title', () => {
    const game = new Game(one(), { random: () => 0.5 });
    assert.equal(screenView(game).hud, null);
    game.loaded();
    assert.equal(screenView(game).hud, null);
    click(game);
    assert.ok(screenView(game).hud.weapons, 'intro');
    click(game);
    game.pressEsc();
    assert.ok(screenView(game).hud.weapons, 'paused');
    game.pressEsc();
    game.player.hearts = 0;
    game.end('defeat');
    assert.ok(screenView(game).hud.weapons, 'defeat');
  });

  test('the page: the weapon line\'s spans and their states, and the notice below the banners', () => {
    const els = {};
    const el = () => ({ hidden: false, textContent: '', className: '', style: {}, addEventListener() {} });
    const doc = { querySelector: (s) => (els[s] ??= el()), body: { classList: { toggle() {} } } };
    const game = playing(one());
    const hud = createHud(doc, game);
    hud.render();
    const spans = ['popper', 'scattergun', 'launcher', 'gatling'].map((w) => els[`#weapon-${w}`]);
    assert.deepEqual(spans.map((s) => [s.textContent, s.className]), [['1 Popper ∞', 'hand'], ['2 Scattergun —', 'none'], ['3 Launcher —', 'none'], ['4 Gatling —', 'none']]);
    assert.equal(els['#notice'].hidden, true);
    const c = game.dropCrate('launcher');
    game.setAim(c.id);
    for (let i = 0; i < 3; i++) game.shoot();
    hud.render();
    assert.deepEqual(spans.map((s) => [s.textContent, s.className]), [['1 Popper ∞', 'owned'], ['2 Scattergun —', 'none'], ['3 Launcher 2/2', 'hand'], ['4 Gatling —', 'none']]);
    assert.equal(els['#notice'].hidden, false);
    assert.equal(els['#notice'].textContent, 'Pumpkin launcher! Explodes — hits every enemy nearby');
    assert.equal(els['#sound'].textContent, '♪ on', 'the sound stays bottom right');
  });

  test('the notice has its own line, so a banner can show with it', () => {
    const game = playing(one());
    const c = game.dropCrate('scattergun');
    game.setAim(c.id);
    for (let i = 0; i < 3; i++) game.shoot();
    kill(game, game.enemies[0]);
    game.update(0.01);
    const view = screenView(game);
    assert.deepEqual(view.band, { lines: ['Wave 1 cleared'] });
    assert.equal(view.hud.notice, 'Scattergun! 8 pellets a blast — best up close');
  });

  test('the title\'s controls line gains "· 1 2 3 4 or wheel: weapons", before "· M sound"', () => {
    assert.match(screenView(newGame()).band.lines[1], / · Esc pauses · 1 2 3 4 or wheel: weapons · R reloads · M sound: on$/);
    assert.match(TEXT.controls, / · 1 2 3 4 or wheel: weapons · R reloads$/);
  });
});

describe('5. resets and pause', () => {
  // A game with every weapon, a shell in the air, a crate floating and one due.
  function armed(game) {
    give(game, 'scattergun');
    give(game, 'launcher');
    game.shoot();
    game.dropCrate('scattergun');
    game.cratesDue.push({ weapon: 'launcher', t: 1 });
    assert.equal(game.shells.length, 1);
    return game;
  }
  const bare = (game) => {
    assert.equal(game.weapon, 'popper');
    assert.deepEqual(game.ammo, { scattergun: 0, launcher: 0, gatling: 0 });
    assert.deepEqual([game.crates, game.shells, game.cratesDue, game.notice], [[], [], [], null]);
  };

  test('Try again and Play again leave only the Popper, and clear crates and flying pumpkins', () => {
    const game = armed(playing(one()));
    game.player.hearts = 0;
    game.end('defeat');
    game.restart();
    bare(game);
    const won = journey();
    armed(won);
    won.weapon = 'popper';
    win(won);
    armed(won); // on the victory card, as it was when the boss fell
    won.restart();
    bare(won);
  });

  test('Next level, Back to title and each level start do the same', () => {
    const game = journey();
    armed(game);
    game.weapon = 'popper';
    win(game);
    armed(game);
    game.nextLevel();
    bare(game);
    click(game);
    armed(game);
    game.weapon = 'popper';
    win(game);
    armed(game);
    game.toTitle();
    bare(game);
    game.pointerDown();
    bare(game);
  });

  test('the boss\'s fall clears the flying pumpkins with everything else', () => {
    const game = playing(one());
    clearWave(game);
    run(game, 3 + 2);
    give(game, 'launcher');
    game.shoot();
    game.weapon = 'popper';
    kill(game, game.enemies[0]);
    assert.equal(game.shells.length, 0);
  });

  test('pause freezes crates, flying pumpkins and explosions', () => {
    const game = armed(playing(one()));
    run(game, 0.5); // the first pumpkin explodes
    game.shoot();
    run(game, 0.2);
    assert.ok(game.effects.chunks.length > 0 && game.shells.length === 1);
    game.pressEsc();
    const frozen = JSON.stringify([game.crates, game.shells, game.cratesDue, game.effects]);
    run(game, 5);
    assert.equal(JSON.stringify([game.crates, game.shells, game.cratesDue, game.effects]), frozen);
    game.pressEsc();
    run(game, 0.3);
    assert.equal(game.shells.length, 0, 'it flies on and explodes after');
  });
});

describe('6. get_state reports the weapon and its ammo', () => {
  test('popper with null, then the weapon in hand and its rounds left', async () => {
    const tools = new Map();
    const game = playing(one());
    await registerWebMcp({ registerTool: (t) => { tools.set(t.name, t); } }, game);
    const state = async () => {
      const { weapon, ammo } = await tools.get('get_state').execute({});
      return { weapon, ammo };
    };
    assert.deepEqual(await state(), { weapon: 'popper', ammo: null });
    give(game, 'scattergun');
    game.shoot();
    assert.deepEqual(await state(), { weapon: 'scattergun', ammo: 3 });
    give(game, 'launcher');
    assert.deepEqual(await state(), { weapon: 'launcher', ammo: 2 });
    assert.deepEqual(Object.keys(game.snapshot()), ['level', 'screen', 'wave', 'score', 'hearts', 'enemies', 'boss_health', 'weapon', 'ammo', 'reloading']);
  });
});
