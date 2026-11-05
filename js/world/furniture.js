import * as THREE from 'three';
import { M } from './materials.js';
import { matrix, roundedBox, cushion, tube } from './builder.js';
import { mulberry32 } from '../util/noise.js';

// Local-to-world helper for a piece placed at (x, y, z) rotated by rot about Y.
function frame(x, y, z, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return {
    p: (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c],
    rot,
  };
}

export function rug(ctx, { x, z, y, w, d, mat, rot = 0 }) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  ctx.b.geo(g, mat, { pos: [x, y + 0.012, z], rot, uv: 'keep', cast: false });
  const edge = new THREE.BoxGeometry(w, 0.012, d);
  ctx.b.geo(edge, M.fabSand, { pos: [x, y + 0.0, z], rot, cast: false });
}

export function sofa(ctx, { x, z, y, rot = 0, len = 2.4, depth = 0.95, mat = M.fabCream, cushionMat, legMat = M.walnut, floor, seats = 3, label = 'Sit on the sofa', back = true, arms = true }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  const cm = cushionMat || mat;
  const sh = 0.44, bh = 0.85;
  b.geo(roundedBox(len, 0.22, depth, 0.05), mat, { pos: f.p(0, 0.23, 0), rot });
  if (back) b.geo(roundedBox(len, bh - 0.3, 0.22, 0.08), mat, { pos: f.p(0, 0.3 + (bh - 0.3) / 2, -depth / 2 + 0.11), rot });
  if (arms) for (const s of [-1, 1]) b.geo(roundedBox(0.2, 0.62, depth, 0.08), mat, { pos: f.p(s * (len / 2 - 0.1), 0.43, 0), rot });
  const inner = len - (arms ? 0.4 : 0.04);
  for (let i = 0; i < seats; i++) {
    const cx = -inner / 2 + inner * (i + 0.5) / seats;
    b.geo(cushion(inner / seats - 0.02, 0.16, depth - 0.3, 0.3), cm, { pos: f.p(cx, sh - 0.02, 0.08), rot });
    if (back) b.geo(cushion(inner / seats - 0.04, 0.42, 0.18, 0.3), cm, { pos: f.p(cx, sh + 0.28, -depth / 2 + 0.28), rot: [-0.12, rot, 0, 'YXZ'] });
    ctx.seat({ x: f.p(cx, 0, 0.12)[0], z: f.p(cx, 0, 0.12)[2], y, yaw: rot, seatH: sh + 0.06, floor, label, exit: [f.p(cx, 0, depth / 2 + 0.55)[0], f.p(cx, 0, depth / 2 + 0.55)[2]] });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(...f.p(sx * (len / 2 - 0.08), 0, sz * (depth / 2 - 0.08)), 0.025, 0.02, 0.12, legMat, { seg: 8 });
  // throw pillows
  if (arms) for (const s of [-1, 1]) b.geo(cushion(0.42, 0.4, 0.12, 0.5), M.fabSaffron === cm ? M.fabTeal : M.fabSaffron, { pos: f.p(s * (inner / 2 - 0.28), sh + 0.24, -depth / 2 + 0.38), rot: [-0.25, rot + s * 0.25, 0, 'YXZ'] });
  ctx.physics.addBoxRot(x, y, z, len, 0.7, depth, rot);
}

export function armchair(ctx, o) { sofa(ctx, { len: 1.05, seats: 1, label: 'Sit in the armchair', ...o }); }

export function chair(ctx, { x, z, y, rot = 0, mat = M.walnut, seatMat = M.fabCream, floor, label = 'Sit on the chair', style = 'dining', collide = true }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  const sh = 0.47;
  if (style === 'office') {
    b.cyl(...f.p(0, 0, 0), 0.32, 0.32, 0.04, M.blackMetal, { seg: 5 });
    b.cyl(...f.p(0, 0.04, 0), 0.03, 0.03, 0.38, M.chrome);
    b.geo(cushion(0.5, 0.08, 0.48, 0.3), seatMat, { pos: f.p(0, 0.44, 0), rot });
    b.geo(roundedBox(0.48, 0.62, 0.07, 0.03), seatMat, { pos: f.p(0, 0.85, -0.25), rot: [-0.12, rot, 0, 'YXZ'] });
  } else {
    b.geo(roundedBox(0.46, 0.05, 0.45, 0.012), mat, { pos: f.p(0, sh - 0.05, 0), rot });
    b.geo(cushion(0.42, 0.05, 0.41, 0.3), seatMat, { pos: f.p(0, sh, 0.01), rot });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(...f.p(sx * 0.2, 0, sz * 0.19), 0.035, sh - 0.05, 0.035, mat, { rot });
    b.box(...f.p(0, sh, -0.205), 0.44, 0.48, 0.035, mat, { rot });
    b.geo(cushion(0.36, 0.36, 0.04, 0.3), seatMat, { pos: f.p(0, sh + 0.26, -0.18), rot });
  }
  const s = ctx.seat({ x, z, y, yaw: rot, seatH: sh + 0.02, floor, label, exit: [f.p(0, 0, 0.7)[0], f.p(0, 0, 0.7)[2]] });
  if (collide) ctx.physics.addBoxRot(x, y, z, 0.48, 0.5, 0.48, rot);
  return s;
}

export function table(ctx, { x, z, y, w = 1.6, d = 0.9, h = 0.76, top = M.walnut, leg = M.walnut, rot = 0, round = false, pedestal = false, thick = 0.045, collide = true }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  if (round) {
    b.cyl(x, y + h - thick, z, w / 2, w / 2, thick, top, { seg: 48 });
    b.cyl(x, y, z, 0.06, 0.08, h - thick, leg, { seg: 16 });
    b.cyl(x, y, z, 0.3, 0.32, 0.04, leg, { seg: 32 });
    if (collide) ctx.physics.addCyl(x, z, w / 2 * 0.9, y, y + h);
    return;
  }
  b.geo(roundedBox(w, thick, d, 0.012), top, { pos: f.p(0, h - thick / 2, 0), rot });
  if (pedestal) { b.box(...f.p(0, 0, 0), w * 0.5, h - thick, 0.12, leg, { rot }); b.box(...f.p(0, 0, 0), w * 0.6, 0.05, d * 0.6, leg, { rot }); }
  else for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(...f.p(sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06)), 0.055, h - thick, 0.055, leg, { rot });
  if (collide) ctx.physics.addBoxRot(x, y, z, w, h, d, rot);
}

