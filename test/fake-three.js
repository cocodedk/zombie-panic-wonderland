// A stand-in for three.js in Node: the classes the stage and models use, keeping only the scene
// graph, positions, colours and calls, so tests can run them without WebGL or a download.

export const BackSide = 1;
export const DoubleSide = 2;
export const AdditiveBlending = 2;

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.set(x, y, z);
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setScalar(s) {
    return this.set(s, s, s);
  }
}
export class Euler extends Vector3 {}
export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}
export class Quaternion {
  setFromEuler() { return this; }
  identity() { return this; }
}
export class Matrix4 {
  makeRotationY() { return this; }
  setPosition() { return this; }
  compose() { return this; }
}

export class Color {
  constructor(hex = '#000000') {
    const n = parseInt(String(hex).slice(1), 16);
    this.r = ((n >> 16) & 255) / 255;
    this.g = ((n >> 8) & 255) / 255;
    this.b = (n & 255) / 255;
  }
  clone() {
    return Object.assign(new Color(), this);
  }
  lerp(c, t) {
    for (const k of ['r', 'g', 'b']) this[k] += (c[k] - this[k]) * t;
    return this;
  }
  offsetHSL() { return this; }
  getHexString() {
    return [this.r, this.g, this.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
}

export const disposed = { geometries: 0, materials: 0, textures: 0 };
export const SRGBColorSpace = 'srgb';

// A canvas that records what is drawn on it, and measures text as 0.6 of its font size a character.
// Every one made is in `canvases`; `document` is theirs where a test has not set its own.
export const canvases = [];
function fakeCanvas() {
  const ctx = {
    font: '', fills: [], texts: [], globalAlpha: 1,
    beginPath() {}, arc() {}, stroke() {},
    fill() { this.fills.push({ style: this.fillStyle, alpha: this.globalAlpha }); },
    measureText(text) { return { width: text.length * 0.6 * Number(/(\d+(\.\d+)?)px/.exec(this.font)[1]) }; },
    fillText(text) { this.texts.push({ text, style: this.fillStyle, font: this.font, width: this.measureText(text).width }); },
  };
  const canvas = { width: 0, height: 0, ctx, getContext: () => ctx };
  canvases.push(canvas);
  return canvas;
}
globalThis.document ??= { createElement: fakeCanvas };

// A texture drawn on a canvas; every one made is in `canvasTextures`.
export const canvasTextures = [];
export class CanvasTexture {
  constructor(canvas) {
    this.image = canvas;
    canvasTextures.push(this);
  }
  dispose() {
    disposed.textures += 1;
  }
}

export class BufferGeometry {
  constructor(...params) {
    this.params = params;
    this.attributes = {};
  }
  setAttribute(name, attr) {
    this.attributes[name] = attr;
  }
  dispose() {
    disposed.geometries += 1;
  }
}
const geometry = () => class extends BufferGeometry {};
export const PlaneGeometry = geometry();
export const BoxGeometry = geometry();
export const CylinderGeometry = geometry();
export const ConeGeometry = geometry();
export const IcosahedronGeometry = geometry();
export const DodecahedronGeometry = geometry();
export const OctahedronGeometry = geometry();
export const TorusGeometry = geometry();
export const ExtrudeGeometry = geometry();
export const TubeGeometry = geometry();
export class SphereGeometry extends BufferGeometry {
  constructor(radius, ...rest) {
    super(radius, ...rest);
    const ys = [-radius, 0, radius];
    this.attributes.position = { count: ys.length, getY: (i) => ys[i] };
  }
}
export class Float32BufferAttribute {
  constructor(array, itemSize) {
    this.array = array;
    this.itemSize = itemSize;
  }
}
export const ShapeGeometry = geometry();
// A shape: given `points`, or drawn with `moveTo` and `absarc`, which only record what they are given.
// `getPoints` walks the outline as three.js does: each arc in its own direction, `steps` points an arc.
export class Shape {
  constructor(points) {
    this.points = points;
    this.holes = [];
    this.arcs = [];
    this.start = null;
  }
  moveTo(x, y) {
    this.start = { x, y };
    return this;
  }
  absarc(x, y, radius, from, to, clockwise = false) {
    this.arcs.push({ x, y, radius, from, to, clockwise });
    return this;
  }
  getPoints(steps = 64) {
    const points = this.start ? [{ ...this.start }] : [];
    for (const { x, y, radius, from, to, clockwise } of this.arcs) {
      let delta = to - from;
      if (!clockwise && delta < 0) delta += 2 * Math.PI;
      if (clockwise && delta > 0) delta -= 2 * Math.PI;
      for (let i = 0; i <= steps; i++) {
        const a = from + (delta * i) / steps;
        points.push({ x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) });
      }
    }
    return points;
  }
}
export class CatmullRomCurve3 {
  constructor(points) { this.points = points; }
}

export class Material {
  constructor(params = {}) {
    Object.assign(this, params);
    if (typeof this.color === 'string') this.color = new Color(this.color);
  }
  dispose() {
    disposed.materials += 1;
  }
}
export class MeshStandardMaterial extends Material {}
export class MeshBasicMaterial extends Material {}
export class SpriteMaterial extends Material {}

export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.children = [];
    this.parent = null;
    this.userData = {};
    this.visible = true;
    this.name = '';
  }
  add(...objs) {
    for (const o of objs) {
      if (o.parent) o.parent.remove(o);
      o.parent = this;
      this.children.push(o);
    }
    return this;
  }
  remove(o) {
    const i = this.children.indexOf(o);
    if (i >= 0) this.children.splice(i, 1);
    o.parent = null;
    return this;
  }
  traverse(fn) {
    fn(this);
    for (const c of this.children) c.traverse(fn);
  }
}
export class Group extends Object3D {}
export class Scene extends Object3D {
  constructor() {
    super();
    this.fog = null;
  }
}
export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}
export class Sprite extends Object3D {
  constructor(material) {
    super();
    this.material = material;
    this.renderOrder = 0;
  }
}
export class InstancedMesh extends Mesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.count = count;
  }
  setMatrixAt(i) {
    if (i >= this.count) throw new Error(`instance ${i} of ${this.count}`);
  }
  setColorAt(i) {
    if (i >= this.count) throw new Error(`instance ${i} of ${this.count}`);
  }
}
export class HemisphereLight extends Object3D {
  constructor(sky, ground, intensity) {
    super();
    this.color = new Color(sky);
    this.groundColor = new Color(ground);
    this.intensity = intensity;
  }
}
export class DirectionalLight extends Object3D {
  constructor(color, intensity) {
    super();
    this.color = new Color(color);
    this.intensity = intensity;
  }
}
export class Fog {
  constructor(color, near, far) {
    this.color = new Color(color);
    this.near = near;
    this.far = far;
  }
}
export class PerspectiveCamera extends Object3D {
  constructor(fov, aspect) {
    super();
    this.aspect = aspect;
  }
  lookAt(x, y, z) {
    this.target = { x, y, z };
  }
  updateProjectionMatrix() {}
}

