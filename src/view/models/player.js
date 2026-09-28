// The hero: a small figure in a red hood and cape with a stubby gun, facing -z (away from the camera).

import * as THREE from 'three';
import { flat, part, group } from './parts.js';

export function buildPlayer({
  hood = '#b3202a',
  cape = '#8e1720',
  skin = '#e9b99a',
  tunic = '#5b4632',
  boots = '#2e2420',
  gun = '#3b3b44',
  size = 1,
} = {}) {
  const root = group();
  const body = group(); // pivots at the waist, so a dodge rolls around the middle
  root.add(body);

  const legGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.45, 5);
  const legs = [-0.12, 0.12].map((x) => part(legGeo, boots, [x, 0.22, 0]));
  body.add(...legs);
  body.add(part(new THREE.CylinderGeometry(0.2, 0.32, 0.55, 6), tunic, [0, 0.7, 0]));
  body.add(part(new THREE.TorusGeometry(0.29, 0.035, 3, 8), '#2a1f18', [0, 0.5, 0], [Math.PI / 2, 0, 0]));

  const capeMat = flat(cape, { side: THREE.DoubleSide });
  body.add(part(new THREE.ConeGeometry(0.42, 0.85, 7, 1, true), capeMat, [0, 0.68, 0.08]));
  body.children.at(-1).scale.z = 0.7;

  body.add(part(new THREE.IcosahedronGeometry(0.19, 0), skin, [0, 1.12, -0.06]));
  body.add(part(new THREE.IcosahedronGeometry(0.25, 0), hood, [0, 1.15, 0.04]));
  body.add(part(new THREE.ConeGeometry(0.12, 0.34, 5), hood, [0, 1.18, 0.28], [Math.PI / 2 + 0.4, 0, 0]));

  // Arms reach forward to the gun, held in both hands.
  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.42, 5);
  body.add(part(armGeo, hood, [0.2, 0.86, -0.16], [-Math.PI / 2 + 0.2, 0, -0.3]));
  body.add(part(armGeo, hood, [-0.08, 0.86, -0.18], [-Math.PI / 2 + 0.2, 0, 0.5]));
  const gunGroup = group(
    part(new THREE.BoxGeometry(0.12, 0.14, 0.26), gun, [0, 0, 0]),
    part(new THREE.CylinderGeometry(0.045, 0.05, 0.2, 6), gun, [0, 0.02, -0.2], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.07, 0.14, 0.08), '#5a3a22', [0, -0.1, 0.06], [0.3, 0, 0]),
  );
  gunGroup.position.set(0.1, 0.88, -0.42);
  body.add(gunGroup);

  const flash = part(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: '#ffe38a' }), [0, 0.02, -0.34]);
  flash.visible = false;
  gunGroup.add(flash);

  for (const c of body.children) c.position.y -= 0.6;
  body.position.y = 0.6;
  root.scale.setScalar(size);

  root.userData = {
    body,
    flash,
    // walk: how fast it walks (0 standing), roll: 0..1 through a dodge, dir: which way it rolls.
    tick(t, { walk = 0, roll = 0, dir = 1 } = {}) {
      const swing = walk ? Math.sin(t * 12) * 0.5 : 0;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      body.position.y = 0.6 + (walk ? Math.abs(Math.sin(t * 12)) * 0.05 : 0) + (roll ? Math.sin(roll * Math.PI) * 0.25 : 0);
      body.rotation.z = -dir * roll * Math.PI * 2;
    },
  };
  return root;
}
