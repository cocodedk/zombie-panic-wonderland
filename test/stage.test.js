// The stage and every model, run against test/fake-three.js: what is built, where it is drawn,
// what can be aimed at, and the backdrop built anew when the level changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { level2 } from '../src/levels/level-2.js';
import { playing, run, kill, clearWave, click, level1 } from './helpers.js';
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
  run(game, 7.5 + 4);
  assert.equal(named(draw(), 'flamingPumpkin').length, 1);
  run(game, 4);
  const scene = draw();
  assert.equal(named(scene, 'flamingPumpkin').length, 0);
  assert.equal(named(scene, 'crow').length, 3);
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
  game.toTitle();
  scene = draw();
  assert.equal(game.level, short1);
  assert.equal(backdropOf(scene).length, 1);
  assert.deepEqual(models(scene), level1.scenery.map((s) => s.model));
  assert.equal(hex(scene.fog.color), '#5a3148');
});