// Every renderer made, so a test can see what was drawn.
export const renderers = [];
export class WebGLRenderer {
  constructor() {
    this.domElement = { tagName: 'CANVAS' };
    this.renders = 0;
    renderers.push(this);
  }
  setPixelRatio() {}
  setSize() {}
  render(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.renders += 1;
  }
}

// Hits the first mesh of each object it is given, in order, whatever the ray, but not a mesh that
// ignores rays (one with a `raycast` of its own). `sets` records each ray set by origin and
// direction. Every raycaster made is in `raycasters`.
export const raycasters = [];
export class Raycaster {
  ray = { origin: new Vector3(0, 0, 0), direction: new Vector3(0, 0, -1), at: (distance, v) => v.set(0, 0, -distance) };
  sets = [];
  constructor() {
    raycasters.push(this);
  }
  setFromCamera() {}
  set(origin, direction) {
    this.sets.push({ origin: { ...origin }, direction: { ...direction } });
  }
  intersectObjects(objects) {
    const hits = [];
    for (const o of objects) {
      let mesh = null;
      o.traverse((m) => { if (!mesh && m instanceof Mesh && !Object.hasOwn(m, 'raycast')) mesh = m; });
      if (mesh) hits.push({ object: mesh });
    }
    return hits;
  }
}
