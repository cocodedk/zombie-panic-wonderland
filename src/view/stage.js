// The three.js stage: builds the level's scene, draws the game state each frame, and finds what
// is under the crosshair. The camera is fixed behind and above the player; the backdrop never moves.
// When the game moves to another level, the backdrop and its light are built anew.

import * as THREE from 'three';
import { buildPlayer } from './models/player.js';
import { buildZombie, buildZombieKing } from './models/zombie.js';
import { buildPumpkin, buildPumpkinMonster, buildFlamingPumpkin } from './models/pumpkin.js';
import { buildCrow } from './models/crow.js';
import { buildScarecrow, buildScarecrowKing } from './models/scarecrow.js';
import { buildSky, buildGround, buildRoad, buildTree, buildMushroom, buildCrypt, buildClockTower, buildHedge, buildFence } from './models/scenery.js';
import { buildCornRows, buildFarmhouse, buildEmeraldCity, buildMoon } from './models/farm.js';

const SCENERY = {
  sky: buildSky, ground: buildGround, road: buildRoad, tree: buildTree, mushroom: buildMushroom,
  crypt: buildCrypt, clockTower: buildClockTower, hedge: buildHedge, fence: buildFence,
  cornRows: buildCornRows, scarecrow: buildScarecrow, farmhouse: buildFarmhouse, emeraldCity: buildEmeraldCity, moon: buildMoon,
};

const BOSSES = { zombieKing: buildZombieKing, scarecrowKing: buildScarecrowKing };

const ENEMIES = {
  zombie: (e) => buildZombie({ seed: e.id * 1.7 }),
  pumpkinMonster: () => buildPumpkinMonster(),
  crow: (e) => buildCrow({ seed: e.id }),
  boss: (e, level) => BOSSES[level.boss.model](),
};

// Level 1's dusk; a level may set its own.
const LIGHT = { fog: '#5a3148', fogFar: 70, sky: '#8a6fb0', ground: '#3a2a1a', key: '#ffb070', keyAt: [-8, 6, -20], fill: '#c9b8ff' };

const ANIMATED = new Set(['title', 'intro', 'play']);

function buildBackdrop(scene, level) {
  const light = { ...LIGHT, ...level.light };
  scene.fog = new THREE.Fog(light.fog, 22, light.fogFar);
  const backdrop = new THREE.Group();
  backdrop.name = 'backdrop';
  backdrop.add(new THREE.HemisphereLight(light.sky, light.ground, 1.2));
  const key = new THREE.DirectionalLight(light.key, 2.2);
  key.position.set(...light.keyAt);
  backdrop.add(key);
  const fill = new THREE.DirectionalLight(light.fill, 0.8);
  fill.position.set(4, 10, 12);
  backdrop.add(fill);
  for (const { model, x = 0, z = 0, turn = 0, ...params } of level.scenery) {
    const obj = SCENERY[model](params);
    obj.name = model;
    obj.position.x = x;
    obj.position.z = z;
    obj.rotation.y = turn;
    backdrop.add(obj);
  }
  scene.add(backdrop);
  return backdrop;
}

function dispose(obj, keep = []) {
  obj.traverse((m) => {
    if (m.geometry && !keep.includes(m.geometry)) m.geometry.dispose();
    if (m.material && !keep.includes(m.material)) m.material.dispose();
  });
}

export function createStage(container, firstLevel) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  let level = firstLevel;
  let backdrop = buildBackdrop(scene, level);

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

  const shown = new Map(); // id -> object, for enemies, pumpkins, shockwaves and leaving crows
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

  // Where a crow is: flying in from the backdrop and circling, then diving at the road.
  function crowAt(e, obj) {
    const c = level.enemies.crow;
    const r = 1.5;
    if (e.diveX == null) {
      const t = c.circle - e.timer;
      const a = t * (Math.PI * 2) / c.circle;
      const arrive = Math.min(1, t / 0.6);
      const from = [e.x, c.height + 3, level.spawn.z - 8];
      const at = [e.x + Math.cos(a) * r, c.height, e.z + Math.sin(a) * r];
      obj.position.set(...from.map((v, i) => v + (at[i] - v) * arrive));
      obj.rotation.set(0, -a, 0.4);
    } else {
      const f = 1 - e.timer / c.dive;
      obj.position.set(e.x + r + (e.diveX - e.x - r) * f, c.height + (0.5 - c.height) * f, e.z + (level.roadZ - e.z) * f);
      obj.rotation.set(0.8, Math.atan2(e.diveX - e.x - r, level.roadZ - e.z), 0);
    }
  }

  return {
    sync(game, dt) {
      if (game.level !== level) {
        for (const [id, obj] of shown) {
          scene.remove(obj);
          shown.delete(id);
          dispose(obj, [shockGeo, shockMat]);
        }
        scene.remove(backdrop);
        dispose(backdrop);
        level = game.level;
        backdrop = buildBackdrop(scene, level);
      }
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
        const obj = place(e.id, () => ENEMIES[e.kind](e, level));
        pickable.push(obj);
        if (e.kind === 'crow') {
          crowAt(e, obj);
          obj.userData.tick(clock, { diving: e.diveX == null ? 0 : 1 });
          continue;
        }
        obj.position.set(e.x, 0, e.z);
        const walking = e.kind === 'boss' ? e.z < level.boss.standZ : e.kind === 'zombie';
        const throwing = e.kind === 'pumpkinMonster' ? Math.max(0, 1 - e.throwTimer / 0.4) : 0;
        obj.userData.tick(clock, { walk: walking ? 1 : 0.2, throwing });
        // Face the player once on the road.
        obj.rotation.y = e.kind === 'zombie' && e.z >= level.roadZ ? Math.sign(p.x - e.x) * 0.9 : 0;
      }
      for (const f of game.flyaways) {
        const obj = place(`c${f.id}`, () => buildCrow({ seed: f.id }));
        const k = f.t / level.enemies.crow.leave;
        obj.position.set(f.x + k * 6, 0.5 + k * 9, level.roadZ - k * 14);
        obj.rotation.set(-0.5, Math.PI, 0);
        obj.userData.tick(clock, { diving: 0 });
      }
      for (const k of game.pumpkins) {
        const obj = place(k.id, () => (k.flaming ? buildFlamingPumpkin({ size: 0.55 }) : buildPumpkin({ size: 0.45 })));
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
        dispose(obj, [shockGeo, shockMat]);
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
