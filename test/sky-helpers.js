// What the sky's tests share: the stage on a stormy game (test/weather-stage-helpers.js), the spec's
// colour table written out here so a typo in a level file shows, and readers for the clouds and the moon.

import { short1, short2 } from './weather-helpers.js';
import { setUp, backdropOf } from './weather-stage-helpers.js';

export { setUp, backdropOf, short1, short2 };
export { THREE, hex } from './weather-stage-helpers.js';

export const TABLE = {
  1: {
    level: short1,
    cycle: 90,
    clouds: ['#ffd9a8', '#ff9d6c', '#d96f9a', '#8b6fb0'],
    moon: ['#f6ead0', '#ffd6a0', '#f3b8c8'],
  },
  2: {
    level: short2,
    cycle: 120,
    clouds: ['#dfe8f5', '#9fb6d6', '#6f88b8', '#a9c4c0'],
    moon: ['#e8ecd1', '#cfe0ff', '#f6f2c8'],
  },
};

const channels = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// The colour `phase` cycles round `list`, worked out from the spec: a cosine ease from each entry to
// the next, and from the last to the first.
export function colourAt(list, phase) {
  const at = (((phase % 1) + 1) % 1) * list.length;
  const i = Math.floor(at);
  const k = (1 - Math.cos(Math.PI * (at - i))) / 2;
  const [a, b] = [channels(list[i]), channels(list[(i + 1) % list.length])];
  return a.map((v, j) => v + (b[j] - v) * k);
}

export const skyIn = (scene) => backdropOf(scene).children.find((c) => c.userData.sky).userData.sky;
export const rgb = (c) => [c.r, c.g, c.b];
export const near = (a, b, eps = 1e-9) => a.every((v, i) => Math.abs(v - b[i]) <= eps);
export const places = (sky) => sky.clouds.map((c) => c.position.x);
export const shades = (sky) => [...sky.clouds.map((c) => rgb(c.userData.material.color)), rgb(sky.moon.material.color)];

// Every colour the sky should show at `clock` seconds of `table`'s cycle: each cloud shifted, the moon not.
export function colours(table, sky, clock) {
  return [...sky.clouds.map((c) => colourAt(table.clouds, clock / table.cycle + c.userData.shift)), colourAt(table.moon, clock / table.cycle)];
}

// Moves the game's weather on by `seconds` in steps of `dt`, calling `after` at each.
export function spin(game, seconds, dt = 0.01, after = () => {}) {
  for (let i = 0; i < Math.round(seconds / dt); i++) {
    game.weather.update(dt);
    after();
  }
}

// The wind pinned to `w`, whatever the weather does.
export const windAt = (game, w) => Object.defineProperty(game.weather, 'wind', { get: () => w });
