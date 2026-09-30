// Spec 15: a Gatling gun: its spin-up and rate, magazine, crate, damage, model, tracers, crosshair,
// weapon line, sounds, pause, resets and WebMCP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { Game } from '../src/logic/game.js';
import { WEAPONS, ORDER, CRATES, CRATE, NOTICE_LIFE } from '../src/logic/weapons.js';
import { MUZZLES, STREAK, TRACER, muzzleAt } from '../src/logic/effects.js';
import { screenView, TEXT } from '../src/logic/screens.js';
import { mix } from '../src/logic/sound.js';
import { registerWebMcp } from '../src/logic/webmcp.js';
import { createAudio } from '../src/view/audio.js';
import { bindInput } from '../src/view/input.js';
import { createHud } from '../src/view/hud.js';
import { level2 } from '../src/levels/level-2.js';
import { newGame, playing, levelWith, run, kill, clearWave, click, level1 } from './helpers.js';
import { journey, win } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

let count = 0;
const check = (name, fn) => {
  count += 1;
  test(name, fn);
};

const one = () => levelWith([{ zombie: 1 }]);
const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-6, `${msg} ${a} ≈ ${b}`);
const hex = (color) => `#${color.getHexString()}`;
const named = (scene, name) => scene.children.filter((c) => c.name === name);
const line = (game) => screenView(game).hud.weapons.map((w) => w.text).join(' · ');
const cues = (game) => game.cues.splice(0);
// The Gatling's three cues in order; a `stop` is the whine cut short, not a cue of its own.
const sfx = (game) => cues(game).filter((c) => ['spinup', 'gatling', 'spindown'].includes(c.name) && !c.stop).map((c) => c.name);

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

// The Gatling in hand, its own zombie at the road that does not fall, and the crosshair on it.
function armed(level = one(), random) {
  const game = give(playing(level, random), 'gatling');
  game.player.hearts = 1e6;
  const z = game.enemies[0];
  z.health = 1e6;
  game.setAim(z.id, { x: z.x, y: 1, z: z.z });
  return game;
}

// Steps of 0.01 seconds until `stop`, returning the step numbers at which the shot count rose.
function shotSteps(game, steps) {
  const at = [];
  for (let i = 1; i <= steps; i++) {
    const before = game.shots;
    game.update(0.01);
    for (let k = before; k < game.shots; k++) at.push(i);
  }
  return at;
}

function keys(game) {
  const win = new EventTarget();
  win.innerWidth = 800;
  win.innerHeight = 600;
  bindInput(win, game, { crosshairAt() {} });
  return {
    key: (n) => win.dispatchEvent(Object.assign(new Event('keydown'), { code: n === 'R' ? 'KeyR' : `Digit${n}` })),
    wheel: (deltaY) => win.dispatchEvent(Object.assign(new Event('wheel'), { deltaY })),
  };
}

function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return { stage, draw: () => { stage.sync(game, 0.01); return renderer.scene; } };
}

// A level's wave `n`, just begun, with the player unhurtable.
function atWave(level, n) {
  const game = playing(level);
  game.player.hearts = 1e6;
  while (game.wave < n) {
    clearWave(game);
    const wave = game.wave;
    while (game.wave === wave) game.update(0.01);
  }
  return game;
}

check('the Gatling is weapon 4 after the launcher: 20 rounds a second of 2 hits, 100 rounds, a 3-second reload, a 0.5-second spin-up', () => {
  assert.deepEqual(ORDER, ['popper', 'scattergun', 'launcher', 'gatling']);
  const g = WEAPONS.gatling;
  assert.deepEqual([g.key, g.name, g.rate, g.hits, g.ammo, g.refill, g.spinUp, g.spinDown, g.turns], [4, 'Gatling', 20, 2, 100, 3, 0.5, 0.4, 12]);
  assert.deepEqual(CRATES.at(-1), { weapon: 'gatling', wave: 5, delay: 2 });
});

check('key 4 and the wheel reach the Gatling only once it is owned, and the wheel wraps around four weapons', () => {
  const game = playing(one());
  const { key, wheel } = keys(game);
  key(4);
  assert.equal(game.weapon, 'popper', 'not owned');
  wheel(100);
  assert.equal(game.weapon, 'popper', 'the wheel skips it too');
  give(game, 'gatling');
  key(1);
  assert.equal(game.weapon, 'popper');
  wheel(100);
  assert.equal(game.weapon, 'gatling', 'past the two not owned');
  wheel(100);
  assert.equal(game.weapon, 'popper', 'wraps');
  wheel(-100);
  assert.equal(game.weapon, 'gatling', 'backwards, wrapping');
  key(1);
  key(4);
  assert.equal(game.weapon, 'gatling');
  give(game, 'scattergun');
  give(game, 'launcher');
  game.selectWeapon('popper');
  const seen = [];
  for (let i = 0; i < 5; i++) {
    wheel(100);
    seen.push(game.weapon);
  }
  assert.deepEqual(seen, ['scattergun', 'launcher', 'gatling', 'popper', 'scattergun']);
  key(4);
  assert.equal(game.weapon, 'gatling');
  game.pressEsc();
  key(1);
  assert.equal(game.weapon, 'gatling', 'not while paused');
});

