import * as THREE from 'three';
import { FH, SLAB, CEIL, HX, HZ, A, STAIR, GROUND_Y, floorY } from '../config.js';
import { M } from './materials.js';
import { matrix, slabShape, tube, roundedBox } from './builder.js';

// ---------------------------------------------------------------------------
// Room finishes
export function roomFinish() {
  return {
    foyer: { wall: M.wallIvory, floor: M.marble },
    temple: { wall: M.wallIvory, floor: M.marble },
    living: { wall: M.wallSage, floor: M.oak },
    dining: { wall: M.wallBlush, floor: M.marbleBeige },
    kitchen: { wall: M.wallWhite, floor: M.terrazzo },
    store: { wall: M.wallWhite, floor: M.concrete },
    washroom: { wall: M.washTile, floor: M.washTile },
    atrium0: { wall: M.wallWhite, floor: M.marble },
    music: { wall: M.wallTerracotta, floor: M.oak },
    library: { wall: M.wallOlive, floor: M.oak },
    yoga: { wall: M.wallMint, floor: M.ash },
    sunroom: { wall: M.wallWhite, floor: M.terrazzo },
    balcony1: { wall: M.extPlaster, floor: M.deck },
    gallery1: { wall: M.wallWhite, floor: M.marble },
    bedroom: { wall: M.wallBlue, floor: M.oak },
    bathroom: { wall: M.marbleWall, floor: M.bathTile },
    guest: { wall: M.wallBlush, floor: M.ash },
    study: { wall: M.wallOlive, floor: M.walnut },
    lounge: { wall: M.wallIvory, floor: M.oak },
    gallery2: { wall: M.wallWhite, floor: M.marble },
    suite: { wall: M.damask, floor: M.oak },
    spa: { wall: M.marbleWall, floor: M.marbleBlack },
    cinema: { wall: M.wallNavy, floor: M.fabCharcoal },
    tea: { wall: M.wallSaffron, floor: M.terrazzo },
    balcony3: { wall: M.extPlaster, floor: M.deck },
    gallery3: { wall: M.wallWhite, floor: M.marble },
    ext: { wall: M.extPlaster, floor: M.paving },
  };
}

// Opening helpers ------------------------------------------------------------
const win = (c, w, o = {}) => ({ c, w, kind: 'window', sill: o.sill ?? 0.8, h: o.h ?? 2.3, frost: o.frost, jali: o.jali, curtain: o.curtain ?? true });
const door = (c, w, h = 2.4, kind = 'hinge') => ({ c, w, h, sill: 0, kind });
const opening = (c, w, h = 2.6) => ({ c, w, h, sill: 0, kind: 'opening' });
const arch = (c, w, h = 3.2) => ({ c, w, h, sill: 0, kind: 'arch' });

