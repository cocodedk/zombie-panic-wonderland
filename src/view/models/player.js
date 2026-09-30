// The hero: a small figure in a red hood and cape with the gun in hand, facing -z (away from the camera).

import * as THREE from 'three';
import { flat, part, group } from './parts.js';
import { bodyPose, MUZZLES, MUZZLE, PIVOT, WAIST } from '../../logic/effects.js';

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

  // The aim rig: the arms, the guns and the flash turn together about the shoulder, yaw then pitch.
  // Its children are placed from the pivot (`at` takes a place in the body before its waist shift).
  const rig = group();
  rig.rotation.order = 'YXZ';
  rig.position.set(PIVOT.x, PIVOT.y + WAIST, PIVOT.z);
  body.add(rig);
  const at = ([x, y, z]) => [x - PIVOT.x, y - PIVOT.y - WAIST, z - PIVOT.z];

  // Arms reach forward to the gun, held in both hands.
  const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.42, 5);
  rig.add(part(armGeo, hood, at([0.2, 0.86, -0.16]), [-Math.PI / 2 + 0.2, 0, -0.3]));
  rig.add(part(armGeo, hood, at([-0.08, 0.86, -0.18]), [-Math.PI / 2 + 0.2, 0, 0.5]));
  // One gun per weapon; only the one in hand shows. Each muzzle is at MUZZLES in the body.
  const grip = () => part(new THREE.BoxGeometry(0.07, 0.14, 0.08), '#5a3a22', [0, -0.1, 0.06], [0.3, 0, 0]);
  const barrel = (r, length, x, z) => part(new THREE.CylinderGeometry(r, r, length, 6), gun, [x, 0.02, z], [Math.PI / 2, 0, 0]);
  // The Gatling: six barrels in a ring on a spinner that turns about the gun's axis, a brass band
  // around them and an ammunition box under them.
  const gatlingMetal = '#3a3a3a';
  const barrelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.6, 6);
  const spinner = group(...Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return part(barrelGeo, gatlingMetal, [Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0], [Math.PI / 2, 0, 0]);
  }));
  spinner.position.set(0, 0.02, -0.36);
  const gatling = group(
    part(new THREE.BoxGeometry(0.2, 0.2, 0.14), gatlingMetal, [0, 0.02, 0]),
    spinner,
    part(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 8), '#b8860b', [0, 0.02, -0.5], [Math.PI / 2, 0, 0]),
    part(new THREE.BoxGeometry(0.16, 0.14, 0.2), gatlingMetal, [0, -0.13, -0.05]),
    grip(),
  );
  const guns = {
    popper: group(part(new THREE.BoxGeometry(0.12, 0.14, 0.26), gun), barrel(0.045, 0.2, 0, -0.2), grip()),
    scattergun: group(part(new THREE.BoxGeometry(0.16, 0.14, 0.26), gun), barrel(0.035, 0.38, -0.038, -0.31), barrel(0.035, 0.38, 0.038, -0.31), grip()),
    launcher: group(
      barrel(0.09, 0.56, 0, -0.18),
      part(new THREE.TorusGeometry(0.09, 0.028, 4, 10), '#e07b24', [0, 0.02, -0.46]),
      grip(),
    ),
    gatling,
  };
  const gunGroup = group(...Object.values(guns));
  gunGroup.position.set(...at([0.1, 0.88, -0.42]));
  rig.add(gunGroup);

  const flash = part(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: '#ffe38a' }), [MUZZLE.x - PIVOT.x, MUZZLE.y - PIVOT.y, 0]);
  flash.visible = false;
  rig.add(flash);

  for (const c of body.children) c.position.y -= 0.6;
  body.position.y = 0.6;
  root.scale.setScalar(size);

  root.userData = {
    body,
    rig,
    flash,
    guns,
    spinner,
    // walk: how fast it walks (0 standing), roll: 0..1 through a dodge, dir: which way it rolls,
    // weapon: the gun in hand, with the flash at its muzzle, spin: the Gatling's barrels, in turns,
    // yaw and pitch: how far the aim rig turns the arms and gun, in radians.
    tick(t, { walk = 0, roll = 0, dir = 1, weapon = 'popper', spin = 0, yaw = 0, pitch = 0 } = {}) {
      for (const [w, g] of Object.entries(guns)) g.visible = w === weapon;
      spinner.rotation.z = spin * Math.PI * 2;
      flash.position.z = MUZZLES[weapon].z - PIVOT.z;
      rig.rotation.y = yaw;
      rig.rotation.x = pitch;
      const swing = walk ? Math.sin(t * 12) * 0.5 : 0;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      const pose = bodyPose({ t, walk, roll, dir });
      body.position.y = pose.y;
      body.rotation.z = pose.turn;
    },
  };
  return root;
}
