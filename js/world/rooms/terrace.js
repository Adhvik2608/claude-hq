import * as THREE from 'three';
import { M } from '../materials.js';
import { floorY, HX, HZ } from '../../config.js';
import { cushion, slabShape, roundedBox } from '../builder.js';
import * as F from '../furniture.js';
import { flame } from '../deities.js';
import { tree } from '../exterior.js';

export function buildTerrace(ctx) {
  const { b, physics } = ctx;
  const n = 4, y = floorY(n);
  // deck finish everywhere except the pavilion
  const s = new THREE.Shape();
  s.moveTo(-HX + 0.15, HZ - 0.15); s.lineTo(HX - 0.15, HZ - 0.15); s.lineTo(HX - 0.15, -HZ + 0.15); s.lineTo(-HX + 0.15, -HZ + 0.15); s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, 0, 4.95, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new THREE.ShapeGeometry(s, 64); g.rotateX(-Math.PI / 2);
  b.geo(g, M.deck, { pos: [0, y + 0.005, 0], cast: false });

  // ---------------- infinity pool on a raised deck
  const px0 = 5.6, px1 = 15.75, pz0 = -11.75, pz1 = 5.2, H = 0.9;
  const wx0 = 7.0, wx1 = 15.2, wz0 = -10.6, wz1 = 3.8;
  // deck strips (top surfaces) around the basin
  const strips = [[px0, pz0, wx0, pz1], [wx1, pz0, px1, pz1], [wx0, pz0, wx1, wz0], [wx0, wz1, wx1, pz1]];
  for (const [x0, z0, x1, z1] of strips) {
    b.box((x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0, H, z1 - z0, x0 === wx1 ? M.stone : M.deck);
    physics.addRect(x0, z0, x1, z1, y + H, H, 'wood');
  }
  // basin
  b.box((wx0 + wx1) / 2, y, (wz0 + wz1) / 2, wx1 - wx0, 0.02, wz1 - wz0, M.poolTile, { cast: false });
  for (const [x, z, w, d] of [[wx0 + 0.01, (wz0 + wz1) / 2, 0.02, wz1 - wz0], [(wx0 + wx1) / 2, wz0 + 0.01, wx1 - wx0, 0.02], [(wx0 + wx1) / 2, wz1 - 0.01, wx1 - wx0, 0.02]]) b.box(x, y, z, w, H, d, M.poolTile, { cast: false });
  physics.addRect(wx0, wz0, wx1, wz1, y + 0.03, 0.05, 'water');
  // pool steps (inside, north end)
  for (let i = 0; i < 5; i++) {
    const top = y + 0.75 - i * 0.15;
    const z0 = wz1 - 0.3 * (i + 1), z1 = wz1 - 0.3 * i;
    b.box(8.0, y, (z0 + z1) / 2, 2.0, top - y, z1 - z0, M.marble, { cast: false });
    physics.addRect(7.0, z0, 9.0, z1, top, top - y, 'water');
  }
  // water surface
  const water = new THREE.Mesh(new THREE.PlaneGeometry(wx1 - wx0 + 0.5, wz1 - wz0, 1, 1), M.water);
  water.rotation.x = -Math.PI / 2; water.position.set((wx0 + wx1) / 2 + 0.25, y + 0.84, (wz0 + wz1) / 2);
  ctx.dyn.add(water);
  const wn = M.water.normalMap;
  ctx.anim((dt, t, game) => {
    wn.offset.set(t * 0.012, t * 0.008);
    if (game && game.player) {
      const p = game.player.pos;
      const inPool = p.x > wx0 && p.x < wx1 && p.z > wz0 && p.z < wz1 && p.y > y - 0.5 && p.y < y + 1.2;
      game.player.waterY = inPool ? y + 0.84 + 0.4 : -Infinity;
      if (inPool && !game._wasInPool) game.audio.splash();
      game._wasInPool = inPool;
    }
  });
  // infinity edge spill
  b.box(15.45, y + H - 0.25, (wz0 + wz1) / 2, 0.5, 0.25, wz1 - wz0, M.waterStill, { cast: false });
  ctx.light({ pos: [11, y + 0.4, -3.4], floor: n, intensity: 10, distance: 9, color: 0x5ad0ff, night: true });
  // steps up to the deck from the terrace (west)
  for (let i = 0; i < 6; i++) {
    const top = y + 0.15 * (i + 1);
    const x0 = px0 - 1.2 + i * 0.2;
    b.box(x0 + 0.1, y, 0.5, 0.2 + (5 - i) * 0 + 0.2, top - y, 3.0, M.deck);
    physics.addRect(x0, -1.0, x0 + 0.2, 2.0, top, top - y, 'wood');
  }
  // loungers along the north deck strip
  for (let i = 0; i < 3; i++) {
    const x = 8.2 + i * 2.4;
    const ly = y + H;
    b.geo(roundedBox(0.7, 0.08, 1.9, 0.02), M.teak, { pos: [x, ly + 0.28, 4.5], rot: Math.PI / 2 });
    b.geo(cushion(0.64, 0.08, 1.2, 0.2), M.fabWhite, { pos: [x + 0.3, ly + 0.35, 4.5], rot: Math.PI / 2 });
    b.geo(cushion(0.64, 0.08, 0.6, 0.2), M.fabWhite, { pos: [x - 0.6, ly + 0.5, 4.5], rot: [0, Math.PI / 2, 0.7, 'YXZ'] });
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.28, 0.28]) b.box(x + dx, ly, 4.5 + dz, 0.04, 0.28, 0.04, M.teak);
    physics.addBoxC(x, ly, 4.5, 1.9, 0.45, 0.7);
    ctx.seat({ x, z: 4.5, y: ly - 0.2, yaw: Math.PI / 2, mode: 'lie', seatH: 0.5, floor: n, label: 'Lounge by the pool', exit: [x, 3.6] });
  }
  F.plant(ctx, { x: 6.2, z: -11.2, y: y + H, size: 1.6, kind: 'palm', pot: M.stone, seed: 301 });
  F.plant(ctx, { x: 6.2, z: 4.6, y: y + H, size: 1.4, kind: 'palm', pot: M.stone, seed: 302 });

  // ---------------- terrace garden (west)
  const beds = [[-14.6, -8.5, 2.2, 5.5], [-14.6, 8.5, 2.2, 5.5], [-9.0, -10.6, 4.6, 1.6], [-9.0, 10.6, 4.6, 1.6]];
  for (const [x, z, w, d] of beds) {
    b.box(x, y, z, w, 0.45, d, M.stone);
    b.box(x, y + 0.45, z, w - 0.16, 0.02, d - 0.16, M.grass, { cast: false });
    physics.addBoxC(x, y, z, w, 0.45, d);
    for (let i = 0; i < Math.floor(w * d * 1.4); i++) F.plant(ctx, { x: x + (Math.random() - 0.5) * (w - 0.5), z: z + (Math.random() - 0.5) * (d - 0.5), y: y + 0.45, size: 0.5 + Math.random() * 0.5, kind: Math.random() < 0.3 ? 'tulsi' : 'bush', pot: null, seed: 400 + i + Math.round(x * z), collide: false });
  }
  tree(ctx, -14.6, y + 0.45, -8.5, 0.55, 11);
  tree(ctx, -14.6, y + 0.45, 8.5, 0.6, 12);
  // lawn
  const lawn = new THREE.PlaneGeometry(6.4, 9.6); lawn.rotateX(-Math.PI / 2);
  b.geo(lawn, M.grass, { pos: [-10.0, y + 0.01, 0], cast: false });
  // tulsi vrindavan
  b.box(-10.0, y, 0, 0.8, 0.9, 0.8, M.terracotta, { collide: true });
  b.box(-10.0, y + 0.9, 0, 0.9, 0.06, 0.9, M.marble);
  for (const [dx, dz] of [[0, 0.41], [0, -0.41], [0.41, 0], [-0.41, 0]]) {
    const om = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xff8a20, emissiveIntensity: 0.3 }));
    om.position.set(-10.0 + dx * 1.01, y + 0.5, dz * 1.01); om.lookAt(-10.0 + dx * 3, y + 0.5, dz * 3); ctx.dyn.add(om);
  }
  F.plant(ctx, { x: -10.0, z: 0, y: y + 0.96, size: 1.1, kind: 'tulsi', pot: null, seed: 501, collide: false });
  flame(ctx, -10.0, y + 0.97, 0.38, 0.8);
  ctx.interact({ pos: [-9.0, y + 1.0, 0], r: 1.3, floor: n, label: 'Light a diya at the tulsi', action: (g) => { g.player.emote = 'pray'; g.audio.bell(1.3); } });
  // telescope
  telescope(ctx, -14.7, y, 1.6);
  // benches
  for (const z of [-3.4, 3.4]) {
    b.box(-7.0, y, z, 0.5, 0.42, 1.6, M.teak, { collide: true });
    ctx.seat({ x: -7.0, z, y, yaw: -Math.PI / 2, seatH: 0.45, floor: n, label: 'Sit in the garden', exit: [-7.8, z] });
  }

  // ---------------- fire-pit lounge (front)
  const fx = 0, fz = 8.8;
  b.cyl(fx, y, fz, 0.7, 0.75, 0.42, M.stone, { seg: 32, collide: true });
  b.cyl(fx, y + 0.4, fz, 0.55, 0.55, 0.03, M.ceramicBlack, { seg: 32 });
  const fireF = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; fireF.push(flame(ctx, fx + Math.cos(a) * 0.25, y + 0.43, fz + Math.sin(a) * 0.25, 3.2)); }
  fireF.push(flame(ctx, fx, y + 0.43, fz, 4.2));
  ctx.light({ pos: [fx, y + 0.9, fz], floor: n, intensity: 10, distance: 8, color: 0xff8a3a, flicker: 2, dayScale: 0.4 });
  for (const [x, z, rot] of [[-2.6, 8.8, Math.PI / 2], [2.6, 8.8, -Math.PI / 2], [0, 11.2, Math.PI]]) F.sofa(ctx, { x, z, y, rot, len: 2.6, seats: 3, mat: M.fabSand, cushionMat: M.fabWhite, floor: n, label: 'Sit by the fire' });
  // pergola with fairy lights
  for (const [x, z] of [[-4.2, 6.0], [4.2, 6.0], [-4.2, 11.6], [4.2, 11.6]]) b.box(x, y, z, 0.14, 2.9, 0.14, M.teak, { collide: true });
  for (const z of [6.0, 11.6]) b.box(0, y + 2.9, z, 8.6, 0.16, 0.16, M.teak);
  for (let i = 0; i < 10; i++) b.box(-4.0 + i * 0.89, y + 3.06, 8.8, 0.08, 0.12, 5.8, M.teak);
  fairyLights(ctx, n, y);

  // ---------------- outdoor dining (back)
  F.table(ctx, { x: 0, z: -9.0, y, w: 2.6, d: 1.0, top: M.teak, leg: M.blackMetal });
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) F.chair(ctx, { x: -0.9 + i * 0.9, z: -9.0 + s * 0.85, y, rot: s > 0 ? Math.PI : 0, mat: M.teak, seatMat: M.fabWhite, floor: n, label: 'Sit at the terrace table' });
  // umbrella
  b.cyl(0, y + 0.76, -9.0, 0.025, 0.025, 1.9, M.chrome, { seg: 8 });
  b.geo(new THREE.ConeGeometry(1.7, 0.5, 12, 1, true), M.fabSaffron, { pos: [0, y + 2.75, -9.0], cast: true });
  // BBQ
  b.box(4.4, y, -10.8, 1.1, 0.9, 0.6, M.steel, { collide: true });
  for (let i = 0; i < 4; i++) flame(ctx, 4.0 + i * 0.25, y + 0.9, -10.8, 0.9);
  ctx.interact({ pos: [4.4, y + 1.0, -10.0], r: 1.2, floor: n, label: 'Grill paneer tikka', action: (g) => { g.audio.noise(g.audio.sfx, { dur: 3, type: 'highpass', f: 3000, gain: 0.05, attack: 0.2 }); g.ui.toast('Smoky paneer tikka, coming right up.'); } });

  // pavilion lights
  ctx.light({ pos: [0, y + 3.2, 3.2], floor: n, intensity: 10, distance: 8, color: 0xffd6a0 });
  F.pendant(ctx, { x: 3.3, z: 3.3, yTop: y + 3.6, drop: 0.8, floor: n });
  F.pendant(ctx, { x: -3.3, z: 3.3, yTop: y + 3.6, drop: 0.8, floor: n });
  F.pendant(ctx, { x: 3.3, z: -3.3, yTop: y + 3.6, drop: 0.8, floor: n });
  F.pendant(ctx, { x: -3.3, z: -3.3, yTop: y + 3.6, drop: 0.8, floor: n });
}