export function bed(ctx, { x, z, y, rot = 0, w = 1.9, l = 2.15, frameMat = M.walnut, sheet = M.linen, blanket = M.fabTeal, pillow = M.fabWhite, floor, canopy = false, headboard = M.fabCream, label = 'Lie down' }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  const mh = 0.6;
  b.geo(roundedBox(w + 0.1, 0.3, l + 0.08, 0.03), frameMat, { pos: f.p(0, 0.2, 0), rot });
  b.geo(roundedBox(w, 0.24, l, 0.08), sheet, { pos: f.p(0, 0.47, 0), rot });
  b.geo(cushion(w + 0.04, 0.06, l * 0.62, 0.4), blanket, { pos: f.p(0, mh - 0.01, l * 0.17), rot });
  b.geo(roundedBox(w + 0.06, 0.25, 0.04, 0.02), blanket, { pos: f.p(0, mh - 0.13, l * 0.48 + 0.02), rot });
  for (const s of [-1, 1]) {
    b.geo(cushion(w / 2 - 0.12, 0.14, 0.42, 0.6), pillow, { pos: f.p(s * w / 4, mh + 0.06, -l / 2 + 0.3), rot: [0.35, rot, 0, 'YXZ'] });
    b.geo(cushion(w / 2 - 0.2, 0.12, 0.36, 0.6), blanket === M.fabTeal ? M.fabMustard : M.fabSaffron, { pos: f.p(s * w / 4.3, mh + 0.13, -l / 2 + 0.48), rot: [0.5, rot, 0, 'YXZ'] });
  }
  // headboard
  b.geo(roundedBox(w + 0.5, 1.2, 0.12, 0.05), frameMat, { pos: f.p(0, 0.6, -l / 2 - 0.06), rot });
  b.geo(cushion(w + 0.3, 0.95, 0.08, 0.2), headboard, { pos: f.p(0, 0.72, -l / 2 + 0.02), rot: [Math.PI / 2, rot, 0, 'YXZ'] });
  if (canopy) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(...f.p(sx * (w / 2 + 0.1), 0, sz * (l / 2 + 0.05)), 0.04, 0.04, 2.5, M.gold, { seg: 12 });
    for (const sz of [-1, 1]) b.box(...f.p(0, 2.48, sz * (l / 2 + 0.05)), w + 0.3, 0.05, 0.05, M.gold, { rot });
    for (const sx of [-1, 1]) b.box(...f.p(sx * (w / 2 + 0.1), 2.48, 0), 0.05, 0.05, l + 0.15, M.gold, { rot });
    // sheer drapes
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const g = pleat(0.55, 2.3, 10, 0.05);
      b.geo(g, M.lampSoft === null ? M.linen : sheer(), { pos: f.p(sx * (w / 2 + 0.05), 0.15, sz * (l / 2 + 0.02)), rot: rot + (sx > 0 ? Math.PI / 2 : -Math.PI / 2), cast: false });
    }
  }
  const lie = ctx.seat({ x: f.p(0, 0, 0.15)[0], z: f.p(0, 0, 0.15)[2], y, yaw: rot + Math.PI, mode: 'lie', seatH: mh + 0.02, floor, label, exit: [f.p(w / 2 + 0.6, 0, 0.3)[0], f.p(w / 2 + 0.6, 0, 0.3)[2]] });
  lie.pos.copy(new THREE.Vector3(...f.p(w / 2 + 0.2, 0.6, 0.2)));
  lie.r = 1.3;
  ctx.physics.addBoxRot(x, y, z, w + 0.1, 0.62, l + 0.2, rot);
  return lie;
}

