// Level 1: the ruined road. Everything the rules and the scene need, as data.
// A new level is a new file of this shape; the game and the stage stay the same.

export const level1 = {
  name: 'The ruined road',
  number: 1,
  text: {
    intro: 'Zombies have risen in Wonderland. Hold the ruined road!',
    boss: 'The Zombie King is here!',
    victory: 'Wonderland is safe — for now.',
  },

  player: {
    hearts: 5,
    speed: 6, // units a second
    minX: -8,
    maxX: 8,
    dodgeTime: 0.5,
    dodgeSpeed: 8,
    dodgeCooldown: 1,
    fireRate: 8, // shots a second
  },

  roadZ: 0, // the road runs along x; the player stands on it
  spawn: { minX: -8, maxX: 8, z: -12 }, // the backdrop, where enemies appear

  enemies: {
    zombie: { hits: 3, points: 100, speed: 1.2, reach: 1.5, closeIn: 1, strikeEvery: 1.5 },
    pumpkinMonster: { hits: 5, points: 250, throwEvery: 2.5, flight: 1.2, splash: 1, pumpkinPoints: 25 },
  },

  timing: { intro: 3, spacing: 1, clearedBanner: 2, gap: 3, bossBanner: 2 },

  // Each wave's enemies arrive in this order, `timing.spacing` seconds apart.
  waves: [
    { zombie: 4 },
    { zombie: 6 },
    { zombie: 5, pumpkinMonster: 1 },
    { zombie: 6, pumpkinMonster: 2 },
    { zombie: 8, pumpkinMonster: 2 },
  ],

  boss: {
    name: 'Zombie King',
    model: 'zombieKing',
    hits: 200,
    points: 2000,
    speed: 1.2,
    standZ: -3, // 3 units behind the road
    firstAction: 2, // seconds after it appears, walking or standing
    actionEvery: 3,
    windup: 0.6, // it winds up this long before each action
    actions: ['stomp', 'summon'], // in turn
    stompDelay: 1, // the shockwave reaches the road this long after the stomp
    stompReach: 3, // and hits only within this many units of its x as it stomped
    summon: 2,
    summons: 'zombie',
    summonNear: 2, // summons appear within this many units of its x, `summonBack` behind its z
    summonBack: 2,
  },

  // The level's loop: A minor. `root` is a MIDI note; `bass` a scale degree per bar, `melody` one
  // per beat (null rests), an octave above the root.
  music: {
    key: 'A minor',
    bpm: 120,
    bars: 8,
    root: 57,
    bass: [0, 0, 5, 5, 3, 3, 4, 4],
    melody: [
      0, 2, 4, null, 4, 3, 2, null, 5, 4, 2, 0, 2, null, null, null,
      3, 5, 7, 5, 4, 2, 0, null, 1, 2, 4, 6, 4, null, -1, null,
    ],
  },

  // Thunder, lightning and wind: seconds between strikes, the wind at rest and how far a gust adds
  // to it (0 to 1), and the colour of the drifting leaves.
  weather: { between: [10, 22], rest: 0.3, gusts: 0.5, leaf: '#8a6a2f' },

  // The scene, for the stage. Each entry names a model and its parameters.
  scenery: [
    { model: 'sky', top: '#2b1d3f', horizon: '#c46a3b' },
    { model: 'ground', color: '#2d3526' },
    { model: 'road', color: '#b89a4e', length: 26, width: 2.6 },
    { model: 'fence', x: -6, z: -2.2, length: 7 },
    { model: 'fence', x: 6.5, z: -2.2, length: 6, seed: 4 },
    { model: 'hedge', x: -9, z: 2.6, length: 5 },
    { model: 'hedge', x: 9.5, z: 2.6, length: 5, seed: 2 },
    { model: 'hedge', x: -12, z: -5, length: 4, turn: 0.6, seed: 5 },
    { model: 'tree', x: -10, z: -8, height: 6, seed: 1 },
    { model: 'tree', x: -4, z: -17, height: 7, seed: 2 },
    { model: 'tree', x: 11, z: -7, height: 5.5, seed: 3 },
    { model: 'tree', x: 15, z: -15, height: 8, seed: 6 },
    { model: 'tree', x: -16, z: -14, height: 7.5, seed: 9 },
    { model: 'mushroom', x: -13, z: -3, size: 2.6, seed: 1 },
    { model: 'mushroom', x: 12.5, z: -2, size: 2, cap: '#6b3fa0', seed: 2 },
    { model: 'mushroom', x: 7, z: -16, size: 3.4, seed: 3 },
    { model: 'mushroom', x: -8.5, z: -13, size: 1.4, cap: '#c2572f', seed: 4 },
    { model: 'crypt', x: -2, z: -19, turn: 0.15 },
    { model: 'clockTower', x: 9, z: -22, turn: -0.3 },
  ],
};