check('held fire spins up for 0.5 seconds, then fires 20 rounds a second, each worth 2 hits on what is under the crosshair', () => {
  const game = armed();
  const z = game.enemies[0];
  const before = z.health;
  game.pointerDown();
  const steps = shotSteps(game, 200);
  assert.equal(steps[0], 50, 'the first round when the spin-up ends');
  steps.slice(1).forEach((s, i) => assert.equal(s - steps[i], 5, 'every 1/20 second'));
  assert.equal(steps.length, 31, 'in 2 seconds: from 0.5 seconds on, every 0.05');
  assert.equal(before - z.health, 2 * 31);
  assert.equal(game.ammo.gatling, 100 - 31);
});

check('a spin-up before every press, even during a spin-down; releasing stops firing at once', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.49);
  assert.equal(game.shots, 0);
  run(game, 0.01);
  assert.equal(game.shots, 1);
  run(game, 0.44); // t = 0.95: the round due at 0.95 is not yet
  const fired = game.shots;
  game.pointerUp();
  run(game, 0.2); // a spin-down
  assert.equal(game.shots, fired, 'not one more after the release');
  game.pointerDown();
  run(game, 0.49);
  assert.equal(game.shots, fired, 'it spins up again, though the barrels were still turning');
  run(game, 0.01);
  assert.equal(game.shots, fired + 1);
  game.pointerUp();
  run(game, 1);
  game.pointerDown();
  run(game, 0.49);
  assert.equal(game.shots, fired + 1, 'and after a full stop');
  run(game, 0.01);
  assert.equal(game.shots, fired + 2);
});

check('released during the spin-up it fires no round', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.3);
  game.pointerUp();
  run(game, 2);
  assert.equal(game.shots, 0);
  assert.equal(game.ammo.gatling, 100);
  assert.deepEqual(sfx(game), ['spinup', 'spindown']);
});

check('each round hits the first enemy, pumpkin, crate or canister under the crosshair, as a pellet does', () => {
  const game = give(playing(levelWith([{ pumpkinMonster: 2 }])), 'gatling');
  run(game, 2.6); // both stand; the first has thrown a pumpkin
  game.player.hearts = 1e6;
  const [a, b] = game.enemies;
  game.setAim(a.id);
  game.shoot();
  assert.deepEqual([a.health, b.health], [3, 5], 'a pumpkin monster has 5');
  const [pumpkin] = game.pumpkins;
  game.setAim(pumpkin.id);
  game.shoot();
  assert.equal(game.pumpkins.length, 0, 'shot down');
  assert.equal(game.score, 25);
  const crate = game.dropCrate('scattergun');
  game.setAim(crate.id);
  game.shoot();
  assert.equal(crate.hits, 1, 'a crate takes one hit a round');
  const canister = { id: game.nextId++, x: 0, z: -8, hits: 0, flash: 0 };
  game.canisters.push(canister);
  game.setAim(canister.id);
  game.shoot();
  assert.equal(canister.hits, 1, 'and a canister');
  game.setAim(null);
  const health = a.health;
  game.shoot();
  assert.equal(a.health, health, 'a round at nothing hits nothing');
});

check('a round that fells an enemy scores and bursts as any weapon\'s does', () => {
  const game = give(playing(one()), 'gatling');
  const z = game.enemies[0];
  game.setAim(z.id);
  game.shoot();
  assert.equal(z.health, 1);
  game.shoot();
  assert.equal(game.enemies.length, 0);
  assert.equal(game.score, 100);
  assert.equal(game.effects.chunks.filter((c) => c.color !== '#8b5a2b').length, 12);
});

check('the magazine of 100 empties at the 100th round and reloads by itself in 3 seconds; held fire spins up again after', () => {
  const game = armed();
  game.pointerDown();
  while (game.shots < 100) game.update(0.01);
  assert.equal(game.ammo.gatling, 0);
  assert.equal(game.reloading, true);
  assert.deepEqual(sfx(game), ['spinup', ...Array(100).fill('gatling')]);
  game.update(0.01);
  assert.deepEqual(sfx(game), ['spindown'], 'firing stops, the barrels spin down');
  assert.equal(game.barrels.mode, 'down');
  run(game, 2.98);
  assert.equal(game.reloading, true);
  assert.equal(game.ammo.gatling, 0);
  assert.equal(game.shots, 100);
  run(game, 0.01);
  assert.equal(game.reloading, false);
  assert.equal(game.ammo.gatling, 100);
  assert.deepEqual(cues(game).map((c) => c.name).filter((n) => n !== 'groan'), ['reload', 'spinup']);
  run(game, 0.47);
  assert.equal(game.shots, 100, 'the barrels spin up for 0.5 seconds again');
  run(game, 0.02);
  assert.equal(game.shots, 101);
});