// Wall plan per floor: [axis, fixed coord, from, to, negRoom, posRoom, openings]
export const WALLS = [
  // ---------------- Ground
  [
    ['x', 12, -16, -5.5, 'temple', 'ext', [win(-13.2, 2.2, { jali: true }), win(-8.3, 2.2, { jali: true })]],
    ['x', 12, -5.5, 5.5, 'foyer', 'ext', [door(0, 2.6, 3.3, 'main'), win(-3.7, 1.2, { sill: 0.3, h: 3.0, curtain: false }), win(3.7, 1.2, { sill: 0.3, h: 3.0, curtain: false })]],
    ['x', 12, 5.5, 16, 'dining', 'ext', [win(8.3, 2.2), win(13.2, 2.2)]],
    ['x', -12, -16, -5.5, 'ext', 'living', [win(-13.2, 2.6, { sill: 0.3, h: 2.8 }), win(-8.3, 2.6, { sill: 0.3, h: 2.8 })]],
    ['x', -12, -5.5, -0.5, 'ext', 'store', [win(-3, 0.8, { sill: 1.9, h: 0.6, curtain: false })]],
    ['x', -12, -0.5, 5.5, 'ext', 'washroom', [win(2.5, 0.9, { sill: 1.8, h: 0.7, frost: true, curtain: false })]],
    ['x', -12, 5.5, 16, 'ext', 'kitchen', [win(8.3, 2.2, { sill: 1.15, h: 1.4, curtain: false }), win(13.2, 2.2, { sill: 1.15, h: 1.4, curtain: false })]],
    ['z', -16, 0, 12, 'ext', 'temple', [win(1.6, 1.4, { sill: 1.0, h: 2.0, jali: true, curtain: false }), win(10.4, 1.4, { sill: 1.0, h: 2.0, jali: true, curtain: false })]],
    ['z', -16, -12, 0, 'ext', 'living', [win(-3, 2.6, { sill: 0.3, h: 2.8 }), win(-9, 2.6, { sill: 0.3, h: 2.8 })]],
    ['z', 16, 0, 12, 'dining', 'ext', [win(3, 2.2), win(9, 2.2)]],
    ['z', 16, -12, 0, 'kitchen', 'ext', [win(-3, 2.2, { sill: 1.15, h: 1.4, curtain: false }), win(-9.5, 1.6)]],
    ['z', -5.5, 5.5, 12, 'temple', 'foyer', [arch(8.75, 3, 3.2)]],
    ['z', -5.5, 0, 5.5, 'temple', 'atrium0', [opening(2.75, 1.6, 2.6)]],
    ['z', -5.5, -5.5, 0, 'living', 'atrium0', [opening(-2.75, 1.8, 2.7)]],
    ['z', -5.5, -12, -5.5, 'living', 'store', []],
    ['z', 5.5, 5.5, 12, 'foyer', 'dining', [arch(8.75, 3, 3.2)]],
    ['z', 5.5, 0, 5.5, 'atrium0', 'dining', [opening(2.75, 1.8, 2.7)]],
    ['z', 5.5, -5.5, 0, 'atrium0', 'kitchen', [opening(-2.75, 1.8, 2.7)]],
    ['z', 5.5, -12, -5.5, 'washroom', 'kitchen', []],
    ['x', 0, -16, -5.5, 'living', 'temple', []],
    ['x', 0, 5.5, 16, 'kitchen', 'dining', [opening(11, 3.6, 2.9)]],
    ['x', 5.5, -5.5, 5.5, 'atrium0', 'foyer', [arch(0, 5, 3.4)]],
    ['x', -5.5, -5.5, -0.5, 'store', 'atrium0', [door(-3, 1.0, 2.3)]],
    ['x', -5.5, -0.5, 5.5, 'washroom', 'atrium0', [door(2.5, 1.0, 2.3)]],
    ['z', -0.5, -12, -5.5, 'store', 'washroom', []],
  ],
  // ---------------- First
  [
    ['x', 12, -16, -5.5, 'music', 'ext', [win(-13.2, 2.4, { sill: 0.5, h: 2.8 }), win(-8.3, 2.4, { sill: 0.5, h: 2.8 })]],
    ['x', 12, -5.5, 5.5, 'sunroom', 'ext', [door(0, 4.2, 2.9, 'slide'), win(-3.95, 1.5, { sill: 0.3, h: 2.9, curtain: false }), win(3.95, 1.5, { sill: 0.3, h: 2.9, curtain: false })]],
    ['x', 12, 5.5, 16, 'library', 'ext', [win(8.3, 2.2), win(13.2, 2.2)]],
    ['x', -12, -16, -5.5, 'ext', 'music', [win(-13.2, 2.4, { sill: 0.5, h: 2.8 }), win(-8.3, 2.4, { sill: 0.5, h: 2.8 })]],
    ['x', -12, -5.5, 5.5, 'ext', 'gallery1', [win(0, 6, { sill: 0.3, h: 3.1, curtain: false })]],
    ['x', -12, 5.5, 16, 'ext', 'yoga', [win(8.3, 2.6, { sill: 0.3, h: 2.9 }), win(13.2, 2.6, { sill: 0.3, h: 2.9 })]],
    ['z', -16, -12, 12, 'ext', 'music', [win(-8, 2, { sill: 0.6, h: 2.6 }), win(-2, 2, { sill: 0.6, h: 2.6 }), win(4, 2, { sill: 0.6, h: 2.6 }), win(9.3, 2, { sill: 0.6, h: 2.6 })]],
    ['z', 16, 0, 12, 'library', 'ext', [win(3, 2.2), win(9, 2.2)]],
    ['z', 16, -12, 0, 'yoga', 'ext', [win(-3, 2.6, { sill: 0.3, h: 2.9 }), win(-9, 2.6, { sill: 0.3, h: 2.9 })]],
    ['z', -5.5, 5.5, 12, 'music', 'sunroom', []],
    ['z', -5.5, -12, 5.5, 'music', 'gallery1', [door(0, 2.4, 3.0, 'double')]],
    ['z', 5.5, 5.5, 12, 'sunroom', 'library', []],
    ['z', 5.5, 0, 5.5, 'gallery1', 'library', [opening(2.75, 1.8, 2.7)]],
    ['z', 5.5, -12, 0, 'gallery1', 'yoga', [door(-2.75, 1.4, 2.6, 'hinge')]],
    ['x', 0, 5.5, 16, 'yoga', 'library', []],
    ['x', 5.5, -5.5, 5.5, 'gallery1', 'sunroom', [opening(0, 4.4, 3.2)]],
  ],
  // ---------------- Second
  [
    ['x', 12, -16, -5.5, 'bedroom', 'ext', [win(-13.2, 2.2, { sill: 0.6, h: 2.4 }), win(-8.3, 2.2, { sill: 0.6, h: 2.4 })]],
    ['x', 12, -5.5, 5.5, 'lounge', 'ext', [win(0, 5, { sill: 0.45, h: 2.7 })]],
    ['x', 12, 5.5, 16, 'guest', 'ext', [win(8.3, 2.2), win(13.2, 2.2)]],
    ['x', -12, -16, -5.5, 'ext', 'bathroom', [win(-10.75, 2.4, { sill: 1.5, h: 1.4, frost: true, curtain: false })]],
    ['x', -12, -5.5, 5.5, 'ext', 'gallery2', [win(0, 6, { sill: 0.3, h: 3.1, curtain: false })]],
    ['x', -12, 5.5, 16, 'ext', 'study', [win(8.3, 2.2), win(13.2, 2.2)]],
    ['z', -16, 0, 12, 'ext', 'bedroom', [win(3, 2.2, { sill: 0.6, h: 2.4 }), win(9, 2.2, { sill: 0.6, h: 2.4 })]],
    ['z', -16, -12, 0, 'ext', 'bathroom', [win(-6, 2, { sill: 1.5, h: 1.4, frost: true, curtain: false })]],
    ['z', 16, 0, 12, 'guest', 'ext', [win(3, 2.2), win(9, 2.2)]],
    ['z', 16, -12, 0, 'study', 'ext', [win(-3, 2.2), win(-9, 2.2)]],
    ['z', -5.5, 5.5, 12, 'bedroom', 'lounge', []],
    ['z', -5.5, 0, 5.5, 'bedroom', 'gallery2', [door(2.75, 1.2, 2.4, 'hinge')]],
    ['z', -5.5, -12, 0, 'bathroom', 'gallery2', [door(-2.75, 1.1, 2.4, 'hinge')]],
    ['z', 5.5, 5.5, 12, 'lounge', 'guest', []],
    ['z', 5.5, 0, 5.5, 'gallery2', 'guest', [door(2.75, 1.2, 2.4, 'hinge')]],
    ['z', 5.5, -12, 0, 'gallery2', 'study', [door(-2.75, 1.2, 2.4, 'hinge')]],
    ['x', 0, -16, -5.5, 'bathroom', 'bedroom', []],
    ['x', 0, 5.5, 16, 'study', 'guest', []],
    ['x', 5.5, -5.5, 5.5, 'gallery2', 'lounge', [opening(0, 4.4, 3.2)]],
  ],
  // ---------------- Third
  [
    ['x', 12, -16, -5.5, 'suite', 'ext', [door(-10.75, 5, 2.9, 'slide')]],
    ['x', 12, -5.5, 5.5, 'tea', 'ext', [door(0, 4.2, 2.9, 'slide')]],
    ['x', 12, 5.5, 16, 'cinema', 'ext', []],
    ['x', -12, -16, -5.5, 'ext', 'spa', [win(-10.75, 3, { sill: 1.2, h: 1.7, curtain: false })]],
    ['x', -12, -5.5, 5.5, 'ext', 'gallery3', [win(0, 6, { sill: 0.3, h: 3.1, curtain: false })]],
    ['x', -12, 5.5, 16, 'ext', 'cinema', []],
    ['z', -16, -3, 12, 'ext', 'suite', [win(2, 2.2, { sill: 0.5, h: 2.6 }), win(8, 2.2, { sill: 0.5, h: 2.6 })]],
    ['z', -16, -12, -3, 'ext', 'spa', [win(-7.5, 2.4, { sill: 1.2, h: 1.7, curtain: false })]],
    ['z', 16, -12, 12, 'cinema', 'ext', []],
    ['z', -5.5, 5.5, 12, 'suite', 'tea', []],
    ['z', -5.5, -3, 5.5, 'suite', 'gallery3', [door(1.5, 2, 2.8, 'double')]],
    ['z', -5.5, -12, -3, 'spa', 'gallery3', []],
    ['z', 5.5, 5.5, 12, 'tea', 'cinema', []],
    ['z', 5.5, -12, 5.5, 'gallery3', 'cinema', [door(0, 2, 2.8, 'double')]],
    ['x', -3, -16, -5.5, 'spa', 'suite', [door(-12, 1.2, 2.4, 'hinge')]],
    ['x', 5.5, -5.5, 5.5, 'gallery3', 'tea', [opening(0, 4.4, 3.2)]],
  ],
];

