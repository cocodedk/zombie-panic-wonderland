// Shared by the spec 39 tests (zombie-gait, zombie-colours). It loads no three.js, so `node --test`
// can run it alone; the tests hand it the builders.

import assert from 'node:assert/strict';

export const hex = (color) => `#${color.getHexString()}`;
export const at = (o) => [o.position.x, o.position.y, o.position.z];
export const close = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-12, `${label}: ${a} is not ${b}`);
export const legsOf = (m) => m.children.slice(0, 2);
export const kneeOf = (leg) => leg.children[1];
const torsoKids = (m, params) => m.userData.torso.children.filter((c) => c.geometry?.params.join() === params);
export const plateOf = (m) => torsoKids(m, '0.14,0.12,0.02')[0];
export const gearOf = (m) => torsoKids(m, '0.06,0.06,0.02,8')[0];
export const modelsOf = (buildZombie, buildZombieKing, extras) => ({
  ordinary: () => buildZombie({ seed: 0.6 }),
  limping: () => buildZombie({ seed: 1.7, extras }),
  fast: () => buildZombie({ fast: true, seed: 3.4, extras }),
  king: () => buildZombieKing({ seed: 5.1 }),
});
export const SEEDS = { ordinary: 0.6, limping: 1.7, fast: 3.4, king: 5.1 };
export const TIMES = [0, 0.3, 0.9, 1.7, 4.2, 11.5];
