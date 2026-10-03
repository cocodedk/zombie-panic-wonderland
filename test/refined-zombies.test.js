// Spec 20: the zombie's four small touches (eye sockets, claws, a stain, a tint), on the model and
// on the stage, against test/fake-three.js. The reference is today's zombie.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { zombieTint, tinted } = await import('../src/view/models/zombie-details.js');

const hex = (color) => `#${color.getHexString()}`;
const lines = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').split('\n').length - 1;
const meshes = (model, params) => {
  const found = [];
  model.traverse((m) => {
    if (m.geometry && JSON.stringify(m.geometry.params) === JSON.stringify(params)) found.push(m);
  });
  return found;
};
const socketsOf = (m) => meshes(m, [0.11, 0.075, 0.03]);
const clawsOf = (m) => meshes(m, [0.015, 0.09, 3]);
const stainsOf = (m) => meshes(m, [0.16, 0.14, 0.02]);
const colours = (m) => [m.userData.head.children[0], m.userData.torso.children[0]].map((x) => hex(x.material.color));
const lightness = (c) => {
  const v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return (Math.max(...v) + Math.min(...v)) / 2;
};
const MODELS = { ordinary: () => buildZombie(), fast: () => buildZombie({ fast: true }), king: () => buildZombieKing() };

describe('1. the refinements', () => {
  for (const [name, build] of Object.entries(MODELS)) {
    test(`${name}: two eye sockets, six claws and one stain, as sized, coloured and placed`, () => {
      const model = build();
      const sockets = socketsOf(model);
      assert.equal(sockets.length, 2);
      assert.deepEqual(sockets.map((s) => s.position.x).sort((a, b) => a - b), [-0.07, 0.07]);
      for (const s of sockets) {
        assert.equal(hex(s.material.color), '#1a1512');
        assert.deepEqual([s.position.y, s.position.z], [0.03, 0.172]);
        assert.equal(s.parent, model.userData.head);
      }
      const claws = clawsOf(model);
      assert.equal(claws.length, 6);
      for (const arm of model.userData.arms) {
        const own = claws.filter((c) => c.parent === arm);
        assert.deepEqual(own.map((c) => c.position.x).sort((a, b) => a - b), [-0.035, 0, 0.035]);
        for (const c of own) {
          assert.equal(hex(c.material.color), '#2a2622');
          assert.ok(c.geometry instanceof THREE.ConeGeometry);
          assert.equal(c.rotation.x, Math.PI, 'pointing on along the arm');
          assert.ok(Math.abs(c.position.y - (-0.96 - 0.045)) < 1e-9, 'its base at the fist\'s edge, its tip 0.09 past');
        }
      }
      const [stain] = stainsOf(model);
      assert.equal(stainsOf(model).length, 1);
      assert.equal(hex(stain.material.color), '#8a4a1e');
      assert.deepEqual([stain.position.x, stain.position.y, stain.position.z], [-0.08, 0.2, 0.151]);
      assert.equal(stain.rotation.z, 0.3);
      assert.equal(stain.parent, model.userData.torso);
    });
  }

  test('the eyes and halos are as before', () => {
    const fast = buildZombie({ fast: true });
    const eyes = fast.userData.head.children.filter((m) => m.material instanceof THREE.MeshBasicMaterial && m.name !== 'halo');
    assert.equal(eyes.length, 2);
    assert.equal(fast.userData.head.children.filter((m) => m.name === 'halo').length, 2);
    for (const eye of eyes) assert.deepEqual([eye.position.y, eye.position.z, eye.scale.x], [0.03, 0.18, 1.8]);
  });
});

describe('2. the claws move with the arms', () => {
  test('every claw hangs on its arm, and the arm swings with all three', () => {
    const model = buildZombie({ seed: 2 });
    const { arms } = model.userData;
    const before = arms.map((a) => a.rotation.x);
    model.userData.tick(1.3);
    assert.notDeepEqual(arms.map((a) => a.rotation.x), before, 'the arms swung');
    for (const claw of clawsOf(model)) {
      let up = claw.parent;
      while (up && !arms.includes(up)) up = up.parent;
      assert.ok(up, 'a claw is under an arm');
      assert.equal(claw.parent, up, 'directly, so it turns with it and stays put on it');
    }
    for (const arm of arms) assert.equal(clawsOf(arm).length, 3);
  });
});

