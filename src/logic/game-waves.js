import { CRATES } from './weapons.js';
import { CANISTER, placeCanisters } from './canisters.js';
import { due, isFlyer } from './game-shared.js';

export const waves = {
  // --- waves ---

  startPlay() {
    this.screen = 'play';
    this.startWave(1);
  },

  startWave(n) {
    this.wave = n;
    this.phase = 'wave';
    this.queue = Object.entries(this.level.waves[n - 1]).flatMap(([kind, count]) => Array(count).fill(kind));
    this.spawnTimer = 0;
    this.sent = 0;
    this.sentSpiders = 0;
    this.spawnDue();
    for (const c of CRATES) if (c.wave === n) this.cratesDue.push({ weapon: c.weapon, t: c.delay });
    if (CANISTER.waves.includes(n)) for (const at of placeCanisters(this.random)) this.canisters.push({ id: this.nextId++, ...at, hits: 0, flash: 0 });
  },

  spawnDue() {
    while (this.queue.length && due(this.spawnTimer)) {
      const e = this.spawn(this.queue.shift());
      if (e.kind === 'zombie') this.markFast(e);
      else if (e.kind === 'spider') this.markDropper(e);
      this.spawnTimer += this.level.timing.spacing;
    }
  },

  // A fixed rule, never chance: from `fromWave` on, every `every`th zombie the wave sends is fast.
  markFast(e) {
    const rule = this.level.enemies.zombie.fast;
    this.sent += 1;
    if (rule && this.wave >= rule.fromWave && this.sent % rule.every === 0) e.fast = true;
  },

  // A fixed rule, never chance: from `fromWave`, every `every`th spider a wave sends hangs at z `at`, its `drop` seconds to lower.
  markDropper(e) {
    const rule = this.level.enemies.spider.drop;
    this.sentSpiders += 1;
    if (!rule || this.wave < rule.fromWave || this.sentSpiders % rule.every !== 0) return;
    e.drop = rule.time;
    e.z = rule.at;
  },

  // A zombie's speed: its own, `speedFactor` times the level's when it is fast.
  speedOf(e) {
    const c = this.level.enemies.zombie;
    return e.fast ? c.speed * c.fast.speedFactor : c.speed;
  },

  spawn(kind) {
    const { spawn, enemies } = this.level;
    const e = {
      id: this.nextId++,
      kind,
      x: spawn.minX + this.random() * (spawn.maxX - spawn.minX),
      z: spawn.z,
      health: enemies[kind].hits,
    };
    if (kind === 'zombie' || kind === 'spider' || kind === 'wolf') e.strike = enemies[kind].strikeEvery;
    if (kind === 'pumpkinMonster') e.throwTimer = enemies.pumpkinMonster.throwEvery;
    if (isFlyer(e)) {
      e.z = enemies[kind].z;
      e.timer = enemies[kind].circle;
      e.diveX = null; // set when it dives
    }
    this.enemies.push(e);
    return e;
  },

  spawnBoss() {
    const b = this.level.boss;
    this.phase = 'boss';
    this.enemies.push({ id: this.nextId++, kind: 'boss', x: 0, z: this.level.spawn.z, health: b.hits, action: b.firstAction, windup: false, next: 0 });
    this.bossHealth = b.hits;
  },
};
