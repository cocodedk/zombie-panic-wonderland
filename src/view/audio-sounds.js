// The table of sounds, by cue name. audio.js wires it in: `h` holds its synth helpers (`tone`, `hiss`,
// `drone`, `whine`, `cutWhine`, `notes`) and the `crunch` noise buffer and weather `bed`, which exist
// only once the context has been made, so they are read through getters.

export function soundTable(h) {
  const { tone, hiss, drone, whine, cutWhine, notes } = h;
  return {
    shot: (t) => {
      hiss(t, 0.025, { filter: 'highpass', f: 3500, level: 0.1 });
      tone(170, t, 0.06, { to: 50, level: 0.22 });
    },
    hit: (t) => tone(2400, t, 0.04, { type: 'square', level: 0.05 }),
    burst: (t, { boss }) => {
      if (boss) {
        hiss(t, 0.6, { f: 900, to: 60, level: 0.7, buffer: h.crunch });
        tone(70, t, 0.6, { to: 28, level: 0.4 });
      } else {
        hiss(t, 0.3, { f: 2600, to: 220, level: 0.45, buffer: h.crunch });
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
    windup: (t) => {
      tone(55, t, 0.6, { type: 'sawtooth', to: 130, level: 0.22, attack: 0.3 });
      tone(56, t, 0.6, { type: 'square', to: 128, level: 0.08, attack: 0.3 });
    },
    stomp: (t) => {
      tone(90, t, 0.45, { to: 30, level: 0.7 });
      hiss(t, 0.3, { f: 400, to: 50, level: 0.6, buffer: h.crunch });
    },
    scatter: (t) => {
      hiss(t, 0.12, { f: 1800, to: 150, level: 0.55, buffer: h.crunch });
      tone(110, t, 0.12, { to: 40, level: 0.4 });
    },
    launch: (t) => {
      tone(160, t, 0.14, { type: 'triangle', to: 80, level: 0.4 });
      hiss(t, 0.05, { filter: 'bandpass', f: 500, q: 4, level: 0.2 });
    },
    spinup: (t, { stop }) => (stop ? cutWhine() : whine(t, 0.5, 80, 700, 0.45)), // a rising whine; `stop` cuts it
    gatling: (t, { pitch = 1 }) => { // a crack of 25 ms, its pitch a little different each time
      hiss(t, 0.025, { filter: 'highpass', f: 1800 * pitch, level: 0.35, buffer: h.crunch });
      tone(200 * pitch, t, 0.025, { type: 'square', to: 70 * pitch, level: 0.2 });
    },
    spindown: (t) => whine(t, 0.4, 700, 60, 0.02), // a falling whine
    boom: (t) => {
      tone(60, t, 0.7, { to: 24, level: 0.6 });
      hiss(t, 0.5, { f: 700, to: 45, level: 0.6, buffer: h.crunch });
    },
    gas: (t) => { // a short hiss, then a deep boom: about 400 ms
      hiss(t, 0.1, { filter: 'highpass', f: 3000, level: 0.3 });
      tone(55, t + 0.1, 0.3, { to: 22, level: 0.7 });
      hiss(t + 0.1, 0.3, { f: 600, to: 40, level: 0.6, buffer: h.crunch });
    },
    groan: (t) => {
      tone(98, t, 0.6, { type: 'sawtooth', to: 66, level: 0.1, attack: 0.15 });
      tone(99.5, t, 0.6, { type: 'triangle', to: 67, level: 0.2, attack: 0.15 });
    },
    pickup: (t) => notes([84, 91], t, 0.1, 0.16),
    reload: (t) => { // a metallic rack: back, then forward
      hiss(t, 0.04, { filter: 'bandpass', f: 3000, q: 6, level: 0.3 });
      tone(1900, t, 0.04, { type: 'square', to: 1400, level: 0.06 });
      hiss(t + 0.1, 0.05, { filter: 'bandpass', f: 2200, q: 6, level: 0.35 });
      tone(1300, t + 0.1, 0.05, { type: 'square', to: 900, level: 0.07 });
    },
    thunder: (t) => h.bed.thunder(t),
    victory: (t) => notes([72, 76, 79], t, 0.18, 0.3),
    defeat: (t) => notes([67, 63, 60], t, 0.25, 0.4),
  };
}
