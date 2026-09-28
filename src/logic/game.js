// The rules of a level: screens, waves, enemies, damage, score, dodge and pause.
// No three.js here, so Node can test it. The stage reads this state and draws it; what happened
// is also recorded as sound cues (`cues`) and effects (`effects`), for the audio module and the stage.

import { Effects, BURSTS, muzzleAt } from './effects.js';
import { WEAPONS, ORDER, CRATES, CRATE, NOTICE_LIFE, crateAt, crateLeaving } from './weapons.js';

const EPS = 1e-9;
const due = (t) => t <= EPS;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const CLICK = 0.25; // seconds: a shorter press is a click

export const SCREENS = ['loading', 'error', 'title', 'intro', 'play', 'paused', 'victory', 'defeat'];

// Where a pumpkin is in its flight: thrown from its owner, arcing down to the road.
export function pumpkinAt(p, roadZ) {
  const f = Math.min(1, p.t / p.flight);
  return { x: p.fromX + (p.x - p.fromX) * f, y: 2.4 * (1 - f) + 0.25 + Math.sin(f * Math.PI) * 4, z: p.fromZ + (roadZ - p.fromZ) * f };
}

export const CROW_CIRCLE = 1.5; // the radius a crow circles at

// Where a crow is: flying in from the backdrop, or out from the boss that summoned it, and
// circling, then diving at the road.
export function crowAt(e, level) {
  const c = level.enemies.crow;
  if (e.diveX == null) {
    const t = c.circle - e.timer;
    const a = t * (Math.PI * 2) / c.circle;
    const arrive = Math.min(1, t / 0.6);
    const from = e.from ?? { x: e.x, y: c.height + 3, z: level.spawn.z - 8 };
    const at = { x: e.x + Math.cos(a) * CROW_CIRCLE, y: c.height, z: e.z + Math.sin(a) * CROW_CIRCLE };
    return { x: from.x + (at.x - from.x) * arrive, y: from.y + (at.y - from.y) * arrive, z: from.z + (at.z - from.z) * arrive };
  }
  const f = 1 - e.timer / c.dive;
  const x = e.x + CROW_CIRCLE;
  return { x: x + (e.diveX - x) * f, y: c.height + (0.5 - c.height) * f, z: e.z + (level.roadZ - e.z) * f };
}

// How far the boss has wound up for its next action: 0 at rest, 1 as the action comes.
export function bossWindup(e, boss) {
  return e.windup ? clamp(1 - e.action / boss.windup, 0, 1) : 0;
}

// The camera shakes when a stomp's shockwave reaches the road, fading over `time` seconds.
export const SHAKE = { time: 0.25, size: 0.15 };

export const GROAN = 1.5; // seconds: the least time between two zombies' groans

// Shown once per boss fight, at its first wind-up, for `life` seconds.
export const HINT = { text: 'Space: dodge — or step aside!', life: 2 };

export class Game {
  // `levels` is the order they are played in; `level` is the one on show.
  constructor(level, { random = Math.random, levels = [level], reducedMotion = false } = {}) {
    this.levels = levels;
    this.level = level;
    this.random = random;
    this.reducedMotion = reducedMotion;
    this.screen = 'loading';
    this.error = null; // 'network' or 'webgl'
    this.startScore = 0; // the score when this level began
    this.soundOn = true; // M flips it; it lasts until the page is closed
    this.cues = []; // { name } for each sound due, taken by the audio module
    this.clock = 0; // seconds the game has run, for the stage's animations
    this.reset();
  }

