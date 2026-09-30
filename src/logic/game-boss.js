import { isFlyer } from './game-shared.js';

export const bossActions = {
  // The boss's summon: `b.summon` of `b.summons` near its x, `b.summonBack` behind its z; flyers come out from it.
  summon(e, b) {
    for (let i = 0; i < b.summon; i++) {
      const s = this.spawn(b.summons);
      s.x = e.x + (this.random() * 2 - 1) * b.summonNear;
      s.z = e.z - b.summonBack;
      if (isFlyer(s)) s.from = { x: s.x, y: this.centre(e).y, z: s.z };
    }
  },
};
