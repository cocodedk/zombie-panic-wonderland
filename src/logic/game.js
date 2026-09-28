// The rules of a level: screens, waves, enemies, damage, score, dodge and pause.
// No three.js here, so Node can test it. The stage reads this state and draws it.

const EPS = 1e-9;
const due = (t) => t <= EPS;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const CLICK = 0.25; // seconds: a shorter press is a click

export const SCREENS = ['loading', 'error', 'title', 'intro', 'play', 'paused', 'victory', 'defeat'];

export class Game {
  // `levels` is the order they are played in; `level` is the one on show.
  constructor(level, { random = Math.random, levels = [level] } = {}) {
    this.levels = levels;
    this.level = level;
    this.random = random;
    this.screen = 'loading';
    this.error = null; // 'network' or 'webgl'
    this.startScore = 0; // the score when this level began
    this.reset();
  }

  reset() {
    const { player, timing } = this.level;
    this.player = { x: 0, hearts: player.hearts, dodging: 0, cooldown: 0, dir: 1, lastDir: 1 };
    this.move = 0;
    this.aim = null;
    this.score = this.startScore;
    this.wave = 1;
    this.phase = 'intro'; // then 'wave', 'cleared', 'announce', 'boss'
    this.timer = timing.intro;
    this.queue = [];
    this.spawnTimer = 0;
    this.enemies = [];
    this.pumpkins = [];
    this.stomps = [];
    this.flyaways = []; // crows leaving after their dive; no longer enemies
    this.banner = null;
    this.bannerTimer = 0;
    this.bossHealth = null;
    this.firing = false;
    this.fireTimer = 0;
    this.shots = 0;
    this.nextId = 1;
    this.pausedFrom = null;
    this.press = null;
    this.pressTime = 0;
  }

  get live() {
    return this.screen === 'intro' || this.screen === 'play';
  }

  get dodging() {
    return this.player.dodging > EPS;
  }

  // --- the journey ---

  loaded() {
    if (this.screen === 'loading') this.screen = 'title';
  }

  fail(kind) {
    if (this.screen !== 'loading') return;
    this.screen = 'error';
    this.error = kind;
  }

  // On the intro card a click (released within CLICK seconds) skips the card and fires nothing;
  // a longer hold shoots. The press that starts the level from the title does neither.
  pointerDown() {
    if (this.screen === 'title') {
      this.begin(this.levels[0], 0);
      this.press = 'title';
    } else if (this.screen === 'intro') {
      this.press = 'intro';
      this.pressTime = 0;
    } else if (this.screen === 'play') {
      this.firing = true;
    }
  }

  pointerUp() {
    if (this.screen === 'intro' && this.press === 'intro' && !this.firing) this.startPlay();
    this.firing = false;
    this.press = null;
  }

  pressEsc() {
    if (this.live) {
      this.pausedFrom = this.screen;
      this.screen = 'paused';
    } else if (this.screen === 'paused') {
      this.screen = this.pausedFrom;
      this.pausedFrom = null;
    }
  }

  // Play again and Try again: this level from its intro card, with the score it began with.
  restart() {
    if (this.screen !== 'victory' && this.screen !== 'defeat') return;
    this.begin(this.level, this.startScore);
  }

  // The level after this one, or null.
  get next() {
    return this.levels[this.levels.indexOf(this.level) + 1] ?? null;
  }

  nextLevel() {
    if (this.screen === 'victory' && this.next) this.begin(this.next, this.score);
  }

  toTitle() {
    if (this.screen !== 'victory') return;
    this.level = this.levels[0];
    this.startScore = 0;
    this.reset();
    this.screen = 'title';
  }

  begin(level, score) {
    this.level = level;
    this.startScore = score;
    this.reset();
    this.screen = 'intro';
  }

  // --- controls ---

  setMove(dir) {
    this.move = Math.sign(dir);
  }

  setAim(id) {
    this.aim = id ?? null;
  }

  dodge() {
    const p = this.player;
    if (!this.live || this.dodging || !due(p.cooldown)) return false;
    p.dodging = this.level.player.dodgeTime;
    p.dir = this.move || p.lastDir;
    return true;
  }

  // One shot at whatever is under the crosshair.
  shoot() {
    this.shots += 1;
    const id = this.aim;
    if (id == null) return;
    const pumpkin = this.pumpkins.findIndex((p) => p.id === id);
    if (pumpkin >= 0) {
      this.score += this.pumpkins.splice(pumpkin, 1)[0].points;
      return;
    }
    const enemy = this.enemies.find((e) => e.id === id);
    if (!enemy) return;
    enemy.health -= 1;
    if (enemy.kind === 'boss') this.bossHealth = enemy.health;
    if (enemy.health <= 0) this.fall(enemy);
  }

  // --- time ---

  update(dt) {
    if (!this.live) return;
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
    this.fire(dt);
    if (this.screen !== 'play') return; // the shot that fells the boss ends the frame
    // Pumpkins and shockwaves first, so one thrown this frame does not age in it.
    for (const p of [...this.pumpkins]) {
      p.t += dt;
      if (p.t < p.flight - EPS) continue;
      this.pumpkins.splice(this.pumpkins.indexOf(p), 1);
      if (Math.abs(this.player.x - p.x) <= this.level.enemies.pumpkinMonster.splash + EPS) this.hurt(p.hearts);
      if (this.screen !== 'play') return;
    }
    this.flyaways = this.flyaways.filter((f) => (f.t += dt) < this.level.enemies.crow.leave - EPS);
    for (const s of [...this.stomps]) {
      s.t -= dt;
      if (!due(s.t)) continue;
      this.stomps.splice(this.stomps.indexOf(s), 1);
      this.hurt();
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
  }

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
  }

