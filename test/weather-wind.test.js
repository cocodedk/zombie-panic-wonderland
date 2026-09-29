// Spec 16, on the stage (against test/fake-three.js): trees, corn, hedges and scarecrows that lean
// about their bases, and the drifting leaves.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { short1, short2 } from './weather-helpers.js';
import { CENTRE, hex, backdropOf, leavesOf, swayers, setUp } from './weather-stage-helpers.js';

describe('7. the stage: wind', () => {
  test('sway changes a tree\'s rotation and never its position; the arms and everything else stay', () => {
    for (const level of [short1, short2]) {
      const { draw, run } = setUp({ level });
      const snap = (scene) => {
        const list = [];
        backdropOf(scene).traverse((o) => { if (!o.userData.leaves && !o.parent?.userData.leaves) list.push({ o, pos: { ...o.position }, rot: { ...o.rotation } }); });
        return list;
      };
      const first = snap(draw());
      run(2.3);
      const second = snap(draw());
      const sways = new Set(swayers(draw()));
      assert.equal(second.length, first.length);
      let moved = 0;
      second.forEach((s, i) => {
        assert.deepEqual(s.pos, first[i].pos, 'no position changes');
        const { z: rz, ...rest } = s.rot;
        const { z: rz0, ...rest0 } = first[i].rot;
        assert.deepEqual(rest, rest0, 'only the lean about z');
        if (rz !== rz0) {
          assert.ok(sways.has(s.o), `${s.o.name} leans`);
          moved += 1;
        }
      });
      assert.ok(moved >= sways.size - 1, `${moved} of ${sways.size} lean`);
      const trees = swayers(draw()).filter((s) => s.name === 'tree');
      const other = swayers(draw()).filter((s) => s.name !== 'tree');
      assert.ok(trees.length > 0 && trees.every((t) => Math.abs(t.rotation.z) <= 0.06 + 1e-9));
      assert.ok(other.every((t) => Math.abs(t.rotation.z) <= 0.03 + 1e-9));
    }
  });

  test('each sways with a phase of its own, and the wind at rest is not still', () => {
    const { draw, run } = setUp();
    const scene = draw();
    run(1);
    draw();
    const trees = swayers(scene).filter((s) => s.name === 'tree');
    assert.equal(new Set(trees.map((t) => t.rotation.z)).size, trees.length, 'not together');
    assert.ok(trees.every((t) => t.rotation.z !== 0));
  });

  test('30 leaves stay in their box, drift along +x at 2 to 8 units a second and wrap around; they are not pickable', () => {
    for (const level of [short1, short2]) {
      const { stage, draw, run } = setUp({ level, intro: true });
      const scene = draw();
      const [group] = leavesOf(scene);
      assert.equal(group.children.length, 30);
      assert.equal(hex(group.children[0].material.color), level.weather.leaf);
      assert.equal(group.parent, backdropOf(scene), 'with the backdrop, not among the pickable things');
      assert.equal(stage.pick(CENTRE), null, 'nothing to hit on the intro card, leaves or not');
      assert.ok(group.children.every((l) => typeof l.raycast === 'function' && l.raycast() === undefined), 'no ray meets one');
      let wrapped = 0;
      const last = group.children.map((l) => l.position.x);
      for (let i = 0; i < 400; i++) { // 40 seconds, in 0.1-second draws
        run(0.1);
        draw();
        group.children.forEach((l, k) => {
          const { x, y, z } = l.position;
          assert.ok(x >= -25 && x <= 25 && y >= 0.3 - 1e-9 && y <= 3 + 1e-9 && z >= -30 && z <= -14, `(${x}, ${y}, ${z})`);
          const speed = (x - last[k]) / 0.1;
          if (x < last[k]) wrapped += 1;
          else assert.ok(speed >= 2 - 1e-6 && speed <= 8 + 1e-6, `drifts at ${speed}`);
          last[k] = x;
        });
      }
      assert.ok(wrapped >= 30, `${wrapped} wraps`);
    }
  });

  test('the leaves and the sway stand still while paused and go on after', () => {
    const { game, draw, run } = setUp();
    run(2);
    game.pressEsc();
    const scene = draw();
    const snap = () => [...leavesOf(scene)[0].children.map((l) => [l.position.x, l.rotation.x]), ...swayers(scene).map((s) => s.rotation.z)];
    const held = snap();
    run(5);
    draw();
    assert.deepEqual(snap(), held);
    game.pressEsc();
    run(1);
    draw();
    assert.notDeepEqual(snap(), held);
  });
});