check('R reloads early in 3 seconds, and only when it should; switching away stops the reload', () => {
  const game = armed();
  const { key } = keys(game);
  key('R');
  assert.equal(game.reloading, false, 'not a full magazine');
  for (let i = 0; i < 13; i++) game.shoot();
  assert.equal(game.ammo.gatling, 87);
  key('R');
  assert.equal(game.reloading, true);
  run(game, 2.99);
  assert.equal(game.ammo.gatling, 87);
  run(game, 0.01);
  assert.equal(game.ammo.gatling, 100);
  assert.equal(game.reloading, false);

  game.shoot();
  key('R');
  run(game, 1);
  game.selectWeapon('popper');
  assert.equal(game.refill.gatling, 0, 'stopped');
  run(game, 5);
  assert.equal(game.ammo.gatling, 99, 'the magazine kept as it was');
  game.selectWeapon('gatling');
  assert.equal(game.reloading, false);

  while (game.ammo.gatling > 0) game.shoot();
  run(game, 1);
  game.selectWeapon('popper');
  game.selectWeapon('gatling');
  assert.equal(game.reloading, true, 'an empty one starts again from the beginning');
  run(game, 2.99);
  assert.equal(game.ammo.gatling, 0);
  run(game, 0.01);
  assert.equal(game.ammo.gatling, 100);
});

check('putting the Gatling away stops its barrels at once, with no sound; taking it back with the button held spins up again', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.8);
  assert.equal(game.barrels.mode, 'firing');
  game.cues.length = 0;
  game.selectWeapon('popper');
  assert.deepEqual([game.barrels.mode, game.barrels.speed], ['idle', 0]);
  assert.deepEqual(game.cues.map((c) => [c.name, c.stop]), [['spinup', true]], 'only the whine is cut, and no spindown');
  game.cues.length = 0;
  const z = game.enemies[0];
  const health = z.health;
  run(game, 0.3);
  assert.ok(z.health < health, 'the Popper fires meanwhile');
  game.selectWeapon('gatling');
  game.cues.length = 0;
  const shots = game.shots;
  run(game, 0.49);
  assert.equal(game.shots, shots, 'a new spin-up of 0.5 seconds');
  run(game, 0.01);
  assert.equal(game.shots, shots + 1);
  assert.equal(sfx(game)[0], 'spinup');
});

for (const [number, level] of [[1, level1], [2, level2]]) {
  check(`level ${number}: a Gatling crate 2 seconds after wave 5 starts, collected in 3 hits for a full magazine`, () => {
    const game = atWave(level, 5);
    assert.equal(game.wave, 5);
    run(game, 1.99);
    assert.equal(game.crates.filter((c) => c.weapon === 'gatling').length, 0);
    run(game, 0.01);
    const [crate] = game.crates.filter((c) => c.weapon === 'gatling');
    assert.ok(crate, 'it appears');
    assert.ok(crate.x >= CRATE.minX && crate.x <= CRATE.maxX);
    game.cues.length = 0;
    game.setAim(crate.id);
    game.shoot();
    game.shoot();
    assert.equal(game.weapon, 'popper');
    assert.equal(game.owns('gatling'), false);
    game.shoot();
    assert.equal(game.weapon, 'gatling');
    assert.equal(game.owns('gatling'), true);
    assert.equal(game.ammo.gatling, 100);
    assert.equal(game.crates.includes(crate), false);
    assert.ok(cues(game).some((c) => c.name === 'pickup'));
    assert.equal(game.notice, 'Gatling! Hold fire to spin it up — 20 rounds a second');
    run(game, NOTICE_LIFE - 0.01);
    assert.equal(game.notice, 'Gatling! Hold fire to spin it up — 20 rounds a second');
    run(game, 0.01);
    assert.equal(game.notice, null);
  });
}

check('there is no Gatling crate before wave 5', () => {
  const game = atWave(level1, 4);
  run(game, 3);
  assert.deepEqual(game.crates.map((c) => c.weapon).filter((w) => w === 'gatling'), []);
  assert.deepEqual(game.cratesDue.filter((d) => d.weapon === 'gatling'), []);
});

check('once collected it stays, with the other weapons, until a reset; a crate for it again refills it', () => {
  const game = give(playing(one()), 'gatling');
  game.selectWeapon('popper');
  run(game, 20);
  assert.equal(game.owns('gatling'), true);
  game.selectWeapon('gatling');
  for (let i = 0; i < 40; i++) game.shoot();
  give(game, 'gatling');
  assert.equal(game.ammo.gatling, 100);
});

check('against a durable zombie-sized target it deals 40 hits a second once spun up, more than the Scattergun\'s best 32', () => {
  const s = WEAPONS.scattergun;
  assert.equal(s.pellets * s.hits * s.rate, 32);
  const game = armed();
  const z = game.enemies[0];
  game.pointerDown();
  run(game, 0.49);
  const before = z.health;
  run(game, 1); // the first round, then 19 more
  assert.equal(before - z.health, 40);
  assert.ok(before - z.health > 32);
});

