// Minimal browser stand-ins so the world, textures and character can be built in
// plain Node (no GPU). Canvas drawing calls are no-ops; pixel buffers are real.

function makeCtx(canvas) {
  const imageData = (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
  const gradient = () => ({ addColorStop() {} });
  const known = {
    createImageData: (w, h) => imageData(w, h),
    getImageData: (x, y, w, h) => imageData(w, h),
    putImageData() {},
    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createPattern: () => ({}),
    measureText: (t) => ({ width: String(t).length * 8 }),
  };
  const state = { canvas };
  return new Proxy(state, {
    get(target, prop) {
      if (prop in known) return known[prop];
      if (prop in target) return target[prop];
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}

export function installFakeDom() {
  if (globalThis.__fakeDom) return;
  globalThis.__fakeDom = true;
  const createElement = (tag) => {
    if (tag === 'canvas') {
      const c = { tagName: 'CANVAS', width: 300, height: 150, style: {}, addEventListener() {}, removeEventListener() {} };
      c.getContext = () => makeCtx(c);
      return c;
    }
    return { tagName: String(tag).toUpperCase(), style: {}, children: [], appendChild() {}, addEventListener() {}, setAttribute() {} };
  };
  globalThis.document = { createElement, createElementNS: (ns, tag) => createElement(tag), hidden: false, addEventListener() {} };
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

// Input stand-in for the Player controller.
export function fakeInput() {
  return {
    axis: { x: 0, y: 0 },
    run: false,
    hits: new Set(),
    moveAxis() { return this.axis; },
    sprinting() { return this.run; },
    hit(code) { return this.hits.has(code); },
  };
}

// Game stand-in passed to world updaters.
export function fakeGame(player) {
  const noop = () => {};
  const audio = new Proxy({}, { get: () => noop });
  return { player, audio, camera: { quaternion: { x: 0, y: 0, z: 0, w: 1 } }, ui: { toast: noop }, sky: { night: 0 } };
}

let worldPromise = null;
// Builds the full house once per test process.
export function buildTestWorld() {
  if (worldPromise) return worldPromise;
  worldPromise = (async () => {
    installFakeDom();
    const THREE = await import('three');
    const { Physics } = await import('../../js/engine/physics.js');
    const { LightPool } = await import('../../js/engine/lightpool.js');
    const { initMaterials } = await import('../../js/world/materials.js');
    const { buildWorld } = await import('../../js/world/world.js');
    const scene = new THREE.Scene();
    const physics = new Physics();
    const lightPool = new LightPool(scene, 8);
    await initMaterials();
    const world = await buildWorld({ scene, physics, audio: null, lightPool, progress: () => {} });
    return { THREE, scene, physics, lightPool, world };
  })();
  return worldPromise;
}
