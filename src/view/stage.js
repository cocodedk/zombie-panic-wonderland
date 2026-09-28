// The three.js stage: builds the level's scene, draws the game state each frame, and finds what
// is under the crosshair. The camera is fixed behind and above the player; the backdrop never moves.

import * as THREE from 'three';
import { buildPlayer } from './models/player.js';
import { buildZombie, buildZombieKing } from './models/zombie.js';
import { buildPumpkin, buildPumpkinMonster } from './models/pumpkin.js';
import { buildSky, buildGround, buildRoad, buildTree, buildMushroom, buildCrypt, buildClockTower, buildHedge, buildFence } from './models/scenery.js';

const SCENERY = {
  sky: buildSky, ground: buildGround, road: buildRoad, tree: buildTree, mushroom: buildMushroom,
  crypt: buildCrypt, clockTower: buildClockTower, hedge: buildHedge, fence: buildFence,
};

const ENEMIES = {
  zombie: (e) => buildZombie({ seed: e.id * 1.7 }),
  pumpkinMonster: () => buildPumpkinMonster(),
  boss: () => buildZombieKing(),
};

const ANIMATED = new Set(['title', 'intro', 'play']);

export function createStage(container, level) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#5a3148', 22, 70);
  scene.add(new THREE.HemisphereLight('#8a6fb0', '#3a2a1a', 1.2));
  const sun = new THREE.DirectionalLight('#ffb070', 2.2);
  sun.position.set(-8, 6, -20);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#c9b8ff', 0.8);
  fill.position.set(4, 10, 12);
  scene.add(fill);

  for (const { model, x = 0, z = 0, turn = 0, ...params } of level.scenery) {
    const obj = SCENERY[model](params);
    obj.position.set(x, 0, z);
    obj.rotation.y = turn;
    scene.add(obj);
  }

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  camera.position.set(0, 5, 9);
  camera.lookAt(0, 1.2, -6);

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const player = buildPlayer();
  player.position.z = level.roadZ;
  scene.add(player);

  const shockGeo = new THREE.TorusGeometry(1, 0.08, 3, 24);
  const shockMat = new THREE.MeshBasicMaterial({ color: '#f0b25a', transparent: true, opacity: 0.8 });

  const shown = new Map(); // id -> object, for enemies, pumpkins and shockwaves
  const pickable = [];
  const raycaster = new THREE.Raycaster();
  let clock = 0;
  let lastShots = 0;
  let flashFor = 0;

  function place(id, make) {
    let obj = shown.get(id);
    if (!obj) {
      obj = make();
      obj.userData.entityId = id;
      shown.set(id, obj);
      scene.add(obj);
    }
    obj.userData.seen = true;
    return obj;
  }

  return {
    sync(game, dt) {
      if (ANIMATED.has(game.screen)) clock += dt;
      const p = game.player;
      const roll = game.dodging ? 1 - p.dodging / level.player.dodgeTime : 0;
      player.position.x = p.x;
      player.userData.tick(clock, { walk: game.live && game.move ? 1 : 0, roll, dir: p.dir });

      if (game.shots !== lastShots) flashFor = 0.05;
      lastShots = game.shots;
      flashFor -= ANIMATED.has(game.screen) ? dt : 0;
      player.userData.flash.visible = flashFor > 0;

      for (const obj of shown.values()) obj.userData.seen = false;
      pickable.length = 0;

      for (const e of game.enemies) {
        const obj = place(e.id, () => ENEMIES[e.kind](e));
        obj.position.set(e.x, 0, e.z);
        const walking = e.kind === 'boss' ? e.z < level.boss.standZ : e.kind === 'zombie';
        const throwing = e.kind === 'pumpkinMonster' ? Math.max(0, 1 - e.throwTimer / 0.4) : 0;
        obj.userData.tick(clock, { walk: walking ? 1 : 0.2, throwing });
        // Face the player once on the road.
        obj.rotation.y = e.kind === 'zombie' && e.z >= level.roadZ ? Math.sign(p.x - e.x) * 0.9 : 0;
        pickable.push(obj);
      }
      for (const k of game.pumpkins) {
        const obj = place(k.id, () => buildPumpkin({ size: 0.45 }));
        const f = Math.min(1, k.t / k.flight);
        obj.position.set(k.fromX + (k.x - k.fromX) * f, 2.4 * (1 - f) + 0.25 + Math.sin(f * Math.PI) * 4, k.fromZ + (level.roadZ - k.fromZ) * f);
        obj.rotation.set(clock * 6, clock * 3, 0);
        pickable.push(obj);
      }
      const boss = game.enemies.find((e) => e.kind === 'boss');
      for (const s of game.stomps) {
        const obj = place(`s${s.id}`, () => new THREE.Mesh(shockGeo, shockMat));
        const f = 1 - s.t / level.boss.stompDelay;
        obj.rotation.x = Math.PI / 2;
        obj.position.set(boss ? boss.x : 0, 0.1, (boss ? boss.z : level.boss.standZ) + (level.roadZ - level.boss.standZ) * f);
        obj.scale.set(2 + f * 12, 2 + f * 12, 1);
      }
      for (const [id, obj] of shown) {
        if (obj.userData.seen) continue;
        scene.remove(obj);
        shown.delete(id);
        obj.traverse((m) => {
          if (m.geometry && m.geometry !== shockGeo) m.geometry.dispose();
          if (m.material && m.material !== shockMat) m.material.dispose();
        });
      }
      renderer.render(scene, camera);
    },

    // The id of the first enemy or pumpkin under the crosshair, or null.
    pick(aim) {
      raycaster.setFromCamera(aim, camera);
      const hit = raycaster.intersectObjects(pickable, true)[0];
      let obj = hit?.object;
      while (obj && obj.userData.entityId == null) obj = obj.parent;
      return obj ? obj.userData.entityId : null;
    },
  };
}
