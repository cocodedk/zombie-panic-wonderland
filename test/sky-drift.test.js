// Spec 21, on the stage: the clouds' drift on the weather's clock and wind, where the sky stands
// still, reduced motion, and the restarts that put it back at clock 0.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/logic/game.js';
import { journey, win } from './journey.js';
import { TABLE, setUp, skyIn, places, shades, colours, near, spin, windAt, THREE } from './sky-helpers.js';
import { createStage } from './weather-stage-helpers.js';

const close = (got, want, eps = 1e-6) => got.forEach((c, i) => assert.ok(near(c, want[i], eps), `colour ${i}`));
const still = (a, b) => assert.deepEqual(a, b);

describe('4. drift', () => {
  test('a cloud drifts along +x at its own speed, 0.4 to 1.2 units a second', () => {
    const { game, draw } = setUp({ level: TABLE[1].level });
    windAt(game, 0);
    const sky = skyIn(draw());
    const from = places(sky);
    game.weather.update(1);
    draw();
    const speeds = sky.clouds.map((c, i) => c.position.x - from[i]);
    speeds.forEach((v, i) => assert.ok(Math.abs(v - sky.clouds[i].userData.speed) < 1e-9 && v >= 0.4 && v <= 1.2, `${v}`));
    assert.ok(new Set(speeds).size > 15, 'each its own');
  });

  test('50% faster at wind 1: at wind w, x (1 + 0.5 w)', () => {
    for (const w of [0, 0.4, 1]) {
      const { game, draw } = setUp({ level: TABLE[2].level });
      windAt(game, w);
      const sky = skyIn(draw());
      const from = places(sky);
      game.weather.update(2);
      draw();
      sky.clouds.forEach((c, i) => assert.ok(Math.abs(c.position.x - from[i] - 2 * c.userData.speed * (1 + 0.5 * w)) < 1e-9, `wind ${w}`));
    }
  });

  test('a cloud leaving at x 75 comes back in at x -75', () => {
    const { game, draw } = setUp({ level: TABLE[1].level });
    windAt(game, 0);
    const sky = skyIn(draw());
    const [cloud] = sky.clouds;
    cloud.position.x = 74.9;
    game.weather.update(0.5);
    draw();
    const travelled = cloud.userData.speed * 0.5;
    assert.ok(Math.abs(cloud.position.x - (-75 + (74.9 + travelled - 75))) < 1e-9, `${cloud.position.x}`);
    assert.ok(cloud.position.x < -74);
    assert.ok(sky.clouds.every((c) => c.position.x >= -75 && c.position.x < 75));
    game.weather.update(300); // and round again, many times over
    draw();
    assert.ok(sky.clouds.every((c) => c.position.x >= -75 && c.position.x < 75));
  });

  test('it drifts on the intro card and in play, and stands still when the weather does: paused, victory, defeat', () => {
    const table = TABLE[1];
    const { game, draw } = setUp({ level: table.level, intro: true });
    assert.equal(game.screen, 'intro');
    const sky = skyIn(draw());
    const start = places(sky);
    for (let i = 0; i < 100; i++) game.update(0.01);
    draw();
    assert.ok(places(sky).every((x, i) => x > start[i]), 'drifting on the intro card');

    game.pointerDown();
    game.pointerUp();
    assert.equal(game.screen, 'play');
    for (let i = 0; i < 300; i++) game.update(0.01);
    const before = draw() && [places(sky), shades(sky)];
    assert.ok(before[0].every((x, i) => x !== start[i]));

    game.pressEsc();
    for (let i = 0; i < 300; i++) game.update(0.01);
    draw();
    still([places(sky), shades(sky)], before);

    game.pressEsc();
    for (let i = 0; i < 200; i++) game.update(0.01);
    draw();
    assert.ok(places(sky).every((x, i) => x !== before[0][i]), 'on from where it was');
    close(shades(sky), colours(table, sky, game.weather.clock));

    for (const screen of ['victory', 'defeat']) {
      game.screen = screen;
      const frozen = [places(sky), shades(sky)];
      for (let i = 0; i < 300; i++) game.update(0.01);
      draw();
      still([places(sky), shades(sky)], frozen);
    }
  });

  test('on loading, error and title it is at clock 0 and still, whatever the weather clock says', () => {
    for (const n of [1, 2]) {
      const table = TABLE[n];
      for (const screen of ['loading', 'error', 'title']) {
        const game = new Game(table.level);
        if (screen === 'title') game.loaded();
        if (screen === 'error') game.fail('webgl');
        const stage = createStage({ appendChild() {} }, game.level);
        const renderer = THREE.renderers.at(-1);
        stage.sync(game, 0.01);
        const sky = skyIn(renderer.scene);
        const start = [places(sky), shades(sky)];
        close(shades(sky), colours(table, sky, 0), 1e-9);
        game.weather.update(50);
        stage.sync(game, 0.01);
        assert.equal(game.screen, screen);
        still([places(sky), shades(sky)], start);
      }
    }
  });
});

describe('5. reduced motion', () => {
  test('the clouds do not drift and the colours do not change, ever', () => {
    for (const n of [1, 2]) {
      const table = TABLE[n];
      const { game, draw } = setUp({ level: table.level, reducedMotion: true });
      const sky = skyIn(draw());
      const start = [places(sky), shades(sky)];
      close(shades(sky), colours(table, sky, 0), 1e-9);
      spin(game, table.cycle * 1.2, 0.5, () => { draw(); still([places(sky), shades(sky)], start); });
      windAt(game, 1);
      game.weather.update(30);
      draw();
      still([places(sky), shades(sky)], start);
    }
  });
});

describe('6. starting again', () => {
  const started = (sky, table, at) => {
    still(places(sky), at);
    close(shades(sky), colours(table, sky, 0), 1e-9);
  };

  test('Try again, Play again, Next level and Back to title bring back the clock-0 colours and the starting places', () => {
    const game = journey();
    const stage = createStage({ appendChild() {} }, game.level);
    const renderer = THREE.renderers.at(-1);
    const draw = () => { stage.sync(game, 0.01); return skyIn(renderer.scene); };
    const one = draw();
    const at1 = places(one);
    started(one, TABLE[1], at1);
    for (let i = 0; i < 1500; i++) game.update(0.01);
    assert.ok(places(draw()).every((x, i) => x !== at1[i]) && shades(one).some((c, i) => c.some((v, j) => v !== colours(TABLE[1], one, 0)[i][j])));

    game.screen = 'defeat'; // Try again
    draw();
    game.restart();
    assert.equal(game.screen, 'intro');
    started(draw(), TABLE[1], at1);

    game.pointerDown();
    game.pointerUp();
    win(game); // Play again
    draw();
    game.restart();
    started(draw(), TABLE[1], at1);

    game.pointerDown();
    game.pointerUp();
    win(game); // Next level
    game.nextLevel();
    const two = draw();
    assert.equal(game.level.number, 2);
    const at2 = places(two);
    started(two, TABLE[2], at2);
    for (let i = 0; i < 500; i++) game.update(0.01);
    assert.ok(places(draw()).every((x, i) => x !== at2[i]));

    game.pointerDown();
    game.pointerUp();
    win(game); // Back to title
    game.toTitle();
    assert.equal(game.screen, 'title');
    started(draw(), TABLE[1], at1);
  });
});