check('the Scattergun\'s best really is 32 hits a second against the same target', () => {
  const game = give(playing(one()), 'scattergun');
  const z = game.enemies[0];
  z.health = 1e6;
  const lines = Array(8).fill({ id: z.id, point: { x: z.x, y: 1, z: z.z } });
  game.setAim(z.id, null, lines);
  game.pointerDown();
  run(game, 0.99);
  assert.equal(1e6 - z.health, 32);
});

check('the gun in hand: six dark metal barrels in a ring on one axis, a brass band and an ammunition box, flat-shaded', () => {
  const game = armed();
  const { draw } = stageFor(game);
  const player = () => draw().children.find((c) => c.userData.guns);
  game.selectWeapon('gatling');
  const { guns, spinner, flash } = player().userData;
  assert.deepEqual(Object.entries(guns).filter(([, g]) => g.visible).map(([w]) => w), ['gatling']);
  near(flash.parent.position.z + flash.position.z, MUZZLES.gatling.z, 'the flash at the muzzle');

  assert.equal(spinner.children.length, 6);
  const radii = spinner.children.map((b) => Math.hypot(b.position.x, b.position.y));
  radii.forEach((r) => near(r, radii[0], 'a ring'));
  assert.equal(new Set(spinner.children.map((b) => b.position.z)).size, 1, 'all on one axis');
  const angles = spinner.children.map((b) => (Math.atan2(b.position.y, b.position.x) * 180) / Math.PI);
  angles.forEach((a, i) => near((a - angles[0] - i * 60) % 360, 0, 'evenly around'));
  assert.ok(spinner.children.every((b) => b.geometry instanceof THREE.CylinderGeometry && hex(b.material.color) === '#3a3a3a'));

  const meshes = [];
  guns.gatling.traverse((m) => { if (m.material) meshes.push(m); });
  assert.ok(meshes.every((m) => m.material.flatShading === true));
  const brass = meshes.filter((m) => hex(m.material.color) === '#b8860b');
  assert.equal(brass.length, 1, 'one brass band');
  assert.ok(brass[0].geometry instanceof THREE.CylinderGeometry);
  assert.ok(brass[0].position.z < 0 && brass[0].position.z > spinner.position.z - 0.3, 'around the barrels');
  const under = meshes.filter((m) => m.geometry instanceof THREE.BoxGeometry && m.position.y < spinner.position.y);
  assert.ok(under.some((m) => hex(m.material.color) === '#3a3a3a'), 'an ammunition box under the barrels');
  const colors = new Set(meshes.map((m) => hex(m.material.color)));
  assert.ok(colors.has('#3a3a3a') && colors.has('#b8860b'));
});

check('the Gatling crate\'s emblem: six small circles in a ring, in the crates\' dark emblem colour, on each side', () => {
  const game = armed();
  game.dropCrate('gatling');
  const { draw } = stageFor(game);
  run(game, 1);
  const [crate] = named(draw(), 'crate');
  const sides = crate.children.filter((g) => g instanceof THREE.Group);
  assert.equal(sides.length, 4);
  for (const side of sides) {
    assert.equal(side.children.length, 6);
    const radii = side.children.map((c) => Math.hypot(c.position.x, c.position.y));
    radii.forEach((r) => near(r, radii[0]));
    assert.ok(side.children.every((c) => c.geometry instanceof THREE.CylinderGeometry && hex(c.material.color) === '#2a1a0e'));
    const angles = side.children.map((c) => (Math.atan2(c.position.y, c.position.x) * 180) / Math.PI);
    angles.forEach((a, i) => near((a - angles[0] - i * 60) % 360, 0));
  }
});

check('the barrels spin up to 12 turns a second in 0.5 seconds, hold it while firing, and stop over 0.4 seconds after the release', () => {
  const game = armed();
  const { draw } = stageFor(game);
  const spinner = () => { const p = draw().children.find((c) => c.userData.guns); return p.userData.spinner; };
  game.pointerDown();
  run(game, 0.25);
  near(game.barrels.speed, 6, 'half way up');
  run(game, 0.25);
  near(game.barrels.speed, 12);
  let turned = 0;
  let last = game.barrels.angle;
  for (let i = 0; i < 100; i++) {
    game.update(0.01);
    turned += (game.barrels.angle - last + 1) % 1;
    last = game.barrels.angle;
    near(game.barrels.speed, 12);
  }
  near(turned, 12, 'turns in a second of firing');
  near(spinner().rotation.z, game.barrels.angle * Math.PI * 2, 'the model turns with them');
  const seen = new Set();
  for (let i = 0; i < 5; i++) {
    game.update(0.01);
    seen.add(spinner().rotation.z);
  }
  assert.equal(seen.size, 5, 'a different angle each frame');

  game.pointerUp();
  run(game, 0.2);
  near(game.barrels.speed, 6, 'half way down');
  run(game, 0.19);
  assert.ok(game.barrels.speed > 0, 'still turning at 0.39 seconds');
  run(game, 0.01);
  assert.equal(game.barrels.speed, 0);
  assert.equal(game.barrels.mode, 'idle');
  const angle = game.barrels.angle;
  run(game, 1);
  assert.equal(game.barrels.angle, angle, 'stopped');
  near(spinner().rotation.z, angle * Math.PI * 2);
});

