// The DOM around the scene: HUD, overlays and crosshair, drawn from screenView().

import { screenView } from '../logic/screens.js';

export function createHud(doc, game) {
  const $ = (sel) => doc.querySelector(sel);
  const el = {
    plain: $('#plain'), hud: $('#hud'), hearts: $('#hearts'), score: $('#score'), wave: $('#wave'),
    bossbar: $('#bossbar'), bossfill: $('#bossbar i'), band: $('#band'), title: $('#band h1'),
    lines: $('#band .lines'), button: $('#band button'), crosshair: $('#crosshair'), stage: $('#stage'),
  };
  el.button.addEventListener('click', () => game.restart());

  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };

  return {
    crosshairAt(x, y) {
      el.crosshair.style.left = `${x}px`;
      el.crosshair.style.top = `${y}px`;
    },
    render() {
      const v = screenView(game);
      el.plain.hidden = !v.plain;
      text(el.plain, v.plain ?? '');
      el.stage.hidden = !!v.plain;

      el.band.hidden = !v.band;
      if (v.band) {
        el.title.hidden = !v.band.title;
        text(el.title, v.band.title ?? '');
        text(el.lines, v.band.lines.join('\n'));
        el.lines.style.whiteSpace = 'pre-line';
        el.button.hidden = !v.band.button;
        text(el.button, v.band.button ?? '');
      }

      el.hud.hidden = !v.hud;
      if (v.hud) {
        text(el.hearts, '♥'.repeat(v.hud.hearts));
        text(el.score, v.hud.score);
        el.wave.hidden = v.hud.wave == null;
        text(el.wave, v.hud.wave ?? '');
        el.bossbar.hidden = v.hud.boss == null;
        el.bossfill.style.width = `${(v.hud.boss ?? 0) * 100}%`;
      }

      el.crosshair.hidden = v.pointer || !!v.plain;
      doc.body.classList.toggle('playing', !v.pointer);
    },
  };
}
