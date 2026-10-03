// Spec 41: the machine zombie's details. The stain is rust, the rag a cable and a brass plug, the bare foot a
// steel foot with a brass piston behind its heel. On the model and on the stage, against test/fake-three.js.
// The cable's own checks are in zombie-dangling-rag.test.js, the foot's colour in zombie-bare-foot.test.js.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';
import { kill, playing, run, clearWave, level1 } from './helpers.js';
import { LEVELS, fastAmongFour } from './fast-helpers.js';
import { withWaves } from './journey.js';
import { worldCentre } from './ray-helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { ZOMBIE_EXTRAS, NO_EXTRAS, limpSide } = await import('../src/view/models/zombie-details.js');
const { createStage } = await import('../src/view/stage.js');
const { level3 } = await import('../src/levels/level-3.js');
const THREE = await import('./fake-three.js');

const hex = (color) => `#${color.getHexString()}`;
const at = (o) => [o.position.x, o.position.y, o.position.z];
const turn = (o) => [o.rotation.x, o.rotation.y, o.rotation.z];
const lines = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').split('\n').length - 1;
const kneeOf = (model, leg) => model.children[leg].children[1];
const pistonOf = (model, leg) => kneeOf(model, leg).children[3];
const torsoKids = (model, params) => model.userData.torso.children.filter((c) => c.geometry?.params.join() === params);
const stainOf = (model) => torsoKids(model, '0.16,0.14,0.02')[0];
const pivotOf = (model) => model.userData.torso.children.find((c) => at(c).join() === '0.2,-0.02,0.13');
const withShape = (...shapes) => (model) => {
  const found = [];
  model.traverse((m) => { if (shapes.includes(m.geometry?.params.join())) found.push(m); });
  return found;
};
const pistons = withShape('0.025,0.025,0.16,6');
const cables = withShape('0.012,0.012,0.16,5', '0.03,0.04,0.03');
const hittable = (model) => {
  const found = [];
  model.traverse((m) => { if (m instanceof THREE.Mesh && !Object.hasOwn(m, 'raycast')) found.push([m.geometry.params, worldCentre(m)]); });
  return found;
};
const stageFor = (game) => {
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  return () => {
    stage.sync(game, 0.01);
    return renderer.scene;
  };
};
const shownAs = (scene, e) => scene.children.find((c) => c.userData.entityId === e.id);
const kingOf = () => {
  const game = playing(withWaves(level1, [{ zombie: 1 }]));
  game.player.hearts = 999;
  const draw = stageFor(game);
  clearWave(game);
  run(game, 3 + 2);
  return draw().children.find((c) => c.name === 'zombieKing');
};

describe('1. the rust patch', () => {
  for (const [name, build] of Object.entries({
    ordinary: () => buildZombie(),
    fast: () => buildZombie({ fast: true, tint: 0.05, extras: ZOMBIE_EXTRAS }),
    king: () => buildZombieKing(),
  })) {
    test(`${name}: the stain is rust, with its old shape, size, place and rotation`, () => {
      const stain = stainOf(build());
      assert.equal(hex(stain.material.color), '#8a4a1e');
      assert.deepEqual(stain.geometry.params, [0.16, 0.14, 0.02]);
      assert.deepEqual(at(stain), [-0.08, 0.2, 0.151]);
      assert.deepEqual(turn(stain), [0, 0, 0.3]);
    });
  }
});