  reset() {
    const { player, timing } = this.level;
    this.player = { x: 0, hearts: player.hearts, dodging: 0, cooldown: 0, dir: 1, lastDir: 1 };
    this.move = 0;
    this.aim = null;
    this.aimPoint = null; // where the crosshair's ray lands, for the bullet's streak
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
    this.shake = 0; // seconds of camera shake left
    this.groanWait = 0; // seconds until a zombie may groan again
    this.banner = null;
    this.bannerTimer = 0;
    this.bossHealth = null;
    this.firing = false;
    this.shots = 0;
    this.weapon = 'popper'; // in hand
    this.ammo = { scattergun: 0, launcher: 0 }; // a weapon is owned while it has ammo
    this.reload = { popper: 0, scattergun: 0, launcher: 0 }; // seconds until each may fire again
    this.pellets = null; // [{ id, point }] on each scattergun pellet's line, from the stage
    this.cratesDue = []; // { weapon, t }: crates still to appear, in t seconds
    this.crates = []; // { id, weapon, x, t, hits, flash }
    this.shells = []; // the launcher's pumpkins in flight: { id, from, to, t }
    this.notice = null; // the pickup notice
    this.noticeTimer = 0;
    this.hint = null; // the boss fight's hint, on its own line below the notice
    this.hintTimer = 0;
    this.hinted = false; // shown in this boss fight
    this.nextId = 1;
    this.pausedFrom = null;
    this.press = null;
    this.pressTime = 0;
    this.winTimer = null; // after the boss falls, the seconds until the victory card
    this.effects = new Effects({ random: this.random, reducedMotion: this.reducedMotion });
  }

  cue(name, extra = {}) {
    this.cues.push({ name, ...extra });
  }

  toggleSound() {
    this.soundOn = !this.soundOn;
  }

  get live() {
    return this.screen === 'intro' || this.screen === 'play';
  }

  get dodging() {
    return this.player.dodging > EPS;
  }

  // How the player is drawn now: walking, and how far through a dodge (see bodyPose).
  pose() {
    const p = this.player;
    const roll = this.dodging ? 1 - p.dodging / this.level.player.dodgeTime : 0;
    return { t: this.clock, walk: this.live && this.move ? 1 : 0, roll, dir: p.dir, weapon: this.weapon };
  }

