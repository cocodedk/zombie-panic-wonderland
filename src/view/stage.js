// The three.js stage: builds the level's scene, draws the game state each frame, and finds what
// is under the crosshair. The camera is fixed behind and above the player, but for a stomp's shake; the backdrop never moves.
// When the game moves to another level, the backdrop and its light are built anew. The game's
// effects (streaks, chunks, puffs and fades) are drawn here too.

import * as THREE from 'three';
import { SHAKE } from '../logic/game.js';
import { CAMERA } from '../logic/camera.js';
import { pelletDirs } from '../logic/weapons.js';
import { dispose } from './stage-helpers.js';
import { buildBackdrop } from './stage-backdrop.js';
import { syncEntities } from './stage-entities.js';
import { createEffectsView } from './stage-effects.js';
import { createWeatherView } from './weather.js';
import { createBubbleView } from './bubbles.js';
import { createSkyView } from './sky.js';
import { buildPlayer } from './models/player.js';
import { buildZombie, buildZombieKing } from './models/zombie.js';
import { zombieTint, ZOMBIE_EXTRAS } from './models/zombie-details.js';
import { buildPumpkinMonster } from './models/pumpkin.js';
import { buildCrow } from './models/crow.js';
import { buildSpider } from './models/spider.js';
import { buildWolf } from './models/wolf.js';
import { buildScarecrow, buildScarecrowKing } from './models/scarecrow.js';
import { buildSky, buildGround, buildRoad, buildTree, buildMushroom, buildCrypt, buildClockTower, buildHedge, buildFence } from './models/scenery.js';
import { buildCornRows, buildFarmhouse, buildEmeraldCity, buildMoon } from './models/farm.js';
import { buildWeb } from './models/webs.js';

const SCENERY = {
  sky: buildSky, ground: buildGround, road: buildRoad, tree: buildTree, mushroom: buildMushroom,
  crypt: buildCrypt, clockTower: buildClockTower, hedge: buildHedge, fence: buildFence,
  cornRows: buildCornRows, scarecrow: buildScarecrow, farmhouse: buildFarmhouse, emeraldCity: buildEmeraldCity, moon: buildMoon, web: buildWeb,
};

const BOSSES = { zombieKing: buildZombieKing, scarecrowKing: buildScarecrowKing };
// A fading copy carries the fallen enemy's own id, so it keeps that enemy's look.
const idOf = (e) => e.enemyId ?? e.id;
const ENEMIES = {
  zombie: (e) => buildZombie({ seed: idOf(e) * 1.7, fast: e.fast, tint: zombieTint(idOf(e)), extras: ZOMBIE_EXTRAS }),
  spider: (e) => buildSpider({ seed: idOf(e) * 1.7 }),
  wolf: (e) => buildWolf({ seed: idOf(e) * 1.7 }),
  pumpkinMonster: () => buildPumpkinMonster(),
  crow: (e) => buildCrow({ seed: e.id }),
  boss: (e, level) => BOSSES[level.boss.model]({ tint: zombieTint(idOf(e)) }), // the scarecrow king ignores it
};

export function createStage(container, firstLevel) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  let level = firstLevel;
  let backdrop = buildBackdrop(scene, level, SCENERY);
  const weather = createWeatherView(scene);
  const sky = createSkyView();
  const bubbles = createBubbleView(scene);

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

  const effects = createEffectsView(place, ENEMIES), { shared } = effects;

  return {
    sync(game, dt) {
      if (game.level !== level) {
        for (const [id, obj] of shown) {
          scene.remove(obj);
          shown.delete(id);
          dispose(obj, shared);
        }
        bubbles.clear();
        scene.remove(backdrop);
        dispose(backdrop);
        level = game.level;
        backdrop = buildBackdrop(scene, level, SCENERY);
      }
      weather.sync(game, backdrop);
      sky.sync(game, backdrop);
      const p = game.player;
      const pose = game.pose();
      player.position.x = p.x;
      player.userData.tick(pose.t, pose);

      player.userData.flash.visible = game.effects.flash > 0;
      player.userData.flash.scale.setScalar(game.effects.flashSize);

      for (const obj of shown.values()) obj.userData.seen = false;
      pickable.length = 0;

      syncEntities(game, level, { place, pickable, enemies: ENEMIES });
      effects.stomps(game, level);
      const fx = game.effects;
      effects.sync(fx, level);
      bubbles.sync(fx.bubbles);
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