check('released half way through the spin-up, the barrels still stop over 0.4 seconds', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.25);
  game.pointerUp();
  run(game, 0.39);
  assert.ok(game.barrels.speed > 0);
  run(game, 0.01);
  assert.equal(game.barrels.speed, 0);
});

check('each round draws a thin #ffb347 tracer from the muzzle to where it hits for 0.05 seconds, and the flash flickers', () => {
  const game = armed();
  const to = { x: 1, y: 1, z: -9 };
  game.setAim(game.enemies[0].id, to);
  game.effects.clear();
  game.shoot();
  const [s] = game.effects.streaks;
  assert.deepEqual([s.color, s.life, s.to], ['#ffb347', 0.05, to]);
  assert.ok(s.width < 1, 'thinner than the Popper\'s');
  assert.deepEqual(s.from, muzzleAt(game.player.x, game.level.roadZ, game.pose()), 'the turned muzzle');
  assert.deepEqual([TRACER.color, TRACER.life], ['#ffb347', 0.05]);

  const { draw } = stageFor(game);
  const drawn = named(draw(), 'streak');
  assert.equal(drawn.length, 1);
  assert.equal(hex(drawn[0].material.color), '#ffb347');
  assert.ok(drawn[0].scale.x < 1);
  run(game, 0.04);
  assert.equal(game.effects.streaks.length, 1);
  run(game, 0.01);
  assert.equal(game.effects.streaks.length, 0);

  game.weapon = 'popper';
  game.shoot();
  assert.equal(game.effects.streaks[0].color, STREAK.color, 'the Popper\'s stay pale');
  game.selectWeapon('gatling');
  game.effects.clear();

  game.pointerDown();
  run(game, 0.5);
  const flash = [];
  const sizes = [];
  for (let i = 0; i < 60; i++) {
    const before = game.shots;
    game.update(1 / 60); // a real frame: a round every 3 frames, a flash for 2 and a half
    flash.push(game.effects.flash > 0);
    if (game.shots > before) sizes.push(game.effects.flashSize);
  }
  assert.ok(flash.includes(true) && flash.includes(false), 'on and off while it fires');
  assert.ok(new Set(sizes).size === 2 && sizes.every((v, i) => i === 0 || v !== sizes[i - 1]), 'and its size flickers');
});

