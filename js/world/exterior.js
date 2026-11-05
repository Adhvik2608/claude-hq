import * as THREE from 'three';
import { M } from './materials.js';
import { GROUND_Y } from '../config.js';
import { matrix } from './builder.js';
import { bakeGroup } from './builder.js';
import * as F from './furniture.js';
import { makeNoise2D, mulberry32, fbm } from '../util/noise.js';

const G = GROUND_Y;

// Organic tree: tapered trunk with branches and lumpy foliage clusters.
export function tree(ctx, x, y, z, scale = 1, seed = 1, kind = 'round') {
  const b = ctx.b;
  const rnd = mulberry32(seed * 977 + 13);
  const h = (4.5 + rnd() * 2.5) * scale;
  b.cyl(x, y, z, 0.12 * scale, 0.26 * scale, h * 0.6, M.bark, { seg: 10 });
  const top = y + h * 0.6;
  const clusters = kind === 'tall' ? 5 : 7;
  for (let i = 0; i < clusters; i++) {
    const a = rnd() * Math.PI * 2, r = (kind === 'tall' ? 0.5 : 1.3) * scale * (0.3 + rnd() * 0.7);
    const cy = top + (kind === 'tall' ? i * 0.8 * scale : rnd() * 1.6 * scale);
    const cx = x + Math.cos(a) * r, cz = z + Math.sin(a) * r;
    const br = new THREE.CylinderGeometry(0.04 * scale, 0.09 * scale, Math.hypot(cx - x, cy - top) + 0.01, 6);
    const dir = new THREE.Vector3(cx - x, cy - top, cz - z).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const m = new THREE.Matrix4().compose(new THREE.Vector3((x + cx) / 2, (top + cy) / 2, (z + cz) / 2), q, new THREE.Vector3(1, 1, 1));
    b.add(br, M.bark, { m });
    const rad = (kind === 'tall' ? 1.0 - i * 0.12 : 1.1 + rnd() * 0.7) * scale;
    const ico = new THREE.IcosahedronGeometry(rad, 2);
    const p = ico.attributes.position;
    const nz = makeNoise2D(seed + i, 8);
    const col = new Float32Array(p.count * 3);
    const base = new THREE.Color().setHSL(0.25 + rnd() * 0.07, 0.42 + rnd() * 0.15, 0.24 + rnd() * 0.08);
    for (let k = 0; k < p.count; k++) {
      const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k);
      const d = 1 + (nz(vx * 3 + 5, vz * 3 + vy * 2 + 5) - 0.5) * 0.55;
      p.setXYZ(k, vx * d, vy * d * 0.85, vz * d);
      const shade = 0.75 + (vy / rad) * 0.25 + (nz(vx * 9, vz * 9) - 0.5) * 0.3;
      col[k * 3] = base.r * shade; col[k * 3 + 1] = base.g * shade; col[k * 3 + 2] = base.b * shade;
    }
    ico.setAttribute('color', new THREE.BufferAttribute(col, 3));
    ico.computeVertexNormals();
    b.add(ico, M.leaf, { m: matrix([cx, cy, cz], rnd() * 6) });
  }
  ctx.physics.addCyl(x, z, 0.3 * scale, y, y + h);
}

function lampPost(ctx, x, z, h = 3.6) {
  const b = ctx.b;
  b.cyl(x, G, z, 0.12, 0.16, 0.4, M.blackMetal, { seg: 12 });
  b.cyl(x, G + 0.4, z, 0.05, 0.06, h - 0.4, M.blackMetal, { seg: 10 });
  b.cyl(x, G + h, z, 0.16, 0.12, 0.36, M.lampWarm, { seg: 8 });
  b.cyl(x, G + h + 0.36, z, 0.24, 0.05, 0.16, M.blackMetal, { seg: 8 });
  ctx.light({ pos: [x, G + h, z], floor: 'ext', intensity: 14, distance: 13, color: 0xffc27a, night: true });
  ctx.physics.addCyl(x, z, 0.16, G, G + h);
}

