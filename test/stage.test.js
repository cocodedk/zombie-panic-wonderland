// The stage and every model, run against test/fake-three.js: what is built, where it is drawn,
// what can be aimed at, and the backdrop built anew when the level changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';
import { level2 } from '../src/levels/level-2.js';
import { playing, run, kill, clearWave, click, levelWith, level1 } from './helpers.js';
import { Game, bossWindup, CROW_CIRCLE } from '../src/logic/game.js';
import { CAMERA } from '../src/logic/camera.js';
import { withWaves, short1, short2, journey } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

const CENTRE = { x: 0, y: 0 };

function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const draw = () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
  return { stage, draw };
}

const backdropOf = (scene) => scene.children.filter((c) => c.name === 'backdrop');
const named = (scene, name) => scene.children.filter((c) => c.name === name);
const hex = (color) => `#${color.getHexString()}`;

test('level 2\'s backdrop: every scenery model built, flat-shaded, in its palette', () => {
  const game = playing(level2);
  const scene = stageFor(game).draw();
  const [backdrop] = backdropOf(scene);
  assert.deepEqual(backdrop.children.filter((c) => c.name).map((c) => c.name), level2.scenery.map((s) => s.model));
  assert.equal(hex(scene.fog.color), '#15302c');

  const sky = backdrop.children.find((c) => c.name === 'sky');
  const colors = sky.geometry.attributes.color.array;
  const same = (rgb, h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b].every((v, i) => Math.abs(v - rgb[i]) < 1e-9); };
  assert.ok(same(colors.slice(0, 3), '#1f4d3f'), 'the horizon');
  assert.ok(same(colors.slice(-3), '#0f1a33'), 'the top');

  const moon = backdrop.children.find((c) => c.name === 'moon');
  assert.equal(moon.position.y, 26);
  assert.equal(hex(moon.children[0].material.color), '#e8ecd1');

  const corn = backdrop.children.find((c) => c.name === 'cornRows');
  assert.equal(hex(corn.children[0].material.color), '#a8943e');
  assert.ok(corn.children[0].count > 0);
  const road = backdrop.children.find((c) => c.name === 'road');
  const bricks = road.children.find((c) => c instanceof THREE.InstancedMesh);
  const whole = Math.floor(26 / 0.62) * Math.floor(2.6 / 0.3);
  assert.ok(bricks.count < whole * 0.9, `the road has gaps: ${bricks.count} of ${whole} bricks`);

  let standard = 0;
  backdrop.traverse((m) => {
    if (m.material instanceof THREE.MeshStandardMaterial) {
      standard += 1;
      assert.equal(m.material.flatShading, true, m.parent?.name);
    }
    assert.equal(m.material?.map, undefined, 'no textures');
  });
  assert.ok(standard > 20);
});

test('a crow is drawn flying in and circling at a height, diving at the road, then flying away', () => {
  const game = playing(withWaves(level2, [{ crow: 1 }]));
  const { stage, draw } = stageFor(game);
  const crowIn = (scene) => named(scene, 'crow');

  run(game, 1);
  let [crow] = crowIn(draw());
  assert.ok(Math.abs(crow.position.y - level2.enemies.crow.height) < 1e-6, `circling at y = ${crow.position.y}`);
  assert.equal(stage.pick(CENTRE), game.enemies[0].id); // it can be aimed at

  run(game, 1.5); // halfway down
  [crow] = crowIn(draw());
  assert.ok(crow.position.y > 0.5 && crow.position.y < level2.enemies.crow.height);
  assert.ok(crow.position.z > level2.enemies.crow.z && crow.position.z < 0);

  run(game, 0.5); // it has landed and turned away
  const scene = draw();
  assert.equal(game.enemies.length, 0);
  assert.equal(crowIn(scene).length, 1);
  assert.equal(stage.pick(CENTRE), null); // a leaving crow is no target
  run(game, 1);
  const leaving = crowIn(draw())[0];
  assert.ok(leaving.position.y > 3);
  run(game, 0.5);
  assert.equal(crowIn(draw()).length, 0);
});

