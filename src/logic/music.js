// The music sequencer as plain data, no Web Audio, so Node can test it: which notes of a track are
// due at which step. src/view/music.js plays them.

export const PASS = 128; // steps in a pass: 8 bars of 16
export const PASSES = 4;
const CHORD = 32; // steps a chord lasts: 2 bars
const BAR = 16;

// The peak of each voice; drums have no pitch (midi is null).
const GAIN = { kick: 0.9, snare: 0.5, hat: 0.22, hatSoft: 0.1, openHat: 0.2, bass: 0.55, arp: 0.16 };
const DRUMS = ['kick', 'snare', 'hat', 'hatSoft', 'openHat'];
const INTERVALS = { min: [0, 3, 7], maj: [0, 4, 7] };

export const stepSeconds = (track) => 60 / track.bpm / 4;

// When a step sounds, in seconds from the start: odd steps are delayed by `swing` of a step.
export const stepTime = (track, step) => (step + (step % 2 ? track.swing : 0)) * stepSeconds(track);

// The notes due at `step`, which counts on without wrapping: { voice, midi, gain }.
export function eventsAt(track, step) {
  const pass = Math.floor(step / PASS) % PASSES;
  const inPass = step % PASS;
  const i = Math.floor(inPass / CHORD);
  const chord = track.root + track.progression[i];
  const tones = INTERVALS[track.qualities[i]];
  const layers = track.arrangement[pass];
  const at = step % BAR;
  const out = [];
  for (const voice of DRUMS) {
    if (layers.includes(voice) && track[voice].includes(at)) out.push({ voice, midi: null, gain: GAIN[voice] });
  }
  const bass = track.bass[at];
  if (layers.includes('bass') && bass != null) out.push({ voice: 'bass', midi: chord + bass - 24, gain: GAIN.bass });
  const tone = track.arp[at];
  if (layers.includes('arp') && tone != null) {
    const midi = chord + tones[tone % 3] + 12 * Math.floor(tone / 3) + 12;
    out.push({ voice: 'arp', midi, gain: GAIN.arp });
  }
  if (layers.includes('pad') && inPass % CHORD === 0) {
    out.push({ voice: 'pad', midi: null, midis: tones.map((t) => chord + t + 12), gain: track.pad.level });
  }
  return out;
}