function car(ctx, x, z, rot, color = 0x1c2a3a) {
  const b = ctx.b;
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
  const s = new THREE.Shape();
  s.moveTo(-2.35, 0.32); s.lineTo(2.35, 0.32); s.quadraticCurveTo(2.45, 0.35, 2.42, 0.68); s.quadraticCurveTo(2.2, 0.86, 1.3, 0.9);
  s.lineTo(0.55, 1.36); s.quadraticCurveTo(0.2, 1.45, -0.7, 1.42); s.lineTo(-1.6, 1.0); s.quadraticCurveTo(-2.35, 0.95, -2.42, 0.72); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.1, bevelSegments: 4, curveSegments: 16 });
  body.translate(0, 0, -0.9);
  const c = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, ly, lz) => [x + lx * c + lz * sn, G + ly, z - lx * sn + lz * c];
  b.geo(body, paint, { pos: P(0, 0, 0), rot, uv: 'keep' });
  // glass
  const gs = new THREE.Shape(); gs.moveTo(1.22, 0.92); gs.lineTo(0.52, 1.31); gs.quadraticCurveTo(0.2, 1.38, -0.65, 1.36); gs.lineTo(-1.5, 0.98); gs.closePath();
  const glass = new THREE.ExtrudeGeometry(gs, { depth: 1.86, bevelEnabled: false }); glass.translate(0, 0, -0.93);
  b.geo(glass, M.glassTint, { pos: P(0, 0.02, 0), rot, cast: false, uv: 'keep' });
  for (const lx of [-1.55, 1.5]) for (const lz of [-0.88, 0.88]) {
    const w = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 24); w.rotateX(Math.PI / 2);
    b.geo(w, M.rubber, { pos: P(lx, 0.36, lz), rot });
    const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.27, 16); hub.rotateX(Math.PI / 2);
    b.geo(hub, M.chrome, { pos: P(lx, 0.36, lz), rot });
  }
  for (const lz of [-0.6, 0.6]) { b.box(...P(2.44, 0.58, lz), 0.05, 0.12, 0.35, M.ledCool, { rot }); b.box(...P(-2.48, 0.62, lz), 0.05, 0.1, 0.4, new THREE.MeshStandardMaterial({ color: 0x600000, emissive: 0xff1010, emissiveIntensity: 0.6 }), { rot }); }
  ctx.physics.addBoxRot(x, G, z, 4.9, 1.4, 2.0, rot);
  ctx.interact({ pos: P(0, 1.0, 1.4), r: 1.5, floor: 0, label: 'Honk the horn', action: (g) => { g.audio.tone(g.audio.sfx, { f: 420, dur: 0.4, gain: 0.15, type: 'square' }); g.audio.tone(g.audio.sfx, { f: 520, dur: 0.4, gain: 0.1, type: 'square' }); } });
}

let plateCanvas, plateTex;
function drawNameplate(name) {
  const g = plateCanvas.getContext('2d');
  const w = plateCanvas.width, h = plateCanvas.height;
  g.fillStyle = '#1a120b'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#d9a54a'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.lineWidth = 2; g.strokeRect(22, 22, w - 44, h - 44);
  g.fillStyle = '#f6d27a'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '64px "Tiro Devanagari Hindi", "Noto Serif Devanagari", "Kohinoor Devanagari", "Nirmala UI", serif';
  g.fillText('स्वप्न गृह', w / 2, h * 0.36);
  g.font = 'italic 600 42px "Cormorant Garamond", Georgia, serif';
  g.fillText(name ? `${name}'s Dream House` : 'The Dream House', w / 2, h * 0.7);
  plateTex.needsUpdate = true;
}