// ---------------------------------------------------------------------------
export function buildStructure(ctx) {
  const { b, physics } = ctx;
  const F = roomFinish();
  ctx.curtains = [];

  // ---------- plinth & ground floor base
  ctx.setLayer(0);
  b.box(0, GROUND_Y - 0.2, 0, HX * 2 + 0.8, -GROUND_Y + 0.2 - 0.02, HZ * 2 + 0.8, M.stone, { collide: false });
  physics.addRect(-HX - 0.4, -HZ - 0.4, HX + 0.4, HZ + 0.4, 0, 0.65, 'marble');

  // ---------- slabs (floor n has a slab at floorY(n); underside = ceiling of n-1)
  const hole = { cx: STAIR.cx, cz: STAIR.cz, r: STAIR.rHole };
  for (let n = 1; n <= 4; n++) {
    ctx.setLayer(n);
    const y = floorY(n);
    const shape = rectShape(-HX - 0.15, -HZ - 0.15, HX + 0.15, HZ + 0.15);
    shape.holes.push(circlePath(hole.cx, hole.cz, hole.r));
    b.geo(slabShape(shape, SLAB), M.ceiling, { pos: [0, y - SLAB, 0] });
    physics.addRect(-HX - 0.15, -HZ - 0.15, HX + 0.15, HZ + 0.15, y, SLAB, 'stone', hole);
  }
  // balcony slabs
  ctx.setLayer(1); balconySlab(ctx, 1, -5.5, 12, 5.5, 15);
  ctx.setLayer(3); balconySlab(ctx, 3, -16, 12, 5.5, 15.5);

  // ---------- floor finishes per room
  const ROOMRECTS = ctx.rooms;
  for (const r of ROOMRECTS) {
    if (r.floor === 4 || r.id.startsWith('balcony')) continue;
    const f = F[r.id]; if (!f) continue;
    ctx.setLayer(r.floor);
    const [x0, z0, x1, z1] = r.rect;
    const shape = rectShape(x0, z0, x1, z1);
    const y = floorY(r.floor) + 0.004;
    const intersectsHole = r.floor > 0 && x0 < hole.r && x1 > -hole.r && z0 < hole.r && z1 > -hole.r;
    if (intersectsHole) shape.holes.push(circlePath(0, 0, hole.r));
    const g = new THREE.ShapeGeometry(shape, 48); g.rotateX(-Math.PI / 2);
    b.geo(g, f.floor, { pos: [0, y, 0], cast: false });
    // skirting board
    const sk = f.floor === M.marble || f.floor === M.marbleBlack ? M.marble : M.walnut;
    void sk;
  }

  // ---------- walls
  for (let n = 0; n < 4; n++) {
    ctx.setLayer(n);
    for (const w of WALLS[n]) buildWall(ctx, n, w, F);
  }
  ctx.setLayer('shell');

  // ---------- facade bands between floors and the parapet cornice
  for (let n = 1; n <= 4; n++) {
    const y = floorY(n) - 0.36;
    b.box(0, y, HZ + 0.22, HX * 2 + 0.7, 0.42, 0.14, M.stone);
    b.box(0, y, -HZ - 0.22, HX * 2 + 0.7, 0.42, 0.14, M.stone);
    b.box(HX + 0.22, y, 0, 0.14, 0.42, HZ * 2 + 0.3, M.stone);
    b.box(-HX - 0.22, y, 0, 0.14, 0.42, HZ * 2 + 0.3, M.stone);
  }

  // ---------- stairs, atrium balustrades, terrace parapet, pavilion
  ctx.setLayer('core');
  buildSpiral(ctx);
  buildAtriumRails(ctx);
  ctx.setLayer(0);
  buildEntrance(ctx);
  ctx.setLayer(4);
  buildTerraceShell(ctx);
}

