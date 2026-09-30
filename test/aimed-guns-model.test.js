// Spec 35 on the model and the stage, against test/fake-three.js: the aim rig turns the arms, the guns
// and the flash about the shoulder; the head and body do not turn.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { MUZZLE, MUZZLES, PIVOT, muzzleAt } from '../src/logic/effects.js';
import { playing, levelWith } from './helpers.js';

register('./three-hooks.js', import.meta.url);
globalThis.window = { devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, addEventListener() {} };
const THREE = await import('./fake-three.js');
const { buildPlayer } = await import('../src/view/models/player.js');
const { createStage } = await import('../src/view/stage.js');

const near = (a, b, msg = '') => assert.ok(Math.abs(a - b) < 1e-9, `${msg} ${a} ≈ ${b}`);
const inBody = (rig, o) => [rig.position.x + o.position.x, rig.position.y + o.position.y, rig.position.z + o.position.z]; // from the waist pivot, at angles 0

test('the arms, the gun in hand and the flash are children of the aim rig, whose origin is the pivot', () => {
  const { body, rig, flash, guns } = buildPlayer().userData;
  assert.equal(rig.parent, body);
  assert.equal(rig.rotation.order, 'YXZ');
  assert.deepEqual(inBody(rig, { position: { x: 0, y: 0, z: 0 } }).map((v) => +v.toFixed(9)), [PIVOT.x, PIVOT.y, PIVOT.z]);
  assert.equal(flash.parent, rig);
  for (const gun of Object.values(guns)) assert.equal(gun.parent.parent, rig, 'the guns are in the rig');
  const arms = rig.children.filter((c) => c instanceof THREE.Mesh && c !== flash);
  assert.equal(arms.length, 2);
  assert.ok(arms.every((m) => m.geometry instanceof THREE.CylinderGeometry && `#${m.material.color.getHexString()}` === '#b3202a'));
});

test('with angles 0 the model is as before: the arms, the gun and the flash where they were', () => {
  const { rig, flash, guns } = buildPlayer().userData;
  const arms = rig.children.filter((c) => c instanceof THREE.Mesh && c !== flash);
  const round = (p) => inBody(rig, p).map((v) => +v.toFixed(9));
  assert.deepEqual(arms.map(round), [[0.2, 0.26, -0.16], [-0.08, 0.26, -0.18]]);
  assert.deepEqual(round(guns.popper.parent), [0.1, 0.28, -0.42]);
  for (const weapon of Object.keys(MUZZLES)) {
    const player = buildPlayer();
    player.userData.tick(0, { weapon });
    const at = inBody(player.userData.rig, player.userData.flash);
    [MUZZLES[weapon].x, MUZZLES[weapon].y, MUZZLES[weapon].z].forEach((v, i) => near(at[i], v, `${weapon} ${i}`));
  }
});

test('tick turns the rig by yaw and pitch each frame; the head and body do not turn', () => {
  const root = buildPlayer();
  const { body, rig } = root.userData;
  root.userData.tick(0, {});
  const others = () => body.children.filter((c) => c !== rig).map((c) => ({ ...c.rotation }));
  const before = others();
  root.userData.tick(0, { yaw: 0.7, pitch: -0.3 });
  assert.equal(rig.rotation.y, 0.7);
  assert.equal(rig.rotation.x, -0.3);
  assert.equal(rig.rotation.order, 'YXZ');
  assert.deepEqual(others(), before);
  assert.deepEqual([body.rotation.x, body.rotation.y], [0, 0]);
  root.userData.tick(0, {});
  assert.deepEqual([rig.rotation.y, rig.rotation.x], [0, 0], 'no angles, no turn');
});

test('on the stage the rig follows the crosshair in the same frame, and the flash is at the turned muzzle', () => {
  const game = playing(levelWith([{ zombie: 1 }]));
  const stage = createStage({ appendChild() {} }, game.level);
  const renderer = THREE.renderers.at(-1);
  const hero = () => { stage.sync(game, 0.01); return renderer.scene.children.find((c) => c.userData.rig).userData; };

  game.setAim(null, { x: -6, y: 2, z: -14 });
  const { rig, body, flash } = hero();
  let pose = game.pose();
  assert.ok(pose.yaw > 0.3);
  assert.deepEqual([rig.rotation.y, rig.rotation.x], [pose.yaw, pose.pitch]);

  // The flash, turned by the rig (pitch about x, then yaw about y), is where muzzleAt puts the muzzle.
  const [cp, sp, cy, sy] = [Math.cos(pose.pitch), Math.sin(pose.pitch), Math.cos(pose.yaw), Math.sin(pose.yaw)];
  const v = flash.position;
  const [y1, z1] = [v.y * cp - v.z * sp, v.y * sp + v.z * cp];
  const m = muzzleAt(game.player.x, game.level.roadZ, pose);
  near(m.x, game.player.x + rig.position.x + v.x * cy + z1 * sy);
  near(m.y, body.position.y + rig.position.y + y1);
  near(m.z, game.level.roadZ + rig.position.z - v.x * sy + z1 * cy);

  game.setAim(null, { x: 6, y: 2, z: -14 });
  hero();
  pose = game.pose();
  assert.ok(pose.yaw < -0.3);
  assert.equal(rig.rotation.y, pose.yaw, 'the same frame');

  game.end('defeat');
  hero();
  assert.deepEqual([rig.rotation.y, rig.rotation.x], [0, 0], 'straight ahead on the defeat card');
  near(flash.position.x + PIVOT.x, MUZZLE.x);
});