export function buildExterior(ctx) {
  const { b, physics } = ctx;
  // ---- ground with gentle undulation far away
  const ground = new THREE.PlaneGeometry(900, 900, 90, 90);
  ground.rotateX(-Math.PI / 2);
  const gp = ground.attributes.position, nz = makeNoise2D(3, 32);
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), d = Math.hypot(x, z - 6);
    const k = Math.max(0, (d - 70) / 120);
    gp.setY(i, k * k * (fbm(nz, x / 60 + 16, z / 60 + 16, 4) * 30) * Math.min(1, k));
  }
  ground.computeVertexNormals();
  b.geo(ground, M.grass, { pos: [0, G - 0.01, 0], cast: false });
  physics.addRect(-450, -450, 450, 450, G, 2, 'grass');
  // distant mountains
  const mtn = new THREE.MeshStandardMaterial({ color: 0x5a6e78, roughness: 1, flatShading: true });
  const rnd = mulberry32(7);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rnd() * 0.2, r = 330 + rnd() * 120;
    const h = 60 + rnd() * 110;
    const cone = new THREE.ConeGeometry(70 + rnd() * 60, h, 7, 3);
    const cp = cone.attributes.position;
    for (let k = 0; k < cp.count; k++) { cp.setX(k, cp.getX(k) * (0.8 + rnd() * 0.4)); cp.setZ(k, cp.getZ(k) * (0.8 + rnd() * 0.4)); }
    cone.computeVertexNormals();
    b.geo(cone, mtn, { pos: [Math.sin(a) * r, G + h / 2 - 8, Math.cos(a) * r], cast: false, receive: false });
  }

  // ---- compound wall and gate
  const X = 38, Zb = -34, Zf = 46;
  const wallSeg = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), rot = x0 === x1 ? Math.PI / 2 : 0;
    b.box((x0 + x1) / 2, G, (z0 + z1) / 2, len, 1.6, 0.35, M.stone, { rot });
    b.box((x0 + x1) / 2, G + 1.6, (z0 + z1) / 2, len + 0.1, 0.1, 0.45, M.marble, { rot });
    physics.addBoxC((x0 + x1) / 2, G, (z0 + z1) / 2, rot ? 0.35 : len, 1.8, rot ? len : 0.35);
  };
  wallSeg(-X, Zb, X, Zb); wallSeg(-X, Zb, -X, Zf); wallSeg(X, Zb, X, Zf);
  wallSeg(-X, Zf, -3.5, Zf); wallSeg(3.5, Zf, X, Zf);
  for (const sx of [-1, 1]) {
    b.box(sx * 3.9, G, Zf, 0.9, 2.8, 0.9, M.stone, { collide: true });
    b.box(sx * 3.9, G + 2.8, Zf, 1.05, 0.12, 1.05, M.marble);
    b.cyl(sx * 3.9, G + 2.92, Zf, 0.22, 0.18, 0.5, M.lampWarm, { seg: 8 });
    ctx.light({ pos: [sx * 3.9, G + 3.2, Zf], floor: 'ext', intensity: 8, distance: 9, color: 0xffc27a, night: true });
    // open gate leaves
    const leaf = new THREE.Group(); leaf.position.set(sx * 3.4, G, Zf); leaf.rotation.y = sx * 1.35;
    for (let i = 0; i < 9; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.04), M.blackMetal); bar.position.set(-sx * (0.15 + i * 0.36), 0.95, 0); leaf.add(bar); }
    for (const yy of [0.2, 1.85]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.05), M.gold); rail.position.set(-sx * 1.6, yy, 0); leaf.add(rail); }
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.03, 6, 24, Math.PI), M.gold); arc.position.set(-sx * 1.6, 1.85, 0); arc.scale.y = 0.25; leaf.add(arc);
    ctx.dyn.add(bakeGroup(leaf));
  }
  // nameplate
  plateCanvas = document.createElement('canvas'); plateCanvas.width = 768; plateCanvas.height = 300;
  plateTex = new THREE.CanvasTexture(plateCanvas); plateTex.colorSpace = THREE.SRGBColorSpace;
  let initialName = ''; try { initialName = localStorage.getItem('dh.name') || ''; } catch (e) {}
  drawNameplate(initialName);
  ctx.world.setName = (n) => drawNameplate(n);
  const plateMat = new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.2, emissive: 0xffffff, emissiveMap: plateTex, emissiveIntensity: 0.25 });
  for (const sx of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.33), plateMat); pl.position.set(sx * 3.9, G + 1.9, Zf + 0.46); ctx.dyn.add(pl); }
  const big = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), plateMat); big.position.set(0, G + 3.85, Zf + 0.05); ctx.dyn.add(big);
  b.box(0, G + 3.2, Zf, 8.6, 0.22, 0.4, M.stone);
  b.box(0, G + 3.42, Zf, 2.9, 1.2, 0.08, M.stone);

  // ---- driveway, roundabout and fountain
  const drive = new THREE.PlaneGeometry(6, Zf + 2 - 33.4); drive.rotateX(-Math.PI / 2);
  b.geo(drive, M.paving, { pos: [0, G + 0.04, (Zf + 2 + 33.4) / 2], cast: false });
  const ring = new THREE.RingGeometry(4.3, 7.4, 64); ring.rotateX(-Math.PI / 2);
  b.geo(ring, M.paving, { pos: [0, G + 0.04, 27.5], cast: false });
  const path = new THREE.PlaneGeometry(7.2, 4.2); path.rotateX(-Math.PI / 2);
  b.geo(path, M.paving, { pos: [0, G + 0.04, 18.3], cast: false });
  physics.addRect(-3.6, 16.2, 3.6, Zf + 2, G + 0.04, 0.1, 'stone');
  // fountain
  b.cyl(0, G, 27.5, 4.2, 4.3, 0.55, M.marble, { seg: 48 });
  b.cyl(0, G + 0.55, 27.5, 3.9, 3.9, 0.02, M.waterStill, { seg: 48, cast: false });
  b.lathe([[0.6, 0], [0.35, 0.3], [0.25, 1.4], [1.6, 1.5], [1.65, 1.62], [0.3, 1.62], [0.2, 2.4], [0.8, 2.5], [0.82, 2.6], [0.15, 2.6], [0.1, 3.1], [0.0, 3.3]], M.marble, { pos: [0, G + 0.5, 27.5], seg: 40 });
  b.cyl(0, G + 2.05, 27.5, 1.55, 1.55, 0.02, M.waterStill, { seg: 40, cast: false });
  physics.addCyl(0, 27.5, 4.25, G, G + 0.8);
  const jets = fountainJets(ctx, 0, G + 3.2, 27.5);
  void jets;
  // statue of an elephant pair flanking the porch steps
  for (const sx of [-1, 1]) elephantStatue(ctx, sx * 5.0, 17.4, sx < 0 ? Math.PI * 0.85 : -Math.PI * 0.85);

  // ---- lamp posts along the drive
  for (let z = 20; z < Zf; z += 7) { lampPost(ctx, -4.3, z); lampPost(ctx, 4.3, z); }
  // ---- hedges & flower beds along the drive
  const hedge = new THREE.MeshStandardMaterial({ color: 0x2e5a26, roughness: 0.9 });
  for (const sx of [-1, 1]) {
    for (let z = 35; z < Zf - 1; z += 0.9) b.geo(new THREE.SphereGeometry(0.6, 10, 8), hedge, { pos: [sx * 3.6, G + 0.35, z], scale: [0.8, 0.7, 1] });
    for (let i = 0; i < 18; i++) { const zz = 17 + i * 0.75; const c = [0xff3a6a, 0xffc21a, 0xff7a10, 0xe0e0ff][i % 4]; b.sphere(sx * 6.2 + (i % 2) * 0.3, G + 0.18, zz, 0.16, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }), { seg: 8, segH: 6 }); }
  }
  // ---- trees around the plot
  const spots = [[-14, 24], [14, 24], [-24, 34], [24, 34], [-30, 18], [30, 18], [-28, 0], [28, 0], [-26, -18], [26, -18], [-12, -26], [12, -26], [0, -28], [-33, 40], [33, 40], [-20, 42], [20, 42], [-33, -28], [33, -28]];
  spots.forEach(([x, z], i) => tree(ctx, x, G, z, 0.9 + (i % 3) * 0.2, i + 1, i % 4 === 0 ? 'tall' : 'round'));
  for (const [x, z] of [[-9, 20], [9, 20], [-20, 26], [20, 26], [-22, -6], [22, -6]]) F.plant(ctx, { x, z, y: G, size: 2.4, kind: 'palm', pot: null, seed: Math.round(x * z) });
  // ---- garden benches & a swing on the lawn
  for (const [x, z, rot] of [[-12, 30, Math.PI / 2], [12, 30, -Math.PI / 2]]) {
    b.box(x, G, z, 0.5, 0.45, 1.8, M.teak, { rot: 0, collide: true });
    b.box(x + (rot > 0 ? -0.22 : 0.22), G + 0.45, z, 0.06, 0.5, 1.8, M.teak);
    ctx.seat({ x, z, y: G, yaw: rot, seatH: 0.47, floor: 0, label: 'Sit in the garden', exit: [x + (rot > 0 ? 0.8 : -0.8), z] });
  }
  // ---- car on the drive
  car(ctx, -6.4, 22.0, Math.PI / 2 + 0.05, 0x14233a);
  // ---- backyard lawn deck
  const deck = new THREE.PlaneGeometry(14, 5); deck.rotateX(-Math.PI / 2);
  b.geo(deck, M.deck, { pos: [-9, G + 0.02, -15], cast: false });
  for (let i = 0; i < 3; i++) F.chair(ctx, { x: -13 + i * 3, z: -15.5, y: G, rot: Math.PI, mat: M.teak, seatMat: M.fabWhite, floor: 0, label: 'Sit in the backyard' });
  tree(ctx, 6, G, -18, 1.1, 77);
  // porch lights
  for (const x of [-5.6, 5.6]) ctx.light({ pos: [x, 3.2, 14.6], floor: 'ext', intensity: 10, distance: 8, color: 0xffc27a });
  // facade uplights at night
  for (const x of [-12, -6, 6, 12]) ctx.light({ pos: [x, 0.4, 13.2], floor: 'ext', intensity: 16, distance: 12, color: 0xffb870, night: true });
}

