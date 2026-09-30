// The rules of a level: screens, waves, enemies, damage, score, dodge and pause.
// No three.js here, so Node can test it. The stage reads this state and draws it; what happened
// is also recorded as sound cues (`cues`) and effects (`effects`), for the audio module and the stage.

import { Effects } from './effects.js';
import { Weather, ownRandom } from './weather.js';
import { EPS } from './game-shared.js';
import { journey } from './game-journey.js';
import { combat } from './game-combat.js';
import { weaponsMixin } from './game-weapons.js';
import { timeMixin } from './game-time.js';
import { waves } from './game-waves.js';
import { enemies } from './game-enemies.js';
import { outcome } from './game-outcome.js';

export { SCREENS, pumpkinAt, CROW_CIRCLE, crowAt, bossWindup, SHAKE, GROAN, HINT } from './game-shared.js';

export class Game {
  // `levels` is the order they are played in; `level` is the one on show.
  constructor(level, { random = Math.random, levels = [level], reducedMotion = false, weatherRandom = ownRandom() } = {}) {
    this.levels = levels;
    this.level = level;
    this.random = random;
    this.weatherRandom = weatherRandom; // the weather's own stream: it never reads `random`
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
    this.sent = 0; // zombies the wave has sent so far, for its fast ones
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
    this.owned = { scattergun: false, launcher: false, gatling: false }; // from its crate until a reset
    this.ammo = { scattergun: 0, launcher: 0, gatling: 0 }; // rounds left in each magazine
    this.reload = { popper: 0, scattergun: 0, launcher: 0, gatling: 0 }; // seconds until each may fire again
    this.refill = { scattergun: 0, launcher: 0, gatling: 0 }; // seconds until each magazine is reloaded, 0 when not reloading
    // The Gatling's barrels: 'idle', 'up' (spinning up, `t` seconds in), 'firing' or 'down' (slowing, losing
    // `slow` turns a second of speed each second); `speed` in turns a second and `angle` in turns.
    this.barrels = { mode: 'idle', t: 0, speed: 0, slow: 0, angle: 0 };
    this.pellets = null; // [{ id, point }] on each scattergun pellet's line, from the stage
    this.cratesDue = []; // { weapon, t }: crates still to appear, in t seconds
    this.crates = []; // { id, weapon, x, t, hits, flash }
    this.shells = []; // the launcher's pumpkins in flight: { id, from, to, t }
    this.canisters = []; // { id, x, z, hits, flash }: standing until their wave is cleared
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
    this.weather = new Weather(this.level.weather, this.weatherRandom, this.reducedMotion);
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
    return { t: this.clock, walk: this.live && this.move ? 1 : 0, roll, dir: p.dir, weapon: this.weapon, spin: this.barrels.angle };
  }

  owns(weapon) {
    return weapon === 'popper' || this.owned[weapon];
  }

  // Whether the weapon in hand is reloading its magazine.
  get reloading() {
    return this.refill[this.weapon] > EPS;
  }
}

// The rest of the class lives in the game-*.js files, as plain objects of methods and getters.
for (const mixin of [journey, combat, weaponsMixin, timeMixin, waves, enemies, outcome]) {
  Object.defineProperties(Game.prototype, Object.getOwnPropertyDescriptors(mixin));
}
