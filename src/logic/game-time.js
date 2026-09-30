import { EPS, due, clamp, CLICK, SHAKE } from './game-shared.js';

export const timeMixin = {
  // --- time ---

  update(dt) {
    if (!this.live) return;
    this.clock += dt;
    for (const _ of this.weather.update(dt)) this.cue('thunder'); // one for each strike
    this.effects.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.groanWait = Math.max(0, this.groanWait - dt);
    this.movePlayer(dt);
    if (this.screen === 'intro') {
      if (this.press === 'intro' && !this.firing) {
        this.pressTime += dt;
        if (this.pressTime >= CLICK - EPS) this.firing = true;
      }
      this.fire(dt);
      this.timer -= dt;
      if (due(this.timer)) this.startPlay();
      return;
    }
    this.flyaways = this.flyaways.filter((f) => (f.t += dt) < this.level.enemies.crow.leave - EPS);
    if (this.winTimer != null) {
      // The boss has fallen: its burst plays out, then the victory card.
      this.winTimer -= dt;
      if (due(this.winTimer)) this.end('victory');
      return;
    }
    if (this.hint) {
      this.hintTimer -= dt;
      if (due(this.hintTimer)) this.hint = null;
    }
    this.updateWeapons(dt); // first, so a pumpkin launched this frame does not age in it
    if (this.winTimer != null) return;
    this.fire(dt);
    if (this.winTimer != null) return; // the shot that fells the boss ends the frame
    // Pumpkins and shockwaves first, so one thrown this frame does not age in it.
    for (const p of [...this.pumpkins]) {
      p.t += dt;
      if (p.t < p.flight - EPS) continue;
      this.pumpkins.splice(this.pumpkins.indexOf(p), 1);
      if (Math.abs(this.player.x - p.x) <= this.level.enemies.pumpkinMonster.splash + EPS) this.hurt(p.hearts);
      if (this.screen !== 'play') return;
    }
    for (const s of [...this.stomps]) {
      s.t -= dt;
      if (!due(s.t)) continue;
      this.stomps.splice(this.stomps.indexOf(s), 1);
      if (!this.reducedMotion) this.shake = SHAKE.time;
      if (Math.abs(this.player.x - s.x) <= this.level.boss.stompReach + EPS) this.hurt();
      if (this.screen !== 'play') return;
    }
    for (const e of [...this.enemies]) {
      if (e.kind === 'zombie') this.zombie(e, dt);
      else if (e.kind === 'pumpkinMonster') this.pumpkinMonster(e, dt);
      else if (e.kind === 'crow') this.crow(e, dt);
      else this.boss(e, dt);
      if (this.screen !== 'play') return;
    }
    this.advance(dt);
  },

  movePlayer(dt) {
    const p = this.player;
    const c = this.level.player;
    if (this.dodging) {
      p.x += p.dir * c.dodgeSpeed * dt;
      p.dodging -= dt;
      if (due(p.dodging)) {
        p.dodging = 0;
        p.cooldown = c.dodgeCooldown;
      }
    } else {
      p.cooldown = Math.max(0, p.cooldown - dt);
      if (this.move) {
        p.x += this.move * c.speed * dt;
        p.lastDir = this.move;
      }
    }
    p.x = clamp(p.x, c.minX, c.maxX);
  },
  advance(dt) {
    const { timing, waves } = this.level;
    if (this.banner) {
      this.bannerTimer -= dt;
      if (due(this.bannerTimer)) this.banner = null;
    }
    if (this.phase === 'wave') {
      this.spawnTimer -= dt;
      this.spawnDue();
      if (this.queue.length === 0 && this.enemies.length === 0) {
        this.phase = 'cleared';
        this.canisters = [];
        this.showBanner(`Wave ${this.wave} cleared`, timing.clearedBanner);
        this.timer = timing.gap;
      }
    } else if (this.phase === 'cleared') {
      this.timer -= dt;
      if (!due(this.timer)) return;
      if (this.wave < waves.length) {
        this.startWave(this.wave + 1);
      } else {
        this.phase = 'announce';
        this.cue('boss');
        this.showBanner(this.level.text.boss, timing.bossBanner);
        this.timer = timing.bossBanner;
      }
    } else if (this.phase === 'announce') {
      this.timer -= dt;
      if (due(this.timer)) this.spawnBoss();
    }
  },
};
