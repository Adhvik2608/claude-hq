import * as THREE from 'three';
import { ROOMS, floorY, CEIL } from '../config.js';
import { Builder } from './builder.js';
import { Doors } from './doors.js';
import { Lift } from './lift.js';
import { buildStructure } from './structure.js';
import { buildGround } from './rooms/ground.js';
import { buildUpper } from './rooms/upper.js';
import { buildTerrace } from './rooms/terrace.js';
import { buildExterior } from './exterior.js';
import { buildCurtains } from './furniture.js';

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function buildWorld({ scene, physics, audio, lightPool, progress }) {
  const house = new THREE.Group(); house.name = 'house';
  const dyn = new THREE.Group(); dyn.name = 'dynamic';
  scene.add(house, dyn);
  const b = new Builder(physics);
  const doors = new Doors(physics, audio);
  scene.add(doors.group);

  const world = {
    interactables: [], updaters: [], doors, house, dyn, frames: [], instruments: {}, waterAreas: [], dynLayers: new Map(),
  };
  const ctx = {
    b, physics, doors, scene, dyn, dynRoot: dyn, audio, rooms: ROOMS, world,
    setLayer(n) {
      b.layer = n;
      let g = world.dynLayers.get(n);
      if (!g) { g = new THREE.Group(); g.name = 'dyn-' + n; dyn.add(g); world.dynLayers.set(n, g); }
      ctx.dyn = g;
    },
    seat(s) {
      const fy = s.y ?? 0;
      const it = {
        kind: 'seat', label: s.label || 'Sit', pos: new THREE.Vector3(s.x, fy + 0.6, s.z), r: s.r ?? 1.1, floor: s.floor,
        seat: { pos: [s.x, fy, s.z], yaw: s.yaw, mode: s.mode || 'sit', seatH: s.seatH ?? 0.46, exit: s.exit, floorY: fy, cam: s.cam, instrument: s.instrument, getPos: s.getPos, getYaw: s.getYaw },
      };
      world.interactables.push(it);
      return it;
    },
    interact(i) { const it = { kind: 'action', r: 1.2, ...i }; if (Array.isArray(it.pos)) it.pos = new THREE.Vector3(...it.pos); world.interactables.push(it); return it; },
    light(a) { lightPool.add(a); },
    anim(fn) { world.updaters.push(fn); },
    floorY,
  };

  progress('Raising walls', 0.1); await tick();
  buildStructure(ctx);
  progress('Furnishing the ground floor', 0.25); await tick();
  ctx.setLayer(0);
  buildGround(ctx);
  progress('Furnishing the upper floors', 0.45); await tick();
  buildUpper(ctx);
  progress('Planting the sky terrace', 0.6); await tick();
  ctx.setLayer(4);
  buildTerrace(ctx);
  progress('Landscaping the garden', 0.7); await tick();
  ctx.setLayer('ext');
  buildExterior(ctx);
  buildCurtains(ctx);
  ctx.setLayer('shell');
  progress('Installing the lift', 0.8); await tick();
  const lift = new Lift(scene, physics, audio);
  world.lift = lift;
  // default ceiling lights for every indoor room
  for (const r of ROOMS) {
    if (r.outdoor || r.floor === 4) continue;
    const [x0, z0, x1, z1] = r.rect;
    const nx = Math.max(1, Math.round((x1 - x0) / 5.5)), nz = Math.max(1, Math.round((z1 - z0) / 5.5));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = x0 + (i + 0.5) * (x1 - x0) / nx, z = z0 + (j + 0.5) * (z1 - z0) / nz;
      if (Math.hypot(x, z) < 4.2 && r.floor > 0) continue;
      lightPool.add({ pos: [x, floorY(r.floor) + CEIL - 0.5, z], floor: r.floor, intensity: r.id === 'cinema' ? 6 : 16, distance: 10, color: 0xffd6aa });
    }
  }
  progress('Merging geometry', 0.9); await tick();
  b.flush(house, 'house');
  world.layers = b.layerGroups;
  // show only nearby floors when indoors
  world.setVisibleFloors = (floor, all) => {
    for (const [k, g] of world.layers) if (typeof k === 'number') g.visible = all || Math.abs(k - floor) <= 1;
    for (const [k, g] of world.dynLayers) if (typeof k === 'number') g.visible = all || Math.abs(k - floor) <= 1;
  };
  return world;
}
