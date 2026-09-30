// Small helpers the stage shares: freeing a scene object's GPU resources and stretching a unit
// bar between two points.

export function dispose(obj, keep = new Set()) {
  obj.traverse((m) => {
    if (m.geometry && !keep.has(m.geometry)) m.geometry.dispose();
    if (m.material && !keep.has(m.material)) m.material.dispose();
  });
}

// `span` lives in the models' parts, which the hero's details use too.
export { span } from './models/parts.js';
