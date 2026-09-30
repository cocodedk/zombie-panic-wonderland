// The web shell: while the player is webbed, a pale translucent ball of web around them. It is made the
// first time it is needed, then shown or hidden; in the last BLINK seconds of the web it blinks so the player
// sees dodging is about to come back (with reduced motion it stays steady).

import * as THREE from 'three';
import { ignoreRays } from './models/parts.js';

export const SHELL = { radius: 0.55, detail: 1, lift: 0.6, color: '#d8e0ea', opacity: 0.35, dim: 0.15, blink: 0.5, rate: 6 };

// The shell's opacity with `webbed` seconds of web left: steady, or in the last `blink` seconds bright and dim in
// turn, `rate` times a second, starting bright.
export function shellOpacity(webbed, reducedMotion = false) {
  if (reducedMotion || webbed > SHELL.blink) return SHELL.opacity;
  return Math.floor((SHELL.blink - webbed) * SHELL.rate * 2) % 2 ? SHELL.dim : SHELL.opacity;
}

export function createWebShell(scene) {
  let shell = null;
  return {
    // Called once a frame: the shell is there exactly while `game.player.webbed` is above 0, at the player's x.
    sync(game) {
      const { webbed, x } = game.player;
      if (!shell && webbed > 0) {
        const material = new THREE.MeshBasicMaterial({ color: SHELL.color, transparent: true, opacity: SHELL.opacity, depthWrite: false });
        shell = ignoreRays(new THREE.Mesh(new THREE.IcosahedronGeometry(SHELL.radius, SHELL.detail), material));
        shell.name = 'webShell';
        scene.add(shell);
      }
      if (!shell) return;
      shell.visible = webbed > 0;
      shell.position.set(x, SHELL.lift, game.level.roadZ);
      shell.material.opacity = shellOpacity(webbed, game.reducedMotion);
    },

    dispose() {
      if (!shell) return;
      scene.remove(shell);
      shell.geometry.dispose();
      shell.material.dispose();
      shell = null;
    },
  };
}
