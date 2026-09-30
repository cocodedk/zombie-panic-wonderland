// What the camera sees of the hero's back, added to the body: a scalloped cape hem with a gold trim,
// a collar, a hood seam and pompom, shoulder caps and a satchel. Places are in the body's own frame
// (before its waist shift); the caller has already added the cape and the hood. Still, flat, no textures.

import * as THREE from 'three';
import { flat, part, group, span } from './parts.js';

const HEM = 7; // the cape's cone has seven sides, so seven hem vertices
const hemAt = (i) => {
  const a = (2 * Math.PI * i) / HEM;
  return [0.42 * Math.sin(a), 0.2, 0.08 + 0.294 * Math.cos(a)];
};

export function addHeroDetails(body, { hood }) {
  // The hem: a small point under each hem vertex, and a gold ring along the seven straight edges.
  const pointGeo = new THREE.ConeGeometry(0.07, 0.12, 3);
  const hemMat = flat('#6f1219');
  for (let i = 0; i < HEM; i++) body.add(part(pointGeo, hemMat, hemAt(i), [Math.PI, 0, 0]));

  // A torus lies in xy; turned flat, then a quarter turn about y, its seven corners sit on the hem's
  // vertices. The parent group squeezes the ring to the cape's 0.7 in z (the torus's own z is its thickness).
  const trim = part(new THREE.TorusGeometry(0.42, 0.012, 4, HEM), '#d9a520', [0, 0, 0], [Math.PI / 2, -Math.PI / 2, 0]);
  trim.rotation.order = 'YXZ';
  const trimRing = group(trim);
  trimRing.position.set(0, 0.255, 0.08);
  trimRing.scale.z = 0.7;
  body.add(trimRing);

  body.add(part(new THREE.ConeGeometry(0.2, 0.14, 7, 1, true), flat('#7a1219', { side: THREE.DoubleSide }), [0, 1.02, 0.04]));

  // A seam along the top edge of the hood's point, and a pompom at its tip.
  const seam = part(new THREE.BoxGeometry(0.03, 0.03, 1), '#8f1820');
  span(seam, { x: 0, y: 1.365, z: 0.17 }, { x: 0, y: 1.12, z: 0.43 });
  body.add(seam, part(new THREE.IcosahedronGeometry(0.05, 0), '#f2e3b8', [0, 1.11, 0.44]));

  // Caps on the tunic's shoulders (the arms turn with the aim rig, so the caps are not joined to them).
  const capGeo = new THREE.IcosahedronGeometry(0.09, 0);
  const capMat = flat(hood);
  body.add(part(capGeo, capMat, [0.22, 0.98, -0.02]), part(capGeo, capMat, [-0.22, 0.98, -0.02]));

  // A satchel on the right hip (+x), outside the cape.
  body.add(
    part(new THREE.BoxGeometry(0.22, 0.26, 0.1), '#6b4a2b', [0.22, 0.45, 0.37]),
    part(new THREE.BoxGeometry(0.22, 0.1, 0.11), '#8a5d33', [0.22, 0.55, 0.37]),
  );
}
