// The page: game logic, HUD and WebMCP first; three.js and the stage load after, and may fail.

import { Game } from './logic/game.js';
import { registerWebMcp } from './logic/webmcp.js';
import { level1 } from './levels/level-1.js';
import { createHud } from './view/hud.js';
import { bindInput } from './view/input.js';

const game = new Game(level1);
const hud = createHud(document, game);
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
    stage = createStage(document.getElementById('stage'), level1);
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
    game.setAim(stage.pick(aim));
    game.update(dt);
    stage.sync(game, dt);
    hud.render();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

hud.render();
boot().finally(() => hud.render());
