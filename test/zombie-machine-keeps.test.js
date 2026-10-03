// Spec 38, Done when 3: addMachine keeps every existing mesh (the same objects, geometry, places,
// rotations, scales and order among their siblings) and the set of meshes a ray can hit; its new
// parts come after them and ignore rays. A rig shaped as buildZombie makes it is taken before and after.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./three-hooks.js', import.meta.url);
const THREE = await import('./fake-three.js');
const { part, group } = await import('../src/view/models/parts.js');
const { addMachine } = await import('../src/view/models/zombie-machine.js');

function rig() {
  const legs = [-0.13, 0.13].map((x) => {
    const hip = group(part(new THREE.CylinderGeometry(0.1, 0.08, 0.8, 5), '#3d3a35', [0, -0.4, 0]), part(new THREE.BoxGeometry(0.16, 0.08, 0.26), '#2a2622', [0, -0.8, 0.05]));
    hip.position.set(x, 0.84, 0);
    return hip;
  });
  const torso = group();
  torso.position.y = 0.92;
  torso.rotation.x = 0.45;
  torso.add(part(new THREE.BoxGeometry(0.5, 0.62, 0.3), '#5b5270', [0, 0.31, 0]));
  for (let i = 0; i < 4; i++) torso.add(part(new THREE.ConeGeometry(0.06, 0.18, 3), '#5b5270', [i * 0.1, -0.06, 0.12], [Math.PI, 0, 0]));
  torso.add(part(new THREE.BoxGeometry(0.14, 0.12, 0.02), '#7d9a6a', [0.1, 0.36, 0.151], [0, 0, 0.4]));
  torso.add(part(new THREE.BoxGeometry(0.1, 0.16, 0.02), '#7d9a6a', [-0.26, 0.2, 0.05], [0, Math.PI / 2, 0.2]));
  torso.add(group(part(new THREE.IcosahedronGeometry(0.2, 0), '#7d9a6a')));
  const arms = [-0.32, 0.32].map((x) => {
    const shoulder = group(
      part(new THREE.CylinderGeometry(0.1, 0.09, 0.2, 5), '#5b5270', [0, -0.08, 0]),
      part(new THREE.CylinderGeometry(0.07, 0.055, 0.85, 5), '#7d9a6a', [0, -0.42, 0]),
      part(new THREE.IcosahedronGeometry(0.08, 0), '#7d9a6a', [0, -0.88, 0.02]),
      ...[-0.035, 0, 0.035].map((cx) => part(new THREE.ConeGeometry(0.015, 0.09, 3), '#2a2622', [cx, -1.005, 0.02], [Math.PI, 0, 0])),
    );
    shoulder.position.set(x, 0.55, 0);
    torso.add(shoulder);
    return shoulder;
  });
  torso.add(part(new THREE.BoxGeometry(0.16, 0.14, 0.02), '#8a4a1e', [-0.08, 0.2, 0.151], [0, 0, 0.3])); // the stain
  const rag = group(part(new THREE.BoxGeometry(0.05, 0.16, 0.012), '#5b5270')); // the rag's pivot, last
  torso.add(rag);
  const root = group(...legs, part(new THREE.BoxGeometry(0.42, 0.22, 0.26), '#3d3a35', [0, 0.86, 0]), torso);
  return { root, legs, arms, torso };
}

// Every node, in order: its identity, geometry, place, rotation, scale and the identities of its children.
const snapshot = (root) => {
  const all = [];
  root.traverse((o) => all.push({ o, geometry: o.geometry, params: o.geometry?.params, at: { ...o.position }, turn: { ...o.rotation }, scale: { ...o.scale }, kids: [...o.children] }));
  return all;
};
const hittable = (root) => {
  const found = [];
  root.traverse((o) => { if (o instanceof THREE.Mesh && !Object.hasOwn(o, 'raycast')) found.push(o); });
  return found;
};

test('addMachine keeps every existing node as it was, adds its parts after them, and the hittable set is the same', () => {
  const { root, legs, arms, torso } = rig();
  const cylinders = legs.map((l) => l.children[0]);
  const feet = legs.map((l) => l.children[1]);
  const plate = torso.children[5];
  const before = snapshot(root);
  const hitBefore = hittable(root);
  addMachine({ legs, arms, torso });
  const after = snapshot(root);

  const added = after.filter((a) => !before.some((b) => b.o === a.o)).map((a) => a.o);
  assert.equal(added.length, 11, 'per leg an upper leg, a knee group, a lower leg and a ball; two elbows and the gear');
  for (const b of before) {
    const a = after.find((x) => x.o === b.o);
    if (cylinders.includes(b.o)) {
      assert.equal(a, undefined, 'a leg cylinder is replaced by the two halves');
      continue;
    }
    assert.ok(a, 'the same object is still in the tree');
    assert.equal(a.geometry, b.geometry);
    const scale = b.o === plate ? { x: 1.5, y: 1.5, z: 1 } : b.scale;
    const place = feet.includes(b.o) ? { x: 0, y: -0.4, z: 0.05 } : b.at; // the foot is now in the knee group
    assert.deepEqual([a.params, a.at, a.turn, a.scale], [b.params, place, b.turn, scale]);
    if (legs.includes(b.o)) continue; // the hips' children are checked below
    assert.deepEqual(a.kids.slice(0, b.kids.length), b.kids, 'the existing children keep their order');
    assert.ok(a.kids.slice(b.kids.length).every((k) => added.includes(k)), 'only new parts follow them');
  }
  legs.forEach((leg, i) => {
    const [upper, knee] = leg.children;
    assert.equal(leg.children.length, 2);
    assert.ok(!(knee instanceof THREE.Mesh), 'the knee is a group, not a mesh');
    const [lower, foot, ball] = knee.children;
    assert.equal(foot, feet[i], 'the same foot');
    assert.ok(Object.hasOwn(ball, 'raycast'));
    assert.deepEqual(hittable(leg), [upper, lower, foot], 'the two halves are hittable, as the cylinder was');
  });
  const halves = legs.flatMap((l) => [l.children[0], l.children[1].children[0]]);
  for (const n of added.filter((n) => !halves.includes(n) && n instanceof THREE.Mesh)) assert.ok(Object.hasOwn(n, 'raycast') && n.raycast() === undefined, 'each other new mesh ignores rays');
  assert.deepEqual(hittable(root).filter((m) => !halves.includes(m)), hitBefore.filter((m) => !cylinders.includes(m)));
});
