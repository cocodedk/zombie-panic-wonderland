// What should sound now, from the game's cues and screen: the audio module plays it. No Web
// Audio here, so Node can test it.

export const VOLUME = { master: 0.5, music: 0.3, effects: 1 };

// The level's loop plays from its intro card until victory or defeat.
const MUSIC = new Set(['intro', 'play', 'paused']);

// Takes the cues due this frame. While paused they wait; with the sound off they are dropped,
// and `muted` silences whatever is still sounding. Thunder sounds only where the music does, and
// the wind bed follows the wind there: `wind` is its strength, or null.
export function mix(game) {
  const paused = game.screen === 'paused';
  const heard = game.soundOn && MUSIC.has(game.screen);
  const cues = paused ? [] : game.cues.splice(0).filter((c) => c.name !== 'thunder' || heard);
  return {
    cues: game.soundOn ? cues : [],
    music: heard ? game.level.music : null,
    wind: heard ? game.weather.wind : null,
    paused,
    muted: !game.soundOn,
  };
}
