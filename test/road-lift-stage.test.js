// Spec 40: the stage draws enemies on the road's bricks, and everything else where it was (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';
import { level3 } from '../src/levels/level-3.js';
import { pumpkinAt, crowAt } from '../src/logic/game.js';
import { crateAt } from '../src/logic/weapons.js';
import { CAMERA } from '../src/logic/camera.js';
import { run, kill } from './helpers.js';
import { raycastBoxes, worldCentre } from './ray-helpers.js';
import { started, near } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { createStage } = await import('../src/view/stage.js');

function stageFor(game) {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return { stage, draw: () => { stage.sync(game, 0.01); return renderer.scene; } };
}
const of = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
const at = (o) => [o.position.x, o.position.y, o.position.z];
const fadeIn = (scene) => scene.children.find((c) => c.name === 'fade');

// A game with its first wave sent whole; the first enemy is put at `z` before anything is drawn.
function field(level, kind, z, { options = {}, edit = () => {} } = {}) {
  const game = started(level, { waves: [{ [kind]: 1 }], random: () => 0.5, spacing: 0, ...options });
  run(game, 0.05);
  const [e] = game.enemies;
  if (z != null) e.z = z;
  edit(e);
  return { game, e, ...stageFor(game) };
}

describe('2. enemies on the road are drawn on the bricks', () => {
  const cases = [
    ['a zombie', level1, 'zombie', () => {}],
    ['a fast zombie', level1, 'zombie', (e) => { e.fast = true; }],
    ['a wolf', level3, 'wolf', () => {}],
    ['a walking spider', level3, 'spider', () => {}],
  ];
  for (const [name, level, kind, edit] of cases) {
    test(`${name}: y 0.11 on the road, 0 off it, and it steps up over the first row`, () => {
      const on = field(level, kind, level.roadZ, { edit });
      assert.deepEqual(at(of(on.draw(), on.e)), [on.e.x, 0.11, level.roadZ]);
      const off = field(level, kind, -12, { edit });
      assert.deepEqual(at(of(off.draw(), off.e)), [off.e.x, 0, -12]);
      const edge = field(level, kind, -1.15, { edit });
      near(of(edge.draw(), edge.e).position.y, 0.055);
    });
  }

  test('a pumpkin monster where it appears and a boss at its stand are drawn at y 0', () => {
    const monster = field(level1, 'pumpkinMonster', null);
    assert.equal(of(monster.draw(), monster.e).position.y, 0);
    const game = started(level3, { waves: [{ zombie: 1 }] });
    game.spawnBoss();
    const [boss] = game.enemies;
    boss.z = level3.boss.standZ;
    assert.deepEqual(at(of(stageFor(game).draw(), boss)), [boss.x, 0, level3.boss.standZ]);
  });

  test('a spider dropping onto the road is drawn at its drop height plus the lift', () => {
    const { e, draw } = field(level3, 'spider', 0, { edit: (s) => { s.drop = 0.6; } });
    const rule = level3.enemies.spider.drop;
    near(of(draw(), e).position.y, rule.from * (0.6 / rule.time) + 0.11);
  });

  test('with reduced motion the fading copy of a zombie that fell on the road is drawn at f.y plus 0.11', () => {
    const { game, e, draw } = field(level1, 'zombie', 0, { options: { reducedMotion: true } });
    draw();
    kill(game, e);
    const [f] = game.effects.fades;
    const fade = fadeIn(draw());
    near(fade.position.y, f.y + 0.11);
    assert.deepEqual([fade.position.x, fade.position.z], [f.x, f.z]);
    f.z = -12;
    near(fadeIn(draw()).position.y, f.y, 1e-12, 'off the road, not lifted');
  });

  test('paused, and in defeat, an enemy stays where it stands, on the bricks', () => {
    const { game, e, draw } = field(level1, 'zombie', 0);
    game.pressEsc();
    assert.equal(of(draw(), e).position.y, 0.11);
    game.pressEsc();
    game.end('defeat');
    assert.equal(of(draw(), e).position.y, 0.11);
  });
});

