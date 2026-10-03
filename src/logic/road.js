// How high the road's bricks lift a foot at depth z. Only where things are drawn: the rules never read it.
// `top` is the lowest brick top; `edge` is the road's first row, over which an enemy steps up onto it.

export const ROAD = { top: 0.11, edge: 0.3 };

export function roadLift(z, level) {
  const road = (level.scenery ?? []).find((s) => s.model === 'road');
  if (!road) return 0;
  const half = road.width / 2;
  const d = Math.abs(z - level.roadZ);
  if (d >= half) return 0;
  return d <= half - ROAD.edge ? ROAD.top : (ROAD.top * (half - d)) / ROAD.edge;
}
