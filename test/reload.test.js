// Spec 12: the Scattergun and the launcher reload their magazines.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/logic/game.js';
import { WEAPONS, CRATE, crateAt } from '../src/logic/weapons.js';
import { screenView, TEXT } from '../src/logic/screens.js';
import { registerWebMcp } from '../src/logic/webmcp.js';
import { mix } from '../src/logic/sound.js';
import { bindInput } from '../src/view/input.js';
import { createHud } from '../src/view/hud.js';
import { newGame, playing, levelWith, run, click } from './helpers.js';

const names = (game) => game.cues.splice(0).map((c) => c.name);
const one = () => levelWith([{ zombie: 1 }]);
const line = (game) => screenView(game).hud.weapons.map((w) => w.text).join(' · ');

// Collects a crate of `weapon` with Popper shots, then clears the cues and the shot count.
function give(game, weapon) {
  const before = game.weapon;
  game.selectWeapon('popper');
  const crate = game.dropCrate(weapon);
  game.setAim(crate.id);
  for (let i = 0; i < CRATE.hits; i++) game.shoot();
  game.setAim(null);
  assert.equal(game.weapon, weapon, `from ${before}`);
  game.cues.length = 0;
  game.shots = 0;
  return game;
}

// Collects a crate of `weapon` with an explosion, whatever is in hand.
function collect(game, weapon) {
  const c = game.dropCrate(weapon);
  c.hits = CRATE.hits - 1;
  game.explode(crateAt(c));
  assert.equal(game.weapon, weapon);
  game.cues.length = 0;
  return game;
}

// Shoots the magazine empty; the reload starts by itself.
function empty(game) {
  while (game.ammo[game.weapon] > 0) game.shoot();
  game.cues.length = 0;
  return game;
}

function keys(game) {
  const win = new EventTarget();
  win.innerWidth = 800;
  win.innerHeight = 600;
  bindInput(win, game, { crosshairAt() {} });
  return (code) => win.dispatchEvent(Object.assign(new Event('keydown'), { code }));
}

describe('1. magazines', () => {
  test('4 shells and 2 rounds, one used per blast or shot', () => {
    for (const [weapon, size] of [['scattergun', 4], ['launcher', 2]]) {
      assert.equal(WEAPONS[weapon].ammo, size);
      const game = give(playing(one()), weapon);
      assert.equal(game.ammo[weapon], size, 'a crate gives a full magazine');
      for (let i = 1; i <= size; i++) {
        game.shoot();
        assert.equal(game.ammo[weapon], size - i);
      }
    }
  });

  test('a crate for an owned weapon fills its magazine at once and ends its reload', () => {
    const game = empty(give(playing(one()), 'scattergun'));
    run(game, 0.5);
    assert.equal(game.reloading, true);
    collect(game, 'scattergun');
    assert.equal(game.ammo.scattergun, 4);
    assert.equal(game.reloading, false);
    assert.equal(game.refill.scattergun, 0);
    // One not in hand, part used: full again.
    give(game, 'launcher');
    game.shoot();
    give(game, 'scattergun');
    give(game, 'launcher');
    assert.equal(game.ammo.launcher, 2);
  });
});

