// The page: game logic, HUD, sound and WebMCP first; three.js and the stage load after, and may fail.

import { Game } from './logic/game.js';
import { mix } from './logic/sound.js';
import { registerWebMcp } from './logic/webmcp.js';
import { level1 } from './levels/level-1.js';
import { level2 } from './levels/level-2.js';
import { createHud } from './view/hud.js';
import { createAudio } from './view/audio.js';
import { bindInput, bindMute } from './view/input.js';

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const game = new Game(level1, { levels: [level1, level2], reducedMotion });
const hud = createHud(document, game);
const audio = createAudio(window);
bindMute(window, game, hud);
window.addEventListener('pointerdown', () => audio.unlock()); // browsers allow sound only after a click
registerWebMcp(document.modelContext, game);

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

async function boot() {
  let createStage;
  try {
    ({ createStage } = await import('./view/stage.js'));
  } catch {
    game.fail('network');
    return;
  }
  let stage;
  try {
    if (!hasWebGL()) throw new Error('no WebGL');
    stage = createStage(document.getElementById('stage'), game.level);
  } catch {
    game.fail('webgl');
    return;
  }
  const aim = bindInput(window, game, hud);
  game.loaded();

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const target = stage.aimAt(aim);
    game.setAim(target.id, target.point);
    game.update(dt);
    stage.sync(game, dt);
    audio.play(mix(game));
    hud.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

hud.render();
boot().finally(() => hud.render());
