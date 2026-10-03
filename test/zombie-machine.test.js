// Spec 38: the zombie's machine body (steel limbs, ball joints, a brass chest, a gear), on the model
// and on the stage, against test/fake-three.js. The reference is the zombie as it was.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
globalThis.window ??= { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildZombie, buildZombieKing } = await import('../src/view/models/zombie.js');
const { MACHINE } = await import('../src/view/models/zombie-machine.js');
const { ZOMBIE_EXTRAS } = await import('../src/view/models/zombie-details.js');

const hex = (color) => `#${color.getHexString()}`;
const at = (o) => [o.position.x, o.position.y, o.position.z];
const turn = (o) => [o.rotation.x, o.rotation.y, o.rotation.z];
const MODELS = {
  ordinary: () => buildZombie(),
  fast: () => buildZombie({ fast: true }),
  tinted: () => buildZombie({ tint: 0.05, extras: ZOMBIE_EXTRAS }),
  king: () => buildZombieKing(),
};
const legsOf = (m) => m.children.slice(0, 2);
const patchesOf = (m) => m.userData.torso.children.filter((c) => ['0.14,0.12,0.02', '0.1,0.16,0.02'].includes(c.geometry?.params.join()));
const gearOf = (m) => m.userData.torso.children.filter((c) => c.geometry?.params.join() === '0.06,0.06,0.02,8');
const kneeOf = (leg) => leg.children[1];
const footOf = (leg) => kneeOf(leg).children[1];
// The meshes a ray can meet: those that do not ignore rays.
const hittable = (m) => {
  const found = [];
  m.traverse((o) => { if (o instanceof THREE.Mesh && !Object.hasOwn(o, 'raycast')) found.push(o); });
  return found;
};
// Checks the machine parts of one model.
function assertMachine(model, label) {
  const { arms } = model.userData;
  for (const leg of legsOf(model)) assert.equal(hex(leg.children[0].material.color), MACHINE.steel, label);
  for (const arm of arms) {
    assert.equal(hex(arm.children[1].material.color), MACHINE.steel, label);
    assert.equal(hex(arm.children[2].material.color), MACHINE.steel, label);
  }
  assert.equal(patchesOf(model).length, 2, label);
  for (const patch of patchesOf(model)) assert.equal(hex(patch.material.color), MACHINE.brass, label);
  assert.equal(gearOf(model).length, 1, label);
}

describe('1. the colours', () => {
  test('MACHINE has steel, dark steel and brass', () => {
    assert.deepEqual(MACHINE, { steel: '#c4c0b6', darkSteel: '#34373d', brass: '#e0a838' });
  });

  for (const [name, build] of Object.entries(MODELS)) {
    test(`${name}: steel arms, hands and legs, brass patches`, () => assertMachine(build(), name));
  }

  test('they are flat materials, roughness 0.9 and no metalness', () => {
    const model = buildZombie();
    for (const m of [legsOf(model)[0].children[0], model.userData.arms[0].children[2], patchesOf(model)[0], gearOf(model)[0]]) {
      assert.equal(m.material.flatShading, true);
      assert.equal(m.material.roughness, 0.9);
      assert.equal(m.material.metalness, 0);
    }
  });
});

describe('2. the joints and the gear', () => {
  for (const [name, build] of Object.entries(MODELS)) {
    test(`${name}: two knees, two elbows and a gear`, () => {
      const model = build();
      for (const leg of legsOf(model)) {
        const knee = kneeOf(leg).children[2];
        assert.deepEqual(knee.geometry.params, [0.13, 0]);
        assert.ok(knee.geometry instanceof THREE.IcosahedronGeometry);
        assert.equal(hex(knee.material.color), MACHINE.darkSteel);
        assert.deepEqual(at(knee), [0, 0, 0]);
        assert.equal(knee.parent, kneeOf(leg));
      }
      for (const arm of model.userData.arms) {
        const elbow = arm.children.at(-1);
        assert.deepEqual(elbow.geometry.params, [0.09, 0]);
        assert.ok(elbow.geometry instanceof THREE.IcosahedronGeometry);
        assert.equal(hex(elbow.material.color), MACHINE.darkSteel);
        assert.deepEqual(at(elbow), [0, -0.42, 0]);
        assert.equal(elbow.parent, arm);
      }
      const [gear] = gearOf(model);
      assert.ok(gear.geometry instanceof THREE.CylinderGeometry);
      assert.deepEqual(gear.geometry.params, [0.06, 0.06, 0.02, 8]);
      assert.equal(hex(gear.material.color), MACHINE.darkSteel);
      assert.deepEqual(turn(gear), [Math.PI / 2, 0, 0]);
      assert.deepEqual(at(gear), [0.1, 0.36, 0.168]);
      assert.equal(gear.parent, model.userData.torso);
    });
  }

  test('the gear\'s back face is behind the front patch and its front face in front of it', () => {
    const [gear] = gearOf(buildZombie());
    const z = gear.position.z;
    const half = gear.geometry.params[2] / 2;
    assert.ok(Math.abs(z - half - 0.158) < 1e-9 && Math.abs(z + half - 0.178) < 1e-9);
    assert.ok(z - half < 0.161 && z + half > 0.161);
  });

  test('each knee and elbow shows all round the limb it joins', () => {
    const smallest = (r) => r * 0.79; // an icosahedron's inscribed radius is about 0.795 of its radius
    assert.ok(smallest(0.13) > 0.09 && smallest(0.09) > 0.063);
  });
});

