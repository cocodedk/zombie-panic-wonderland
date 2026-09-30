// The shockwaves and the game's effects (streaks, sparks, chunks, puffs and fades), drawn from
// geometry and materials shared across frames. `shared` lists what the stage must never dispose.

import * as THREE from 'three';
import { STREAK, TRACER, SPARK } from '../logic/effects.js';
import { flat } from './models/parts.js';
import { span } from './stage-helpers.js';

// `place(id, make)` finds or makes the object for an id; `enemies` maps an enemy kind to its builder.
export function createEffectsView(place, enemies) {
  const shockGeo = new THREE.TorusGeometry(1, 0.08, 3, 24);
  const shockMat = new THREE.MeshBasicMaterial({ color: '#f0b25a', transparent: true, opacity: 0.8 });
  const streakGeo = new THREE.BoxGeometry(0.035, 0.035, 1);
  const streakMat = new THREE.MeshBasicMaterial({ color: STREAK.color });
  const tracerMat = new THREE.MeshBasicMaterial({ color: TRACER.color });
  const sparkMat = new THREE.MeshBasicMaterial({ color: SPARK.color });
  const chunkGeo = new THREE.IcosahedronGeometry(1, 0);
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  const chunkMats = new Map(); // colour -> material, shared by every chunk
  const shared = new Set([shockGeo, shockMat, streakGeo, streakMat, tracerMat, sparkMat, chunkGeo, puffGeo]);
  const chunkMat = (color) => {
    if (!chunkMats.has(color)) {
      chunkMats.set(color, flat(color));
      shared.add(chunkMats.get(color));
    }
    return chunkMats.get(color);
  };

  return {
    shared,

    // The shockwave spreads from where the boss stomped, only as wide as the road it reaches.
    stomps(game, level) {
      const boss = game.enemies.find((e) => e.kind === 'boss');
      for (const s of game.stomps) {
        const obj = place(`s${s.id}`, () => new THREE.Mesh(shockGeo, shockMat));
        const f = 1 - s.t / level.boss.stompDelay;
        obj.rotation.x = Math.PI / 2;
        const z = boss ? boss.z : level.boss.standZ;
        obj.position.set(s.x, 0.1, z + (level.roadZ - z) * f);
        const r = Math.min(2 + f * 12, level.boss.stompReach);
        obj.scale.set(r, r, 1);
      }
    },

    sync(fx, level) {
      const mesh = (name, geometry, material) => () => Object.assign(new THREE.Mesh(geometry, material), { name });
      for (const s of fx.streaks) {
        const obj = place(`x${s.id}`, mesh('streak', streakGeo, s.color === TRACER.color ? tracerMat : streakMat));
        span(obj, s.from, s.to);
        obj.scale.set(s.width, s.width, obj.scale.z);
      }
      for (const k of fx.sparks) {
        const obj = place(`x${k.id}`, mesh('spark', chunkGeo, sparkMat));
        obj.position.set(k.pos.x, k.pos.y, k.pos.z);
        obj.scale.setScalar(SPARK.size);
      }
      for (const c of fx.chunks) {
        const obj = place(`x${c.id}`, mesh('chunk', chunkGeo, chunkMat(c.color)));
        obj.position.set(c.pos.x, c.pos.y, c.pos.z);
        obj.rotation.set(c.rot.x, c.rot.y, c.rot.z);
        obj.scale.setScalar(c.size * (1 - c.age / c.life));
      }
      for (const p of fx.puffs) {
        const obj = place(`x${p.id}`, () => mesh('puff', puffGeo, flat(p.color, { transparent: true }))());
        const k = p.age / p.life;
        obj.position.set(p.pos.x, p.pos.y, p.pos.z);
        obj.scale.setScalar(p.size * (0.3 + 0.7 * k));
        obj.material.opacity = 0.85 * (1 - k);
      }
      for (const f of fx.fades) {
        const obj = place(`x${f.id}`, () => {
          const model = enemies[f.kind](f, level);
          model.name = 'fade';
          model.traverse((m) => { if (m.material) m.material.transparent = true; });
          return model;
        });
        obj.position.set(f.x, f.y, f.z);
        obj.traverse((m) => { if (m.material) m.material.opacity = 1 - f.age / f.life; });
      }
    },
  };
}