function rectShape(x0, z0, x1, z1) {
  const s = new THREE.Shape();
  s.moveTo(x0, -z0); s.lineTo(x1, -z0); s.lineTo(x1, -z1); s.lineTo(x0, -z1); s.closePath();
  return s;
}
function circlePath(cx, cz, r) {
  const p = new THREE.Path();
  p.absarc(cx, -cz, r, 0, Math.PI * 2, true);
  return p;
}

function balconySlab(ctx, n, x0, z0, x1, z1) {
  const { b, physics } = ctx;
  const y = floorY(n);
  b.box((x0 + x1) / 2, y - SLAB, (z0 + z1) / 2 + 0.05, x1 - x0, SLAB, z1 - z0 + 0.1, M.extPlaster);
  b.box((x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0, 0.01, z1 - z0, M.deck, { cast: false });
  physics.addRect(x0, z0 - 0.2, x1, z1, y, SLAB, 'wood');
  // glass balustrade with a brass top rail
  const rails = [[x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]];
  for (const [ax, az, bx, bz] of rails) {
    const len = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const rot = ax === bx ? Math.PI / 2 : 0;
    b.box(cx, y, cz, len, 1.05, 0.02, M.glassRail, { rot, cast: false });
    b.box(cx, y + 1.05, cz, len + 0.05, 0.05, 0.07, M.brass, { rot });
    b.box(cx, y, cz, len, 0.08, 0.1, M.blackMetal, { rot });
    ctx.physics.addBoxC(cx, y, cz, rot ? 0.12 : len, 1.1, rot ? len : 0.12);
  }
}

// ---------------------------------------------------------------------------
function buildWall(ctx, n, [axis, fixed, from, to, negRoom, posRoom, ops], F) {
  const { b, physics, doors, world } = ctx;
  const y0 = floorY(n);
  const ext = negRoom === 'ext' || posRoom === 'ext';
  const t = ext ? 0.3 : 0.16;
  const H = ext ? FH : CEIL;
  const yb = ext ? y0 - 0.0 : y0;
  const matNeg = F[negRoom].wall, matPos = F[posRoom].wall;
  // extend exterior x-walls over the corners
  let s0 = from, s1 = to;
  if (ext && axis === 'x') { if (from === -HX) s0 = -HX - 0.15; if (to === HX) s1 = HX + 0.15; }
  if (ext && axis === 'z') { if (from === -HZ) s0 = -HZ + 0.15; if (to === HZ) s1 = HZ - 0.15; }

  const piece = (a, c, ya, yh, collide = true) => {
    if (c - a < 0.005 || yh < 0.005) return;
    const len = c - a, mid = (a + c) / 2;
    const half = t / 2;
    if (axis === 'x') {
      if (matNeg === matPos) b.box(mid, ya, fixed, len, yh, t, matNeg);
      else {
        b.box(mid, ya, fixed - half / 2, len, yh, half, matNeg);
        b.box(mid, ya, fixed + half / 2, len, yh, half, matPos);
      }
      if (collide) physics.addBox(a, ya, fixed - half, c, ya + yh, fixed + half, { cam: true });
    } else {
      if (matNeg === matPos) b.box(fixed, ya, mid, t, yh, len, matNeg);
      else {
        b.box(fixed - half / 2, ya, mid, half, yh, len, matNeg);
        b.box(fixed + half / 2, ya, mid, half, yh, len, matPos);
      }
      if (collide) physics.addBox(fixed - half, ya, a, fixed + half, ya + yh, c, { cam: true });
    }
  };

  const sorted = [...ops].sort((p, q) => p.c - q.c);
  let cur = s0;
  for (const o of sorted) {
    const a = o.c - o.w / 2, c = o.c + o.w / 2;
    piece(cur, a, yb, H);
    const top = o.sill + o.h;
    piece(a, c, y0 + top, H - top - (yb - y0));
    if (o.sill > 0) piece(a, c, yb, y0 + o.sill - yb);
    cur = c;
    decorateOpening(ctx, n, axis, fixed, o, t, negRoom, posRoom);
  }
  piece(cur, s1, yb, H);

  // skirting on interior faces (skips door openings, runs under windows)
  const skirt = (side, room) => {
    if (room === 'ext' || room.startsWith('balcony')) return;
    const fl = F[room].floor;
    const mat = fl === M.oak || fl === M.walnut || fl === M.ash ? M.walnut : fl === M.fabCharcoal ? M.blackMetal : M.marble;
    const doorsOnly = sorted.filter((o) => o.sill === 0);
    let c2 = s0;
    for (const o of [...doorsOnly, { c: s1 + 1, w: 0 }]) {
      const a = Math.min(o.c - o.w / 2, s1);
      if (a - c2 > 0.05) {
        const len = a - c2, mid = (a + c2) / 2;
        if (axis === 'x') b.box(mid, y0, fixed + side * (t / 2 + 0.006), len, 0.11, 0.012, mat, { cast: false });
        else b.box(fixed + side * (t / 2 + 0.006), y0, mid, 0.012, 0.11, len, mat, { cast: false });
      }
      c2 = o.c + o.w / 2;
    }
  };
  skirt(-1, negRoom); skirt(1, posRoom);
}

function decorateOpening(ctx, n, axis, fixed, o, t, negRoom, posRoom) {
  const { b, physics, doors } = ctx;
  const y0 = floorY(n);
  const P = (s, perp, y) => axis === 'x' ? [s, y, fixed + perp] : [fixed + perp, y, s];
  const rot = axis === 'x' ? 0 : Math.PI / 2;
  const trimMat = o.kind === 'arch' ? M.marble : M.walnut;

  if (o.kind === 'window') {
    // frame, glass, sill
    const [cx, , cz] = P(o.c, 0, 0);
    const gy = y0 + o.sill;
    const glassMat = o.frost ? M.glassFrost : M.glass;
    b.box(cx, gy, cz, axis === 'x' ? o.w : 0.02, o.h, axis === 'x' ? 0.02 : o.w, glassMat, { cast: false, receive: false });
    if (o.jali) b.box(cx, gy, cz, axis === 'x' ? o.w : 0.03, o.h, axis === 'x' ? 0.03 : o.w, M.jaliMarble, { cast: true });
    const fr = 0.06;
    for (const [s, w] of [[o.c - o.w / 2 + fr / 2, fr], [o.c + o.w / 2 - fr / 2, fr]]) {
      const [x, , z] = P(s, 0, 0);
      b.box(x, gy, z, axis === 'x' ? w : t + 0.02, o.h, axis === 'x' ? t + 0.02 : w, M.blackMetal);
    }
    const [x, , z] = P(o.c, 0, 0);
    b.box(x, gy + o.h - fr, z, axis === 'x' ? o.w : t + 0.02, fr, axis === 'x' ? t + 0.02 : o.w, M.blackMetal);
    b.box(x, gy - 0.04, z, axis === 'x' ? o.w + 0.1 : t + 0.12, 0.05, axis === 'x' ? t + 0.12 : o.w + 0.1, M.marble);
    if (o.w > 2.2) { // mullion
      b.box(x, gy, z, axis === 'x' ? 0.04 : t * 0.6, o.h, axis === 'x' ? t * 0.6 : 0.04, M.blackMetal);
    }
    physics.addBox(...(axis === 'x' ? [o.c - o.w / 2, y0, fixed - t / 2, o.c + o.w / 2, y0 + o.sill + o.h, fixed + t / 2] : [fixed - t / 2, y0, o.c - o.w / 2, fixed + t / 2, y0 + o.sill + o.h, o.c + o.w / 2]));
    // curtains on the room side(s)
    if (o.curtain) {
      for (const [side, room] of [[-1, negRoom], [1, posRoom]]) {
        if (room === 'ext') continue;
        ctx.curtains.push({ axis, fixed: fixed + side * (t / 2 + 0.12), c: o.c, w: o.w, y0, top: Math.min(CEIL - 0.05, o.sill + o.h + 0.3), room });
      }
    }
    return;
  }

  // doors / openings: architrave trims on both faces
  const top = o.h;
  for (const side of [-1, 1]) {
    const room = side < 0 ? negRoom : posRoom;
    if (room === 'ext' && o.kind !== 'main') continue;
    const perp = side * (t / 2 + 0.015);
    const tw = o.kind === 'arch' ? 0.22 : 0.09;
    for (const s of [o.c - o.w / 2 - tw / 2, o.c + o.w / 2 + tw / 2]) {
      const [x, , z] = P(s, perp, 0);
      b.box(x, y0, z, axis === 'x' ? tw : 0.04, top + tw, axis === 'x' ? 0.04 : tw, trimMat);
    }
    const [x, , z] = P(o.c, perp, 0);
    b.box(x, y0 + top, z, axis === 'x' ? o.w + tw * 2 : 0.04, tw, axis === 'x' ? 0.04 : o.w + tw * 2, trimMat);
    if (o.kind === 'arch') archInfill(ctx, axis, fixed + perp, o.c, y0, o.w, top, side);
  }
  // threshold
  {
    const [x, , z] = P(o.c, 0, 0);
    b.box(x, y0, z, axis === 'x' ? o.w : t + 0.02, 0.012, axis === 'x' ? t + 0.02 : o.w, M.marble, { cast: false });
  }
  if (o.kind === 'hinge' || o.kind === 'double' || o.kind === 'main' || o.kind === 'slide') {
    const [cx, , cz] = P(o.c, 0, 0);
    doors.add({ kind: o.kind, axis, cx, cz, y0, w: o.w, h: o.h, floor: n, mat: o.kind === 'main' ? M.teak : M.walnut });
  }
}

// Decorative cusped (multifoil) arch filling the top of a rectangular opening.
function archInfill(ctx, axis, perpCoord, c, y0, w, h, side) {
  const rise = Math.min(0.9, w * 0.32);
  const s = new THREE.Shape();
  const hw = w / 2;
  s.moveTo(-hw, h - rise);
  s.lineTo(-hw, h); s.lineTo(hw, h); s.lineTo(hw, h - rise);
  const N = 60, lobes = 7;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const ang = Math.PI * t;
    const cusp = Math.abs(Math.sin(t * Math.PI * lobes)) * 0.06;
    const px = Math.cos(ang) * (hw - cusp);
    const py = h - rise + Math.sin(ang) * (rise - 0.08 - cusp) ;
    s.lineTo(px, py);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -0.025);
  const m = axis === 'x' ? matrix([c, y0, perpCoord], 0) : matrix([perpCoord, y0, c], Math.PI / 2);
  ctx.b.geo(g, M.marble, { m });
  // a gilded edge line
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, ang = Math.PI * t, cusp = Math.abs(Math.sin(t * Math.PI * lobes)) * 0.06;
    pts.push(new THREE.Vector3(Math.cos(ang) * (hw - cusp), h - rise + Math.sin(ang) * (rise - 0.08 - cusp), side * 0.03));
  }
  const tg = tube(pts, 0.012, 80, 6);
  ctx.b.geo(tg, M.gold, { m });
}

