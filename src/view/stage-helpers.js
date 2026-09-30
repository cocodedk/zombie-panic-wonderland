// Small helpers the stage shares: freeing a scene object's GPU resources and stretching a unit
// bar between two points.

export function dispose(obj, keep = new Set()) {
  obj.traverse((m) => {
    if (m.geometry && !keep.has(m.geometry)) m.geometry.dispose();
    if (m.material && !keep.has(m.material)) m.material.dispose();
  });
}

// Points `obj`, a unit length along z, from `a` to `b`.
export function span(obj, a, b) {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const len = Math.hypot(d.x, d.y, d.z);
  obj.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  obj.rotation.order = 'YXZ';
  obj.rotation.set(-Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0);
  obj.scale.set(1, 1, len);
}
