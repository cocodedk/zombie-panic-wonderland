// Spec 26: a rag that dangles from the shirt's hem, behind the `rag` flag of ZOMBIE_EXTRAS, on the
// model and on the stage, against test/fake-three.js. The reference is today's zombie.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { kill, playing, run, clearWave, level1 } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';
import { withWaves } from './journey.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { ZOMBIE_EXTRAS, NO_EXTRAS, tinted } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');
const THREE = await import('./fake-three.js');

const SIZE = [0.05, 0.16, 0.012];
const PIVOT = [0.2, -0.02, 0.13];
const hex = (color) => `#${color.getHexString()}`;
const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pivotsOf = (model) => model.userData.torso.children.filter((c) => same(c.position.toArray?.() ?? [c.position.x, c.position.y, c.position.z], PIVOT));
const stripOf = (pivot) => pivot.children[0];
const sway = (t, seed) => 0.15 * Math.sin((t * 3.2 + seed) * 1.3 + 1);
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
const everything = (model) => {
  const all = [];
  model.traverse((m) => all.push([m.geometry?.params, m.material && hex(m.material.color), { ...m.position }, { ...m.rotation }, { ...m.scale }]));
  return all;
};

describe('1. the rag on the model', () => {
  test('ZOMBIE_EXTRAS turns it on and NO_EXTRAS off', () => {
    assert.equal(ZOMBIE_EXTRAS.rag, true);
    assert.equal(NO_EXTRAS.rag, false);
  });

  for (const fast of [false, true]) {
    const name = fast ? 'fast' : 'ordinary';
    test(`${name}: no rag without extras or with the flag off`, () => {
      for (const extras of [undefined, {}, { rag: false }]) {
        const model = buildZombie({ fast, extras });
        assert.equal(pivotsOf(model).length, 0);
        assert.deepEqual(everything(model), everything(buildZombie({ fast })));
      }
    });

    test(`${name}: with the flag on the torso has one rag, as sized, placed and coloured`, () => {
      for (const tint of [0, -0.05, 0.04]) {
        const model = buildZombie({ fast, tint, extras: { rag: true } });
        const [pivot, ...more] = pivotsOf(model);
        assert.equal(more.length, 0);
        assert.equal(pivot.parent, model.userData.torso);
        assert.equal(pivot.children.length, 1);
        const strip = stripOf(pivot);
        assert.deepEqual(strip.geometry.params, SIZE);
        assert.deepEqual([strip.position.x, strip.position.y, strip.position.z], [0, -0.08, 0]);
        assert.deepEqual([strip.rotation.x, strip.rotation.y, strip.rotation.z], [0, 0, 0]);
        assert.equal(strip.material, model.userData.torso.children[0].material);
        assert.equal(hex(strip.material.color), hex(model.userData.torso.children[0].material.color));
        if (!fast) assert.equal(hex(strip.material.color), tinted('#5b5270', tint));
      }
    });
  }

  test('its strip uses the shirt\'s own colour', () => {
    const model = buildZombie({ shirt: '#a0b0c0', extras: { rag: true } });
    assert.equal(hex(stripOf(pivotsOf(model)[0]).material.color), '#a0b0c0');
  });

  test('the strip ignores rays, so the meshes a shot can meet are the plain zombie\'s', () => {
    const pickable = (model) => {
      const found = [];
      model.traverse((m) => { if (m.geometry && !Object.hasOwn(m, 'raycast')) found.push([m.geometry.params, { ...m.position }]); });
      return found;
    };
    assert.deepEqual(pickable(buildZombie({ extras: { rag: true } })), pickable(buildZombie()));
  });
});