// ---------------------------------------------------------------------------
// Spiral staircase: floating marble treads cantilevered from a steel spine, glass
// balustrade and brass handrail following the helix.
function buildSpiral(ctx) {
  const { b, physics } = ctx;
  const { cx, cz, rIn, rOut, landing, steps } = STAIR;
  const TAU = Math.PI * 2;
  const span = TAU - 2 * landing;
  const dth = span / steps;
  const rise = FH / (steps + 1);

  const sector = (r0, r1, a0, a1, depth) => {
    const s = new THREE.Shape();
    const N = 8;
    for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N; const px = Math.sin(a) * r1, pz = Math.cos(a) * r1; i === 0 ? s.moveTo(px, -pz) : s.lineTo(px, -pz); }
    for (let i = N; i >= 0; i--) { const a = a0 + (a1 - a0) * i / N; s.lineTo(Math.sin(a) * r0, -Math.cos(a) * r0); }
    s.closePath();
    return slabShape(s, depth);
  };
  const tread = sector(rIn + 0.02, rOut, 0, dth + 0.01, 0.07);
  const land = sector(rIn + 0.02, STAIR.rHole - 0.005, -landing, landing, 0.07);
  const treadUnder = sector(rIn + 0.02, rOut - 0.05, 0, dth + 0.01, 0.12);

  for (let k = 0; k < 4; k++) {
    const yk = floorY(k);
    for (let i = 0; i < steps; i++) {
      const a = landing + i * dth;
      const top = yk + (i + 1) * rise;
      b.geo(tread, M.marble, { pos: [cx, top - 0.07, cz], rot: a });
      b.geo(treadUnder, M.blackMetal, { pos: [cx, top - 0.19, cz], rot: a });
    }
  }
  for (let k = 1; k <= 4; k++) {
    // landings at each upper floor (ground uses the floor itself)
    b.geo(land, M.marble, { pos: [cx, floorY(k) - 0.07, cz] });
  }
  b.geo(land, M.marble, { pos: [cx, 0.0, cz] , cast: false});
  physics.addSpiral({ cx, cz, rIn, rOut: STAIR.rHole + 0.02, landing, turnRise: FH, turns: 4, baseY: 0 });

  // steel spine at the inner edge and a helical outer stringer
  const helix = (r, y0, y1, a0, a1, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; const a = a0 + (a1 - a0) * t; pts.push(new THREE.Vector3(cx + Math.sin(a) * r, y0 + (y1 - y0) * t, cz + Math.cos(a) * r)); }
    return pts;
  };
  for (let k = 0; k < 4; k++) {
    const yk = floorY(k);
    const a0 = landing, a1 = TAU - landing;
    b.geo(tube(helix(rOut - 0.03, yk + rise * 0.6 - 0.16, yk + FH - rise * 0.4 - 0.16, a0, a1, 64), 0.05, 96, 8), M.blackMetal);
    b.geo(tube(helix(rIn + 0.05, yk + rise * 0.6 - 0.16, yk + FH - rise * 0.4 - 0.16, a0, a1, 64), 0.06, 96, 8), M.blackMetal);
    // brass handrail
    b.geo(tube(helix(rOut + 0.02, yk + 1.0 + rise * 0.5, yk + FH + 1.0 - rise * 0.5, a0, a1, 72), 0.028, 120, 10), M.brass);
    // glass balustrade panels following the helix
    const panels = 16;
    for (let i = 0; i < panels; i++) {
      const ta = a0 + (a1 - a0) * (i + 0.5) / panels;
      const yy = yk + rise * 0.5 + FH * ((ta - landing) / span) * (1 - rise / FH);
      const len = (a1 - a0) / panels * rOut;
      const g = new THREE.BoxGeometry(len, 0.95, 0.014);
      const pitch = Math.atan2(FH / panels, len);
      const m = new THREE.Matrix4().makeRotationY(ta + Math.PI / 2);
      m.multiply(new THREE.Matrix4().makeRotationZ(-pitch * 0));
      m.setPosition(cx + Math.sin(ta) * (rOut + 0.02), yy + 0.5, cz + Math.cos(ta) * (rOut + 0.02));
      b.geo(g, M.glassRail, { m, cast: false });
    }
  }
}