describe('3. everything else is drawn where it was', () => {
  test('crows, bats and their fading copies are not lifted, even over the road', () => {
    for (const [level, kind] of [[level2, 'crow'], [level3, 'bat']]) {
      const { game, e, draw } = field(level, kind, 0, { options: { reducedMotion: true } });
      const want = crowAt(e, level);
      assert.deepEqual(at(of(draw(), e)), [want.x, want.y, want.z], kind);
      kill(game, e);
      const [f] = game.effects.fades;
      f.z = 0;
      assert.equal(fadeIn(draw()).position.y, f.y, kind);
    }
  });

  test('pumpkins in flight, crates, canisters and the hero keep their places', () => {
    const game = started(level1, { waves: [{ zombie: 1 }] });
    game.crates.push({ id: 901, weapon: 'scattergun', x: 0, t: 1, hits: 3, flash: 0 });
    game.canisters.push({ id: 902, x: 1, z: 0, hits: 3, flash: 0 });
    const k = { id: 903, fromX: 0, fromZ: -5, x: 0, t: 0.5, flight: 1, flaming: false, web: false };
    game.pumpkins.push(k);
    const scene = stageFor(game).draw();
    const c = crateAt(game.crates[0]);
    assert.deepEqual(at(of(scene, game.crates[0])), [c.x, c.y, c.z]);
    assert.deepEqual(at(of(scene, game.canisters[0])), [1, 0, 0]);
    const p = pumpkinAt(k, level1.roadZ);
    assert.deepEqual(at(of(scene, k)), [p.x, p.y, p.z]);
    const hero = scene.children.find((o) => o.userData.flash);
    assert.deepEqual([hero.position.y, hero.position.z], [0, level1.roadZ]);
  });
});

describe('4. the aim and the game', () => {
  test('a ray aimed at a lifted zombie\'s drawn body hits it: the hit area is the drawn model, lifted with it', () => {
    const { stage, e, draw } = field(level1, 'zombie', 0);
    const obj = of(draw(), e);
    assert.equal(obj.position.y, 0.11);
    assert.equal(stage.pick({ x: 0, y: 0 }), e.id);
    // fake-three's raycaster ignores geometry, so the rays are cast here, against the boxes as drawn.
    const isBox = (g) => g instanceof THREE.BoxGeometry;
    const from = Object.values(CAMERA.position);
    const boxes = [];
    obj.traverse((m) => { if (m.geometry && isBox(m.geometry) && !Object.hasOwn(m, 'raycast')) boxes.push(m); });
    assert.ok(boxes.length > 5);
    let lowest = Infinity;
    for (const m of boxes) {
      const c = worldCentre(m);
      const dir = c.map((v, i) => v - from[i]);
      const hits = raycastBoxes(obj, from, dir, isBox).filter((h) => !Object.hasOwn(h.object, 'raycast'));
      assert.ok(hits.length > 0, 'a ray aimed at the centre of a drawn part meets the zombie');
      assert.ok(hits.some((h) => h.object === m), 'and the part itself');
      lowest = Math.min(lowest, c[1] - m.geometry.params[1] / 2);
    }
    assert.ok(lowest >= 0.11 - 0.05, `its lowest part stands on the bricks, not in them (${lowest})`);
    // A ray at the drawn body's height misses where the zombie would have stood, unlifted, under the ground-level feet.
    const sole = [e.x, 0.11 - 0.06, e.z];
    const below = raycastBoxes(obj, [e.x, sole[1], e.z + 5], [0, 0, -1], isBox).filter((h) => !Object.hasOwn(h.object, 'raycast'));
    assert.equal(below.length, 0, 'nothing of it hangs below the bricks\' top');
  });

  test('the game and get_state are the same whether the stage draws it or not', () => {
    const play = (drawn) => {
      const game = started(level1, { waves: [{ zombie: 3, pumpkinMonster: 1 }], random: () => 0.5 });
      const { draw } = stageFor(game);
      const log = [];
      for (let i = 0; i < 700; i++) {
        game.update(0.01);
        if (drawn) draw();
        if (i % 100 === 99 && game.enemies[0]) { game.setAim(game.enemies[0].id); game.shoot(); game.setAim(null); }
        if (i % 50 === 0) log.push(JSON.stringify([game.snapshot(), game.enemies.map((e) => [e.id, e.x, e.y, e.z, e.health])]));
      }
      return log;
    };
    assert.deepEqual(play(true), play(false));
  });
});