function fountainJets(ctx, x, y, z) {
  const n = 900;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n);
  for (let i = 0; i < n; i++) life[i] = Math.random() * 1.4;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 0.05, transparent: true, opacity: 0.7, depthWrite: false }));
  pts.frustumCulled = false;
  ctx.dyn.add(pts);
  const reset = (i) => {
    const tier = i % 3;
    const a = Math.random() * Math.PI * 2;
    if (tier === 0) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = Math.cos(a) * 0.35; vel[i * 3 + 1] = 4.2 + Math.random() * 0.4; vel[i * 3 + 2] = Math.sin(a) * 0.35; }
    else { const r = tier === 1 ? 1.62 : 0.82, yy = tier === 1 ? G + 2.1 : G + 3.0; pos[i * 3] = x + Math.cos(a) * r; pos[i * 3 + 1] = yy; pos[i * 3 + 2] = z + Math.sin(a) * r; vel[i * 3] = Math.cos(a) * 0.5; vel[i * 3 + 1] = 0.2; vel[i * 3 + 2] = Math.sin(a) * 0.5; }
    life[i] = 0;
  };
  for (let i = 0; i < n; i++) reset(i);
  ctx.anim((dt, t, game) => {
    if (game && game.floor > 1) return;
    for (let i = 0; i < n; i++) {
      life[i] += dt;
      vel[i * 3 + 1] -= 9.8 * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < G + 0.56) reset(i);
    }
    geo.attributes.position.needsUpdate = true;
  });
  return pts;
}

function elephantStatue(ctx, x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, G, z); g.rotation.y = rot;
  const m = M.marbleStatue;
  const add = (geo, px, py, pz, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(1.4, 0.3, 0.9), 0, 0.15, 0);
  add(new THREE.SphereGeometry(0.42, 20, 14), 0, 0.95, 0, 1.4, 1, 1);
  add(new THREE.SphereGeometry(0.3, 18, 12), 0.62, 1.15, 0, 1, 1.05, 0.95);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.26, 14, 10), 0.58, 1.12, s * 0.28, 0.35, 1.0, 1); for (const dx of [-0.35, 0.35]) add(new THREE.CylinderGeometry(0.12, 0.13, 0.6, 12), dx, 0.6, s * 0.2); }
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.85, 1.05, 0], [1.0, 0.75, 0], [0.98, 0.45, 0], [1.08, 0.32, 0]].map((p) => new THREE.Vector3(...p))), 20, 0.08, 10), m); trunk.castShadow = true; g.add(trunk);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.9), M.fabRed); cloth.position.set(0, 1.38, 0); cloth.rotation.x = 0; g.add(cloth);
  ctx.dyn.add(bakeGroup(g));
  ctx.physics.addCyl(x, z, 0.8, G, G + 1.6);
}