let _sheer = null;
function sheer() { if (!_sheer) _sheer = new THREE.MeshStandardMaterial({ color: 0xfffaf2, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }); return _sheer; }

// Pleated fabric panel (curtains): width w, height h, folds n, depth amplitude a
export function pleat(w, h, n, a) {
  const g = new THREE.PlaneGeometry(w, h, n * 6, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin((x / w + 0.5) * n * Math.PI * 2) * a);
    p.setY(i, p.getY(i) + h / 2);
  }
  g.computeVertexNormals();
  return g;
}

export function buildCurtains(ctx) {
  const b = ctx.b;
  const pal = { temple: M.fabMaroon, living: M.fabCream, dining: M.fabSand, music: M.fabMaroon, library: M.fabEmerald, yoga: M.linen, bedroom: M.fabNavy, guest: M.fabBlush, study: M.fabCharcoal, lounge: M.fabMustard, suite: M.fabPlum, tea: M.fabSaffron };
  for (const c of ctx.curtains || []) {
    ctx.setLayer(Math.round(c.y0 / 4));
    const mat = pal[c.room] || M.fabCream;
    const top = c.y0 + c.top;
    const ph = c.top - 0.02;
    for (const s of [-1, 1]) {
      const g = pleat(0.55, ph, 6, 0.045);
      const along = c.c + s * (c.w / 2 + 0.18);
      const pos = c.axis === 'x' ? [along, c.y0 + 0.02, c.fixed] : [c.fixed, c.y0 + 0.02, along];
      b.geo(g, mat, { pos, rot: c.axis === 'x' ? 0 : Math.PI / 2, cast: false });
      // sheer inner layer
    }
    const rodLen = c.w + 1.0;
    const pos = c.axis === 'x' ? [c.c, top + 0.04, c.fixed] : [c.fixed, top + 0.04, c.c];
    const g = new THREE.CylinderGeometry(0.016, 0.016, rodLen, 8); g.rotateZ(Math.PI / 2);
    b.geo(g, M.brass, { pos, rot: c.axis === 'x' ? 0 : Math.PI / 2 });
  }
}

export function wardrobe(ctx, { x, z, y, rot = 0, w = 2.2, h = 2.4, d = 0.62, mat = M.walnut, handle = M.brass, doors = 3 }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  b.geo(roundedBox(w, h, d, 0.01), mat, { pos: f.p(0, h / 2, 0), rot });
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const cx = -w / 2 + dw * (i + 0.5);
    b.geo(roundedBox(dw - 0.03, h - 0.1, 0.02, 0.005), mat, { pos: f.p(cx, h / 2, d / 2 + 0.005), rot });
    b.geo(new THREE.BoxGeometry(0.02, 0.4, 0.03), handle, { pos: f.p(cx + (i % 2 ? -1 : 1) * (dw / 2 - 0.08), h / 2, d / 2 + 0.03), rot });
  }
  ctx.physics.addBoxRot(x, y, z, w, h, d, rot);
}