describe('2. reloading', () => {
  test('an empty magazine reloads by itself: 1.5 seconds for the Scattergun, 2 for the launcher', () => {
    for (const [weapon, time, size] of [['scattergun', 1.5, 4], ['launcher', 2, 2]]) {
      const game = empty(give(playing(one()), weapon));
      assert.equal(game.reloading, true);
      run(game, time - 0.01);
      assert.equal(game.ammo[weapon], 0);
      assert.equal(game.reloading, true);
      assert.ok(!names(game).includes('reload'));
      run(game, 0.01);
      assert.equal(game.reloading, false);
      assert.equal(game.ammo[weapon], size);
    }
  });

  test('R reloads early only when it should', () => {
    const game = playing(one());
    const key = keys(game);
    key('KeyR');
    assert.equal(game.reloading, false, 'not the Popper');
    give(game, 'scattergun');
    key('KeyR');
    assert.equal(game.reloading, false, 'not a full magazine');
    game.shoot();
    game.pressEsc();
    key('KeyR');
    assert.equal(game.reloading, false, 'not while paused');
    game.pressEsc();
    key('KeyR');
    assert.equal(game.reloading, true);
    run(game, 1);
    key('KeyR');
    run(game, 0.49);
    assert.equal(game.reloading, true);
    run(game, 0.01);
    assert.equal(game.reloading, false, 'a second R did not start it again');
    assert.equal(game.ammo.scattergun, 4);
    game.shoot();
    game.player.hearts = 0;
    game.end('defeat');
    assert.equal(game.reloadMagazine(), false, 'not on the defeat card');
    for (const g of [newGame(), (() => { const t = newGame(); click(t); return t; })()]) {
      assert.equal(g.reloadMagazine(), false, `not on ${g.screen}`);
    }
  });

  test('nothing fires during a reload, and held fire carries on after, at its own rate', () => {
    const game = give(playing(one()), 'scattergun');
    game.pointerDown();
    run(game, 1.6); // blasts at 0, 0.5, 1 and 1.5: the magazine is empty
    assert.equal(game.shots, 4);
    assert.equal(game.reloading, true);
    game.shoot();
    assert.equal(game.shots, 4, 'no shot by hand either');
    run(game, 1.39); // the reload ends 1.5 seconds after the fourth blast, at 3 seconds
    assert.equal(game.shots, 4);
    run(game, 0.01);
    assert.equal(game.shots, 5, 'at once when it ends');
    run(game, 0.45);
    assert.equal(game.shots, 5);
    run(game, 0.1);
    assert.equal(game.shots, 6, 'then at its own rate, half a second on');
  });
});

describe('3. the weapons never run out', () => {
  test('after 100 blasts the Scattergun is still owned and in hand, and no click is cued', () => {
    const game = give(playing(one()), 'scattergun');
    game.player.hearts = 1e6; // the zombie strikes all the while
    game.pointerDown();
    const cues = [];
    while (game.shots < 100) {
      run(game, 0.1);
      cues.push(...names(game));
    }
    assert.equal(game.shots, 100);
    assert.equal(game.weapon, 'scattergun');
    assert.equal(game.owns('scattergun'), true);
    assert.ok(!cues.includes('click'));
    assert.equal(cues.filter((c) => c === 'reload').length, 24);
  });
});

describe('4. switching and pause', () => {
  test('switching away stops a reload and keeps the magazine', () => {
    const game = give(playing(one()), 'scattergun');
    game.shoot();
    game.reloadMagazine();
    run(game, 1);
    game.selectWeapon('popper');
    assert.equal(game.refill.scattergun, 0);
    run(game, 1);
    assert.equal(game.ammo.scattergun, 3);
    game.selectWeapon('scattergun');
    assert.equal(game.reloading, false, 'a magazine not empty does not start reloading');
    assert.equal(line(game), '1 Popper ∞ · 2 Scattergun 3/4 · 3 Launcher — · 4 Gatling —');
  });

  test('switching back to an empty weapon starts its reload from the beginning', () => {
    const game = empty(give(playing(one()), 'launcher'));
    run(game, 1.5);
    game.selectWeapon('popper');
    run(game, 3);
    assert.equal(game.ammo.launcher, 0);
    game.selectWeapon('launcher');
    assert.equal(game.reloading, true);
    run(game, 1.99);
    assert.equal(game.ammo.launcher, 0);
    run(game, 0.01);
    assert.equal(game.ammo.launcher, 2);
  });

  test('a crate for another weapon also stops the reload in hand', () => {
    const game = empty(give(playing(one()), 'scattergun'));
    run(game, 1);
    collect(game, 'launcher');
    assert.equal(game.refill.scattergun, 0);
    game.selectWeapon('scattergun');
    run(game, 1.49);
    assert.equal(game.ammo.scattergun, 0, 'from the beginning');
    run(game, 0.01);
    assert.equal(game.ammo.scattergun, 4);
  });

  test('pause freezes a reload', () => {
    const game = empty(give(playing(one()), 'scattergun'));
    run(game, 1);
    game.pressEsc();
    run(game, 5);
    assert.equal(game.reloading, true);
    assert.equal(line(game), '1 Popper ∞ · 2 Scattergun reloading · 3 Launcher — · 4 Gatling —');
    game.pressEsc();
    run(game, 0.49);
    assert.equal(game.reloading, true);
    run(game, 0.01);
    assert.equal(game.reloading, false);
  });

  test('the Popper never reloads', () => {
    const game = playing(one());
    game.pointerDown();
    run(game, 20);
    assert.equal(game.reloading, false);
    assert.ok(!names(game).includes('reload'));
  });
});

