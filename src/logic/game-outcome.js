import { BURSTS } from './effects.js';
import { pumpkinAt, crowAt } from './game-shared.js';

export const outcome = {
  // When the boss falls, everything else on the field bursts with it, for no points, and the
  // victory card waits for the boss's burst to finish.
  fall(e) {
    this.enemies.splice(this.enemies.indexOf(e), 1);
    this.pumpkins = this.pumpkins.filter((p) => p.owner !== e.id);
    this.burst(e);
    if (e.kind === 'boss') {
      this.cue('burst', { boss: true });
      this.score += this.effects.award(this.level.boss.points, { x: e.x, y: 0, z: e.z }, 1.5);
      this.bossHealth = 0;
      this.stomps = [];
      this.hint = null;
      for (const other of this.enemies) {
        this.burst(other);
        this.cue('burst');
      }
      for (const p of this.pumpkins) this.shootDown(p, 0);
      this.enemies = [];
      this.pumpkins = [];
      this.shells = [];
      this.firing = false;
      this.stopBarrels();
      this.winTimer = BURSTS[this.level.boss.model].life;
    } else {
      this.cue('burst');
      const c = this.level.enemies[e.kind];
      this.score += this.effects.award(e.fast ? c.fast.points : c.points, this.centre(e), 0.5); // its middle is 1 up
    }
  },

  burst(e) {
    const kind = e.kind === 'boss' ? this.level.boss.model : e.fast ? 'fastZombie' : e.kind;
    const at = this.centre(e);
    this.effects.burst(kind, at, { kind: e.kind, enemyId: e.id, fast: e.fast, x: at.x, y: e.kind === 'crow' ? at.y : 0, z: at.z });
  },

  // A pumpkin shot down in the air: its points, and a small burst.
  shootDown(p, points = p.points) {
    const at = pumpkinAt(p, this.level.roadZ);
    this.score += this.effects.award(points, at, 1.5);
    this.effects.burst('pumpkin', at);
  },

  // The middle of an enemy, where it bursts: where the stage draws it.
  centre(e) {
    if (e.kind === 'crow') return crowAt(e, this.level);
    return { x: e.x, y: e.kind === 'boss' ? 3 : 1, z: e.z };
  },

  hurt(hearts = 1) {
    if (this.screen !== 'play' || this.dodging || this.winTimer != null) return false;
    this.player.hearts -= hearts;
    this.cue('hurt');
    if (this.player.hearts <= 0) {
      this.player.hearts = 0;
      this.end('defeat');
    }
    return true;
  },

  end(screen) {
    this.screen = screen;
    this.firing = false;
    this.stopBarrels();
    this.shake = 0;
    this.hint = null;
    this.cue(screen);
  },

  showBanner(text, seconds) {
    this.banner = text;
    this.bannerTimer = seconds;
  },

  // The answer of the WebMCP get_state tool.
  snapshot() {
    return {
      level: this.level.number,
      screen: this.screen,
      wave: this.wave,
      score: this.score,
      hearts: this.player.hearts,
      enemies: this.enemies.length,
      boss_health: this.bossHealth,
      weapon: this.weapon,
      ammo: this.weapon === 'popper' ? null : this.ammo[this.weapon],
      reloading: this.reloading,
    };
  },
};
