// Places the game's enemies, flyaways, pumpkins, crates, canisters and shells each frame.
// `place(id, make)` finds or makes the object for an id; `pickable` collects what the crosshair can hit.

import { pumpkinAt, crowAt, CROW_CIRCLE, bossWindup } from '../logic/game.js';
import { crateAt, crateLeaving, shellAt } from '../logic/weapons.js';
import { buildPumpkin, buildFlamingPumpkin, buildLaunchedPumpkin } from './models/pumpkin.js';
import { buildCrate } from './models/crate.js';
import { buildCanister } from './models/canister.js';
import { buildCrow } from './models/crow.js';

// A crow flies in and circles facing along its circle, then dives facing the road.
function placeCrow(e, obj, level) {
  const c = level.enemies.crow;
  const at = crowAt(e, level);
  obj.position.set(at.x, at.y, at.z);
  if (e.diveX == null) obj.rotation.set(0, -((c.circle - e.timer) * (Math.PI * 2)) / c.circle, 0.4);
  else obj.rotation.set(0.8, Math.atan2(e.diveX - e.x - CROW_CIRCLE, level.roadZ - e.z), 0);
}

// `enemies` maps an enemy kind to its model builder.
export function syncEntities(game, level, { place, pickable, enemies }) {
  const clock = game.clock; // the game's, so the drawn gun is where its shots start
  const p = game.player;
  for (const e of game.enemies) {
    const obj = place(e.id, () => enemies[e.kind](e, level));
    pickable.push(obj);
    if (e.kind === 'crow') {
      placeCrow(e, obj, level);
      obj.userData.tick(clock, { diving: e.diveX == null ? 0 : 1 });
      continue;
    }
    obj.position.set(e.x, 0, e.z);
    const crawler = e.kind === 'zombie' || e.kind === 'spider'; // walks in, then turns toward the player
    const walking = e.kind === 'boss' ? e.z < level.boss.standZ : crawler;
    const throwing = e.kind === 'pumpkinMonster' ? Math.max(0, 1 - e.throwTimer / 0.4) : 0;
    const windup = e.kind === 'boss' ? bossWindup(e, level.boss) : 0;
    obj.userData.tick(clock, { walk: walking ? 1 : 0.2, throwing, windup, twitch: !game.reducedMotion });
    // Face the player once on the road.
    obj.rotation.y = crawler && e.z >= level.roadZ ? Math.sign(p.x - e.x) * 0.9 : 0;
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
}
