// Web Audio: plays what mix() says is due, each frame. Every sound is made here from oscillators
// and noise; there are no audio files. The context is made on the first click, as browsers ask.

import { VOLUME } from '../logic/sound.js';

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
// A scale degree of the minor key on `root`; degrees below 0 or above 6 change octave.
const degree = (root, d) => root + 12 * Math.floor(d / 7) + MINOR[((d % 7) + 7) % 7];
const AHEAD = 0.2; // seconds of music scheduled ahead

export function createAudio(win) {
  let ctx = null;
  let master, musicBus, fxBus, noise, crunch;
  let held = false; // suspended by the pause
  let loop = null; // { tune, out, step, at }

  const gainNode = (value, to) => {
    const g = ctx.createGain();
    g.gain.value = value;
    g.connect(to);
    return g;
  };

  // A quick attack to `level`, then a decay to silence over `len` seconds.
  function envelope(at, len, level, to, attack = 0.005) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    g.connect(to);
    return g;
  }

  // An oscillator gliding from `f` to `to`.
  function tone(f, at, len, { type = 'sine', to = f, level = 0.3, out = fxBus, attack } = {}) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, at);
    if (to !== f) o.frequency.exponentialRampToValueAtTime(to, at + len);
    o.connect(envelope(at, len, level, out, attack));
    o.start(at);
    o.stop(at + len + 0.02);
  }

  // Noise through a filter sweeping from `f` to `to`.
  function hiss(at, len, { filter = 'lowpass', f = 2000, to = f, q = 1, level = 0.3, buffer = noise } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f, at);
    if (to !== f) bq.frequency.exponentialRampToValueAtTime(to, at + len);
    src.connect(bq);
    bq.connect(envelope(at, len, level, fxBus));
    src.start(at);
    src.stop(at + len + 0.02);
  }

  function drone(at) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.3, at + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2);
    g.connect(fxBus);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    lp.connect(g);
    for (const f of [55, 55.7, 82.4]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(lp);
      o.start(at);
      o.stop(at + 2.05);
    }
  }

  const notes = (list, at, gap, len) => list.forEach((m, i) => tone(hz(m), at + i * gap, len, { type: 'triangle', level: 0.3 }));

  const SOUNDS = {
    shot: (t) => {
      hiss(t, 0.025, { filter: 'highpass', f: 3500, level: 0.1 });
      tone(170, t, 0.06, { to: 50, level: 0.22 });
    },
    hit: (t) => tone(2400, t, 0.04, { type: 'square', level: 0.05 }),
    burst: (t, { boss }) => {
      if (boss) {
        hiss(t, 0.6, { f: 900, to: 60, level: 0.7, buffer: crunch });
        tone(70, t, 0.6, { to: 28, level: 0.4 });
      } else {
        hiss(t, 0.3, { f: 2600, to: 220, level: 0.45, buffer: crunch });
      }
    },
    hurt: (t) => tone(330, t, 0.4, { type: 'sawtooth', to: 70, level: 0.18 }),
    dodge: (t) => hiss(t, 0.18, { filter: 'bandpass', f: 400, to: 3200, q: 2, level: 0.35 }),
    throw: (t) => tone(200, t, 0.12, { to: 90, level: 0.2, attack: 0.02 }),
    caw: (t) => {
      tone(840, t, 0.09, { type: 'sawtooth', to: 560, level: 0.1 });
      tone(780, t + 0.11, 0.11, { type: 'sawtooth', to: 500, level: 0.1 });
    },
    boss: drone,
    victory: (t) => notes([72, 76, 79], t, 0.18, 0.3),
    defeat: (t) => notes([67, 63, 60], t, 0.25, 0.4),
  };

  // Bass on every beat, root and fifth in turn; the melody's soft, quickly fading marimba notes.
  function schedule() {
    const { tune, out } = loop;
    const beat = 60 / tune.bpm;
    loop.at = Math.max(loop.at, ctx.currentTime);
    while (loop.at < ctx.currentTime + AHEAD) {
      const i = loop.step % (tune.bars * 4);
      const bass = tune.bass[Math.floor(i / 4)] + (i % 2 ? 4 : 0);
      tone(hz(degree(tune.root - 12, bass)), loop.at, beat * 0.9, { type: 'triangle', level: 0.5, out });
      const m = tune.melody[i];
      if (m != null) {
        const f = hz(degree(tune.root + 12, m));
        tone(f, loop.at, 0.5, { level: 0.35, out });
        tone(f * 4, loop.at, 0.08, { level: 0.06, out });
      }
      loop.at += beat;
      loop.step += 1;
    }
  }

  function noiseBuffer(hold) {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < data.length; i++) data[i] = i % hold ? v : (v = Math.random() * 2 - 1);
    return buf;
  }

  return {
    // On a click: make the context, or wake it.
    unlock() {
      if (!ctx) {
        const Ctx = win.AudioContext ?? win.webkitAudioContext;
        if (!Ctx) return;
        ctx = new Ctx();
        master = gainNode(VOLUME.master, ctx.destination);
        musicBus = gainNode(VOLUME.music, master);
        fxBus = gainNode(VOLUME.effects, master);
        noise = noiseBuffer(1);
        crunch = noiseBuffer(6); // held samples sound crunchy
      }
      if (!held && ctx.state === 'suspended') ctx.resume();
    },

    // `frame` is what mix() returned.
    play({ cues, music, paused, muted = false }) {
      if (!ctx) return;
      master.gain.value = muted ? 0 : VOLUME.master; // silences sounds already playing, too
      if (paused !== held) {
        held = paused;
        if (paused) ctx.suspend();
        else ctx.resume();
      }
      if (paused) return;
      if (music !== (loop?.tune ?? null)) {
        loop?.out.disconnect();
        loop = music ? { tune: music, out: gainNode(1, musicBus), step: 0, at: ctx.currentTime + 0.05 } : null;
      }
      if (loop) schedule();
      for (const c of cues) SOUNDS[c.name]?.(ctx.currentTime, c);
    },
  };
}