describe('3. everything else stays as it was', () => {
  const PLAIN = ['ordinary', 'fast', 'tinted', 'king'];
  for (const name of PLAIN) {
    test(`${name}: existing meshes keep their shape, place and rotation, and the order of their siblings`, () => {
      const model = MODELS[name]();
      assert.deepEqual(model.children[2].geometry.params, [0.42, 0.22, 0.26]);
      legsOf(model).forEach((leg, i) => {
        assert.deepEqual(at(leg), [[-0.13, 0.13][i], 0.84, 0]);
        assert.deepEqual(leg.children[0].geometry.params, [0.1, 0.09, 0.4, 5]);
        assert.deepEqual(at(leg.children[0]), [0, -0.2, 0]);
        assert.deepEqual(kneeOf(leg).children[0].geometry.params, [0.09, 0.08, 0.4, 5]);
        assert.deepEqual(footOf(leg).geometry.params, [0.16, 0.08, 0.26]);
        assert.deepEqual(at(footOf(leg)), [0, -0.4, 0.05]);
        assert.equal(leg.children.length, 2);
      });
      const { torso, arms } = model.userData;
      assert.deepEqual(torso.children[0].geometry.params, [0.5, 0.62, 0.3]);
      assert.deepEqual(patchesOf(model).map((p) => [p.geometry.params, at(p), turn(p)]), [
        [[0.14, 0.12, 0.02], [0.1, 0.36, 0.151], [0, 0, 0.4]],
        [[0.1, 0.16, 0.02], [-0.26, 0.2, 0.05], [0, Math.PI / 2, 0.2]],
      ]);
      arms.forEach((arm) => {
        assert.deepEqual(arm.children.slice(0, 3).map((c) => c.geometry.params), [[0.1, 0.09, 0.2, 5], [0.07, 0.055, 0.85, 5], [0.08, 0]]);
        assert.deepEqual(arm.children.slice(1, 3).map(at), [[0, -0.42, 0], [0, -0.88, 0.02]]);
        assert.deepEqual(arm.children.slice(3, 6).map((c) => c.geometry.params), [[0.015, 0.09, 3], [0.015, 0.09, 3], [0.015, 0.09, 3]]);
        assert.equal(arm.children.length, 7);
      });
      assert.equal(torso.children.at(-1), gearOf(model)[0], 'the gear is the torso\'s last child, after the stain and any rag');
    });

    test(`${name}: the new parts ignore rays and the meshes a ray can hit are as before`, () => {
      const model = MODELS[name]();
      const news = [...legsOf(model).map((l) => kneeOf(l).children[2]), ...model.userData.arms.map((a) => a.children.at(-1)), gearOf(model)[0]];
      for (const part of news) assert.ok(Object.hasOwn(part, 'raycast'));
      // 4 leg halves + 2 feet, pelvis, shirt, 4 hem cones, 2 patches, stain, head, 2 sockets, 2 eyes, jaw
      // and 4 teeth, 2 sleeves, 2 arms, 2 hands and 6 claws: 37. The King's crown adds its own.
      const crown = name === 'king' ? hittable(model.userData.head.children.at(-1)).length : 0;
      assert.equal(hittable(model).length, 37 + crown);
      for (const part of news) assert.ok(!hittable(model).includes(part));
    });
  }

  test('the head, eyes, claws, stain, feet, shirt, pelvis and sleeves keep their colours; pants colours the pelvis', () => {
    const model = buildZombie({ pants: '#123456' });
    const { head, torso, arms } = model.userData;
    assert.equal(hex(head.children[0].material.color), '#7d9a6a');
    assert.equal(hex(torso.children[0].material.color), '#5b5270');
    assert.equal(hex(model.children[2].material.color), '#123456');
    assert.equal(hex(footOf(legsOf(model)[0]).material.color), '#2a2622');
    assert.equal(hex(arms[0].children[0].material.color), '#5b5270');
    assert.equal(hex(arms[0].children[3].material.color), '#2a2622');
    const stain = torso.children.find((c) => c.geometry?.params.join() === '0.16,0.14,0.02');
    assert.equal(hex(stain.material.color), '#4a1f24');
    const fast = buildZombie({ fast: true });
    assert.equal(hex(fast.userData.head.children[0].material.color), '#4a5c40');
    assert.equal(hex(fast.userData.torso.children[0].material.color), '#2e2a3a');
    assert.equal(hex(fast.children[2].material.color), '#22201d');
  });

  test('the skin and shirt keep their tint, and the bare foot its skin', () => {
    const model = buildZombie({ tint: 0.05, seed: 0, extras: { bareFoot: true } });
    const skin = hex(model.userData.head.children[0].material.color);
    assert.notEqual(skin, '#7d9a6a');
    assert.equal(hex(footOf(legsOf(model)[0]).material.color), skin);
  });

  test('the walk, the windup and the limp pose the zombie as before', () => {
    const model = buildZombie({ seed: 1.7, extras: { limp: true } });
    model.userData.tick(1, { walk: 1, windup: 0 });
    const step = Math.sin(1 * 4 + 1.7) * 0.35;
    assert.ok(Math.abs(legsOf(model)[0].rotation.x - step) < 1e-9);
    assert.ok(Math.abs(legsOf(model)[1].rotation.x + step * 0.6) < 1e-9);
    model.userData.tick(1, { windup: 1 });
    const up = -(Math.PI / 2 + model.userData.torso.rotation.x);
    for (const arm of model.userData.arms) assert.ok(Math.abs(arm.rotation.x - up) < 1e-9);
    for (const leg of legsOf(model)) assert.equal(leg.children.length, 2);
  });
});

