// Spec 18's look: the fast zombie's darker colours, larger eyes and halos, on the model and on the
// stage (its fade and its burst), against test/fake-three.js. The reference is today's zombie.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { BURSTS, FAST_ZOMBIE } from '../src/logic/effects.js';
import { kill } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { createStage } = await import('../src/view/stage.js');

const hex = (color) => `#${color.getHexString()}`;
const DARK = ['#4a5c40', '#2e2a3a', '#22201d'];
const PLAIN = ['#7d9a6a', '#5b5270', '#3d3a35'];
const isEye = (m) => m.material instanceof THREE.MeshBasicMaterial && m.name !== 'halo';
const eyesOf = (model) => model.userData.head.children.filter(isEye);
const halosOf = (model) => model.userData.head.children.filter((m) => m.name === 'halo');
const colours = (model) => [model.userData.head.children[0], model.userData.torso.children[0], model.children[2]].map((m) => hex(m.material.color));
// Every mesh but the eyes and halos: its shape, where it sits and how it turns.
const shape = (model) => {
  const meshes = [];
  model.traverse((m) => { if (m.geometry && !isEye(m) && m.name !== 'halo') meshes.push([m.geometry.params, { ...m.position }, { ...m.rotation }, { ...m.scale }]); });
  return meshes;
};
const count = (model) => { let n = 0; model.traverse(() => { n += 1; }); return n; };

describe('5. the model', () => {
  test('the fast colours are the ones the spec names, and the burst\'s chunks use them', () => {
    assert.deepEqual(Object.values(FAST_ZOMBIE), DARK);
    assert.deepEqual(BURSTS.fastZombie.colors, DARK);
    assert.deepEqual(BURSTS.zombie.colors, PLAIN);
  });

  test('a fast zombie is darker: skin, shirt and pants', () => {
    assert.deepEqual(colours(buildZombie({ fast: true })), DARK);
  });

  test('an ordinary zombie is as before: its colours, red eyes at their size, and no halo', () => {
    for (const model of [buildZombie(), buildZombie({ fast: false }), buildZombie({ fast: undefined })]) {
      assert.deepEqual(colours(model), PLAIN);
      assert.equal(eyesOf(model).length, 2);
      for (const eye of eyesOf(model)) {
        assert.equal(hex(eye.material.color), '#ff3b30');
        assert.deepEqual([eye.scale.x, eye.scale.y, eye.scale.z], [1, 1, 1]);
      }
      assert.equal(halosOf(model).length, 0);
      let additive = 0;
      model.traverse((m) => { if (m.material?.blending === THREE.AdditiveBlending || m.material?.depthWrite === false) additive += 1; });
      assert.equal(additive, 0);
    }
  });

  test('a fast zombie\'s eyes are 1.8 times larger in every direction and #ff2a1a', () => {
    const eyes = eyesOf(buildZombie({ fast: true }));
    assert.equal(eyes.length, 2);
    for (const eye of eyes) {
      assert.equal(hex(eye.material.color), '#ff2a1a');
      assert.deepEqual([eye.scale.x, eye.scale.y, eye.scale.z], [1.8, 1.8, 1.8]);
    }
  });

  test('each eye has a halo: a 0.16 square, additive #ff3b30 at 0.55, no depth, no rays, just in front and facing on', () => {
    const model = buildZombie({ fast: true });
    const halos = halosOf(model);
    assert.equal(halos.length, 2);
    for (const eye of eyesOf(model)) {
      const halo = halos.find((h) => h.position.x === eye.position.x);
      assert.ok(halo, 'one at each eye');
      assert.deepEqual(halo.geometry.params, [0.16, 0.16]);
      assert.ok(halo.geometry instanceof THREE.PlaneGeometry, 'a flat square');
      assert.equal(halo.material.blending, THREE.AdditiveBlending);
      assert.equal(halo.material.transparent, true);
      assert.equal(halo.material.depthWrite, false);
      assert.equal(halo.material.opacity, 0.55);
      assert.equal(hex(halo.material.color), '#ff3b30');
      assert.equal(halo.position.y, eye.position.y);
      const front = halo.position.z - eye.position.z;
      assert.ok(front > 0 && front <= 0.1, `${front} in front of the eye`);
      assert.deepEqual([halo.rotation.x, halo.rotation.y, halo.rotation.z], [0, 0, 0], 'a plane faces +z, where the camera is');
      assert.equal(typeof halo.raycast, 'function');
      assert.equal(halo.raycast(), undefined);
    }
    const ignoring = [];
    model.traverse((m) => { if (m instanceof THREE.Mesh && Object.hasOwn(m, 'raycast')) ignoring.push(m); });
    assert.deepEqual(ignoring, halos, 'only the halos ignore rays');
  });

  test('the shape, size, walk and twitch do not change', () => {
    const plain = buildZombie({ seed: 3 });
    const fast = buildZombie({ seed: 3, fast: true });
    assert.deepEqual(shape(fast), shape(plain));
    assert.equal(count(fast), count(plain) + 2);
    assert.equal(fast.scale.x, plain.scale.x);
    for (const t of [0, 1, 2.5, 7]) {
      plain.userData.tick(t);
      fast.userData.tick(t);
      assert.deepEqual([fast.userData.head.rotation.y, fast.userData.torso.rotation.z], [plain.userData.head.rotation.y, plain.userData.torso.rotation.z]);
    }
  });

  test('the Zombie King is as before', () => {
    const king = buildZombieKing();
    assert.equal(halosOf(king).length, 0);
    assert.deepEqual(eyesOf(king).map((e) => hex(e.material.color)), ['#ff3b30', '#ff3b30']);
    assert.equal(hex(king.userData.torso.children[0].material.color), '#5a1f3a');
  });
});

