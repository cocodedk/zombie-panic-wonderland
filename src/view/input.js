// Keyboard and mouse into game calls. `aim` is the crosshair in normalised device coordinates.

const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);

export function bindInput(win, game, hud) {
  const aim = { x: 0, y: 0 };
  const held = new Set();
  const steer = () => game.setMove((held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0));

  win.addEventListener('keydown', (e) => {
    if (LEFT.has(e.code)) held.add('left');
    else if (RIGHT.has(e.code)) held.add('right');
    else if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) game.dodge();
      return;
    } else if (e.code === 'Escape') {
      if (!e.repeat) game.pressEsc();
      follow();
      return;
    } else return;
    e.preventDefault();
    steer();
  });
  win.addEventListener('keyup', (e) => {
    if (LEFT.has(e.code)) held.delete('left');
    else if (RIGHT.has(e.code)) held.delete('right');
    else return;
    steer();
  });
  win.addEventListener('blur', () => {
    held.clear();
    steer();
    game.pointerUp();
  });

  // The pointer is always tracked; while paused the crosshair and the aim hold still, and catch up on resume.
  const pointer = { x: win.innerWidth / 2, y: win.innerHeight / 2 };
  const follow = () => {
    if (game.screen === 'paused') return;
    aim.x = (pointer.x / win.innerWidth) * 2 - 1;
    aim.y = -(pointer.y / win.innerHeight) * 2 + 1;
    hud.crosshairAt(pointer.x, pointer.y);
  };
  const track = (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    follow();
  };
  follow();

  win.addEventListener('mousemove', track);
  win.addEventListener('mousedown', (e) => {
    track(e);
    if (e.button === 0 && e.target.tagName !== 'BUTTON') game.pointerDown();
  });
  win.addEventListener('mouseup', (e) => {
    if (e.button === 0) game.pointerUp();
  });
  win.addEventListener('contextmenu', (e) => e.preventDefault());

  return aim;
}
