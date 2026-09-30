import { stepZombie } from './fences.js';
import { EPS, due, GROAN, HINT } from './game-shared.js';

export const enemies = {
  // --- enemies ---

  // Zombies and spiders: to the road, then in on the player, striking. Only a zombie is held by
  // fences, is ever fast, or groans; a spider crawls straight to the road on its own numbers.
  walker(e, dt) {
    const zombie = e.kind === 'zombie';
    const c = this.level.enemies[e.kind];
    const road = this.level.roadZ;
    const speed = zombie ? this.speedOf(e) : c.speed;
    if (e.z < road - EPS) {
      if (zombie) stepZombie(e, this.level, speed, dt); // led to a gap in the fences, then straight to the road
      else e.z = Math.min(road, e.z + speed * dt);
      if (zombie && e.z >= road - EPS) this.groan();
      return;
    }
    const dx = this.player.x - e.x;
    if (Math.abs(dx) > c.closeIn) e.x += Math.sign(dx) * Math.min(speed * dt, Math.abs(dx) - c.closeIn);
    if (Math.abs(this.player.x - e.x) > c.reach + EPS) {
      e.strike = c.strikeEvery;
      return;
    }
    e.strike -= dt;
    if (due(e.strike)) {
      e.strike += c.strikeEvery;
      this.hurt();
    }
  },

  // A zombie reaching the road groans, at most once every GROAN seconds across all zombies.
  groan() {
    if (this.groanWait > EPS) return;
    this.groanWait = GROAN;
    this.cue('groan');
  },

  pumpkinMonster(e, dt) {
    const c = this.level.enemies.pumpkinMonster;
    e.throwTimer -= dt;
    if (!due(e.throwTimer)) return;
    e.throwTimer += c.throwEvery;
    this.throwPumpkin(e, { hearts: 1, points: c.pumpkinPoints });
  },

  // A pumpkin flies from `from` to where the player stands now; the boss's burns.
  throwPumpkin(from, { hearts, points, flaming = false }) {
    const c = this.level.enemies.pumpkinMonster;
    this.cue('throw');
    this.pumpkins.push({ id: this.nextId++, owner: from.id, fromX: from.x, fromZ: from.z, x: this.player.x, t: 0, flight: c.flight, hearts, points, flaming });
  },

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
  },

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
  },
};