export function bookshelf(ctx, { x, z, y, rot = 0, w = 1.8, h = 2.4, d = 0.36, mat = M.walnut, shelves = 6, deco = true }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  b.geo(new THREE.BoxGeometry(w, h, 0.02), mat, { pos: f.p(0, h / 2, -d / 2 + 0.01), rot });
  for (const s of [-1, 1]) b.geo(new THREE.BoxGeometry(0.04, h, d), mat, { pos: f.p(s * (w / 2 - 0.02), h / 2, 0), rot });
  const rnd = mulberry32(Math.floor(x * 13 + z * 7));
  for (let i = 0; i <= shelves; i++) {
    const sy = 0.05 + i * (h - 0.1) / shelves;
    b.geo(new THREE.BoxGeometry(w - 0.06, 0.03, d - 0.02), mat, { pos: f.p(0, sy, 0), rot });
    if (i < shelves) {
      const bh = (h - 0.1) / shelves - 0.06;
      // books as a textured box front with depth
      const bw = w - 0.12 - (deco && rnd() < 0.5 ? 0.45 : 0);
      const bg = new THREE.BoxGeometry(bw, bh * 0.95, d - 0.08);
      const uv = bg.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * bw * 0.9 + rnd(), uv.getY(k) * 0.95 + 0.02);
      b.geo(bg, M.books, { pos: f.p(-(w - 0.12 - bw) / 2, sy + 0.015 + bh * 0.475, 0), rot, uv: 'keep' });
      if (bw < w - 0.2) {
        const kx = (w - 0.12) / 2 - 0.2;
        if (rnd() < 0.5) b.geo(new THREE.SphereGeometry(0.08, 16, 12), M.ceramic, { pos: f.p(kx, sy + 0.1, 0), rot });
        else b.cyl(...f.p(kx, sy + 0.015, 0), 0.06, 0.08, 0.22, M.brass, { seg: 16 });
      }
    }
  }
  ctx.physics.addBoxRot(x, y, z, w, h, d, rot);
}

// Foliage made of curved leaf cards with vertex colours, merged into the leaf batch.
export function plant(ctx, { x, z, y, size = 1, kind = 'tall', pot = M.terracotta, seed = 1, potH = 0.42, collide = true }) {
  const b = ctx.b;
  const rnd = mulberry32(seed + Math.floor(x * 100 + z * 37));
  if (pot) {
    b.lathe([[0.0, 0], [0.18 * size, 0], [0.22 * size, potH * 0.2], [0.24 * size, potH], [0.26 * size, potH + 0.02], [0.22 * size, potH + 0.02]], pot, { pos: [x, y, z], seg: 24 });
    b.cyl(x, y + potH - 0.04, z, 0.21 * size, 0.21 * size, 0.03, M.soil, { seg: 20 });
  }
  const base = y + (pot ? potH : 0);
  const leaves = kind === 'palm' ? 14 : kind === 'bush' ? 46 : kind === 'monstera' ? 12 : kind === 'tulsi' ? 60 : 28;
  for (let i = 0; i < leaves; i++) {
    const a = rnd() * Math.PI * 2;
    let ht, len, wid, tilt;
    if (kind === 'palm') { ht = 0.5 + rnd() * 0.9; len = 0.9; wid = 0.18; tilt = 0.9 + rnd() * 0.5; }
    else if (kind === 'bush') { ht = 0.1 + rnd() * 0.5; len = 0.22; wid = 0.12; tilt = 0.3 + rnd() * 1.2; }
    else if (kind === 'monstera') { ht = 0.25 + rnd() * 0.7; len = 0.45; wid = 0.38; tilt = 0.6 + rnd() * 0.6; }
    else if (kind === 'tulsi') { ht = 0.05 + rnd() * 0.45; len = 0.07; wid = 0.05; tilt = 0.5 + rnd() * 0.8; }
    else { ht = 0.3 + rnd() * 1.4; len = 0.35; wid = 0.12; tilt = 0.4 + rnd() * 0.7; }
    ht *= size; len *= size; wid *= size;
    const g = new THREE.PlaneGeometry(wid, len, 2, 4);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const yy = p.getY(k) / len + 0.5; // 0..1
      const xx = p.getX(k) / wid;
      p.setX(k, p.getX(k) * Math.sin(yy * Math.PI) * 1.1);
      p.setZ(k, -yy * yy * 0.25 * len + Math.abs(xx) * 0.04 * wid * 4);
      p.setY(k, p.getY(k) + len / 2);
    }
    const col = new THREE.Color().setHSL(0.27 + rnd() * 0.08, 0.45 + rnd() * 0.2, 0.22 + rnd() * 0.14);
    const m = matrix([x + Math.sin(a) * 0.05 * size, base + ht, z + Math.cos(a) * 0.05 * size], [tilt, a, 0, 'YXZ']);
    b.add(g, M.leaf, { m, color: col, uv: 'keep' });
    if (kind !== 'bush' && kind !== 'tulsi') {
      const stem = new THREE.CylinderGeometry(0.006 * size, 0.008 * size, ht, 4);
      b.add(stem, M.leaf, { m: matrix([x, base + ht / 2, z], 0), color: new THREE.Color(0x3a5a2a), uv: 'keep' });
    }
  }
  if (collide) ctx.physics.addCyl(x, z, 0.25 * size, y, y + 1);
}

