// The weather's sounds, made from noise and a sine like every other: the thunder cue, and the wind
// bed. audio.js wires them in; `ctx` is its context, `out` the effects bus and `noise` its noise buffer.

import { lerp } from '../logic/game-shared.js';

export const WIND = { gain: [0.05, 0.35], centre: [300, 900], q: 0.8 }; // from no wind to full wind
export const THUNDER = { crack: 0.08, rumble: 2.5, sweep: [220, 40], under: 40 };

// Noise through a filter from `f` to `to` over `len` seconds, shaped by `shape`: [seconds, level] points.
// The noise buffer is a second long, so it loops to last as long as `len`.
function burst(ctx, out, noise, at, len, { filter, f, to = f, shape }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = len > 1;
  const bq = ctx.createBiquadFilter();
  bq.type = filter;
  bq.frequency.setValueAtTime(f, at);
  if (to !== f) bq.frequency.exponentialRampToValueAtTime(to, at + len);
  swell(ctx, at, shape, out, bq);
  src.connect(bq);
  src.start(at);
  src.stop(at + len + 0.02);
}

// Routes `from` through a gain that follows `shape`: [seconds, level] points from silence.
function swell(ctx, at, shape, out, from) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  for (const [t, level] of shape) g.gain.exponentialRampToValueAtTime(level, at + t);
  from.connect(g);
  g.connect(out);
}

// A sharp crack, then a deep rumble that swells twice as its lowpass sinks, and a low sine under it.
function thunderVoice(ctx, out, noise, at) {
  const { crack, rumble, sweep, under } = THUNDER;
  burst(ctx, out, noise, at, crack, { filter: 'highpass', f: 2000, shape: [[0.005, 0.5], [crack, 0.0001]] });
  const shape = [[0.3, 0.8], [0.9, 0.35], [1.4, 0.7], [rumble, 0.0001]];
  burst(ctx, out, noise, at, rumble, { filter: 'lowpass', f: sweep[0], to: sweep[1], shape });
  const sine = ctx.createOscillator();
  sine.frequency.setValueAtTime(under, at);
  swell(ctx, at, shape.map(([t, level]) => [t, level * 0.6]), out, sine);
  sine.start(at);
  sine.stop(at + rumble + 0.02);
}

// The weather's sound. `thunder(at)` sounds one. The wind bed is looped noise through a bandpass, its
// volume and centre following the wind (0 to 1): `wind(strength)` starts it or moves it, and with
// null stops it and any thunder still sounding, as the music stops off its screens.
export function weatherSound(ctx, out, noise) {
  let bed = null;
  let bus = null; // every thunder now sounding goes through it
  const stop = () => {
    if (bed) {
      bed.src.stop(ctx.currentTime);
      bed.gain.disconnect();
      bed = null;
    }
    bus?.disconnect();
    bus = null;
  };
  return {
    thunder(at) {
      if (!bus) {
        bus = ctx.createGain();
        bus.connect(out);
      }
      thunderVoice(ctx, bus, noise, at);
    },
    wind(strength) {
      if (strength == null) return stop();
      if (!bed) {
        const src = ctx.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = WIND.q;
        const gain = ctx.createGain();
        src.connect(filter);
        filter.connect(gain);
        gain.connect(out);
        src.start(ctx.currentTime);
        bed = { src, filter, gain };
      }
      bed.gain.gain.value = lerp(...WIND.gain, strength);
      bed.filter.frequency.value = lerp(...WIND.centre, strength);
    },
  };
}
