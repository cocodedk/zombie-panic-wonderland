// Spec 07 on the stage, against test/fake-three.js: crates, the launcher's pumpkins and their
// explosions, the gun in hand and the scattergun's pellet rays.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { Game } from '../src/logic/game.js';
import { crateAt, shellAt, pelletDirs } from '../src/logic/weapons.js';
import { MUZZLES } from '../src/logic/effects.js';
import { playing, run, kill, click, levelWith } from './helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const CENTRE = { x: 0, y: 0 };
const hex = (color) => `#${color.getHexString()}`;
const named = (scene, name) => scene.children.filter((c) => c.name === name);
const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} ≈ ${b}`);

function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return { stage, raycaster: THREE.raycasters.at(-1), draw: () => { stage.sync(game, 0.01); return renderer.scene; } };
}

// Wave 1 cleared, so only what the test adds can be aimed at.
function empty(options) {
  const game = options ? new Game(levelWith([{ zombie: 1 }]), { random: () => 0.5, ...options }) : playing(levelWith([{ zombie: 1 }]));
  if (options) {
    game.loaded();
    click(game);
    click(game);
  }
  kill(game, game.enemies[0]);
  game.update(0.01);
  return game;
}

test('a crate is a flat-shaded wooden box with its weapon\'s dark emblem on each side, drawn where it floats', () => {
  const game = empty();
  const { stage, draw } = stageFor(game);
  const c = game.dropCrate('launcher');
  run(game, 1);
  const [crate] = named(draw(), 'crate');
  const at = crateAt(c);
  assert.deepEqual({ ...crate.position }, at);
  const colors = new Set();
  crate.traverse((m) => {
    if (!m.material) return;
    assert.equal(m.material.flatShading, true);
    colors.add(hex(m.material.color));
  });
  assert.deepEqual([...colors].sort(), ['#2a1a0e', '#8b5a2b']);
  const sides = crate.children.filter((g) => g instanceof THREE.Group);
  assert.equal(sides.length, 4, 'an emblem on each side');
  assert.equal(stage.pick(CENTRE), c.id, 'it can be shot');
});

test('a hit flashes the crate white for 0.08 seconds', () => {
  const game = empty();
  const { draw } = stageFor(game);
  const c = game.dropCrate('scattergun');
  game.setAim(c.id);
  game.shoot();
  const wood = () => hex(named(draw(), 'crate')[0].children[0].material.color);
  assert.equal(wood(), '#ffffff');
  run(game, 0.08);
  assert.equal(wood(), '#8b5a2b');
});

test('a crate leaving cannot be aimed at, and is gone after its second', () => {
  const game = empty();
  const { stage, draw } = stageFor(game);
  game.dropCrate('scattergun').t = 10; // before the boss comes
  assert.equal(named(draw(), 'crate').length, 1);
  assert.equal(stage.pick(CENTRE), null, 'shots pass through');
  run(game, 1);
  assert.equal(named(draw(), 'crate').length, 0);
});

test('the launcher\'s pumpkin is a small glowing orange pumpkin, flying from the muzzle; then an orange burst', () => {
  const game = empty();
  const { draw } = stageFor(game);
  const c = game.dropCrate('launcher');
  game.setAim(c.id);
  for (let i = 0; i < 3; i++) game.shoot();
  game.setAim(null, { x: 2, y: 0, z: -6 });
  game.shoot();
  run(game, 0.2);
  const [shell] = named(draw(), 'launchedPumpkin');
  assert.deepEqual({ ...shell.position }, shellAt(game.shells[0]));
  assert.ok(shell.scale.x < 0.5, 'small');
  assert.equal(hex(shell.children[0].material.color), '#e0762b');
  assert.equal(hex(shell.children[0].material.emissive), '#e07b24', 'glowing');
  run(game, 0.3);
  const scene = draw();
  assert.equal(named(scene, 'launchedPumpkin').length, 0);
  assert.equal(named(scene, 'chunk').length, 12 + 16, 'the zombie\'s, still falling, and the explosion\'s; the chips are gone');
  assert.equal(named(scene, 'puff').length, 1);
});

test('with reduced motion the explosion draws only its puff', () => {
  const game = empty({ reducedMotion: true });
  const { draw } = stageFor(game);
  game.explode({ x: 0, y: 1, z: -6 });
  const scene = draw();
  assert.equal(named(scene, 'chunk').length, 0);
  assert.equal(named(scene, 'puff').length, 1);
});

test('the gun in hand changes with the weapon, its flash at the muzzle where the streaks start', () => {
  const game = empty();
  const { draw } = stageFor(game);
  const player = () => draw().children.find((c) => c.userData.guns);
  for (const weapon of ['scattergun', 'launcher']) {
    const c = game.dropCrate(weapon);
    game.weapon = 'popper';
    game.setAim(c.id);
    for (let i = 0; i < 3; i++) game.shoot();
  }
  for (const weapon of ['popper', 'scattergun', 'launcher']) {
    game.selectWeapon(weapon);
    const { guns, flash } = player().userData;
    assert.deepEqual(Object.entries(guns).filter(([, g]) => g.visible).map(([w]) => w), [weapon]);
    near(flash.parent.position.z + flash.position.z, MUZZLES[weapon].z, weapon);
  }
  const ring = [];
  player().userData.guns.launcher.traverse((m) => { if (m.geometry instanceof THREE.TorusGeometry) ring.push(hex(m.material.color)); });
  assert.deepEqual(ring, ['#e07b24'], 'the launcher\'s orange ring');
  let barrels = 0;
  player().userData.guns.scattergun.traverse((m) => { if (m.geometry instanceof THREE.CylinderGeometry) barrels += 1; });
  assert.equal(barrels, 2, 'a double barrel');

  game.selectWeapon('scattergun');
  game.shoot();
  assert.equal(player().userData.flash.scale.x, 2, 'a larger flash');
  game.selectWeapon('popper');
  game.shoot();
  assert.equal(player().userData.flash.scale.x, 1);
});

test('with the Scattergun, the aim casts 8 pellet rays in the cone, each finding the first thing on its line', () => {
  const game = empty();
  const { stage, raycaster, draw } = stageFor(game);
  const c = game.dropCrate('scattergun');
  draw();
  const before = raycaster.sets.length;
  const target = stage.aimAt(CENTRE, true);
  const rays = raycaster.sets.slice(before);
  assert.equal(rays.length, 8);
  pelletDirs({ x: 0, y: 0, z: -1 }).forEach((d, i) => {
    for (const k of ['x', 'y', 'z']) near(rays[i].direction[k], d[k]);
  });
  assert.deepEqual(target.pellets, Array(8).fill({ id: c.id, point: { x: 0, y: 0, z: -60 } }));
  assert.equal(stage.aimAt(CENTRE).pellets, undefined, 'only when asked');
});

test('Try again clears crates and flying pumpkins from the stage', () => {
  const game = empty();
  const { draw } = stageFor(game);
  const c = game.dropCrate('launcher');
  game.setAim(c.id);
  for (let i = 0; i < 3; i++) game.shoot();
  game.shoot();
  game.dropCrate('scattergun');
  let scene = draw();
  assert.equal(named(scene, 'crate').length + named(scene, 'launchedPumpkin').length, 2);
  game.end('defeat');
  game.restart();
  scene = draw();
  assert.equal(named(scene, 'crate').length + named(scene, 'launchedPumpkin').length, 0);
});