function telescope(ctx, x, y, z) {
  const b = ctx.b;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.box(x + Math.cos(a) * 0.25, y, z + Math.sin(a) * 0.25, 0.03, 1.1, 0.03, M.blackMetal, { rot: [0.25 * Math.sin(a), a, 0.25 * Math.cos(a), 'YXZ'] }); }
  const tube = new THREE.CylinderGeometry(0.07, 0.09, 1.0, 20); tube.rotateZ(Math.PI / 2 - 0.6);
  b.geo(tube, M.ceramic, { pos: [x, y + 1.15, z], rot: -0.6 });
  b.cyl(x, y + 1.05, z, 0.05, 0.05, 0.1, M.gold, { seg: 12 });
  ctx.physics.addCyl(x, z, 0.35, y, y + 1.3);
  ctx.interact({ pos: [x + 0.6, y + 1.0, z], r: 1.0, floor: 4, label: 'Look through the telescope', action: (g) => { const night = g.sky.night > 0.5; g.ui.toast(night ? 'Saturn’s rings, crisp and golden. ✨' : 'Too bright for stars — try again tonight (T to change the time).', 3500); } });
}

function fairyLights(ctx, n, y) {
  const b = ctx.b;
  const strands = [];
  for (let i = 0; i < 6; i++) { const z = 6.2 + i * 1.05; strands.push([[-4.1, y + 2.85, z], [4.1, y + 2.85, z], 0.35]); }
  strands.push([[-15.8, y + 1.15, 11.85], [15.8, y + 1.15, 11.85], 0.0]);
  strands.push([[-15.8, y + 1.15, -11.85], [15.8, y + 1.15, -11.85], 0.0]);
  strands.push([[-15.85, y + 1.15, -11.8], [-15.85, y + 1.15, 11.8], 0.0]);
  strands.push([[15.85, y + 1.15, -11.8], [15.85, y + 1.15, 11.8], 0.0]);
  const g = new THREE.SphereGeometry(0.03, 6, 4);
  for (const [a, c, sag] of strands) {
    const len = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const cnt = Math.floor(len / 0.32);
    for (let i = 0; i <= cnt; i++) {
      const t = i / cnt;
      const wob = sag ? Math.sin(t * Math.PI) * sag : Math.sin(t * Math.PI * len / 2) * 0.04;
      b.geo(g, M.fairy, { pos: [a[0] + (c[0] - a[0]) * t, a[1] - wob, a[2] + (c[2] - a[2]) * t], cast: false, receive: false });
    }
  }
  for (const [x, z] of [[0, 8.8], [-10, 0], [10, -3], [0, -9], [-10, -9], [-10, 9]]) ctx.light({ pos: [x, y + 2.5, z], floor: 'ext', intensity: 5, distance: 8, color: 0xffc070, night: true });
}
