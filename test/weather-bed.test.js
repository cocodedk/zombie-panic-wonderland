// Spec 16, the wind bed against the stand-in AudioContext (test/weather-audio-helpers.js).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mix } from '../src/logic/sound.js';
import { Game } from '../src/logic/game.js';
import { level1 } from '../src/levels/level-1.js';
import { level2 } from '../src/levels/level-2.js';
import { setUp, click, frame, bedOf, isBed } from './weather-audio-helpers.js';

describe('8. the wind bed', () => {
  test('noise looping through a bandpass at Q 0.8, on the effects bus; its gain and centre follow the wind', () => {
    const { audio, ctx, effects } = setUp();
    audio.play(frame({ wind: 0 }));
    const bed = bedOf(ctx);
    assert.ok(bed, 'a noise');
    assert.equal(bed.loop, true);
    const filter = bed.to;
    const gain = filter.to;
    assert.equal(filter.type, 'bandpass');
    assert.equal(filter.Q.value, 0.8);
    assert.equal(gain.to, effects);
    const at = (wind) => { audio.play(frame({ wind })); return [gain.gain.value, filter.frequency.value]; };
    const [g0, f0] = at(0);
    assert.ok(Math.abs(g0 - 0.05) < 1e-9 && f0 === 300);
    const [g1, f1] = at(1);
    assert.ok(Math.abs(g1 - 0.35) < 1e-9 && f1 === 900);
    const [gh, fh] = at(0.5);
    assert.ok(Math.abs(gh - 0.2) < 1e-9 && fh === 600);
    assert.equal(ctx.sources.filter(isBed).length, 1, 'one bed, moved, not made again');
  });

  test('it plays on the intro card, in play and paused only, and is held by a pause', () => {
    const game = new Game({ ...level2, waves: [{ zombie: 1 }] }, { levels: [level2], weatherRandom: () => 0.5 });
    const { audio, ctx } = setUp();
    const state = () => {
      audio.play(mix(game));
      const bed = bedOf(ctx);
      return bed ? (bed.stoppedAt == null ? 'sounding' : 'stopped') : 'none';
    };
    assert.equal(state(), 'none', 'loading');
    game.loaded();
    assert.equal(state(), 'none', 'title');
    click(game);
    assert.equal(state(), 'sounding', 'intro');
    const gain = bedOf(ctx).to.to.gain.value;
    assert.ok(Math.abs(gain - (0.05 + 0.3 * level2.weather.rest)) < 1e-9, 'level 2\'s wind at rest');
    click(game);
    for (let i = 0; i < 500; i++) game.update(0.01);
    assert.equal(state(), 'sounding', 'play');
    const playing = bedOf(ctx).to.to.gain.value;
    assert.ok(Math.abs(playing - (0.05 + 0.3 * game.weather.wind)) < 1e-9, 'follows the wind');
    game.pressEsc();
    assert.equal(state(), 'sounding', 'paused');
    assert.equal(ctx.state, 'suspended', 'held by the suspended context');
    assert.equal(bedOf(ctx).to.to.gain.value, playing, 'unchanged');
    game.pressEsc();
    assert.equal(state(), 'sounding');
    assert.equal(ctx.sources.filter(isBed).length, 1);
    game.end('victory');
    assert.equal(state(), 'stopped', 'victory');
  });

  test('it is silent with the sound off, and comes back with it', () => {
    const game = new Game({ ...level1, waves: [{ zombie: 1 }] });
    game.loaded();
    click(game);
    const { audio, ctx, master } = setUp();
    audio.play(mix(game));
    assert.equal(bedOf(ctx).stoppedAt, undefined);
    game.toggleSound();
    audio.play(mix(game));
    assert.ok(bedOf(ctx).stoppedAt != null, 'stopped');
    assert.equal(master.gain.value, 0);
    game.toggleSound();
    audio.play(mix(game));
    assert.equal(ctx.sources.filter((s) => isBed(s) && s.stoppedAt == null).length, 1, 'a new bed');
    assert.equal(master.gain.value, 0.5);
  });

  test('no earlier cue, volume or loop changes: the volumes, and nothing new without wind or thunder', () => {
    const { audio, ctx, master, music, effects } = setUp();
    assert.deepEqual([master.gain.value, music.gain.value, effects.gain.value], [0.5, 0.3, 1]);
    audio.play({ cues: [{ name: 'shot' }], music: level1.music, paused: false });
    assert.equal(ctx.sources.filter(isBed).length, 0, 'no bed without a wind');
    assert.ok(ctx.gains.some((g) => g.to === music), 'the level\'s loop plays on the music bus');
    assert.deepEqual([master.gain.value, music.gain.value, effects.gain.value], [0.5, 0.3, 1]);
  });
});
