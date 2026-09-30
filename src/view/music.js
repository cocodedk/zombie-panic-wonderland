// Plays a track's events on the audio context: a drum kit and three synths from oscillators and
// noise, and the arp's echo. No audio files. `play(track)` is called each frame by audio.js and
// schedules the steps due in the next AHEAD seconds on the audio clock.

import { eventsAt, stepSeconds, stepTime } from '../logic/music.js';

const AHEAD = 0.2; // seconds of music scheduled ahead
const LATE = 0.1; // seconds a missed step may still sound
const FLOOR = 0.0001; // exponential ramps cannot reach 0
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

export function createMusic(ctx, bus, noise) {
  let run = null; // { track, out, echo, step, start }

  const gain = (value, to) => {
    const g = ctx.createGain();
    g.gain.value = value;
    g.connect(to);
    return g;
  };

  // A filter at `f` from time `at`, sweeping to `sweep` over `over` seconds.
  const filter = (type, f, at, { q = 1, sweep = f, over = 0 } = {}) => {
    const bq = ctx.createBiquadFilter();
    bq.type = type;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f, at);
    if (sweep !== f) bq.frequency.exponentialRampToValueAtTime(sweep, at + over);
    return bq;
  };

  // A gain rising to `peak` over `attack`, then falling to silence at `len` (after holding until `release`
  // before the end, when given), into `out`.
  const envelope = (at, len, peak, out, { attack = 0.005, release = 0 } = {}) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(FLOOR, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    if (release) g.gain.setValueAtTime(peak, at + len - release);
    g.gain.exponentialRampToValueAtTime(FLOOR, at + len);
    g.connect(out);
    return g;
  };

  const osc = (type, f, at, len, to, cents = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    o.detune.value = cents;
    o.connect(to);
    o.start(at);
    o.stop(at + len + 0.02);
    return o;
  };

  // Noise through a filter, enveloped.
  const hiss = (at, len, peak, type, f, { q = 1, out = run.out } = {}) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bq = filter(type, f, at, { q });
    src.connect(bq);
    bq.connect(envelope(at, len, peak, out));
    src.start(at);
    src.stop(at + len + 0.02);
  };

  const VOICES = {
    kick(at, e) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(160, at);
      o.frequency.exponentialRampToValueAtTime(48, at + 0.11);
      o.connect(envelope(at, 0.22, e.gain, run.out));
      o.start(at);
      o.stop(at + 0.24);
      hiss(at, 0.01, 0.2, 'highpass', 3000);
    },
    snare(at, e) {
      hiss(at, 0.12, e.gain, 'bandpass', 1800);
      hiss(at + 0.015, 0.12, 0.35, 'bandpass', 1800);
    },
    hat: (at, e) => hiss(at, 0.035, e.gain, 'highpass', 7500),
    hatSoft: (at, e) => hiss(at, 0.035, e.gain, 'highpass', 7500),
    openHat: (at, e) => hiss(at, 0.22, e.gain, 'highpass', 7500),
    // An acid-style saw through a lowpass that closes fast: 2200 to 300 Hz over 0.12 seconds, or over
    // the whole note where it is shorter (a step is under 0.134 seconds above 112 bpm), so the sweep is always heard in full.
    bass(at, e, sec) {
      const len = sec * 0.9;
      const lp = filter('lowpass', 2200, at, { q: 8, sweep: 300, over: Math.min(0.12, len) });
      lp.connect(envelope(at, len, e.gain, run.out));
      osc('sawtooth', hz(e.midi), at, len, lp);
    },
    // Two detuned saws, dry and into the echo.
    arp(at, e, sec) {
      const len = sec * 1.5;
      const lp = filter('lowpass', 3000, at, { sweep: 900, over: 0.15 });
      const g = envelope(at, len, e.gain, run.out);
      g.connect(run.echo);
      lp.connect(g);
      for (const cents of [6, -6]) osc('sawtooth', hz(e.midi), at, len, lp, cents);
    },
    // Each chord tone: two detuned saws and a triangle, through one lowpass, for the chord's 2 bars.
    pad(at, e, sec) {
      const len = sec * 32;
      const lp = filter('lowpass', run.track.pad.cutoff, at);
      lp.connect(run.out);
      for (const midi of e.midis) {
        for (const [type, cents] of [['sawtooth', 8], ['sawtooth', -8], ['triangle', 0]]) {
          const g = envelope(at, len, e.gain, lp, { attack: 0.4, release: 0.4 });
          osc(type, hz(midi), at, len, g, cents);
        }
      }
    },
  };

  // A delay of 3 steps, its loop filtered, feeding back at 0.35; 0.3 of it is heard.
  function makeEcho(track, out) {
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 3 * stepSeconds(track);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2500;
    delay.connect(lp);
    lp.connect(gain(0.35, delay));
    lp.connect(gain(0.3, out));
    return delay;
  }

  function stop() {
    run?.out.disconnect();
    run = null;
  }

  function start(track) {
    const out = gain(1, bus);
    run = { track, out, echo: makeEcho(track, out), step: 0, start: ctx.currentTime + 0.05 };
  }

  return {
    stop,
    // Follow `track` (or silence for null): a new track starts from step 0.
    play(track) {
      if (track !== (run?.track ?? null)) {
        stop();
        if (track) start(track);
      }
      if (!run) return;
      const { track: t } = run;
      const sec = stepSeconds(t);
      const now = ctx.currentTime;
      // The grid never moves, so the tempo holds. A step missed by a late frame still sounds if it is at
      // most LATE seconds gone; older ones are dropped, not made into a burst of inaudible notes.
      while (run.start + stepTime(t, run.step) < now + AHEAD) {
        const at = run.start + stepTime(t, run.step);
        if (at >= now - LATE) for (const e of eventsAt(t, run.step)) VOICES[e.voice](at, e, sec);
        run.step += 1;
      }
    },
  };
}
