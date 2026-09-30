import { WEAPONS, ORDER } from './weapons.js';
import { due } from './game-shared.js';

export const journey = {
  // --- the journey ---

  loaded() {
    if (this.screen === 'loading') this.screen = 'title';
  },

  fail(kind) {
    if (this.screen !== 'loading') return;
    this.screen = 'error';
    this.error = kind;
  },

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
  },

  pointerUp() {
    if (this.screen === 'intro' && this.press === 'intro' && !this.firing) this.startPlay();
    this.firing = false;
    this.press = null;
  },

  pressEsc() {
    if (this.live) {
      this.pausedFrom = this.screen;
      this.screen = 'paused';
    } else if (this.screen === 'paused') {
      this.screen = this.pausedFrom;
      this.pausedFrom = null;
    }
  },

  // Play again and Try again: this level from its intro card, with the score it began with.
  restart() {
    if (this.screen !== 'victory' && this.screen !== 'defeat') return;
    this.begin(this.level, this.startScore);
  },

  // The level after this one, or null.
  get next() {
    return this.levels[this.levels.indexOf(this.level) + 1] ?? null;
  },

  nextLevel() {
    if (this.screen === 'victory' && this.next) this.begin(this.next, this.score);
  },

  toTitle() {
    if (this.screen !== 'victory') return;
    this.level = this.levels[0];
    this.startScore = 0;
    this.reset();
    this.screen = 'title';
  },
  startAt(index) { if (this.screen === 'title' && Number.isInteger(index) && this.levels[index]) this.begin(this.levels[index], 0); }, // a level's button on the title

  begin(level, score) {
    this.level = level;
    this.startScore = score;
    this.reset();
    this.screen = 'intro';
  },

  // --- controls ---

  setMove(dir) {
    this.move = Math.sign(dir);
  },

  // `point` is where the crosshair's ray lands: on the thing aimed at, or the ground or backdrop.
  // `pellets` is the same for each scattergun pellet's line; without it they all follow the crosshair.
  setAim(id, point = null, pellets = null) {
    this.aim = id ?? null;
    this.aimPoint = point;
    this.pellets = pellets;
  },

  // Keys 1 to 4: an owned weapon, at once.
  selectWeapon(weapon) {
    if (!this.live || !this.owns(weapon)) return false;
    this.take(weapon);
    return true;
  },

  // Into the hand: the reload and the spinning of the weapon put away stop, and an empty one starts its own.
  take(weapon) {
    if (weapon === this.weapon) return;
    if (this.weapon !== 'popper') this.refill[this.weapon] = 0;
    this.stopBarrels();
    this.weapon = weapon;
    if (weapon !== 'popper' && this.ammo[weapon] === 0) this.refill[weapon] = WEAPONS[weapon].refill;
  },

  // R: reloads the weapon in hand early, where shooting works.
  reloadMagazine() {
    const w = this.weapon;
    if (!this.live || this.winTimer != null || w === 'popper' || this.reloading || this.ammo[w] >= WEAPONS[w].ammo) return false;
    this.refill[w] = WEAPONS[w].refill;
    return true;
  },

  // The wheel: the next or previous owned weapon, wrapping around.
  cycleWeapon(step) {
    const owned = ORDER.filter((w) => this.owns(w));
    const i = owned.indexOf(this.weapon);
    return this.selectWeapon(owned[(i + Math.sign(step) + owned.length) % owned.length]);
  },

  dodge() {
    const p = this.player;
    if (!this.live || this.dodging || p.webbed > 0 || !due(p.cooldown)) return false;
    p.dodging = this.level.player.dodgeTime;
    p.dir = this.move || p.lastDir;
    this.cue('dodge');
    return true;
  },
};