  fire(dt) {
    if (!this.firing) {
      this.fireTimer = Math.max(0, this.fireTimer - dt);
      return;
    }
    this.fireTimer -= dt;
    while (due(this.fireTimer)) {
      this.shoot();
      this.fireTimer += 1 / this.level.player.fireRate;
      if (!this.live) return;
    }
  }

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
        this.showBanner(this.level.text.boss, timing.bossBanner);
        this.timer = timing.bossBanner;
      }
    } else if (this.phase === 'announce') {
      this.timer -= dt;
      if (due(this.timer)) this.spawnBoss();
    }
  }

  // --- waves ---

  startPlay() {
    this.screen = 'play';
    this.startWave(1);
  }

  startWave(n) {
    this.wave = n;
    this.phase = 'wave';
    this.queue = Object.entries(this.level.waves[n - 1]).flatMap(([kind, count]) => Array(count).fill(kind));
    this.spawnTimer = 0;
    this.spawnDue();
  }

  spawnDue() {
    while (this.queue.length && due(this.spawnTimer)) {
      this.spawn(this.queue.shift());
      this.spawnTimer += this.level.timing.spacing;
    }
  }

  spawn(kind) {
    const { spawn, enemies } = this.level;
    const e = {
      id: this.nextId++,
      kind,
      x: spawn.minX + this.random() * (spawn.maxX - spawn.minX),
      z: spawn.z,
      health: enemies[kind].hits,
    };
    if (kind === 'zombie') e.strike = enemies.zombie.strikeEvery;
    if (kind === 'pumpkinMonster') e.throwTimer = enemies.pumpkinMonster.throwEvery;
    if (kind === 'crow') {
      e.z = enemies.crow.z;
      e.timer = enemies.crow.circle;
      e.diveX = null; // set when it dives
    }
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const b = this.level.boss;
    this.phase = 'boss';
    this.enemies.push({ id: this.nextId++, kind: 'boss', x: 0, z: this.level.spawn.z, health: b.hits, action: b.actionEvery, next: 0 });
    this.bossHealth = b.hits;
  }

  // --- enemies ---

  zombie(e, dt) {
    const c = this.level.enemies.zombie;
    const road = this.level.roadZ;
    if (e.z < road - EPS) {
      e.z = Math.min(road, e.z + c.speed * dt);
      return;
    }
    const dx = this.player.x - e.x;
    if (Math.abs(dx) > c.closeIn) e.x += Math.sign(dx) * Math.min(c.speed * dt, Math.abs(dx) - c.closeIn);
    if (Math.abs(this.player.x - e.x) > c.reach + EPS) {
      e.strike = c.strikeEvery;
      return;
    }
    e.strike -= dt;
    if (due(e.strike)) {
      e.strike += c.strikeEvery;
      this.hurt();
    }
  }

  pumpkinMonster(e, dt) {
    const c = this.level.enemies.pumpkinMonster;
    e.throwTimer -= dt;
    if (!due(e.throwTimer)) return;
    e.throwTimer += c.throwEvery;
    this.throwPumpkin(e, { hearts: 1, points: c.pumpkinPoints });
  }

  // A pumpkin flies from `from` to where the player stands now; the boss's burns.
  throwPumpkin(from, { hearts, points, flaming = false }) {
    const c = this.level.enemies.pumpkinMonster;
    this.pumpkins.push({ id: this.nextId++, owner: from.id, fromX: from.x, fromZ: from.z, x: this.player.x, t: 0, flight: c.flight, hearts, points, flaming });
  }

  // Circles, then dives at where the player is then, lands on the road and flies away.
  crow(e, dt) {
    const c = this.level.enemies.crow;
    e.timer -= dt;
    if (!due(e.timer)) return;
    if (e.diveX == null) {
      e.diveX = this.player.x;
      e.timer += c.dive;
      return;
    }
    this.enemies.splice(this.enemies.indexOf(e), 1);
    this.flyaways.push({ id: e.id, x: e.diveX, t: 0 });
    if (Math.abs(this.player.x - e.diveX) <= c.splash + EPS) this.hurt();
  }

  boss(e, dt) {
    const b = this.level.boss;
    if (e.z < b.standZ - EPS) {
      e.z = Math.min(b.standZ, e.z + b.speed * dt);
      return;
    }
    e.action -= dt;
    if (!due(e.action)) return;
    e.action += b.actionEvery;
    const action = b.actions[e.next];
    e.next = (e.next + 1) % b.actions.length;
    if (action === 'stomp') this.stomps.push({ id: this.nextId++, t: b.stompDelay });
    else if (action === 'throw') this.throwPumpkin(e, { ...b.flamingPumpkin, flaming: true });
    else for (let i = 0; i < b.summon; i++) this.spawn(b.summons);
  }

  fall(e) {
    this.enemies.splice(this.enemies.indexOf(e), 1);
    this.pumpkins = this.pumpkins.filter((p) => p.owner !== e.id);
    if (e.kind === 'boss') {
      this.score += this.level.boss.points;
      this.bossHealth = 0;
      this.stomps = [];
      this.end('victory');
    } else {
      this.score += this.level.enemies[e.kind].points;
    }
  }

  hurt(hearts = 1) {
    if (this.screen !== 'play' || this.dodging) return false;
    this.player.hearts -= hearts;
    if (this.player.hearts <= 0) {
      this.player.hearts = 0;
      this.end('defeat');
    }
    return true;
  }

  end(screen) {
    this.screen = screen;
    this.firing = false;
  }

  showBanner(text, seconds) {
    this.banner = text;
    this.bannerTimer = seconds;
  }

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
    };
  }
}