describe('3. the tint', () => {
  test('tint 0 is exactly today\'s colours, ordinary and fast', () => {
    assert.deepEqual(colours(buildZombie()), ['#7d9a6a', '#5b5270']);
    assert.deepEqual(colours(buildZombie({ tint: 0 })), ['#7d9a6a', '#5b5270']);
    assert.deepEqual(colours(buildZombie({ fast: true, tint: 0 })), ['#4a5c40', '#2e2a3a']);
  });

  test('positive lightens and negative darkens skin and shirt by at most 6% of their lightness', () => {
    for (const fast of [false, true]) {
      const base = colours(buildZombie({ fast }));
      for (const tint of [0.06, 0.03, -0.03, -0.06]) {
        colours(buildZombie({ fast, tint })).forEach((c, i) => {
          const ratio = lightness(c) / lightness(base[i]);
          assert.ok(Math.abs(ratio - (1 + tint)) < 0.01, `${c} of ${base[i]} at ${tint}: ${ratio}`);
        });
      }
    }
  });

  test('a tint beyond 0.06 is limited to it', () => {
    assert.deepEqual(colours(buildZombie({ tint: 0.5 })), colours(buildZombie({ tint: 0.06 })));
    assert.deepEqual(colours(buildZombie({ tint: -3 })), colours(buildZombie({ tint: -0.06 })));
    assert.equal(tinted('#7d9a6a', 0), '#7d9a6a');
  });

  test('the torn patches are brass, and the tint does not touch them', () => {
    const model = buildZombie({ tint: 0.05 });
    const patches = model.userData.torso.children.filter((m) => m.geometry?.params.join() === '0.14,0.12,0.02');
    assert.equal(patches.length, 1);
    assert.equal(hex(patches[0].material.color), '#e0a838');
  });
});

describe('4. the tint drawn from an id', () => {
  test('the same id always gives the same tint, ids 1 to 50 give at least 10, all within ±0.06', () => {
    const tints = Array.from({ length: 50 }, (_, i) => zombieTint(i + 1));
    assert.deepEqual(tints, Array.from({ length: 50 }, (_, i) => zombieTint(i + 1)));
    assert.ok(new Set(tints).size >= 10, `${new Set(tints).size} different`);
    for (const t of tints) assert.ok(Math.abs(t) <= 0.06);
  });

  test('it does not use Math.random', () => {
    const real = Math.random;
    Math.random = () => { throw new Error('random used'); };
    try {
      zombieTint(7);
    } finally {
      Math.random = real;
    }
  });

});

describe('5. the walk is as before', () => {
  test('a tick gives the same rotations as today, tint or not', () => {
    for (const build of [() => buildZombie({ seed: 0 }), () => buildZombie({ seed: 0, tint: 0.05, fast: true })]) {
      const m = build();
      m.userData.tick(1, { twitch: false });
      const s = 1 * 3.2;
      assert.equal(m.userData.torso.rotation.z, 0);
      assert.equal(m.userData.head.rotation.z, 0.35 + Math.sin(s * 0.5) * 0.1);
      assert.equal(m.userData.head.rotation.y, 0);
      assert.equal(m.userData.arms[0].rotation.x, -1.45 + Math.sin(s * 0.7) * 0.2);
      assert.equal(m.userData.arms[1].rotation.x, -1.45 + Math.sin(s * 0.7 + 2) * 0.2);
      assert.equal(m.scale.x, 1);
    }
    assert.equal(buildZombieKing().scale.x, 3);
  });
});

describe('7. file sizes', () => {
  test('new files and zombie.js are under 200 lines and stage.js grew by at most 5', () => {
    assert.ok(lines('../src/view/models/zombie-details.js') < 200);
    assert.ok(lines('../src/view/models/zombie.js') < 200);
    assert.ok(lines('../src/view/stage.js') <= 320 + 5);
    assert.ok(lines('./refined-zombies.test.js') < 200);
  });
});