export function floorLamp(ctx, { x, z, y, floor, h = 1.65 }) {
  const b = ctx.b;
  b.cyl(x, y, z, 0.18, 0.2, 0.03, M.brass, { seg: 24 });
  b.cyl(x, y, z, 0.015, 0.015, h, M.brass, { seg: 8 });
  b.cyl(x, y + h - 0.12, z, 0.16, 0.24, 0.32, M.lampSoft, { seg: 24, open: true });
  ctx.light({ pos: [x, y + h - 0.05, z], floor, intensity: 6, distance: 5, color: 0xffc98a });
  ctx.physics.addCyl(x, z, 0.2, y, y + h);
}

export function tableLamp(ctx, { x, z, y, floor, base = M.ceramic }) {
  const b = ctx.b;
  b.lathe([[0, 0], [0.07, 0], [0.1, 0.12], [0.06, 0.25], [0.02, 0.3], [0.02, 0.32]], base, { pos: [x, y, z] });
  b.cyl(x, y + 0.3, z, 0.11, 0.16, 0.2, M.lampSoft, { seg: 20, open: true });
  ctx.light({ pos: [x, y + 0.4, z], floor, intensity: 3, distance: 3.5, color: 0xffc27a });
}

export function pendant(ctx, { x, z, yTop, drop = 1.0, floor, r = 0.22, mat = M.brass }) {
  const b = ctx.b;
  b.cyl(x, yTop - drop, z, 0.004, 0.004, drop, M.blackMetal, { seg: 4 });
  b.sphere(x, yTop - drop, z, r, mat, { seg: 24, segH: 12, thetaLen: Math.PI / 2 });
  b.sphere(x, yTop - drop - 0.02, z, r * 0.45, M.lampWarm, { seg: 16 });
  ctx.light({ pos: [x, yTop - drop - 0.3, z], floor, intensity: 8, distance: 6, color: 0xffc98a });
}

export function chandelier(ctx, { x, z, yTop, size = 1, floor, drop = 0.9 }) {
  const b = ctx.b;
  const cy = yTop - drop;
  b.cyl(x, cy, z, 0.008, 0.008, drop, M.gold, { seg: 6 });
  for (const [r, yy, n] of [[0.75 * size, 0, 12], [0.5 * size, 0.28 * size, 8], [0.28 * size, 0.52 * size, 6]]) {
    const ring = new THREE.TorusGeometry(r, 0.018, 8, 48); ring.rotateX(Math.PI / 2);
    b.geo(ring, M.goldPolish, { pos: [x, cy + yy, z] });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      b.cyl(px, cy + yy, pz, 0.018, 0.02, 0.1, M.lampWarm, { seg: 8 });
      for (let k = 0; k < 3; k++) b.sphere(px, cy + yy - 0.08 - k * 0.07, pz, 0.018 - k * 0.003, M.glass, { seg: 8, segH: 6, cast: false });
    }
  }
  b.sphere(x, cy - 0.15 * size, z, 0.14 * size, M.goldPolish, { seg: 20 });
  ctx.light({ pos: [x, cy, z], floor, intensity: 26 * size, distance: 12, color: 0xffd2a0 });
}