// Glass rings around the atrium opening on every upper floor, with a gap at the landing.
function buildAtriumRails(ctx) {
  const { b, physics } = ctx;
  const { cx, cz, rHole, landing } = STAIR;
  const gapA = landing - 0.02;
  // one tall collision arc at the stair's outer edge with openings at each landing
  const gaps = [];
  for (let n = 0; n <= 4; n++) gaps.push({ a0: -gapA, a1: gapA, y0: floorY(n) - 0.6, y1: floorY(n) + 0.6 });
  physics.addArc(cx, cz, STAIR.rOut + 0.04, -1, floorY(4) + 1.2, gaps);
  // ground floor: a reflecting pool with pebbles beneath the first turn of the stair
  {
    const ring = new THREE.RingGeometry(STAIR.rIn + 0.1, STAIR.rOut - 0.05, 72, 1, landing + 0.5 - Math.PI / 2, Math.PI * 2 - 2 * landing - 0.5);
    ring.rotateX(-Math.PI / 2);
    b.geo(ring, M.waterStill, { pos: [cx, 0.06, cz], cast: false, uv: 'world' });
    const curb = new THREE.RingGeometry(STAIR.rIn + 0.02, STAIR.rOut, 72, 1, landing + 0.4 - Math.PI / 2, Math.PI * 2 - 2 * landing - 0.4);
    curb.rotateX(-Math.PI / 2);
    b.geo(curb, M.marbleBlack, { pos: [cx, 0.012, cz], cast: false });
    // radial barrier stopping walks under the low end of the stair
    const a = -landing - 0.02;
    for (let r = STAIR.rIn + 0.15; r < STAIR.rOut; r += 0.32) physics.addBoxC(cx + Math.sin(a) * r, 0, cz + Math.cos(a) * r, 0.34, 0.9, 0.34);
    const m = new THREE.Matrix4().makeRotationY(a + Math.PI / 2);
    m.setPosition(cx + Math.sin(a) * (STAIR.rIn + STAIR.rOut) / 2, 0.45, cz + Math.cos(a) * (STAIR.rIn + STAIR.rOut) / 2);
    b.geo(new THREE.BoxGeometry(0.06, 0.9, STAIR.rOut - STAIR.rIn), M.glassRail, { m: m.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)), cast: false });
  }
  for (let n = 0; n <= 4; n++) {
    const y = floorY(n);
    const a0 = gapA, a1 = Math.PI * 2 - gapA;
    const seg = 40;
    for (let i = 0; i < seg; i++) {
      const ta = a0 + (a1 - a0) * (i + 0.5) / seg;
      const len = (a1 - a0) / seg * rHole + 0.01;
      const m = new THREE.Matrix4().makeRotationY(ta + Math.PI / 2);
      m.setPosition(cx + Math.sin(ta) * rHole, y + 0.55, cz + Math.cos(ta) * rHole);
      b.geo(new THREE.BoxGeometry(len, 1.0, 0.016), M.glassRail, { m, cast: false });
    }
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = a0 + (a1 - a0) * i / 64; pts.push(new THREE.Vector3(cx + Math.sin(a) * rHole, y + 1.07, cz + Math.cos(a) * rHole)); }
    b.geo(tube(pts, 0.03, 96, 8), M.brass);
    const base = [];
    for (let i = 0; i <= 64; i++) { const a = a0 + (a1 - a0) * i / 64; base.push(new THREE.Vector3(cx + Math.sin(a) * rHole, y + 0.04, cz + Math.cos(a) * rHole)); }
    b.geo(tube(base, 0.05, 96, 6), M.blackMetal);
    // posts at the landing gap
    for (const a of [a0, a1]) b.cyl(cx + Math.sin(a) * rHole, y, cz + Math.cos(a) * rHole, 0.035, 0.035, 1.1, M.brass, { seg: 12 });
    if (n === 0) continue;
    // marble edge band around the opening
    const ring = new THREE.RingGeometry(rHole - 0.02, rHole + 0.22, 96); ring.rotateX(-Math.PI / 2);
    b.geo(ring, M.marbleBlack, { pos: [cx, y + 0.008, cz], cast: false });
    // slab edge fascia (gold band visible from the atrium)
    b.geo(new THREE.CylinderGeometry(rHole, rHole, 0.3, 96, 1, true), M.marble, { pos: [cx, y - 0.15, cz] });
    b.geo(new THREE.CylinderGeometry(rHole + 0.005, rHole + 0.005, 0.04, 96, 1, true), M.gold, { pos: [cx, y - 0.04, cz] });
  }
}