describe('2. it sways', () => {
  for (const seed of [0, 1.7, 3.4]) {
    test(`seed ${seed}: the pivot turns by 0.15 × sin(s × 1.3 + 1), within ±0.15`, () => {
      const model = buildZombie({ seed, extras: { rag: true } });
      const [pivot] = pivotsOf(model);
      let widest = 0;
      for (let t = 0; t < 20; t += 0.13) {
        model.userData.tick(t);
        assert.ok(Math.abs(pivot.rotation.z - sway(t, seed)) < 1e-12);
        assert.ok(Math.abs(pivot.rotation.z) <= 0.15);
        assert.deepEqual([pivot.rotation.x, pivot.rotation.y], [0, 0]);
        widest = Math.max(widest, Math.abs(pivot.rotation.z));
      }
      assert.ok(widest > 0.14);
    });
  }

  test('under reduced motion (twitch false) it hangs still at 0 at every t', () => {
    const model = buildZombie({ seed: 1.7, extras: { rag: true } });
    const [pivot] = pivotsOf(model);
    model.userData.tick(0.5);
    assert.notEqual(pivot.rotation.z, 0);
    for (let t = 0; t < 20; t += 0.37) {
      model.userData.tick(t, { twitch: false });
      assert.equal(pivot.rotation.z, 0);
    }
  });

});

describe('3. on the stage', () => {
  for (const [i, level] of LEVELS.entries()) {
    test(`level ${i + 1}: every shown zombie, fast or not, has its rag`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      assert.ok(zombies.some((z) => z.fast) && zombies.some((z) => !z.fast));
      for (const e of zombies) assert.equal(pivotsOf(shownAs(scene, e)).length, 1);
    });

    test(`level ${i + 1}: under reduced motion the fading copy has the rag too`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      for (const e of zombies) {
        kill(game, e);
        const fade = draw().children.filter((c) => c.name === 'fade').at(-1);
        assert.equal(pivotsOf(fade).length, 1, `zombie ${e.id}`);
        assert.equal(pivotsOf(fade)[0].rotation.z, 0);
      }
    });
  }

  test('the Zombie King has none', () => {
    const game = playing(withWaves(level1, [{ zombie: 1 }]));
    game.player.hearts = 999;
    const draw = stageFor(game);
    clearWave(game);
    run(game, 3 + 2);
    const boss = game.enemies.find((e) => e.kind === 'boss');
    const king = shownAs(draw(), boss);
    assert.equal(king.name, 'zombieKing');
    assert.equal(pivotsOf(king).length, 0);
    assert.equal(pivotsOf(buildZombieKing()).length, 0);
  });
});

describe('4. it is part of the torso, and nothing else changed', () => {
  test('the rag leans and sways with the torso', () => {
    const model = buildZombie({ seed: 2, extras: { rag: true } });
    const [pivot] = pivotsOf(model);
    assert.equal(pivot.parent, model.userData.torso);
    assert.equal(model.userData.torso.parent, model);
  });

  for (const fast of [false, true]) {
    test(`${fast ? 'fast' : 'ordinary'}: the same shapes, places, rotations and colours but the rag's parts`, () => {
      const extras = { ...ZOMBIE_EXTRAS, rag: false };
      const plain = buildZombie({ fast, seed: 3.4, tint: 0.04, extras });
      const ragged = buildZombie({ fast, seed: 3.4, tint: 0.04, extras: ZOMBIE_EXTRAS });
      for (const [t, pose] of [[0, {}], [0.7, { walk: 0 }], [3.1, { windup: 0.6 }], [9.4, { twitch: false }]]) {
        plain.userData.tick(t, pose);
        ragged.userData.tick(t, pose);
        const [pivot] = pivotsOf(ragged);
        const rest = everything(ragged);
        const before = everything(plain);
        const isRag = (m) => m === pivot || m === stripOf(pivot);
        const kept = [];
        ragged.traverse((m) => { if (!isRag(m)) kept.push(everything(m)[0]); });
        assert.equal(rest.length - kept.length, 2);
        assert.deepEqual(kept, before);
      }
    });
  }
});

describe('5. sizes', () => {
  test('zombie.js is at most 6 longer than before this spec (182) and under 200, new files under 200', () => {
    assert.ok(lines('src/view/models/zombie.js') <= 182 + 6);
    assert.ok(lines('src/view/models/zombie.js') < 200);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('test/zombie-dangling-rag.test.js') < 200);
  });
});
