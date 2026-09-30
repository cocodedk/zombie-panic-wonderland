import { WEAPONS, ORDER, CRATE } from './weapons.js';
import { EPS, due } from './game-shared.js';

export const weaponsMixin = {
  // Crates due and floating, the launcher's pumpkins in flight, and the pickup notice.
  updateWeapons(dt) {
    if (this.notice) {
      this.noticeTimer -= dt;
      if (due(this.noticeTimer)) this.notice = null;
    }
    for (const c of this.crates) {
      c.t += dt;
      c.flash = Math.max(0, c.flash - dt);
    }
    for (const c of this.canisters) c.flash = Math.max(0, c.flash - dt);
    this.crates =this.crates.filter((c) => c.t < CRATE.stay + CRATE.leave - EPS);
    for (const d of [...this.cratesDue]) {
      d.t -= dt;
      if (!due(d.t)) continue;
      this.cratesDue.splice(this.cratesDue.indexOf(d), 1);
      this.dropCrate(d.weapon);
    }
    for (const s of [...this.shells]) {
      s.t += dt;
      if (s.t < WEAPONS.launcher.flight - EPS) continue;
      this.shells.splice(this.shells.indexOf(s), 1);
      this.explode(s.to);
      if (this.winTimer != null) return;
    }
  },
  // Each weapon keeps its own reload: held, the weapon in hand fires once its own interval has
  // passed since it last fired. The weapon in hand reloads its magazine first, and fires as soon
  // as that ends.
  fire(dt) {
    const w = this.weapon;
    if (this.reloading) {
      this.refill[w] -= dt;
      if (due(this.refill[w])) {
        this.refill[w] = 0;
        this.ammo[w] = WEAPONS[w].ammo;
        this.cue('reload');
      }
    }
    let idle = !this.firing || this.reloading;
    let left = dt; // the seconds of this frame the weapon fires in
    if (w === 'gatling') {
      left = this.spinBarrels(dt, !idle);
      idle = left == null;
    }
    for (const k of ORDER) if (k !== w || idle) this.reload[k] = Math.max(0, this.reload[k] - dt);
    if (idle) return;
    this.reload[w] -= left;
    while (due(this.reload[w]) && this.weapon === w && !this.reloading) {
      this.shoot();
      this.reload[w] += 1 / (WEAPONS[w].rate ?? this.level.player.fireRate);
      if (this.winTimer != null) return;
    }
  },

  // The Gatling's barrels for `dt` seconds. Driven (fire held, not reloading) they spin up, then fire;
  // let go, they slow to a stop. Returns the seconds of the frame they were up to speed for, or null.
  spinBarrels(dt, driven) {
    const { spinUp, spinDown, turns } = WEAPONS.gatling;
    const b = this.barrels;
    let left = null;
    if (driven) {
      if (b.mode === 'idle' || b.mode === 'down') {
        b.mode = 'up';
        b.t = 0;
        this.cue('spinup');
      }
      if (b.mode === 'up') {
        const step = Math.min(dt, spinUp - b.t);
        b.t += step;
        b.speed = Math.min(turns, b.speed + (step * turns) / spinUp);
        if (due(spinUp - b.t)) {
          b.mode = 'firing';
          left = dt - step;
        }
      } else left = dt;
    } else if (b.mode === 'up' || b.mode === 'firing') {
      b.mode = 'down';
      b.slow = b.speed / spinDown; // from wherever they were, they stop in spinDown seconds
      this.cue('spindown');
    }
    if (b.mode === 'down') {
      b.speed -= b.slow * dt;
      if (due(b.speed)) Object.assign(b, { mode: 'idle', speed: 0 });
    }
    b.angle = (b.angle + b.speed * dt) % 1;
    return left;
  },

  // The barrels stop at once, and any whine with them, with no sound of their own.
  stopBarrels() {
    const b = this.barrels;
    if (b.mode !== 'idle') this.cue('spinup', { stop: true });
    Object.assign(b, { mode: 'idle', t: 0, speed: 0 });
  },
};
