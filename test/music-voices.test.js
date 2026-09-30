// Spec 34: each voice's nodes on the stand-in context: filters, envelopes, durations, the echo.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { track1, track2, track3 } from '../src/levels/tracks.js';
import { stepSeconds, stepTime } from '../src/logic/music.js';
import { setUp, frame } from './weather-audio-helpers.js';

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const START = 0.05;
const FLOOR = 0.0001;
const close = (a, b) => Math.abs(a - b) < 1e-9;
const round = (x) => Math.round(x * 1e6) / 1e6;

// A context whose music has been played until `step` is scheduled; returns it and the step's time.
function playTo(track, step) {
  const { audio, ctx } = setUp();
  const t = START + stepTime(track, step);
  for (; ctx.currentTime < t; ctx.currentTime += 0.1) audio.play(frame({ music: track }));
  audio.play(frame({ music: track }));
  return { ctx, t, sec: stepSeconds(track) };
}

const noiseAt = (ctx, t) => ctx.musicSources.filter((s) => close(s.startedAt, t)).map((s) => {
  const env = s.to.to.gain.calls;
  return {
    filter: s.to.type, f: s.to.frequency.calls[0][1], q: s.to.Q.value,
    attack: round(env[1][2] - t), peak: env[1][1], len: round(env[2][2] - t), stop: round(s.stoppedAt - t),
  };
});
const oscAt = (ctx, t, pick) => ctx.oscillators.filter((o) => close(o.startedAt, t) && pick(o));

describe('the drums', () => {
  test('kick: a sine 160 to 48 Hz over 0.11 s, peak 0.9, gone in 0.22 s, with a 0.01 s click through a highpass at 3000 Hz, peak 0.2', () => {
    const { ctx, t } = playTo(track1, 0);
    const [kick] = oscAt(ctx, t, (o) => o.type === 'sine');
    assert.deepEqual(kick.frequency.calls, [['set', 160, t], ['ramp', 48, t + 0.11]]);
    const env = kick.to.gain.calls;
    assert.equal(env[1][1], 0.9);
    assert.ok(close(env[2][2], t + 0.22));
    const click = noiseAt(ctx, t).find((n) => n.f === 3000);
    assert.deepEqual([click.filter, click.peak, click.len], ['highpass', 0.2, 0.01]);
  });

  test('snare: noise through a bandpass at 1800 Hz (Q 1), 0.12 s at peak 0.5, and a second tap 0.015 s later at 0.35', () => {
    const { ctx, t } = playTo(track1, 132);
    const [a] = noiseAt(ctx, t).filter((n) => n.filter === 'bandpass');
    const [b] = noiseAt(ctx, t + 0.015);
    for (const n of [a, b]) assert.deepEqual([n.filter, n.f, n.q, n.len], ['bandpass', 1800, 1, 0.12]);
    assert.deepEqual([a.peak, b.peak], [0.5, 0.35]);
  });

  test('hats: noise through a highpass at 7500 Hz: closed 0.035 s at 0.22, soft 0.035 s at 0.1, open 0.22 s at 0.2', () => {
    const { ctx, t } = playTo(track1, 258); // a closed and an open hat
    const hats = noiseAt(ctx, t);
    assert.equal(hats.length, 2);
    for (const h of hats) assert.deepEqual([h.filter, h.f], ['highpass', 7500]);
    assert.deepEqual(hats.map((h) => [h.peak, h.len]).sort(), [[0.2, 0.22], [0.22, 0.035]]);
    const soft = noiseAt(ctx, START + stepTime(track1, 257));
    assert.deepEqual(soft.map((h) => [h.filter, h.f, h.peak, h.len]), [['highpass', 7500, 0.1, 0.035]]);
  });
});