check('the crosshair: today\'s ring and colour at 40 px, with four short ticks outside it', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const rule = (sel) => {
    const m = css.match(new RegExp(`${sel.replace(/[.#:]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `a rule for ${sel}`);
    return m[1];
  };
  const px = (body, prop) => Number(body.match(new RegExp(`(?:^|[\\s;])${prop}:\\s*(-?[\\d.]+)px`))[1]);
  const border = Number(rule('#crosshair').match(/border: (\d+)px/)[1]);
  const ring = rule('#crosshair.gatling');
  assert.equal(px(ring, 'width') + 2 * border, 40);
  assert.equal(px(ring, 'height') + 2 * border, 40);
  assert.equal(px(ring, 'margin'), -20, 'centred on the pointer');
  assert.doesNotMatch(ring, /border|background/, 'today\'s ring and colour');
  assert.doesNotMatch(css, /#crosshair\.\w+::after/, 'the centre dot is the same for all');

  const ticks = rule('#crosshair.gatling::before');
  assert.equal((ticks.match(/linear-gradient\(#fff4d0, #fff4d0\)/g) ?? []).length, 4);
  const list = (prop) => ticks.match(new RegExp(`${prop}:([^;]*);`))[1].split(',').map((p) => p.trim().split(/\s+/).map(parseFloat));
  const [sizes, at] = [list('background-size'), list('background-position')];
  const box = px(ticks, 'width');
  const from = -px(ticks, 'left') - border; // the ring's outer edge in the ::before box
  const to = from + 40;
  near(box / 2, from + 20, 'the box is centred on the ring');
  const sides = sizes.map(([w, h], i) => {
    const [x, y] = at[i];
    const [cx, cy] = [x + w / 2, y + h / 2];
    assert.ok(Math.min(w, h) <= 2 && Math.max(w, h) <= 8, 'short');
    if (Math.abs(cx - box / 2) < 1e-6 && y + h <= from) return 'top';
    if (Math.abs(cx - box / 2) < 1e-6 && y >= to) return 'bottom';
    if (Math.abs(cy - box / 2) < 1e-6 && x + w <= from) return 'left';
    if (Math.abs(cy - box / 2) < 1e-6 && x >= to) return 'right';
    return 'misplaced';
  });
  assert.deepEqual(sides.sort(), ['bottom', 'left', 'right', 'top']);

  const els = {};
  const el = () => ({ hidden: false, textContent: '', className: '', style: {}, addEventListener() {} });
  const doc = { querySelector: (s) => (els[s] ??= el()), body: { classList: { toggle() {} } } };
  const game = give(playing(one()), 'gatling');
  createHud(doc, game).render();
  assert.equal(els['#crosshair'].className, 'gatling');
});

check('the weapon line gains "· 4 Gatling" with its magazine or reloading, and the HUD\'s span is dimmed until it is owned', () => {
  const game = playing(one());
  assert.equal(line(game), '1 Popper ∞ · 2 Scattergun — · 3 Launcher — · 4 Gatling —');
  give(game, 'launcher');
  give(game, 'gatling');
  for (let i = 0; i < 13; i++) game.shoot();
  assert.equal(line(game), '1 Popper ∞ · 2 Scattergun — · 3 Launcher 2/2 · 4 Gatling 87/100');
  assert.deepEqual(screenView(game).hud.weapons.map((w) => w.state), ['owned', 'none', 'owned', 'hand']);
  game.reloadMagazine();
  assert.equal(line(game), '1 Popper ∞ · 2 Scattergun — · 3 Launcher 2/2 · 4 Gatling reloading');

  const els = {};
  const el = () => ({ hidden: false, textContent: '', className: '', style: {}, addEventListener() {} });
  const doc = { querySelector: (s) => (els[s] ??= el()), body: { classList: { toggle() {} } } };
  const hud = createHud(doc, game);
  hud.render();
  assert.deepEqual([els['#weapon-gatling'].textContent, els['#weapon-gatling'].className], ['4 Gatling reloading', 'hand']);
  assert.equal(els['#crosshair'].style.opacity, '0.5');
  game.selectWeapon('popper');
  hud.render();
  assert.equal(els['#weapon-gatling'].className, 'owned');
});

check('on every screen: no line, crosshair or firing on loading, error and title; all four weapons on the intro card and after', () => {
  const game = newGame();
  const raw = new Game(one(), { random: () => 0.5 });
  assert.equal(screenView(raw).hud, null, 'loading');
  raw.fail('network');
  assert.equal(screenView(raw).hud, null, 'error');
  assert.equal(screenView(game).hud, null, 'title');
  assert.equal(screenView(game).pointer, true);
  assert.match(screenView(game).band.lines[1], / · 1 2 3 4 or wheel: weapons · R reloads · M sound: on$/);
  assert.match(TEXT.controls, / · 1 2 3 4 or wheel: weapons · R reloads$/);
  game.pointerDown();
  game.update(1);
  assert.equal(game.shots, 0);

  assert.equal(game.screen, 'intro');
  assert.deepEqual(screenView(game).hud.weapons.at(-1), { weapon: 'gatling', text: '4 Gatling —', state: 'none' });
  click(game);
  assert.equal(game.screen, 'play');
  game.pressEsc();
  assert.equal(screenView(game).hud.weapons.length, 4, 'paused');
  game.pressEsc();
  game.player.hearts = 0;
  game.end('defeat');
  assert.equal(screenView(game).hud.weapons.length, 4, 'defeat');
});

check('the pickup notice shows below a banner, on its own line, where the others do', () => {
  const game = playing(one());
  const c = game.dropCrate('gatling');
  game.setAim(c.id);
  for (let i = 0; i < CRATE.hits; i++) game.shoot();
  game.setAim(null);
  game.selectWeapon('popper');
  kill(game, game.enemies[0]);
  game.update(0.01);
  const view = screenView(game);
  assert.deepEqual(view.band, { lines: ['Wave 1 cleared'] });
  assert.equal(view.hud.notice, 'Gatling! Hold fire to spin it up — 20 rounds a second');
  assert.equal(WEAPONS.gatling.notice, view.hud.notice);
});

check('spinup when the barrels start to spin up, one gatling per round with its own pitch within 5%, spindown when firing stops', () => {
  let n = 0;
  const random = () => [0, 0.3, 0.6, 1, 0.45][n++ % 5];
  const game = armed(one(), random);
  game.pointerDown();
  game.update(0.01);
  assert.deepEqual(sfx(game), ['spinup']);
  run(game, 0.48);
  assert.deepEqual(sfx(game), [], 'silent apart from the whine until it fires');
  game.update(0.01);
  const first = cues(game).filter((c) => c.name === 'gatling');
  assert.equal(first.length, 1);
  run(game, 0.99);
  const all = [...first, ...cues(game).filter((c) => c.name === 'gatling')];
  assert.equal(all.length, 20, 'one for each round');
  assert.ok(all.every((c) => c.pitch >= 0.95 - 1e-9 && c.pitch <= 1.05 + 1e-9), 'within 5%');
  assert.ok(new Set(all.map((c) => c.pitch)).size > 3, 'each a little different');
  game.pointerUp();
  game.update(0.01);
  assert.deepEqual(sfx(game), ['spindown']);
  run(game, 1);
  assert.deepEqual(sfx(game), [], 'once');
});

check('the cues follow mute and pause like every cue', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.6);
  game.pressEsc();
  assert.deepEqual(mix(game).cues, [], 'paused, they wait');
  assert.ok(game.cues.some((c) => c.name === 'gatling'));
  run(game, 3);
  game.pressEsc();
  const names = mix(game).cues.map((c) => c.name);
  assert.equal(names.filter((n) => n === 'spinup').length, 1);
  assert.ok(names.includes('gatling'));
  game.toggleSound();
  run(game, 0.5);
  assert.deepEqual(mix(game).cues, [], 'muted, dropped');
  assert.equal(mix(game).muted, true);
});

check('the audio: each cue sounds, the crack is 25 ms and follows its pitch, the whines last 0.5 and 0.4 seconds and are cut at once', () => {
  class Ctx {
    static made = [];
    currentTime = 0;
    sampleRate = 100;
    state = 'running';
    destination = {};
    gains = [];
    freqs = [];
    ramps = [];
    started = 0;
    constructor() { Ctx.made.push(this); }
    node(extra) { return { connect: (to) => to, disconnect() { this.cut = true; }, ...extra }; }
    createGain() {
      const g = this.node({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime: (v, t) => this.ramps.push(t) } });
      this.gains.push(g);
      return g;
    }
    createOscillator() {
      return this.node({ frequency: { setValueAtTime: (f) => this.freqs.push(f), exponentialRampToValueAtTime() {} }, start: () => { this.started += 1; }, stop() {} });
    }
    createBufferSource() { return this.node({ start: () => { this.started += 1; }, stop() {} }); }
    createBiquadFilter() { return this.node({ frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, Q: {} }); }
    createBuffer(c, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    suspend() { this.state = 'suspended'; }
    resume() { this.state = 'running'; }
  }
  const audio = createAudio({ AudioContext: Ctx });
  audio.unlock();
  const ctx = Ctx.made.at(-1);
  const play = (...cues) => audio.play({ cues, music: null, paused: false });
  const longest = (name, extra) => {
    ctx.ramps.length = 0;
    play({ name, ...extra });
    return Math.max(...ctx.ramps);
  };
  for (const name of ['spinup', 'gatling', 'spindown']) {
    const started = ctx.started;
    play({ name });
    assert.ok(ctx.started > started, name);
  }
  near(longest('gatling', { pitch: 1 }), 0.025, 'a crack of about 25 ms');
  near(longest('spinup'), 0.5);
  near(longest('spindown'), 0.4);

  const tone = (pitch) => { ctx.freqs.length = 0; play({ name: 'gatling', pitch }); return ctx.freqs[0]; };
  near(tone(1.05) / tone(0.95), 1.05 / 0.95, 'the pitch moves the crack');

  play({ name: 'spinup' });
  const whine = ctx.gains.at(-1);
  const started = ctx.started;
  play({ name: 'spinup', stop: true });
  assert.equal(whine.cut, true, 'cut at once');
  assert.equal(ctx.started, started, 'a stop makes no sound');
  play({ name: 'spinup' });
  const second = ctx.gains.at(-1);
  play({ name: 'spindown' });
  assert.equal(second.cut, true, 'the spin-down replaces the whine');
  assert.notEqual(ctx.gains.at(-1).cut, true);
});

check('pause freezes the spin-up, the spinning barrels, the reload and the sounds', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.3);
  game.pressEsc();
  const frozen = JSON.stringify([game.barrels, game.reload, game.refill, game.cues, game.effects, game.shots]);
  run(game, 5);
  assert.equal(JSON.stringify([game.barrels, game.reload, game.refill, game.cues, game.effects, game.shots]), frozen);
  game.pressEsc();
  run(game, 0.19);
  assert.equal(game.shots, 0);
  run(game, 0.01);
  assert.equal(game.shots, 1, 'the spin-up carried on where it was');

  run(game, 0.3);
  game.pressEsc();
  const spinning = JSON.stringify(game.barrels);
  run(game, 3);
  assert.equal(JSON.stringify(game.barrels), spinning, 'the barrels hold still');
  game.pressEsc();

  game.pointerUp();
  while (game.ammo.gatling > 0) game.shoot();
  run(game, 1);
  game.pressEsc();
  run(game, 9);
  assert.equal(game.reloading, true);
  game.pressEsc();
  run(game, 1.99);
  assert.equal(game.reloading, true);
  run(game, 0.01);
  assert.equal(game.reloading, false);
});

check('defeat freezes the barrels as they are: the Gatling stops firing, with no spin-down and no spindown sound', () => {
  const game = armed();
  game.pointerDown();
  run(game, 0.8);
  game.cues.length = 0;
  game.player.hearts = 0;
  game.end('defeat');
  assert.equal(game.firing, false);
  assert.deepEqual(sfx(game), []);
  const shots = game.shots;
  const barrels = JSON.stringify(game.barrels);
  run(game, 5);
  assert.equal(game.shots, shots);
  assert.equal(JSON.stringify(game.barrels), barrels);
  assert.deepEqual(sfx(game), []);
  assert.equal(game.barrels.speed, 0);
});

check('victory freezes them too: the boss\'s fall stops the barrels at once, with no spindown sound', () => {
  const game = journey();
  game.player.hearts = 1e6;
  clearWave(game);
  run(game, game.level.timing.gap + game.level.timing.bossBanner + 0.05);
  give(game, 'gatling');
  game.pointerDown();
  run(game, 0.8);
  assert.equal(game.barrels.mode, 'firing');
  const boss = game.enemies.find((e) => e.kind === 'boss');
  boss.health = 2;
  game.cues.length = 0;
  kill(game, boss);
  assert.equal(game.barrels.mode, 'idle');
  run(game, 1.6);
  assert.equal(game.screen, 'victory');
  assert.deepEqual(sfx(game), ['gatling'], 'the round that felled it, and no spindown');
  const shots = game.shots;
  run(game, 3);
  assert.equal(game.shots, shots);
  assert.equal(game.barrels.speed, 0);
});

check('each level start, Try again, Play again, Next level and Back to title leave only the Popper', () => {
  const bare = (game) => {
    assert.equal(game.weapon, 'popper');
    assert.equal(game.owns('gatling'), false);
    assert.deepEqual(game.ammo, { scattergun: 0, launcher: 0, gatling: 0 });
    assert.deepEqual(game.refill, { scattergun: 0, launcher: 0, gatling: 0 });
    assert.deepEqual([game.barrels.mode, game.barrels.speed], ['idle', 0]);
    assert.deepEqual([game.crates, game.cratesDue, game.notice], [[], [], null]);
  };
  // Everything the Gatling brings, and its barrels turning, as a reset finds it.
  const armed = (game) => {
    give(game, 'gatling');
    game.dropCrate('gatling');
    game.cratesDue.push({ weapon: 'gatling', t: 1 });
    Object.assign(game.barrels, { mode: 'firing', speed: 12 });
    assert.equal(game.owns('gatling'), true);
  };

  const lost = playing(one());
  armed(lost);
  lost.pointerDown();
  run(lost, 0.8);
  assert.equal(lost.barrels.mode, 'firing');
  lost.player.hearts = 0;
  lost.end('defeat');
  armed(lost);
  lost.restart(); // Try again
  bare(lost);

  const won = journey();
  win(won);
  armed(won);
  won.restart(); // Play again
  bare(won);
  click(won);
  win(won);
  armed(won);
  won.nextLevel();
  bare(won);
  click(won);
  win(won);
  armed(won);
  won.toTitle();
  bare(won);
  armed(won);
  won.pointerDown(); // the level start
  bare(won);
});

check('get_state reports gatling with its magazine as ammo, and changes nothing else', async () => {
  const tools = new Map();
  const game = playing(one());
  await registerWebMcp({ registerTool: (t) => { tools.set(t.name, t); } }, game);
  give(game, 'gatling');
  for (let i = 0; i < 13; i++) game.shoot();
  const state = await tools.get('get_state').execute({});
  assert.equal(state.weapon, 'gatling');
  assert.equal(state.ammo, 87);
  assert.equal(state.reloading, false);
  assert.deepEqual(Object.keys(state), ['level', 'screen', 'wave', 'score', 'hearts', 'enemies', 'boss_health', 'weapon', 'ammo', 'reloading']);
  assert.match(tools.get('get_state').description, /popper, scattergun, launcher or gatling/);
  game.reloadMagazine();
  assert.deepEqual((({ weapon, ammo, reloading }) => ({ weapon, ammo, reloading }))(await tools.get('get_state').execute({})), { weapon: 'gatling', ammo: 87, reloading: true });
});

check('llms.txt names the Gatling among the weapons and in get_state\'s answer', () => {
  const llms = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8');
  assert.match(llms, /The Gatling \(key 4\)/);
  assert.match(llms, /20 rounds a second/);
  assert.match(llms, /magazine of 100 rounds/);
  assert.match(llms, /a Gatling crate 2 seconds after wave 5 starts/);
  assert.match(llms, /`weapon` is `popper`, `scattergun`, `launcher` or `gatling`, the one in hand/);
  assert.match(llms, /1 2 3 4 or wheel: weapons/);
  assert.match(readFileSync(new URL('../README.md', import.meta.url), 'utf8'), /1 2 3 4 or wheel: weapons/);
});

test('this file holds its 34 tests', () => {
  assert.equal(count, 34);
});
