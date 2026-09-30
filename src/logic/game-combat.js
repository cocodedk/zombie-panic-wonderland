import { muzzleAt, TRACER } from './effects.js';
import { WEAPONS, CRATE, NOTICE_LIFE, crateAt, crateLeaving } from './weapons.js';
import { CANISTER, canisterAt } from './canisters.js';
import { EPS, pumpkinAt } from './game-shared.js';

export const combat = {
  // One shot of the weapon in hand. The Popper and the pellets hit at once, the streaks only show
  // them; the launcher's pumpkin explodes when it lands. A weapon reloading does not fire, and an
  // empty magazine starts its reload.
  shoot() {
    const w = this.weapon;
    if (this.reloading) return;
    this.shots += 1;
    if (w !== 'popper' && --this.ammo[w] === 0) this.refill[w] = WEAPONS[w].refill;
    const from = muzzleAt(this.player.x, this.level.roadZ, { ...this.pose(), weapon: w });
    const to = this.aimPoint ?? { x: this.player.x, y: 1, z: this.level.spawn.z };
    if (w === 'popper') {
      this.cue('shot');
      this.effects.shot(from, to);
      this.hit(this.aim);
    } else if (w === 'scattergun') {
      this.cue('scatter');
      const pellets = this.pellets ?? Array(WEAPONS.scattergun.pellets).fill({ id: this.aim, point: to });
      this.effects.blast(from, pellets.map((p) => ({ to: p.point ?? to, hit: p.id != null })));
      for (const p of pellets) this.hit(p.id, WEAPONS.scattergun.hits);
    } else if (w === 'gatling') {
      const { hits, pitch } = WEAPONS.gatling;
      this.cue('gatling', { pitch: 1 + (this.random() * 2 - 1) * pitch });
      this.effects.shot(from, to, { ...TRACER, flashSize: TRACER.flashSizes[this.shots % 2] });
      this.hit(this.aim, hits);
    } else {
      this.cue('launch');
      this.shells.push({ id: this.nextId++, from, to, t: 0 });
    }
  },

  // The timers that only run down, while the game runs: the camera shake, the wait between groans, the web.
  countDown(dt) {
    this.shake = Math.max(0, this.shake - dt);
    this.groanWait = Math.max(0, this.groanWait - dt);
    const web = this.player.webbed - dt;
    this.player.webbed = web > EPS ? web : 0;
  },

  // A hit on the first thing on a shot's line: a pumpkin, a crate, a canister or an enemy, which takes `hits`.
  hit(id, hits = 1) {
    if (id == null) return;
    const pumpkin = this.pumpkins.findIndex((p) => p.id === id);
    if (pumpkin >= 0) {
      this.cue('hit');
      this.shootDown(this.pumpkins.splice(pumpkin, 1)[0]);
      return;
    }
    const crate = this.crates.find((c) => c.id === id && !crateLeaving(c));
    if (crate) return this.hitCrate(crate);
    const canister = this.canisters.find((c) => c.id === id);
    if (canister) return this.hitCanister(canister);
    const enemy = this.enemies.find((e) => e.id === id);
    if (!enemy) return;
    this.cue('hit');
    this.damage(enemy, hits);
  },

  damage(enemy, hits) {
    enemy.health -= hits;
    if (enemy.kind === 'boss') this.bossHealth = Math.max(0, enemy.health);
    if (enemy.health <= 0) this.fall(enemy);
  },

  // Every enemy, pumpkin, crate and canister within the blast of `at`: `hits`, shot down, one hit,
  // blown up. The launcher's blast, or a canister's.
  explode(at, { blast = WEAPONS.launcher.blast, hits = WEAPONS.launcher.hits, cue = 'boom', kind = 'explosion' } = {}) {
    const near = (p) => Math.hypot(p.x - at.x, p.y - at.y, p.z - at.z) <= blast + EPS;
    this.cue(cue);
    this.effects.explode(at, kind);
    for (const p of [...this.pumpkins]) {
      if (!near(pumpkinAt(p, this.level.roadZ))) continue;
      this.pumpkins.splice(this.pumpkins.indexOf(p), 1);
      this.shootDown(p);
    }
    for (const c of [...this.crates]) if (!crateLeaving(c) && near(crateAt(c))) this.hitCrate(c);
    for (const e of [...this.enemies]) if (this.enemies.includes(e) && near(this.centre(e))) this.damage(e, hits);
    for (const c of [...this.canisters]) if (this.canisters.includes(c) && near(canisterAt(c))) this.blowUp(c);
  },

  // --- gas canisters ---

  hitCanister(c) {
    this.cue('hit');
    c.hits += 1;
    c.flash = CANISTER.flash;
    if (c.hits >= CANISTER.hits) this.blowUp(c);
  },

  blowUp(c) {
    this.canisters.splice(this.canisters.indexOf(c), 1);
    this.explode(canisterAt(c), { blast: CANISTER.blast, hits: CANISTER.damage, cue: 'gas', kind: 'gas' });
  },

  // --- crates ---

  dropCrate(weapon) {
    const c = { id: this.nextId++, weapon, x: CRATE.minX + this.random() * (CRATE.maxX - CRATE.minX), t: 0, hits: 0, flash: 0 };
    this.crates.push(c);
    return c;
  },

  hitCrate(c) {
    this.cue('hit');
    c.hits += 1;
    c.flash = CRATE.flash;
    this.effects.burst('crate', crateAt(c));
    if (c.hits < CRATE.hits) return;
    this.crates.splice(this.crates.indexOf(c), 1);
    this.owned[c.weapon] = true;
    this.ammo[c.weapon] = WEAPONS[c.weapon].ammo;
    this.refill[c.weapon] = 0;
    this.take(c.weapon);
    this.cue('pickup');
    this.notice = WEAPONS[c.weapon].notice;
    this.noticeTimer = NOTICE_LIFE;
  },
};
