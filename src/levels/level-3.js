// Level 3: the Spider Wood, a webbed twilight forest after level 2's cornfield. Level 2's enemies plus
// the spider, and level 1's boss for now; the rest of the wood's creatures and the queen come later.

import { level1 } from './level-1.js';
import { level2 } from './level-2.js';

export const level3 = {
  name: 'The Spider Wood',
  number: 3,
  text: {
    intro: 'The wood is silent. Something watches from the webs.',
    boss: 'The Zombie King rises!',
    victory: 'You made it through the wood — for now.',
  },

  player: level1.player,
  roadZ: 0,
  spawn: level1.spawn,

  // Level 2's enemies, and the spider: quick and low, it crawls under and over fences. From wave `fromWave`,
  // every `every`th spider a wave sends drops at z `at`, `from` up on a thread, lowering over `time` seconds.
  enemies: {
    ...level2.enemies,
    spider: { hits: 2, points: 150, speed: 2.2, reach: 1.2, closeIn: 0.8, strikeEvery: 1.2, drop: { fromWave: 2, every: 3, at: -5, from: 5, time: 1.2 } },
  },

  timing: level1.timing,

  // Each wave's enemies arrive in this order (zombie, spider, pumpkin monster, crow), `timing.spacing` seconds apart.
  waves: [
    { zombie: 4, spider: 2, crow: 1 },
    { zombie: 5, spider: 3, crow: 2 },
    { zombie: 5, spider: 3, pumpkinMonster: 1, crow: 2 },
    { zombie: 6, spider: 4, pumpkinMonster: 2, crow: 3 },
    { zombie: 6, spider: 5, pumpkinMonster: 2, crow: 3 },
  ],

  boss: { ...level1.boss },

  music: {
    key: 'E minor',
    bpm: 92,
    bars: 8,
    root: 52,
    bass: [0, 3, 0, 4, 5, 3, 4, 4],
    melody: [
      2, null, 4, 3, 2, null, 0, null, 1, 2, 3, null, 4, 3, 2, null,
      4, null, 5, 4, 3, null, 2, null, 1, null, 0, null, -1, null, 0, null,
    ],
  },

  light: { fog: '#1d2b2a', fogFar: 100, sky: '#6b7fa8', ground: '#1a231e', key: '#c9d6ff', keyAt: [-10, 14, -20], fill: '#8f7fc0' },

  weather: { between: [8, 18], rest: 0.4, gusts: 0.6, leaf: '#6f7f4a' },

  sky: {
    cycle: 100,
    clouds: { seed: 7, colors: ['#c7d2e8', '#8fa3c9', '#7d6fa3', '#b9c7d6'] },
    moon: { radius: 3.5, at: [-16, 24, -72], colors: ['#e6f0d8', '#cfe0ff', '#d9d2f0'] },
  },

  // No fences: zombies walk straight to the road.
  scenery: [
    { model: 'sky', top: '#1b1533', horizon: '#3d5a4e' },
    { model: 'ground', color: '#1f2a24' },
    { model: 'road', color: '#8f9a7a', length: 26, width: 2.6, missing: 0.2, seed: 21 },
    { model: 'tree', x: -18, z: -8, height: 7, seed: 1 },
    { model: 'tree', x: -13, z: -14, height: 8, seed: 2 },
    { model: 'tree', x: -9, z: -18, height: 9, seed: 3 },
    { model: 'tree', x: -5, z: -22, height: 8, seed: 4 },
    { model: 'tree', x: 5, z: -20, height: 7.5, seed: 5 },
    { model: 'tree', x: 9, z: -16, height: 9, seed: 6 },
    { model: 'tree', x: 13, z: -12, height: 8, seed: 7 },
    { model: 'tree', x: 18, z: -9, height: 7, seed: 8 },
    { model: 'tree', x: -15, z: -26, height: 9, seed: 9 },
    { model: 'tree', x: 16, z: -25, height: 8.5, seed: 10 },
    { model: 'mushroom', x: -11, z: -4, cap: '#4a6fa5', size: 2, seed: 1 },
    { model: 'mushroom', x: 11.5, z: -3, cap: '#4a6fa5', size: 1.6, seed: 2 },
    { model: 'mushroom', x: -6.5, z: -15, cap: '#4a6fa5', size: 3, seed: 3 },
    { model: 'mushroom', x: 7, z: -17, cap: '#4a6fa5', size: 2.4, seed: 4 },
    { model: 'web', x: -9, z: -7, size: 2.2, height: 3, turn: 0.3, seed: 1 },
    { model: 'web', x: 9.5, z: -8, size: 2.6, height: 3.6, turn: -0.4, seed: 2 },
    { model: 'web', x: -3, z: -19, size: 2, height: 2.8, turn: 0.5, seed: 3 },
    { model: 'web', x: 4, z: -21, size: 2.4, height: 4, turn: -0.2, seed: 4 },
    { model: 'web', x: -14, z: -13, size: 2.6, height: 3.4, turn: -0.5, seed: 5 },
    { model: 'web', x: 14, z: -14, size: 2.3, height: 3.2, turn: 0.1, seed: 6 },
  ],
};