test('the Scarecrow King is drawn, and its flaming pumpkin and summoned crows', () => {
  const game = playing(withWaves(level2, [{ zombie: 1 }]));
  const { draw } = stageFor(game);
  clearWave(game);
  run(game, 3 + 2);
  assert.equal(named(draw(), 'scarecrowKing').length, 1);
  run(game, 2);
  assert.equal(named(draw(), 'flamingPumpkin').length, 1);
  run(game, 4);
  const scene = draw();
  assert.equal(named(scene, 'flamingPumpkin').length, 0);
  assert.equal(named(scene, 'crow').length, 3);
});

test('winding up, the crown glows gold and the hat orange, at full brightness as the action comes, then rest', () => {
  for (const [level, model, glowOf, color] of [
    [level1, 'zombieKing', (b) => b.userData.crown[0], '#ffd76a'],
    [level2, 'scarecrowKing', (b) => b.userData.hat, '#ff9a3c'],
  ]) {
    const game = playing(withWaves(level, [{ zombie: 1 }]));
    game.player.hearts = 99;
    const { draw } = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = () => named(draw(), model)[0];
    const rest = hex(glowOf(boss()).color);
    run(game, 1.39);
    assert.equal(hex(glowOf(boss()).color), rest);
    run(game, 0.6);
    const lit = glowOf(boss());
    const want = new THREE.Color(color);
    for (const k of ['r', 'g', 'b']) assert.ok(Math.abs(lit.emissive[k] - want[k]) < 0.02, `${model} glows ${color}`);
    run(game, 0.01);
    assert.equal(hex(glowOf(boss()).color), rest, 'back to rest after the action');
    assert.equal(hex(glowOf(boss()).emissive), '#000000');
  }
});