describe('the synths', () => {
  test('bass: a sawtooth through a lowpass (Q 8) sweeping 2200 to 300 Hz within the note, attack 0.005 s, peak 0.55, lasting 0.9 of a step', () => {
    for (const track of [track1, track2, track3]) {
      const { ctx, t, sec } = playTo(track, 0);
      const [bass] = oscAt(ctx, t, (o) => o.type === 'sawtooth');
      const lp = bass.to;
      assert.deepEqual([lp.type, lp.Q.value], ['lowpass', 8], track.name);
      const [set, ramp] = lp.frequency.calls;
      assert.deepEqual(set, ['set', 2200, t]);
      const env = lp.to.gain.calls;
      assert.equal(ramp[1], 300);
      assert.ok(close(ramp[2], t + Math.min(0.12, 0.9 * sec)), `${track.name} sweeps over 0.12 s or the note`);
      assert.ok(ramp[2] <= env[2][2] + 1e-9, `${track.name}: the sweep ends with the note, so it is heard in full`);
      assert.ok(close(env[1][2], t + 0.005) && env[1][1] === 0.55);
      assert.ok(close(env[2][2], t + 0.9 * sec));
      assert.equal(bass.frequency.calls[0][1], hz(track.root - 24));
    }
  });

  test('arp: two sawtooths at +6 and -6 cents through a lowpass 3000 to 900 Hz over 0.15 s, peak 0.16, 1.5 steps, dry and into the echo', () => {
    const { ctx, t, sec } = playTo(track1, 128);
    const [a, b] = oscAt(ctx, t, (o) => o.detune.value !== 0);
    assert.deepEqual([a.type, b.type, a.detune.value, b.detune.value], ['sawtooth', 'sawtooth', 6, -6]);
    assert.equal(a.to, b.to, 'one filter for both');
    const lp = a.to;
    assert.equal(lp.type, 'lowpass');
    assert.deepEqual(lp.frequency.calls, [['set', 3000, t], ['ramp', 900, t + 0.15]]);
    const env = lp.to;
    assert.equal(env.gain.calls[1][1], 0.16);
    assert.ok(close(env.gain.calls[2][2], t + 1.5 * sec));
    const [out, echo] = env.outs;
    assert.equal(out.to, ctx.gains[1], 'dry, on the music bus');
    assert.equal(echo, ctx.delays[0], 'and into the echo');
  });

  test('echo: a delay of 3 steps, its loop filtered by a lowpass at 2500 Hz, feedback 0.35, wet 0.3 into the music bus', () => {
    const { ctx, t, sec } = playTo(track1, 128);
    const [delay] = ctx.delays;
    assert.ok(close(delay.delayTime.value, 3 * sec));
    const [loop] = delay.outs;
    assert.deepEqual([loop.type, loop.frequency.value], ['lowpass', 2500]);
    const [feedback, wet] = loop.outs;
    assert.deepEqual([feedback.gain.value, feedback.outs], [0.35, [delay]]);
    assert.equal(wet.gain.value, 0.3);
    const arpOut = oscAt(ctx, t, (o) => o.detune.value === 6)[0].to.to.outs[0];
    assert.deepEqual(wet.outs, [arpOut], 'the wet goes to the same music output as the dry');
    assert.equal(arpOut.to, ctx.gains[1]);
  });

  test('pad: per chord tone two sawtooths at +8 and -8 cents and a triangle, through a lowpass at the cutoff, attack and release 0.4 s, 2 bars', () => {
    for (const [track, cutoff, level] of [[track1, 900, 0.05], [track2, 800, 0.06], [track3, 700, 0.05]]) {
      const { ctx, t, sec } = playTo(track, 256);
      const voices = oscAt(ctx, t, (o) => o.type === 'triangle' || Math.abs(o.detune.value) === 8);
      assert.equal(voices.length, 9, track.name);
      const len = 32 * sec;
      for (const o of voices) {
        const lp = o.to.to;
        assert.equal(lp.type, 'lowpass');
        assert.deepEqual(lp.frequency.calls, [['set', cutoff, t]]);
        assert.deepEqual(o.to.gain.calls.map((c) => [c[0], c[1]]), [['set', FLOOR], ['ramp', level], ['set', level], ['ramp', FLOOR]]);
        const times = o.to.gain.calls.map((c) => c[2]);
        [t, t + 0.4, t + len - 0.4, t + len].forEach((want, i) => assert.ok(close(times[i], want), `${track.name} envelope ${i}`));
      }
      assert.deepEqual(voices.map((o) => o.detune.value).sort(), [-8, -8, -8, 0, 0, 0, 8, 8, 8]);
      const tones = [0, 3, 7].map((i) => hz(track.root + track.progression[0] + i + 12)); // the first chord is minor
      const triangles = voices.filter((o) => o.type === 'triangle').map((o) => o.frequency.calls[0][1]);
      assert.deepEqual(triangles, tones);
    }
  });
});

describe('a late frame', () => {
  test('a 10-second gap schedules only the steps still due, not every step it missed', () => {
    const { audio, ctx } = setUp();
    audio.play(frame({ music: track1 }));
    const before = [ctx.oscillators.length, ctx.musicSources.length];
    ctx.currentTime = 10;
    audio.play(frame({ music: track1 }));
    const fresh = [...ctx.oscillators.slice(before[0]), ...ctx.musicSources.slice(before[1])];
    assert.ok(fresh.length > 0 && fresh.length < 40, `${fresh.length} nodes`);
    for (const n of fresh) assert.ok(n.startedAt >= 10 - 0.1 - 1e-9 && n.startedAt < 10.2, `started at ${n.startedAt}`);
    // the grid held: the next kick is where it always was
    const onGrid = (time) => close((time - START) / (4 * stepSeconds(track1)), Math.round((time - START) / (4 * stepSeconds(track1))));
    for (const o of fresh.filter((n) => n.type === 'sine')) assert.ok(onGrid(o.startedAt));
  });
});
