// The three.js stage: builds the level's scene, draws the game state each frame, and finds what
// is under the crosshair. The camera is fixed behind and above the player, but for a stomp's shake; the backdrop never moves.
// When the game moves to another level, the backdrop and its light are built anew. The game's
// effects (streaks, chunks, puffs and fades) are drawn here too.

import * as THREE from 'three';
import { pumpkinAt, crowAt, CROW_CIRCLE, bossWindup, SHAKE } from '../logic/game.js';
import { STREAK, TRACER, SPARK } from '../logic/effects.js';
import { CAMERA } from '../logic/camera.js';
import { crateAt, crateLeaving, shellAt, pelletDirs } from '../logic/weapons.js';
import { flat } from './models/parts.js';
import { createWeatherView } from './weather.js';
import { buildPlayer } from './models/player.js';
import { buildZombie, buildZombieKing } from './models/zombie.js';
import { buildPumpkin, buildPumpkinMonster, buildFlamingPumpkin, buildLaunchedPumpkin } from './models/pumpkin.js';
import { buildCrate } from './models/crate.js';
import { buildCanister } from './models/canister.js';
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
  zombie: (e) => buildZombie({ seed: e.id * 1.7, fast: e.fast }),
  pumpkinMonster: () => buildPumpkinMonster(),
  crow: (e) => buildCrow({ seed: e.id }),
  boss: (e, level) => BOSSES[level.boss.model](),
};

// Level 1's dusk; a level may set its own.
const LIGHT = { fog: '#5a3148', fogFar: 70, sky: '#8a6fb0', ground: '#3a2a1a', key: '#ffb070', keyAt: [-8, 6, -20], fill: '#c9b8ff' };

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

function dispose(obj, keep = new Set()) {
  obj.traverse((m) => {
    if (m.geometry && !keep.has(m.geometry)) m.geometry.dispose();
    if (m.material && !keep.has(m.material)) m.material.dispose();
  });
}

// Points `obj`, a unit length along z, from `a` to `b`.
function span(obj, a, b) {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const len = Math.hypot(d.x, d.y, d.z);
  obj.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  obj.rotation.order = 'YXZ';
  obj.rotation.set(-Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0);
  obj.scale.set(1, 1, len);
}