describe('2. the piston foot', () => {
  for (const fast of [false, true]) {
    for (const seed of [0, 1.7, 3.4, 5.1]) {
      test(`${fast ? 'fast' : 'ordinary'}, seed ${seed}: one brass piston in the limping knee, none in the other`, () => {
        const model = buildZombie({ fast, seed, tint: 0.05, extras: { bareFoot: true } });
        const side = limpSide(seed);
        assert.equal(pistons(model).length, 1);
        const piston = pistonOf(model, side);
        assert.equal(piston.geometry.params.join(), '0.025,0.025,0.16,6');
        assert.equal(piston.parent, kneeOf(model, side));
        assert.equal(hex(piston.material.color), '#e0a838');
        assert.deepEqual(at(piston), [0, -0.3, -0.115]);
        assert.deepEqual(turn(piston), [0, 0, 0]);
        assert.ok(Object.hasOwn(piston, 'raycast'));
        assert.equal(kneeOf(model, 1 - side).children.length, 3);
      });
    }
  }

  test('it touches neither the lower leg nor the foot', () => {
    const knee = kneeOf(buildZombie({ seed: 0, extras: { bareFoot: true } }), 0);
    const [lower, foot, , piston] = knee.children;
    const front = piston.position.z + piston.geometry.params[0]; // the cylinder's radius, the nearest to the front
    const [top, bottom] = lower.geometry.params;
    const back = -Math.max(top, bottom) * Math.cos(Math.PI / 5); // its backmost, at most: the flat of a 5-sided cylinder
    const footBack = foot.position.z - foot.geometry.params[2] / 2;
    assert.ok(front < back && front < footBack, `${front} is behind the lower leg's back ${back} and the foot's back ${footBack}`);
  });

  test('it follows the knee\'s bend', () => {
    const model = buildZombie({ seed: 0, extras: { bareFoot: true } });
    const knee = kneeOf(model, 0);
    const piston = pistonOf(model, 0);
    model.userData.tick(0, { walk: 0 });
    const still = worldCentre(piston);
    model.userData.tick(Math.PI * 1.5 / 4, { walk: 1 }); // sin(beat) = -1: the left knee bends most
    assert.ok(knee.rotation.x > 0.4);
    assert.equal(piston.parent, knee);
    assert.deepEqual(at(piston), [0, -0.3, -0.115]);
    assert.deepEqual(turn(piston), [0, 0, 0]);
    assert.notDeepEqual(worldCentre(piston), still);
  });

  test('without bareFoot there is no piston and both feet have the shoe', () => {
    for (const extras of [undefined, {}, { bareFoot: false }, { ...ZOMBIE_EXTRAS, bareFoot: false }]) {
      const model = buildZombie({ seed: 1.7, extras });
      assert.equal(pistons(model).length, 0);
      for (const leg of [0, 1]) assert.equal(hex(kneeOf(model, leg).children[1].material.color), '#2a2622');
    }
  });
});

describe('3. without extras', () => {
  test('a zombie has no cable, no plug and no piston, and the King neither', () => {
    for (const model of [buildZombie(), buildZombie({ fast: true }), buildZombie({ extras: NO_EXTRAS }), buildZombieKing()]) {
      assert.equal(cables(model).length, 0);
      assert.equal(pistons(model).length, 0);
      assert.equal(pivotOf(model), undefined);
    }
  });
});

describe('4. what a shot can hit', () => {
  for (const fast of [false, true]) {
    test(`${fast ? 'fast' : 'ordinary'}: the same shapes at the same world places as without the cable and the piston`, () => {
      const plain = buildZombie({ fast, seed: 1.7, extras: NO_EXTRAS });
      const machine = buildZombie({ fast, seed: 1.7, extras: { rag: true, bareFoot: true } });
      assert.deepEqual(hittable(machine), hittable(plain));
      const news = [...cables(machine), ...pistons(machine)];
      assert.equal(news.length, 3);
      for (const m of news) assert.ok(Object.hasOwn(m, 'raycast'));
    });
  }
});

describe('5. on the stage', () => {
  for (const [i, level] of [...LEVELS, level3].entries()) {
    const machined = (model) => {
      assert.equal(hex(stainOf(model).material.color), '#8a4a1e');
      assert.equal(pivotOf(model).children.length, 2);
      assert.equal(pistons(model).length, 1);
    };
    test(`level ${i + 1}: every shown zombie, fast or not, has the rust, the cable and the piston foot`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5);
      const scene = stageFor(game)();
      assert.ok(zombies.some((z) => z.fast) && zombies.some((z) => !z.fast));
      for (const e of zombies) {
        const model = shownAs(scene, e);
        machined(model);
        assert.ok(pistonOf(model, e.id % 2));
      }
    });

    test(`level ${i + 1}: the fading copies have them too`, () => {
      const { game, zombies } = fastAmongFour(level, () => 0.5, { reducedMotion: true });
      const draw = stageFor(game);
      draw();
      for (const e of zombies) {
        kill(game, e);
        machined(draw().children.filter((c) => c.name === 'fade').at(-1));
      }
    });
  }

  test('the Zombie King has the rust and no cable or piston', () => {
    for (const king of [kingOf(), buildZombieKing()]) {
      assert.equal(king.name, 'zombieKing');
      assert.equal(hex(stainOf(king).material.color), '#8a4a1e');
      assert.equal(cables(king).length, 0);
      assert.equal(pistons(king).length, 0);
    }
  });
});

describe('6. sizes', () => {
  test('the files stay within their caps', () => {
    assert.ok(lines('src/view/models/zombie-machine.js') < 200);
    assert.ok(lines('src/view/models/zombie-details.js') < 200);
    assert.ok(lines('src/view/models/zombie.js') <= 183);
    assert.ok(lines('test/zombie-piston.test.js') < 200);
  });
});