// Framed picture with a canvas texture (deity art, photographs or uploads).
export function framedPicture(ctx, { x, z, y, rot = 0, w = 0.8, h = 1.0, tex, frameMat = M.gold, depth = 0.05, border = 0.08, floor, id, label, glow = false }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  const fw = w + border * 2, fh = h + border * 2;
  // ornate frame: outer + inner bevel strips
  for (const [sx, sy, sw, sh] of [[0, fh / 2 - border / 2, fw, border], [0, -fh / 2 + border / 2, fw, border], [-fw / 2 + border / 2, 0, border, fh], [fw / 2 - border / 2, 0, border, fh]]) {
    b.geo(roundedBox(sw, sh, depth, 0.012), frameMat, { pos: f.p(sx, sy, depth / 2), rot });
  }
  b.geo(new THREE.BoxGeometry(fw - border * 1.2, fh - border * 1.2, 0.012), M.ceramicBlack, { pos: f.p(0, 0, 0.006), rot });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.05, emissive: glow ? 0xffffff : 0x000000, emissiveMap: glow ? tex : null, emissiveIntensity: glow ? 0.18 : 0 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.set(...f.p(0, 0, depth * 0.5)); plane.rotation.y = rot;
  plane.receiveShadow = true;
  ctx.dyn.add(plane);
  const rec = { id, mesh: plane, w, h, floor, label };
  ctx.world.frames.push(rec);
  return rec;
}

export function toilet(ctx, { x, z, y, rot = 0, floor }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  b.lathe([[0, 0], [0.16, 0], [0.18, 0.2], [0.2, 0.38], [0.0, 0.38]], M.ceramic, { pos: f.p(0, 0, 0.08), seg: 28, scale: [1, 1, 1.3] });
  b.geo(roundedBox(0.42, 0.04, 0.5, 0.02), M.ceramic, { pos: f.p(0, 0.4, 0.1), rot });
  b.geo(roundedBox(0.44, 0.4, 0.18, 0.04), M.ceramic, { pos: f.p(0, 0.6, -0.2), rot });
  b.geo(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), M.chrome, { pos: f.p(0, 0.81, -0.2) });
  ctx.physics.addBoxRot(...f.p(0, 0, -0.05), 0.45, 0.42, 0.7, rot);
  const seat = ctx.seat({ x: f.p(0, 0, 0.12)[0], z: f.p(0, 0, 0.12)[2], y, yaw: rot, seatH: 0.42, mode: 'toilet', floor, label: 'Sit on the toilet', exit: [f.p(0, 0, 0.75)[0], f.p(0, 0, 0.75)[2]] });
  ctx.interact({ pos: f.p(0, 0.8, -0.2), r: 1.1, floor, label: 'Flush', key: 'F', action: (g) => g.audio.flush() });
  return seat;
}

export function vanity(ctx, { x, z, y, rot = 0, w = 1.6, floor, top = M.marble, body = M.walnut, sinks = 2, mirror = true }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  b.geo(roundedBox(w, 0.5, 0.55, 0.01), body, { pos: f.p(0, 0.45, 0), rot });
  b.geo(roundedBox(w + 0.04, 0.04, 0.58, 0.01), top, { pos: f.p(0, 0.72, 0.01), rot });
  for (let i = 0; i < sinks; i++) {
    const sx = sinks === 1 ? 0 : (i - 0.5) * w * 0.5;
    b.geo(new THREE.CylinderGeometry(0.2, 0.17, 0.14, 32), M.ceramic, { pos: f.p(sx, 0.81, 0.04), rot, scale: [1, 1, 0.8] });
    b.cyl(...f.p(sx, 0.74, -0.2), 0.016, 0.016, 0.28, M.chrome, { seg: 10 });
    b.geo(new THREE.BoxGeometry(0.03, 0.03, 0.16), M.chrome, { pos: f.p(sx, 1.0, -0.13), rot });
    ctx.interact({ pos: f.p(sx, 0.9, 0.1), r: 0.9, floor, label: 'Wash your hands', action: (g) => g.audio.water(2.5) });
  }
  if (mirror) {
    b.geo(roundedBox(w, 0.95, 0.03, 0.01), M.chrome, { pos: f.p(0, 1.65, -0.26), rot });
    b.box(...f.p(0, 2.15, -0.22), w * 0.9, 0.04, 0.05, M.ledStrip, { rot, cast: false });
  }
  ctx.physics.addBoxRot(x, y, z, w, 0.85, 0.58, rot);
}

