// The level's backdrop: fog, lights and scenery, built anew whenever the game moves to another level.

import * as THREE from 'three';

// Level 1's dusk; a level may set its own.
const LIGHT = { fog: '#5a3148', fogFar: 70, sky: '#8a6fb0', ground: '#3a2a1a', key: '#ffb070', keyAt: [-8, 6, -20], fill: '#c9b8ff' };

// `scenery` maps a scenery model name to its builder.
export function buildBackdrop(scene, level, scenery) {
  const light = { ...LIGHT, ...level.light };
  scene.fog = new THREE.Fog(light.fog, 22, light.fogFar);
  const backdrop = new THREE.Group();
  backdrop.name = 'backdrop';
  backdrop.add(new THREE.HemisphereLight(light.sky, light.ground, 1.2));
  const key = new THREE.DirectionalLight(light.key, 2.2);
  key.position.set(...light.keyAt);
  backdrop.add(key);
  const fill = new THREE.DirectionalLight(light.fill, 0.8);
  fill.position.set(4, 10, 12);
  backdrop.add(fill);
  for (const { model, x = 0, z = 0, turn = 0, ...params } of level.scenery) {
    const obj = scenery[model](params);
    obj.name = model;
    obj.position.x = x;
    obj.position.z = z;
    obj.rotation.y = turn;
    backdrop.add(obj);
  }
  scene.add(backdrop);
  return backdrop;
}
