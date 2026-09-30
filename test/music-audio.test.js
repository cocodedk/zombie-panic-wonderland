// Spec 34: the music on a stand-in audio context: what it schedules, the echo, the pause, and the
// stops and starts.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { track1, track2 } from '../src/levels/tracks.js';
import { stepSeconds } from '../src/logic/music.js';
import { mix } from '../src/logic/sound.js';
import { playing, levelWith } from './helpers.js';
import { setUp, frame } from './weather-audio-helpers.js';

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const START = 0.05; // the first step sounds this long after the start
const near = (a, b) => Math.abs(a - b) < 1e-9;
const kicks = (ctx) => ctx.oscillators.filter((o) => o.type === 'sine');
const arps = (ctx) => ctx.oscillators.filter((o) => o.detune.value === 6 || o.detune.value === -6);
const pads = (ctx) => ctx.oscillators.filter((o) => o.type === 'triangle');

// Plays the frame every 0.1 seconds of audio time up to `to`.
function run(audio, ctx, music, to) {
  for (; ctx.currentTime < to; ctx.currentTime += 0.1) audio.play(frame({ music }));
  ctx.currentTime = to;
  audio.play(frame({ music }));
}

describe('5. the music on a stand-in context', () => {
  test('starting schedules oscillators and noise only, on the audio clock, for the next 0.2 seconds', () => {
    const { audio, ctx } = setUp();
    const nodes = ctx.gains.length;
    audio.play(frame({ music: track1 }));
    // steps 0 and 1 are due before 0.2 seconds: a kick, its click, hats and the bass
    assert.ok(ctx.oscillators.length > 0 && ctx.musicSources.length > 0);
    assert.ok(ctx.gains.length > nodes);
    assert.equal(ctx.sources.length, 0, 'the music\'s noise is on the music bus');
    for (const n of [...ctx.oscillators, ...ctx.musicSources]) {
      assert.ok(n.startedAt >= START && n.startedAt < 0.2 + START, `started at ${n.startedAt}`);
    }
    assert.ok(near(kicks(ctx)[0].startedAt, START));
    assert.equal(kicks(ctx).length, 1, 'one kick in steps 0 and 1');
    assert.ok(ctx.oscillators.some((o) => o.type === 'sawtooth' && o.frequency.calls[0][1] === hz(33)), 'the bass at MIDI 33');
  });

  test('a kick is a sine gliding from 160 to 48 Hz over 0.11 seconds', () => {
    const { audio, ctx } = setUp();
    audio.play(frame({ music: track1 }));
    const { frequency, startedAt } = kicks(ctx)[0];
    assert.deepEqual(frequency.calls, [['set', 160, startedAt], ['ramp', 48, startedAt + 0.11]]);
  });

  test('the arp has two detuned sawtooths and feeds the echo: 3 steps, feedback 0.35', () => {
    const { audio, ctx } = setUp();
    run(audio, ctx, track1, 13.9); // pass 1 begins at 13.76 seconds
    const a = arps(ctx);
    assert.ok(a.length >= 2);
    assert.ok(a.every((o) => o.type === 'sawtooth'));
    assert.deepEqual([a[0].detune.value, a[1].detune.value], [6, -6]);
    assert.equal(a[0].startedAt, a[1].startedAt);
    assert.equal(ctx.delays.length, 1);
    const [delay] = ctx.delays;
    assert.ok(near(delay.delayTime.value, 3 * stepSeconds(track1)));
    assert.ok(ctx.gains.some((g) => g.gain.value === 0.35 && g.outs.includes(delay)), 'the feedback');
    assert.ok(ctx.gains.some((g) => g.gain.value !== 0.35 && g.outs.includes(delay)), 'the arp feeds the delay');
  });

  test('the pad starts at each chord\'s first step of a pass that has it', () => {
    const { audio, ctx } = setUp();
    run(audio, ctx, track1, 26);
    assert.equal(pads(ctx).length, 0, 'none before pass 2 (step 256 at 27.5 seconds)');
    run(audio, ctx, track1, 27.6);
    const step = stepSeconds(track1);
    assert.equal(pads(ctx).length, 3);
    assert.ok(pads(ctx).every((o) => near(o.startedAt, START + 256 * step)));
    assert.deepEqual(pads(ctx).map((o) => o.frequency.calls[0][1]), [69, 72, 76].map(hz));
    run(audio, ctx, track1, 27.6 + 32 * step);
    assert.equal(pads(ctx).length, 6, 'the next chord, 32 steps on');
    assert.ok(near(pads(ctx)[3].startedAt, START + 288 * step));
  });

  test('nothing is scheduled twice', () => {
    const { audio, ctx } = setUp();
    audio.play(frame({ music: track1 }));
    const count = [ctx.oscillators.length, ctx.musicSources.length];
    audio.play(frame({ music: track1 }));
    assert.deepEqual([ctx.oscillators.length, ctx.musicSources.length], count);
    run(audio, ctx, track1, 6);
    const starts = kicks(ctx).map((o) => o.startedAt);
    assert.equal(new Set(starts).size, starts.length);
    starts.forEach((t, k) => assert.ok(near(t, START + k * 4 * stepSeconds(track1)), `kick ${k}`));
  });
});