  owns(weapon) {
    return weapon === 'popper' || this.ammo[weapon] > 0;
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

  // `point` is where the crosshair's ray lands: on the thing aimed at, or the ground or backdrop.
  // `pellets` is the same for each scattergun pellet's line; without it they all follow the crosshair.
  setAim(id, point = null, pellets = null) {
    this.aim = id ?? null;
    this.aimPoint = point;
    this.pellets = pellets;
  }

  // Keys 1 to 3: an owned weapon, at once.
  selectWeapon(weapon) {
    if (!this.live || !this.owns(weapon)) return false;
    this.weapon = weapon;
    return true;
  }

  // The wheel: the next or previous owned weapon, wrapping around.
  cycleWeapon(step) {
    const owned = ORDER.filter((w) => this.owns(w));
    const i = owned.indexOf(this.weapon);
    return this.selectWeapon(owned[(i + Math.sign(step) + owned.length) % owned.length]);
  }

  dodge() {
    const p = this.player;
    if (!this.live || this.dodging || !due(p.cooldown)) return false;
    p.dodging = this.level.player.dodgeTime;
    p.dir = this.move || p.lastDir;
    this.cue('dodge');
    return true;
  }

  // One shot of the weapon in hand. The Popper and the pellets hit at once, the streaks only show
  // them; the launcher's pumpkin explodes when it lands. A weapon run empty gives way to the Popper.
  shoot() {
    const w = this.weapon;
    this.shots += 1;
    if (w !== 'popper' && --this.ammo[w] <= 0) {
      this.ammo[w] = 0;
      this.weapon = 'popper';
      this.cue('click');
    }
    const from = muzzleAt(this.player.x, this.level.roadZ, { ...this.pose(), weapon: w });
    const to = this.aimPoint ?? { x: this.player.x, y: 1, z: this.level.spawn.z };
    if (w === 'popper') {
      this.cue('shot');
      this.effects.shot(from, to);
      this.hit(this.aim);
    } else if (w === 'scattergun') {
      this.cue('scatter');
      const pellets = this.pellets ?? Array(WEAPONS.scattergun.pellets).fill({ id: this.aim, point: to });
      this.effects.blast(from, pellets.map((p) => p.point ?? to));
      for (const p of pellets) this.hit(p.id);
    } else {
      this.cue('launch');
      this.shells.push({ id: this.nextId++, from, to, t: 0 });
    }
  }

  // A hit on the first thing on a shot's line: a pumpkin, a crate or an enemy.
  hit(id) {
    if (id == null) return;
    const pumpkin = this.pumpkins.findIndex((p) => p.id === id);
    if (pumpkin >= 0) {
      this.cue('hit');
      this.shootDown(this.pumpkins.splice(pumpkin, 1)[0]);
      return;
    }
    const crate = this.crates.find((c) => c.id === id && !crateLeaving(c));
    if (crate) return this.hitCrate(crate);
    const enemy = this.enemies.find((e) => e.id === id);
    if (!enemy) return;
    this.cue('hit');
    this.damage(enemy, 1);
  }

  damage(enemy, hits) {
    enemy.health -= hits;
    if (enemy.kind === 'boss') this.bossHealth = Math.max(0, enemy.health);
    if (enemy.health <= 0) this.fall(enemy);
  }

  // Every enemy, pumpkin and crate within the blast of `at`: 8 hits, shot down, one hit.
  explode(at) {
    const { blast, hits } = WEAPONS.launcher;
    const near = (p) => Math.hypot(p.x - at.x, p.y - at.y, p.z - at.z) <= blast + EPS;
    this.cue('boom');
    this.effects.explode(at);
    for (const p of [...this.pumpkins]) {
      if (!near(pumpkinAt(p, this.level.roadZ))) continue;
      this.pumpkins.splice(this.pumpkins.indexOf(p), 1);
      this.shootDown(p);
    }
    for (const c of [...this.crates]) if (!crateLeaving(c) && near(crateAt(c))) this.hitCrate(c);
    for (const e of [...this.enemies]) if (this.enemies.includes(e) && near(this.centre(e))) this.damage(e, hits);
  }

  // --- crates ---

  dropCrate(weapon) {
    const c = { id: this.nextId++, weapon, x: CRATE.minX + this.random() * (CRATE.maxX - CRATE.minX), t: 0, hits: 0, flash: 0 };
    this.crates.push(c);
    return c;
  }

  hitCrate(c) {
    this.cue('hit');
    c.hits += 1;
    c.flash = CRATE.flash;
    this.effects.burst('crate', crateAt(c));
    if (c.hits < CRATE.hits) return;
    this.crates.splice(this.crates.indexOf(c), 1);
    this.ammo[c.weapon] = WEAPONS[c.weapon].ammo;
    this.weapon = c.weapon;
    this.cue('pickup');
    this.notice = WEAPONS[c.weapon].notice;
    this.noticeTimer = NOTICE_LIFE;
  }

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
    this.crates = this.crates.filter((c) => c.t < CRATE.stay + CRATE.leave - EPS);
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
  }

  // --- time ---

