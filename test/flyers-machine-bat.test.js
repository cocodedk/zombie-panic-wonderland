// Spec 42: the machine bat model (against test/fake-three.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { hex, named, hittable, near, at, pose, checkGlows, lines } from './flyers-machine-helpers.js';

register('./three-hooks.js', import.meta.url);
const { buildBat } = await import('../src/view/models/bat.js');

describe('the machine bat', () => {
  const bat = buildBat();
  const head = named(bat, 'head')[0];
  const wings = named(bat, 'wing');

  test('new default colours, and colours passed still apply', () => {
    const colours = (b) => [named(b, 'body')[0], named(b, 'fan')[0], named(b, 'ear')[0], named(b, 'eye')[0], named(b, 'fang')[0]].map((m) => hex(m.material.color));
    assert.deepEqual(colours(bat), ['#34373d', '#7a808a', '#e0a838', '#ff2a1a', '#e8e0c8']);
    assert.deepEqual(colours(buildBat({ body: '#111111', membrane: '#222222', eyes: '#333333', fang: '#444444' })).filter((_, i) => i !== 2), ['#111111', '#222222', '#333333', '#444444']);
  });

  test('each eye has a red glow of 0.09, 0.01 in front of it, in the head', () => {
    checkGlows(head, named(bat, 'eye'), '#ff2a1a', 0.09);
    checkGlows(named(buildBat({ eyes: '#00ff00' }), 'head')[0], named(bat, 'eye'), '#00ff00', 0.09);
  });

  test('three brass spars in each wing, from the shoulder to the fan edge', () => {
    const edge = [[0.3, 0.2], [0.5, 0.08], [0.42, -0.12]];
    for (const wing of wings) {
      const side = Math.sign(wing.position.x);
      const spars = wing.children.slice(1);
      assert.equal(spars.length, 3);
      spars.forEach((spar, i) => {
        assert.equal(spar.name, 'spar');
        assert.equal(spar.parent, wing);
        assert.equal(hex(spar.material.color), '#e0a838');
        assert.deepEqual(spar.geometry.params, [0.012, 0.012, 1]);
        assert.ok(Object.hasOwn(spar, 'raycast'));
        // The spar's end is where its own z axis, scaled to its length, reaches from its middle.
        const { x: rx, y: ry } = spar.rotation;
        const len = spar.scale.z;
        const dir = [Math.sin(ry) * Math.cos(rx), -Math.sin(rx)]; // its z axis, in the wing's x and y (rotation order YXZ)
        const [ex, ey] = [spar.position.x + dir[0] * len / 2, spar.position.y + dir[1] * len / 2];
        const [sx, sy] = [spar.position.x - dir[0] * len / 2, spar.position.y - dir[1] * len / 2];
        assert.ok(near(sx, 0, 1e-3) && near(sy, 0, 1e-3), 'starts at the shoulder');
        assert.ok(near(ex, side * edge[i][0], 1e-3) && near(ey, edge[i][1], 1e-3), 'ends at the edge point');
        assert.ok(near(spar.position.z, 0));
      });
      assert.equal(wing.children[0].name, 'fan', 'the fan comes first');
    }
    assert.equal(named(bat, 'spar').length, 6);
  });

  test('every mesh it had keeps its geometry, place and rotation, and only those can be hit', () => {
    assert.equal(hittable(bat).length, 10);
    assert.equal(bat.children.length, 4);
    pose(named(bat, 'body')[0], [0.12, 0], [0, 0, 0]);
    pose(head, undefined, [0, 0.05, 0.12]);
    pose(head.children[0], [0.08, 0], [0, 0, 0]);
    const parts = (name) => named(bat, name);
    parts('ear').forEach((e, i) => pose(e, [0.03, 0.08, 3], [[-0.05, 0.05][i], 0.1, -0.01]));
    parts('eye').forEach((e, i) => pose(e, [0.03, 0.03, 0.01], [[-0.035, 0.035][i], 0.02, 0.07]));
    parts('fang').forEach((f, i) => pose(f, [0.012, 0.05, 3], [[-0.025, 0.025][i], -0.06, 0.06], [Math.PI, 0, 0]));
    assert.equal(head.children.length, 7 + 2);
    wings.forEach((wing, i) => {
      pose(wing, undefined, [[-0.06, 0.06][i], 0.02, 0]);
      pose(wing.children[0], undefined, [0, 0, 0]);
      assert.equal(wing.children.length, 1 + 3);
    });
  });

  test('the wings beat as before, and the spars stay in their wing', () => {
    const b = buildBat({ seed: 2 });
    const [l, r] = named(b, 'wing');
    const spars = named(l, 'spar').map((s) => JSON.stringify([s.position, s.rotation, s.scale]));
    b.userData.tick(0.3, { diving: 1 });
    assert.ok(near(l.rotation.z, -Math.sin(0.3 * 18 + 2) * 0.9) && near(r.rotation.z, Math.sin(0.3 * 18 + 2) * 0.9));
    assert.deepEqual(named(l, 'spar').map((s) => JSON.stringify([s.position, s.rotation, s.scale])), spars);
    assert.ok(named(l, 'spar').every((s) => s.parent === l));
  });
});

test('the files stay under 200 lines', () => {
  for (const f of ['src/view/models/crow.js', 'src/view/models/bat.js', 'src/view/models/glow-eyes.js', 'test/flyers-machine-bat.test.js', 'test/flyers-machine-model.test.js', 'test/flyers-machine-helpers.js', 'test/flyers-machine-stage.test.js']) {
    assert.ok(lines(`../${f}`) < 200, f);
  }
});