export function createStage(container, firstLevel) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  let level = firstLevel;
  let backdrop = buildBackdrop(scene, level);
  const weather = createWeatherView(scene);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
  const { position: at, target } = CAMERA;
  camera.position.set(at.x, at.y, at.z);
  camera.lookAt(target.x, target.y, target.z);

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

  const shown = new Map(); // id -> object, for enemies, pumpkins, shockwaves, leaving crows and effects
  const pickable = [];
  const raycaster = new THREE.Raycaster();

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

  // A crow flies in and circles facing along its circle, then dives facing the road.
  function placeCrow(e, obj) {
    const c = level.enemies.crow;
    const at = crowAt(e, level);
    obj.position.set(at.x, at.y, at.z);
    if (e.diveX == null) obj.rotation.set(0, -((c.circle - e.timer) * (Math.PI * 2)) / c.circle, 0.4);
    else obj.rotation.set(0.8, Math.atan2(e.diveX - e.x - CROW_CIRCLE, level.roadZ - e.z), 0);
  }

  return {
    sync(game, dt) {
      if (game.level !== level) {
        for (const [id, obj] of shown) {
          scene.remove(obj);
          shown.delete(id);
          dispose(obj, shared);
        }
        scene.remove(backdrop);
        dispose(backdrop);
        level = game.level;
        backdrop = buildBackdrop(scene, level);
      }
      weather.sync(game, backdrop);
      const clock = game.clock; // the game's, so the drawn gun is where its shots start
      const p = game.player;
      const pose = game.pose();
      player.position.x = p.x;
      player.userData.tick(pose.t, pose);

      player.userData.flash.visible = game.effects.flash > 0;
      player.userData.flash.scale.setScalar(game.effects.flashSize);

      for (const obj of shown.values()) obj.userData.seen = false;
      pickable.length = 0;

      for (const e of game.enemies) {
        const obj = place(e.id, () => ENEMIES[e.kind](e, level));
        pickable.push(obj);
        if (e.kind === 'crow') {
          placeCrow(e, obj);
          obj.userData.tick(clock, { diving: e.diveX == null ? 0 : 1 });
          continue;
        }
        obj.position.set(e.x, 0, e.z);
        const walking = e.kind === 'boss' ? e.z < level.boss.standZ : e.kind === 'zombie';
        const throwing = e.kind === 'pumpkinMonster' ? Math.max(0, 1 - e.throwTimer / 0.4) : 0;
        const windup = e.kind === 'boss' ? bossWindup(e, level.boss) : 0;
        obj.userData.tick(clock, { walk: walking ? 1 : 0.2, throwing, windup, twitch: !game.reducedMotion });
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
        const at = pumpkinAt(k, level.roadZ);
        obj.position.set(at.x, at.y, at.z);
        obj.rotation.set(clock * 6, clock * 3, 0);
        pickable.push(obj);
      }
      // Crates bob and turn slowly; one leaving can no longer be aimed at.
      for (const c of game.crates) {
        const obj = place(c.id, () => buildCrate({ weapon: c.weapon }));
        const at = crateAt(c);
        obj.position.set(at.x, at.y, at.z);
        obj.rotation.y = c.t * 0.6;
        obj.userData.tick(clock, { flash: c.flash > 0 ? 1 : 0 });
        if (!crateLeaving(c)) pickable.push(obj);
      }
      for (const c of game.canisters) {
        const obj = place(c.id, () => buildCanister());
        obj.position.set(c.x, 0, c.z);
        obj.userData.tick(clock, { flash: c.flash > 0 ? 1 : 0 });
        pickable.push(obj);
      }
      for (const s of game.shells) {
        const obj = place(s.id, () => buildLaunchedPumpkin());
        const at = shellAt(s);
        obj.position.set(at.x, at.y, at.z);
        obj.rotation.set(clock * 8, clock * 4, 0);
      }
      // The shockwave spreads from where the boss stomped, only as wide as the road it reaches.
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
      const fx = game.effects;
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
          const model = ENEMIES[f.kind](f, level);
          model.name = 'fade';
          model.traverse((m) => { if (m.material) m.material.transparent = true; });
          return model;
        });
        obj.position.set(f.x, f.y, f.z);
        obj.traverse((m) => { if (m.material) m.material.opacity = 1 - f.age / f.life; });
      }
      for (const [id, obj] of shown) {
        if (obj.userData.seen) continue;
        scene.remove(obj);
        shown.delete(id);
        dispose(obj, shared);
      }
      // The stomp's shake: a random offset each frame, fading to nothing; held still while paused.
      const shake = game.screen === 'play' ? (SHAKE.size * game.shake) / SHAKE.time : 0;
      const jolt = () => (Math.random() * 2 - 1) * shake;
      camera.position.set(at.x + jolt(), at.y + jolt(), at.z);
      renderer.render(scene, camera);
    },

    // The first enemy, pumpkin, crate or canister under the crosshair (id, or null) and where the ray lands:
    // on it, else on the ground or backdrop, else far along the ray. With `pellets`, the same for
    // each scattergun pellet's line in `pellets`.
    aimAt(aim, pellets = false) {
      const cast = () => {
        const hit = raycaster.intersectObjects(pickable, true)[0];
        let obj = hit?.object;
        while (obj && obj.userData.entityId == null) obj = obj.parent;
        const land = hit ?? raycaster.intersectObjects([backdrop], true)[0];
        const p = land?.point ?? raycaster.ray.at(60, new THREE.Vector3());
        return { id: obj ? obj.userData.entityId : null, point: { x: p.x, y: p.y, z: p.z } };
      };
      raycaster.setFromCamera(aim, camera);
      const target = cast();
      if (!pellets) return target;
      const { origin: o, direction: d } = raycaster.ray;
      const from = new THREE.Vector3(o.x, o.y, o.z);
      target.pellets = pelletDirs({ x: d.x, y: d.y, z: d.z }).map((v) => {
        raycaster.set(from, new THREE.Vector3(v.x, v.y, v.z));
        return cast();
      });
      return target;
    },

    pick(aim) {
      return this.aimAt(aim).id;
    },
  };
}