describe('5. what the player sees and hears', () => {
  test('the weapon line shows left/size, or reloading', () => {
    const game = give(playing(one()), 'scattergun');
    game.shoot();
    assert.equal(line(game), '1 Popper ∞ · 2 Scattergun 3/4 · 3 Launcher — · 4 Gatling —');
    give(game, 'launcher');
    game.selectWeapon('scattergun');
    empty(game);
    assert.equal(line(game), '1 Popper ∞ · 2 Scattergun reloading · 3 Launcher 2/2 · 4 Gatling —');
    assert.deepEqual(screenView(game).hud.weapons.map((w) => w.state), ['owned', 'hand', 'owned', 'none']);
  });

  test('the crosshair is at half opacity while the weapon in hand reloads', () => {
    const els = {};
    const el = () => ({ hidden: false, textContent: '', className: '', style: {}, addEventListener() {} });
    const doc = { querySelector: (s) => (els[s] ??= el()), body: { classList: { toggle() {} } } };
    const game = give(playing(one()), 'scattergun');
    const hud = createHud(doc, game);
    const opacity = () => { hud.render(); return els['#crosshair'].style.opacity; };
    assert.equal(opacity(), '1');
    empty(game);
    assert.equal(opacity(), '0.5');
    game.pressEsc();
    assert.equal(opacity(), '0.5', 'paused, it stays');
    game.pressEsc();
    run(game, 1.5);
    assert.equal(opacity(), '1');
    assert.equal(els['#weapon-scattergun'].textContent, '2 Scattergun 4/4');
  });

  test('the title\'s controls line gains "· R reloads" before "· M sound"', () => {
    assert.match(TEXT.controls, / · 1 2 3 4 or wheel: weapons · R reloads$/);
    assert.match(screenView(newGame()).band.lines[1], / · R reloads · M sound: on$/);
  });

  test('the reload cue, once, when a reload ends; it follows mute and pause', () => {
    const reloads = (game) => mix(game).cues.filter((c) => c.name === 'reload').length;
    const game = empty(give(playing(one()), 'launcher'));
    run(game, 1.99);
    assert.equal(reloads(game), 0);
    run(game, 0.01);
    assert.equal(reloads(game), 1);
    run(game, 3);
    assert.equal(reloads(game), 0);
    empty(game);
    game.toggleSound();
    run(game, 2);
    assert.equal(reloads(game), 0, 'muted');
    game.toggleSound();
    empty(game);
    run(game, 1.99);
    mix(game);
    game.pressEsc();
    run(game, 1);
    assert.equal(reloads(game), 0, 'paused');
    game.pressEsc();
    run(game, 0.01);
    assert.equal(reloads(game), 1, 'after the pause');
  });
});

describe('6. get_state', () => {
  test('reports the magazine and reloading, and llms.txt says so', async () => {
    const tools = new Map();
    const game = playing(one());
    await registerWebMcp({ registerTool: (t) => { tools.set(t.name, t); } }, game);
    const state = async () => {
      const { weapon, ammo, reloading } = await tools.get('get_state').execute({});
      return { weapon, ammo, reloading };
    };
    assert.deepEqual(await state(), { weapon: 'popper', ammo: null, reloading: false });
    give(game, 'scattergun');
    game.shoot();
    assert.deepEqual(await state(), { weapon: 'scattergun', ammo: 3, reloading: false });
    empty(game);
    assert.deepEqual(await state(), { weapon: 'scattergun', ammo: 0, reloading: true });
    game.selectWeapon('popper');
    assert.deepEqual(await state(), { weapon: 'popper', ammo: null, reloading: false });
    assert.match(tools.get('get_state').description, /reloading/);
    const llms = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8');
    assert.match(llms, /weapon, ammo, reloading \}/);
    assert.match(llms, /`ammo` is the rounds left in its magazine/);
    assert.match(llms, /`reloading` is `true` while it reloads/);
  });
});

test('victory and defeat freeze a reload as it is', () => {
  const game = empty(give(playing(one()), 'scattergun'));
  game.player.hearts = 0;
  game.end('defeat');
  run(game, 5);
  assert.equal(game.reloading, true);
  assert.match(line(game), /Scattergun reloading/);
  game.restart();
  assert.equal(game.owns('scattergun'), false, 'Try again resets as spec 07 says');
  assert.equal(new Game(one()).owns('scattergun'), false);
});