describe('6. the pause, the sound and the stops', () => {
  test('the pause suspends and resumes it without skipping or repeating steps', () => {
    const { audio, ctx } = setUp();
    run(audio, ctx, track1, 1);
    const count = ctx.oscillators.length;
    audio.play(frame({ music: track1, paused: true }));
    assert.equal(ctx.state, 'suspended');
    audio.play(frame({ music: track1, paused: true }));
    assert.equal(ctx.oscillators.length, count, 'nothing scheduled while paused');
    audio.play(frame({ music: track1 }));
    assert.equal(ctx.state, 'running');
    run(audio, ctx, track1, 3);
    const starts = kicks(ctx).map((o) => o.startedAt);
    starts.forEach((t, k) => assert.ok(near(t, START + k * 4 * stepSeconds(track1)), `kick ${k}`));
    assert.ok(starts.length >= 6);
  });

  test('a late frame does not move the grid: the missed steps sound at once, at their own times', () => {
    const { audio, ctx } = setUp();
    audio.play(frame({ music: track1 }));
    ctx.currentTime = 0.5; // a frame 0.5 seconds late
    audio.play(frame({ music: track1 }));
    const starts = kicks(ctx).map((o) => o.startedAt);
    assert.ok(near(starts[1], START + 4 * stepSeconds(track1)), `the second kick at ${starts[1]}`);
    assert.equal(starts.length, 2, 'step 8 is not yet due');
  });

  test('with the sound off nothing sounds', () => {
    const game = playing(levelWith([{ zombie: 1 }]));
    const { audio, ctx } = setUp();
    game.toggleSound();
    ctx.currentTime = 5;
    audio.play(mix(game));
    assert.equal(ctx.oscillators.length + ctx.musicSources.length, 0);
    game.toggleSound();
    audio.play(mix(game));
    assert.ok(ctx.oscillators.length > 0, 'on again, it plays');
  });

  test('it stops on victory, defeat and the title (no track), and a new start begins at step 0', () => {
    const { audio, ctx } = setUp();
    run(audio, ctx, track1, 15); // into pass 1, where the arp plays
    assert.ok(arps(ctx).length > 0);
    const [out] = ctx.gains.filter((g) => g.to === ctx.gains[1]).slice(-1);
    audio.play(frame({ music: null }));
    assert.equal(out.cut, true);
    const count = ctx.oscillators.length;
    ctx.currentTime = 20;
    audio.play(frame({ music: null }));
    assert.equal(ctx.oscillators.length, count, 'silent after the stop');

    const arpCount = arps(ctx).length;
    run(audio, ctx, track1, 21.5);
    assert.ok(ctx.oscillators.length > count, 'it plays again');
    assert.ok(near(kicks(ctx).find((o) => o.startedAt > 20).startedAt, 20 + START), 'from step 0');
    assert.equal(arps(ctx).length, arpCount, 'pass 0 again: no arp');
  });

  test('a level\'s track replaces the previous one', () => {
    const { audio, ctx } = setUp();
    run(audio, ctx, track1, 1);
    const [first] = ctx.gains.filter((g) => g.to === ctx.gains[1]).slice(-1);
    ctx.currentTime = 2;
    audio.play(frame({ music: track2 }));
    assert.equal(first.cut, true, 'the old track\'s output is cut');
    const fresh = ctx.oscillators.filter((o) => o.startedAt >= 2);
    assert.ok(near(fresh.find((o) => o.type === 'sine').startedAt, 2 + START), 'track 2 starts at its step 0');
    assert.ok(fresh.some((o) => o.type === 'sawtooth' && o.frequency.calls[0][1] === hz(26)), 'its bass: D1 at MIDI 50 - 24');
  });
});
