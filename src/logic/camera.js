// Where the camera stands and what it looks at: low behind the player, about 8° down, close to
// looking over the player's shoulder. Plain data, so Node can pin it; the stage reads it.

export const CAMERA = {
  position: { x: 0, y: 3.6, z: 9 },
  target: { x: 0, y: 1.4, z: -6 },
};