export function bathtub(ctx, { x, z, y, rot = 0, floor, len = 1.8, free = true }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  const g = new THREE.CapsuleGeometry(0.42, len - 0.84, 8, 24); g.rotateX(Math.PI / 2); g.scale(1, 0.72, 1);
  b.geo(g, M.ceramic, { pos: f.p(0, 0.32, 0), rot });
  const w = new THREE.CapsuleGeometry(0.36, len - 0.84, 8, 24); w.rotateX(Math.PI / 2); w.scale(1, 0.1, 1);
  b.geo(w, M.water, { pos: f.p(0, 0.55, 0), rot, cast: false });
  if (free) for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sphere(...f.p(sx * 0.3, 0.05, sz * (len / 2 - 0.25)), 0.06, M.goldPolish, { seg: 10 });
  b.cyl(...f.p(0, 0, -len / 2 - 0.15), 0.025, 0.025, 1.0, M.goldPolish, { seg: 10 });
  b.geo(new THREE.TorusGeometry(0.12, 0.02, 8, 16, Math.PI), M.goldPolish, { pos: f.p(0, 1.0, -len / 2 - 0.03), rot: [0, rot + Math.PI / 2, 0, 'YXZ'] });
  ctx.physics.addBoxRot(x, y, z, 0.9, 0.62, len, rot);
  ctx.seat({ x, z, y, yaw: rot + Math.PI, mode: 'lie', seatH: 0.1, floor, label: 'Relax in the bath', exit: [f.p(0.9, 0, 0)[0], f.p(0.9, 0, 0)[2]] });
  ctx.interact({ pos: f.p(0, 0.9, -len / 2), r: 1.2, floor, label: 'Run the tap', key: 'F', action: (g) => g.audio.water(4) });
}

export function shower(ctx, { x, z, y, w = 1.4, d = 1.2, floor, rot = 0 }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  b.geo(new THREE.BoxGeometry(w, 0.04, d), M.marbleBlack, { pos: f.p(0, 0.02, 0), rot, cast: false });
  b.geo(new THREE.BoxGeometry(0.02, 2.1, d), M.glassRail, { pos: f.p(w / 2, 1.05, 0), rot, cast: false });
  b.geo(new THREE.BoxGeometry(w * 0.55, 2.1, 0.02), M.glassRail, { pos: f.p(w * 0.22, 1.05, d / 2), rot, cast: false });
  b.cyl(...f.p(0, 2.2, -d / 2 + 0.35), 0.18, 0.18, 0.02, M.chrome, { seg: 24 });
  b.box(...f.p(0, 2.2, -d / 2 + 0.15), 0.03, 0.03, 0.4, M.chrome, { rot });
  ctx.physics.addBoxRot(...f.p(w / 2, 0, 0), 0.06, 2.1, d, rot);
  ctx.physics.addBoxRot(...f.p(w * 0.22, 0, d / 2), w * 0.55, 2.1, 0.06, rot);
  const water = makeShowerWater(f.p(0, 2.18, -d / 2 + 0.35));
  ctx.dyn.add(water.points);
  ctx.anim((dt) => water.update(dt));
  ctx.interact({ pos: f.p(0, 1.2, 0), r: 1.2, floor, label: 'Turn the shower on/off', key: 'F', action: (g) => { water.on = !water.on; g.audio.water(water.on ? 6 : 0.2); } });
}

function makeShowerWater(pos) {
  const n = 500;
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3), v = new Float32Array(n);
  for (let i = 0; i < n; i++) { p[i * 3] = pos[0]; p[i * 3 + 1] = -100; p[i * 3 + 2] = pos[2]; v[i] = Math.random(); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.02, transparent: true, opacity: 0.6, depthWrite: false }));
  pts.frustumCulled = false;
  const st = { points: pts, on: false, update(dt) {
    if (!st.on && pts.visible === false) return;
    pts.visible = true;
    let alive = 0;
    for (let i = 0; i < n; i++) {
      let y = p[i * 3 + 1];
      if (y < pos[1] - 2.2 || y < -50) {
        if (st.on) { const a = Math.random() * 6.28, r = Math.random() * 0.16; p[i * 3] = pos[0] + Math.cos(a) * r; p[i * 3 + 2] = pos[2] + Math.sin(a) * r; p[i * 3 + 1] = pos[1] - Math.random() * 0.3; }
        else p[i * 3 + 1] = -100;
      } else { p[i * 3 + 1] -= dt * (4 + v[i] * 2); alive++; }
    }
    g.attributes.position.needsUpdate = true;
    if (!st.on && alive === 0) pts.visible = false;
  } };
  return st;
}