// Grand entrance: porch, steps, columns and a carved canopy.
function buildEntrance(ctx) {
  const { b, physics } = ctx;
  // porch floor (under the first-floor balcony)
  b.box(0, GROUND_Y, 13.6, 11, -GROUND_Y, 3.2, M.marble, { cast: false });
  physics.addRect(-5.5, 12, 5.5, 15.2, 0, 0.5, 'marble');
  for (let i = 0; i < 3; i++) {
    const top = -0.1125 * (i + 1);
    const z = 15.2 + i * 0.4 + 0.2;
    b.box(0, GROUND_Y, z, 7 - i * 0.0, top - GROUND_Y, 0.4, M.marble, { cast: false });
    physics.addRect(-3.5, z - 0.2, 3.5, z + 0.2, top, 0.4, 'marble');
  }
  // side cheeks
  for (const s of [-1, 1]) {
    b.box(s * 3.85, GROUND_Y, 15.85, 0.5, 0.9, 1.3, M.stone, { collide: true });
    b.box(s * 3.85, GROUND_Y + 0.9, 15.85, 0.56, 0.06, 1.36, M.marble);
  }
  // columns
  for (const x of [-5, -2.2, 2.2, 5]) {
    b.box(x, 0, 14.8, 0.62, 0.3, 0.62, M.marble);
    b.cyl(x, 0.3, 14.8, 0.22, 0.24, 3.25, M.marble, { seg: 28, collide: true });
    for (let i = 0; i < 3; i++) b.cyl(x, 0.3 + 0.3 + i * 1.1, 14.8, 0.245, 0.245, 0.05, M.gold, { seg: 28 });
    b.box(x, 3.55, 14.8, 0.6, 0.15, 0.6, M.marble);
  }
  // canopy beam
  b.box(0, 3.7, 14.85, 11.2, 0.3, 0.5, M.stone);
}

