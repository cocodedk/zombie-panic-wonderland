// Level 2: the crumbling road, through a moonlit cornfield. Level 1's shape, with crows and the
// Scarecrow King.

import { level1 } from './level-1.js';

export const level2 = {
  name: 'The crumbling road',
  number: 2,
  text: {
    intro: 'The yellow brick road is crumbling. Keep going!',
    boss: 'The Scarecrow King rises!',
    victory: 'The road is clear — for now.',
  },

  player: level1.player,
  roadZ: 0,
  spawn: level1.spawn,

  enemies: {
    ...level1.enemies,
    // Level 1's zombie, with this level's own fast rule: one line to change if it is too hard.
    zombie: { ...level1.enemies.zombie, fast: { fromWave: 2, every: 4, speedFactor: 1.6, points: 200 } },
    // Circles `circle` seconds at `height` over z, dives for `dive` seconds, then leaves in `leave`.
    crow: { hits: 1, points: 50, z: -6, height: 4, circle: 2, dive: 1, splash: 1, leave: 1.5 },
  },

  timing: level1.timing,

  // Each wave's enemies arrive in this order, `timing.spacing` seconds apart.
  waves: [
    { zombie: 5, crow: 2 },
    { zombie: 6, pumpkinMonster: 1, crow: 3 },
    { zombie: 6, pumpkinMonster: 2, crow: 3 },
    { zombie: 8, pumpkinMonster: 2, crow: 4 },
    { zombie: 8, pumpkinMonster: 3, crow: 5 },
  ],

  boss: {
    name: 'Scarecrow King',
    model: 'scarecrowKing',
    hits: 240,
    points: 3000,
    speed: 1.2,
    standZ: -3, // 3 units behind the road
    firstAction: 2, // seconds after it appears, walking or standing
    actionEvery: 3,
    windup: 0.6, // it winds up this long before each action
    actions: ['throw', 'summon'], // in turn
    flamingPumpkin: { hearts: 2, points: 25 }, // flies like a pumpkin monster's
    summon: 3,
    summons: 'crow',
    summonNear: 2, // summons appear within this many units of its x, `summonBack` behind its z
    summonBack: 2,
  },

  // Level 1's shape of loop, slower, in D minor.
  music: {
    key: 'D minor',
    bpm: 100,
    bars: 8,
    root: 50,
    bass: [0, 3, 0, 4, 5, 3, 4, 4],
    melody: [
      4, null, 3, 2, 0, null, null, 2, 3, 4, 5, 4, 2, null, null, null,
      4, null, 3, 2, 0, 2, 3, null, 1, null, -1, 1, 0, null, null, null,
    ],
  },

  // Moonlight in place of level 1's sunset.
  light: { fog: '#15302c', fogFar: 120,sky: '#5d7fa8', ground: '#1a2618', key: '#cfdcff', keyAt: [10, 14, -20], fill: '#7fa0c0' },

  weather: { between: [7, 16], rest: 0.5, gusts: 0.5, leaf: '#a8943e' },

  scenery: [
    { model: 'sky', top: '#0f1a33', horizon: '#1f4d3f' },
    { model: 'moon', x: 18, z: -70, height: 26, color: '#e8ecd1', size: 4 },
    { model: 'ground', color: '#1f2a1c' },
    { model: 'road', color: '#b89a4e', length: 26, width: 2.6, missing: 0.2, seed: 11 },
    { model: 'cornRows', x: -9, z: -6, rows: 5, length: 7, color: '#a8943e', seed: 1 },
    { model: 'cornRows', x: 9.5, z: -6, rows: 5, length: 7, color: '#a8943e', seed: 2 },
    { model: 'cornRows', x: -10, z: 4, rows: 2, length: 8, color: '#a8943e', seed: 3 },
    { model: 'cornRows', x: 10, z: 4, rows: 2, length: 8, color: '#a8943e', seed: 4 },
    { model: 'cornRows', x: 0, z: -14, rows: 3, length: 20, color: '#8f7d34', seed: 5 },
    { model: 'fence', x: -7.5, z: -2.2, length: 2, missing: 0.15, seed: 7 },
    { model: 'fence', x: -3.7, z: -2.2, length: 2.4, missing: 0.15, seed: 7 },
    { model: 'fence', x: 4.3, z: -2.2, length: 1.6, missing: 0.15, seed: 8 },
    { model: 'fence', x: 7.6, z: -2.2, length: 1.8, missing: 0.15, seed: 8 },
    { model: 'scarecrow', x: -6, z: -9, turn: 0.3, seed: 1 },
    { model: 'scarecrow', x: 7.5, z: -11, turn: -0.4, seed: 2 },
    { model: 'scarecrow', x: 13, z: -4, turn: -0.8, seed: 3 },
    { model: 'farmhouse', x: -14, z: -20, turn: 0.4 },
    { model: 'tree', x: -19, z: -16, height: 6, seed: 4 },
    { model: 'emeraldCity', x: 4, z: -80, size: 1.6 },
  ],
};