test('winding up, the Zombie King\'s arms rise to shoulder height and the Scarecrow King\'s to 45° above level, then rest', async () => {
  const { buildZombieKing } = await import('../src/view/models/zombie.js');
  const { buildScarecrowKing } = await import('../src/view/models/scarecrow.js');
  const up = {
    // The arm's angle with the torso's lean: -90° points it straight ahead, level with the shoulders.
    zombieKing: (b) => b.userData.arms.map((a) => a.rotation.x + b.userData.torso.rotation.x),
    scarecrowKing: (b) => b.userData.arms.map((a) => a.rotation.z),
  };
  const raised = { zombieKing: [-Math.PI / 2, -Math.PI / 2], scarecrowKing: [-Math.PI / 4, Math.PI / 4] };
  const rest = (build, model, t) => {
    const b = build();
    b.userData.tick(t, {});
    return up[model](b);
  };
  const close = (a, b, msg) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${msg}: ${v} ≈ ${b[i]}`));

  for (const [level, model, build] of [[level1, 'zombieKing', buildZombieKing], [level2, 'scarecrowKing', buildScarecrowKing]]) {
    // The model itself: fully wound up, the arms are raised; unwound, they keep the resting pose.
    const b = build();
    b.userData.tick(1.23, { windup: 1 });
    close(up[model](b), raised[model], `${model} raised`);
    b.userData.tick(1.23, { windup: 0 });
    close(up[model](b), rest(build, model, 1.23), `${model} at rest`);

    // Through the stage, in a fight.
    const game = playing(withWaves(level, [{ zombie: 1 }]));
    game.player.hearts = 99;
    const { draw } = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const drawn = () => up[model](named(draw(), model)[0]);
    run(game, 1.39);
    close(drawn(), rest(build, model, game.clock), `${model} before the wind-up`);
    run(game, 0.6);
    const w = bossWindup(game.enemies[0], level.boss);
    assert.ok(w > 0.98);
    const r = rest(build, model, game.clock);
    close(drawn(), r.map((v, i) => v + (raised[model][i] - v) * w), `${model} as the action comes`);
    run(game, 0.01);
    close(drawn(), rest(build, model, game.clock), `${model} after the action`);
  }
});

test('the Scarecrow King\'s crows fly out from beside it, not from the backdrop', () => {
  const game = playing(withWaves(level2, [{ zombie: 1 }]));
  game.player.hearts = 99;
  const { draw } = stageFor(game);
  clearWave(game);
  run(game, 3 + 2 + 5); // the first summon
  const king = game.enemies.find((e) => e.kind === 'boss');
  assert.equal(game.enemies.filter((e) => e.kind === 'crow').length, 3);
  const z = king.z; // where it stood as it summoned them
  for (let i = 0; i < 70; i++) {
    for (const crow of named(draw(), 'crow')) {
      assert.ok(Math.abs(crow.position.z - z) <= CROW_CIRCLE + 1e-9, `z = ${crow.position.z}, the king at ${z}`);
      assert.ok(Math.abs(crow.position.x - king.x) <= 2 + CROW_CIRCLE + 1e-9, `x = ${crow.position.x}`);
    }
    run(game, 0.01);
  }
});

test('the stomp shakes the camera by at most 0.15 units for 0.25 seconds; reduced motion does not', () => {
  for (const reducedMotion of [false, true]) {
    const game = new Game(withWaves(level1, [{ zombie: 1 }]), { random: () => 0.5, reducedMotion });
    game.loaded();
    click(game);
    click(game);
    const { draw } = stageFor(game);
    const camera = () => THREE.renderers.at(-1).camera.position;
    const at = CAMERA.position;
    clearWave(game);
    run(game, 3 + 2 + 3); // the first stomp's shockwave reaches the road
    let moved = 0;
    for (let i = 0; i < 5; i++) {
      draw();
      const { x, y, z } = camera();
      assert.ok(Math.abs(x - at.x) <= 0.15 && Math.abs(y - at.y) <= 0.15 && z === at.z);
      moved += Math.abs(x - at.x) + Math.abs(y - at.y);
    }
    assert.equal(moved > 0, !reducedMotion);
    run(game, 0.25);
    draw();
    assert.deepEqual({ ...camera() }, { ...at });
  }
});

test('moving to level 2 builds its backdrop anew; Back to title brings level 1\'s back', () => {
  const game = journey();
  const { draw } = stageFor(game);
  const models = (scene) => backdropOf(scene)[0].children.filter((c) => c.name).map((c) => c.name);

  let scene = draw();
  assert.deepEqual(models(scene), level1.scenery.map((s) => s.model));
  assert.equal(hex(scene.fog.color), '#5a3148');
  clearWave(game);
  run(game, 3 + 2 + 0.05);
  assert.equal(named(draw(), 'zombieKing').length, 1);
  kill(game, game.enemies[0]);
  run(game, 1.5);
  draw();

  const disposed = THREE.disposed.geometries;
  game.nextLevel();
  scene = draw();
  assert.equal(game.level, short2);
  assert.equal(backdropOf(scene).length, 1);
  assert.deepEqual(models(scene), level2.scenery.map((s) => s.model));
  assert.equal(hex(scene.fog.color), '#15302c');
  assert.ok(THREE.disposed.geometries > disposed, 'the old backdrop is disposed');
  assert.equal(scene.children.length, 2); // the backdrop and the player, nothing left of level 1

  click(game);
  clearWave(game);
  run(game, 3 + 2 + 0.05);
  assert.equal(named(draw(), 'scarecrowKing').length, 1);
  kill(game, game.enemies[0]);
  run(game, 1.5);
  game.toTitle();
  scene = draw();
  assert.equal(game.level, short1);
  assert.equal(backdropOf(scene).length, 1);
  assert.deepEqual(models(scene), level1.scenery.map((s) => s.model));
  assert.equal(hex(scene.fog.color), '#5a3148');
});

test('the camera stands at (0, 3.6, 9) looking at (0, 1.4, -6), both read from src/logic/camera.js', async () => {
  const { CAMERA } = await import('../src/logic/camera.js');
  assert.deepEqual(CAMERA, { position: { x: 0, y: 3.6, z: 9 }, target: { x: 0, y: 1.4, z: -6 } });
  const source = readFileSync(new URL('../src/logic/camera.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import/, 'no three.js');

  const cameraOf = () => {
    stageFor(playing(level2)).draw();
    const { position: { x, y, z }, target } = THREE.renderers.at(-1).camera;
    return { position: { x, y, z }, target };
  };
  assert.deepEqual(cameraOf(), CAMERA);
  const saved = structuredClone(CAMERA);
  Object.assign(CAMERA.position, { y: 7 });
  Object.assign(CAMERA.target, { y: -2 });
  try {
    assert.deepEqual(cameraOf(), CAMERA, 'the stage follows the module');
  } finally {
    Object.assign(CAMERA, saved);
  }
});

test('the aim finds the enemy under the crosshair, and where its ray lands', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  const { stage, draw } = stageFor(game);
  draw();
  assert.deepEqual(stage.aimAt(CENTRE), { id: game.enemies[0].id, point: { x: 0, y: 0, z: -60 } });
});

test('a streak starts where the drawn gun is, walking or rolling', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  const { draw } = stageFor(game);
  game.setMove(1);
  for (const [seconds, dodge] of [[0.3, false], [0.2, true]]) {
    if (dodge) assert.ok(game.dodge());
    run(game, seconds);
    game.shoot();
    const body = draw().children.find((c) => c.userData.flash).userData.body;
    const { from } = game.effects.streaks.at(-1);
    const [mx, my] = [0.1, 0.3]; // the muzzle, from the body's waist pivot
    const a = body.rotation.z;
    assert.ok(Math.abs(from.y - (body.position.y + mx * Math.sin(a) + my * Math.cos(a))) < 1e-9);
    assert.ok(Math.abs(from.x - (game.player.x + mx * Math.cos(a) - my * Math.sin(a))) < 1e-9);
  }
});

test('streaks, the muzzle flash, chunks and puffs are drawn; pause freezes them; a restart clears them', () => {
  const game = playing(levelWith([{ zombie: 2 }]));
  const { stage, draw } = stageFor(game);
  const player = () => draw().children.find((c) => c.userData.flash);
  game.setAim(game.enemies[0].id, { x: 0, y: 1.1, z: -11 });
  for (let i = 0; i < 3; i++) game.shoot(); // it falls
  let scene = draw();
  const [streak] = named(scene, 'streak');
  const from = game.effects.streaks[0].from;
  assert.ok(Math.abs(streak.scale.z - Math.hypot(0 - from.x, 1.1 - from.y, -11 - from.z)) < 1e-9);
  assert.equal(hex(streak.material.color), '#fff3b0');
  assert.equal(player().userData.flash.visible, true);
  assert.equal(named(scene, 'chunk').length, 12);
  assert.ok(named(scene, 'chunk').every((c) => c.material.flatShading));
  assert.equal(hex(named(scene, 'puff')[0].material.color), '#9fd18b');

  run(game, 0.1);
  scene = draw();
  assert.equal(named(scene, 'streak').length, 0);
  assert.equal(player().userData.flash.visible, false);
  game.pressEsc();
  const where = () => JSON.stringify(named(draw(), 'chunk').map((c) => [c.position, c.scale]));
  const frozen = where();
  for (let i = 0; i < 10; i++) stage.sync(game, 0.05);
  assert.equal(where(), frozen);
  game.pressEsc();
  run(game, 1);
  assert.equal(named(draw(), 'chunk').length, 0);

  kill(game, game.enemies[0]);
  game.player.hearts = 0;
  game.end('defeat');
  assert.equal(named(draw(), 'chunk').length, 12);
  game.restart();
  scene = draw();
  assert.equal(named(scene, 'chunk').length + named(scene, 'puff').length, 0);
});

test('with reduced motion a fallen enemy fades out, and no chunks are drawn', () => {
  const game = new Game(levelWith([{ zombie: 1 }]), { random: () => 0.5, reducedMotion: true });
  game.loaded();
  click(game);
  click(game);
  const { draw } = stageFor(game);
  kill(game, game.enemies[0]);
  run(game, 0.15);
  const scene = draw();
  assert.equal(named(scene, 'chunk').length, 0);
  const [fade] = named(scene, 'fade');
  let opacity;
  fade.traverse((m) => { if (m.material) opacity = m.material.opacity; });
  assert.ok(Math.abs(opacity - 0.5) < 1e-6, `opacity ${opacity}`);
  run(game, 0.15);
  assert.equal(named(draw(), 'fade').length, 0);
});