// Terrace: parapet walls, a glass pavilion with a white dome (chhatri) over the stair.
function buildTerraceShell(ctx) {
  const { b, physics } = ctx;
  const y = floorY(4);
  // parapets
  const par = [[0, HZ, HX * 2, 0.3, 'x'], [0, -HZ, HX * 2, 0.3, 'x'], [HX, 0, 0.3, HZ * 2, 'z'], [-HX, 0, 0.3, HZ * 2, 'z']];
  for (const [x, z, w, d] of par) {
    b.box(x, y, z, w, 0.5, d, M.stone);
    b.box(x, y + 0.5, z, w, 0.62, d * 0.1 + 0.01, M.glassRail, { cast: false });
    b.box(x, y + 1.12, z, w + 0.05, 0.06, d * 0.5, M.brass);
    physics.addBoxC(x, y, z, w, 1.2, d);
  }
  // pavilion: glass drum + dome
  const R = 4.7, ph = 3.6;
  const gapA = 0.5;
  physics.addArc(0, 0, R, y, y + ph, [{ a0: -gapA, a1: gapA, y0: y - 1, y1: y + 2 }], { cam: false });
  const cols = 12;
  for (let i = 0; i < cols; i++) {
    const a = gapA + (Math.PI * 2 - 2 * gapA) * i / (cols - 1);
    b.cyl(Math.sin(a) * R, y, Math.cos(a) * R, 0.09, 0.09, ph, M.marble, { seg: 16 });
  }
  for (const a of [gapA, -gapA]) b.cyl(Math.sin(a) * R, y, Math.cos(a) * R, 0.14, 0.14, ph, M.marble, { seg: 20 });
  const glass = new THREE.CylinderGeometry(R, R, ph - 0.2, 72, 1, true, gapA, Math.PI * 2 - 2 * gapA);
  b.geo(glass, M.glassRail, { pos: [0, y + ph / 2, 0], cast: false });
  b.geo(new THREE.CylinderGeometry(R + 0.25, R + 0.25, 0.35, 72), M.marble, { pos: [0, y + ph + 0.17, 0] });
  b.geo(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.06, 72), M.gold, { pos: [0, y + ph + 0.36, 0] });
  // dome (lathe) with lotus base and finial
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; const a = t * Math.PI / 2; pts.push([R * Math.cos(a) * (1 - 0.06 * Math.sin(t * Math.PI)), Math.sin(a) * R * 0.8]); }
  b.lathe(pts, M.marbleStatue, { pos: [0, y + ph + 0.39, 0], seg: 64 });
  b.lathe([[0.6, 0], [0.75, 0.15], [0.5, 0.35], [0.25, 0.45], [0.32, 0.65], [0.12, 0.85], [0.18, 1.0], [0.04, 1.4], [0, 1.5]], M.goldPolish, { pos: [0, y + ph + 0.39 + R * 0.8 - 0.12, 0] });
  // ceiling of the pavilion
  const ceil = new THREE.CircleGeometry(R, 64); ceil.rotateX(Math.PI / 2);
  b.geo(ceil, M.ceiling, { pos: [0, y + ph, 0], cast: false });
  physics.addRect(-R, -R, R, R, y + ph + 0.4, 0.4, 'stone');
  // pavilion floor
  const ring = new THREE.RingGeometry(STAIR.rHole + 0.2, R + 0.25, 72); ring.rotateX(-Math.PI / 2);
  b.geo(ring, M.marble, { pos: [0, y + 0.006, 0], cast: false });
}
