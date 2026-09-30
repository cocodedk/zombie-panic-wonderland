// What spec 17's tests share.

import { calm, level1 } from './helpers.js';
import { level2 } from '../src/levels/level-2.js';

export const LEVELS = [level1, level2];
export const near = (a, b, tol = 1e-9, msg = '') => {
  if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg} ${a} ≈ ${b}`);
};
// The level, without weather, with one zombie in its one wave.
export const oneZombie = (level) => ({ ...calm(level), waves: [{ zombie: 1 }] });