export function kitchenRun(ctx, { x0, x1, z, y, axis = 'x', side = 1, floor, upper = true, top = M.marbleBlack, body = M.woodLacquer }) {
  // a straight run of base cabinets (+ uppers) against a wall. side: which way the fronts face
  const b = ctx.b;
  const len = Math.abs(x1 - x0), mid = (x0 + x1) / 2;
  const d = 0.62;
  const P = (s, off, yy) => axis === 'x' ? [s, yy, z + side * off] : [z + side * off, yy, s];
  const rot = axis === 'x' ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
  b.geo(new THREE.BoxGeometry(axis === 'x' ? len : d, 0.82, axis === 'x' ? d : len), body, { pos: P(mid, d / 2, 0.06 + 0.41) });
  b.geo(new THREE.BoxGeometry(axis === 'x' ? len : d - 0.06, 0.08, axis === 'x' ? d - 0.06 : len), M.blackMetal, { pos: P(mid, d / 2 - 0.03, 0.04) });
  b.geo(new THREE.BoxGeometry(axis === 'x' ? len + 0.02 : d + 0.03, 0.04, axis === 'x' ? d + 0.03 : len + 0.02), top, { pos: P(mid, d / 2 + 0.01, 0.9) });
  const n = Math.max(1, Math.round(len / 0.6));
  for (let i = 0; i < n; i++) {
    const s = Math.min(x0, x1) + (i + 0.5) * len / n;
    b.geo(new THREE.BoxGeometry(axis === 'x' ? 0.3 : 0.02, 0.02, axis === 'x' ? 0.02 : 0.3), M.goldPolish, { pos: P(s, d + 0.01, 0.8) });
    b.geo(new THREE.BoxGeometry(axis === 'x' ? len / n - 0.01 : 0.004, 0.005, axis === 'x' ? 0.004 : len / n - 0.01), M.blackMetal, { pos: P(s, d + 0.002, 0.5) });
  }
  if (upper) {
    b.geo(new THREE.BoxGeometry(axis === 'x' ? len : 0.36, 0.8, axis === 'x' ? 0.36 : len), body, { pos: P(mid, 0.18, 1.75) });
    b.geo(new THREE.BoxGeometry(axis === 'x' ? len : 0.02, 0.02, axis === 'x' ? 0.02 : len), M.ledStrip, { pos: P(mid, 0.3, 1.72), cast: false });
  }
  if (axis === 'x') ctx.physics.addBox(Math.min(x0, x1), y, Math.min(z, z + side * d), Math.max(x0, x1), y + 0.92, Math.max(z, z + side * d));
  else ctx.physics.addBox(Math.min(z, z + side * d), y, Math.min(x0, x1), Math.max(z, z + side * d), y + 0.92, Math.max(x0, x1));
  return { rot, P, d };
}

export function tv(ctx, { x, z, y, rot = 0, w = 1.9, tex }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  const h = w * 0.5625;
  b.geo(roundedBox(w + 0.04, h + 0.04, 0.04, 0.01), M.plastic, { pos: f.p(0, h / 2, 0), rot });
  const mat = new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? 0xffffff : 0x050608, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  screen.position.set(...f.p(0, h / 2, 0.022)); screen.rotation.y = rot;
  ctx.dyn.add(screen);
  return screen;
}

export function fireplace(ctx, { x, z, y, rot = 0, w = 1.8, floor }) {
  const f = frame(x, y, z, rot), b = ctx.b;
  b.geo(new THREE.BoxGeometry(w + 0.6, 1.25, 0.4), M.marbleBlack, { pos: f.p(0, 0.62, 0), rot });
  b.geo(new THREE.BoxGeometry(w, 0.5, 0.42), M.ceramicBlack, { pos: f.p(0, 0.45, 0.01), rot });
  b.geo(new THREE.BoxGeometry(w + 0.8, 0.06, 0.5), M.marble, { pos: f.p(0, 1.25, 0.02), rot });
  const flames = [];
  for (let i = 0; i < 7; i++) {
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 8), M.flame);
    fl.position.set(...f.p(-w / 2 + 0.25 + i * (w - 0.5) / 6, 0.36, 0.1));
    ctx.dyn.add(fl); flames.push(fl);
  }
  ctx.light({ pos: f.p(0, 0.6, 0.6), floor, intensity: 6, distance: 6, color: 0xff8a3a, flicker: 2, dayScale: 0.8 });
  ctx.anim((dt, t) => { for (let i = 0; i < flames.length; i++) { const s = 0.8 + Math.sin(t * 9 + i * 1.7) * 0.2 + Math.sin(t * 23 + i) * 0.1; flames[i].scale.set(1, s, 1); } });
  ctx.physics.addBoxRot(x, y, z, w + 0.6, 1.25, 0.6, rot);
}

export { frame };
