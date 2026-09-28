// What each screen shows, as plain data: the HUD reads it, and Node tests it.

export const TEXT = {
  loading: 'Loading…',
  network: 'The game could not load. Check your connection and reload the page.',
  webgl: 'Your browser cannot show 3D graphics (WebGL). Try another browser.',
  title: 'Zombie Panic in Wonderland',
  start: 'Click to start',
  controls: 'A / D or ← / → move · mouse aims · hold the left button to shoot · Space dodges · Esc pauses',
  intro: 'Zombies have risen in Wonderland. Hold the ruined road!',
  paused: 'Paused — press Esc to go on',
  victory: 'Wonderland is safe — for now.',
  defeat: 'Game over',
  playAgain: 'Play again',
  tryAgain: 'Try again',
};

const pad = (score) => String(score).padStart(6, '0');

// plain: full-page text with nothing else. band: a dark band over the visible scene.
// hud: the heads-up display, or null. pointer: whether the mouse pointer shows (else the crosshair).
export function screenView(game) {
  const s = game.screen;
  const view = { plain: null, band: null, hud: null, pointer: true };
  if (s === 'loading') view.plain = TEXT.loading;
  else if (s === 'error') view.plain = TEXT[game.error] ?? TEXT.network;
  else if (s === 'title') view.band = { title: TEXT.title, lines: [TEXT.start, TEXT.controls] };
  else if (s === 'intro') view.band = { lines: [TEXT.intro] };
  else if (s === 'play' && game.banner) view.band = { lines: [game.banner] };
  else if (s === 'paused') view.band = { lines: [TEXT.paused] };
  else if (s === 'victory') view.band = { title: TEXT.victory, lines: [`Final score ${game.score}`], button: TEXT.playAgain };
  else if (s === 'defeat') view.band = { title: TEXT.defeat, lines: [`Final score ${game.score}`], button: TEXT.tryAgain };

  if (['intro', 'play', 'paused', 'victory', 'defeat'].includes(s)) {
    const boss = game.bossHealth != null && game.phase === 'boss';
    view.hud = {
      hearts: game.player.hearts,
      score: `SCORE ${pad(game.score)}`,
      wave: boss ? null : `Wave ${game.wave} / ${game.level.waves.length}`,
      boss: boss ? game.bossHealth / game.level.boss.hits : null,
    };
  }
  view.pointer = !['intro', 'play', 'paused'].includes(s);
  return view;
}