describe('5. on the stage', () => {
  const stageFor = (game) => {
    const stage = createStage({ appendChild() {} }, game.level);
    const renderer = THREE.renderers.at(-1);
    return () => {
      stage.sync(game, 0.01);
      return renderer.scene;
    };
  };
  const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
  const named = (scene, name) => scene.children.filter((c) => c.name === name);
  const haloes = (scene) => {
    let n = 0;
    scene.traverse((m) => { if (m.name === 'halo') n += 1; });
    return n;
  };

  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: the stage builds a fast zombie in the dark look and the others as before`, () => {
      const { game, zombies, fast } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      const model = shownAs(scene, fast);
      assert.deepEqual(colours(model), DARK);
      assert.equal(halosOf(model).length, 2);
      for (const e of zombies.slice(0, 3)) {
        assert.deepEqual(colours(shownAs(scene, e)), PLAIN);
        assert.equal(halosOf(shownAs(scene, e)).length, 0);
      }
    });

    test(`level ${i + 1}: with normal motion it bursts into chunks in the darker colours, with no model and no eyes`, () => {
      const { game, fast } = fastAmongFour(level, () => 0.5);
      const draw = stageFor(game);
      draw();
      kill(game, fast);
      const scene = draw();
      assert.equal(shownAs(scene, fast), undefined, 'no model');
      assert.equal(haloes(scene), 0, 'no eyes');
      const chunks = named(scene, 'chunk');
      assert.equal(chunks.length, 12);
      assert.deepEqual([...new Set(chunks.map((c) => hex(c.material.color)))].sort(), [...DARK].sort());
      assert.equal(named(scene, 'fade').length, 0);
      assert.equal(named(scene, 'puff').length, 1);
    });

    test(`level ${i + 1}: an ordinary zombie's chunks are as before`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const draw = stageFor(game);
      draw();
      kill(game, zombies[0]);
      const chunks = named(draw(), 'chunk');
      assert.equal(chunks.length, 12);
      assert.deepEqual([...new Set(chunks.map((c) => hex(c.material.color)))].sort(), [...PLAIN].sort());
    });

    test(`level ${i + 1}: with reduced motion it fades out as a copy of the dark model, larger eyes and all`, () => {
      const { game, fast } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      kill(game, fast);
      const scene = draw();
      const [fade] = named(scene, 'fade');
      assert.ok(fade, 'a fading copy');
      assert.equal(named(scene, 'chunk').length, 0);
      assert.deepEqual(colours(fade), DARK);
      assert.equal(eyesOf(fade).length, 2);
      for (const eye of eyesOf(fade)) {
        assert.equal(hex(eye.material.color), '#ff2a1a');
        assert.deepEqual([eye.scale.x, eye.scale.y, eye.scale.z], [1.8, 1.8, 1.8]);
      }
    });

    test(`level ${i + 1}: with reduced motion an ordinary zombie's fading copy is as before`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      kill(game, zombies[0]);
      const [fade] = named(draw(), 'fade');
      assert.deepEqual(colours(fade), PLAIN);
      for (const eye of eyesOf(fade)) assert.equal(hex(eye.material.color), '#ff3b30');
      assert.equal(halosOf(fade).length, 0);
    });
  }
});