  update(dt) {
    if (!this.live) return;
    this.clock += dt;
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

  // Each weapon keeps its own reload: held, the weapon in hand fires once its own interval has
  // passed since it last fired.
  fire(dt) {
    const w = this.weapon;
    for (const k of ORDER) if (k !== w || !this.firing) this.reload[k] = Math.max(0, this.reload[k] - dt);
    if (!this.firing) return;
    this.reload[w] -= dt;
    while (due(this.reload[w]) && this.weapon === w) {
      this.shoot();
      this.reload[w] += 1 / (WEAPONS[w].rate ?? this.level.player.fireRate);
      if (this.winTimer != null) return;
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
        this.cue('boss');
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
    for (const c of CRATES) if (c.wave === n) this.cratesDue.push({ weapon: c.weapon, t: c.delay });
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
    this.enemies.push({ id: this.nextId++, kind: 'boss', x: 0, z: this.level.spawn.z, health: b.hits, action: b.firstAction, windup: false, next: 0 });
    this.bossHealth = b.hits;
  }

  // --- enemies ---

  zombie(e, dt) {
    const c = this.level.enemies.zombie;
    const road = this.level.roadZ;
    if (e.z < road - EPS) {
      e.z = Math.min(road, e.z + c.speed * dt);
      if (e.z >= road - EPS) this.groan();
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

  // A zombie reaching the road groans, at most once every GROAN seconds across all zombies.
  groan() {
    if (this.groanWait > EPS) return;
    this.groanWait = GROAN;
    this.cue('groan');
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
    this.cue('throw');
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
      this.cue('caw');
      return;
    }
    this.enemies.splice(this.enemies.indexOf(e), 1);
    this.flyaways.push({ id: e.id, x: e.diveX, t: 0 });
    if (Math.abs(this.player.x - e.diveX) <= c.splash + EPS) this.hurt();
  }

  // Walks to where it stands; its actions come on their own clock, walking or standing, each
  // after a wind-up.
  boss(e, dt) {
    const b = this.level.boss;
    if (e.z < b.standZ - EPS) e.z = Math.min(b.standZ, e.z + b.speed * dt);
    e.action -= dt;
    if (!e.windup && e.action <= b.windup + EPS) {
      e.windup = true;
      this.cue('windup');
      if (!this.hinted) {
        this.hinted = true;
        this.hint = HINT.text;
        this.hintTimer = HINT.life;
      }
    }
    if (!due(e.action)) return;
    e.action += b.actionEvery;
    e.windup = false;
    const action = b.actions[e.next];
    e.next = (e.next + 1) % b.actions.length;
    if (action === 'stomp') {
      this.cue('stomp');
      this.stomps.push({ id: this.nextId++, t: b.stompDelay, x: e.x });
    } else if (action === 'throw') {
      this.throwPumpkin(e, { ...b.flamingPumpkin, flaming: true });
    } else {
      for (let i = 0; i < b.summon; i++) {
        const s = this.spawn(b.summons);
        s.x = e.x + (this.random() * 2 - 1) * b.summonNear;
        s.z = e.z - b.summonBack;
        if (s.kind === 'crow') s.from = { x: s.x, y: this.centre(e).y, z: s.z };
      }
    }
  }

  // When the boss falls, everything else on the field bursts with it, for no points, and the
  // victory card waits for the boss's burst to finish.
  fall(e) {
    this.enemies.splice(this.enemies.indexOf(e), 1);
    this.pumpkins = this.pumpkins.filter((p) => p.owner !== e.id);
    this.burst(e);
    if (e.kind === 'boss') {
      this.cue('burst', { boss: true });
      this.score += this.level.boss.points;
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
      this.winTimer = BURSTS[this.level.boss.model].life;
    } else {
      this.cue('burst');
      this.score += this.level.enemies[e.kind].points;
    }
  }

  burst(e) {
    const kind = e.kind === 'boss' ? this.level.boss.model : e.kind;
    const at = this.centre(e);
    this.effects.burst(kind, at, { kind: e.kind, x: at.x, y: e.kind === 'crow' ? at.y : 0, z: at.z });
  }

  // A pumpkin shot down in the air: its points, and a small burst.
  shootDown(p, points = p.points) {
    this.score += points;
    this.effects.burst('pumpkin', pumpkinAt(p, this.level.roadZ));
  }

  // The middle of an enemy, where it bursts: where the stage draws it.
  centre(e) {
    if (e.kind === 'crow') return crowAt(e, this.level);
    return { x: e.x, y: e.kind === 'boss' ? 3 : 1, z: e.z };
  }

  hurt(hearts = 1) {
    if (this.screen !== 'play' || this.dodging || this.winTimer != null) return false;
    this.player.hearts -= hearts;
    this.cue('hurt');
    if (this.player.hearts <= 0) {
      this.player.hearts = 0;
      this.end('defeat');
    }
    return true;
  }

  end(screen) {
    this.screen = screen;
    this.firing = false;
    this.shake = 0;
    this.hint = null;
    this.cue(screen);
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
      weapon: this.weapon,
      ammo: this.weapon === 'popper' ? null : this.ammo[this.weapon],
    };
  }
}
