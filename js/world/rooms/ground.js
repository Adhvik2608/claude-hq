import * as THREE from 'three';
import { M } from '../materials.js';
import { CEIL } from '../../config.js';
import { sagPoints, roundedBox, tube, cushion } from '../builder.js';
import { bakeGroup } from '../builder.js';
import * as F from '../furniture.js';
import { deityTexture, DEITY_NAMES, murti, ganeshaMurti, shivaLingam, nandi, samai, flame } from '../deities.js';

const marigold = new THREE.MeshStandardMaterial({ color: 0xff8a10, roughness: 0.85 });
const marigoldY = new THREE.MeshStandardMaterial({ color: 0xffc21a, roughness: 0.85 });
const rose = new THREE.MeshStandardMaterial({ color: 0xd0103a, roughness: 0.7 });
const leafGreen = new THREE.MeshStandardMaterial({ color: 0x2f7a2a, roughness: 0.7, side: THREE.DoubleSide });

export function garlandStrand(ctx, a, b, sag, n = 26, r = 0.035) {
  const pts = sagPoints(a, b, sag, n);
  const g = new THREE.SphereGeometry(r, 7, 5);
  pts.forEach((p, i) => ctx.b.geo(g, i % 3 === 2 ? marigoldY : i % 7 === 0 ? rose : marigold, { pos: [p.x, p.y, p.z], cast: false }));
}
export function hangingStrand(ctx, x, yTop, z, len, r = 0.034) {
  const g = new THREE.SphereGeometry(r, 7, 5);
  const n = Math.floor(len / (r * 1.8));
  for (let i = 0; i < n; i++) ctx.b.geo(g, i % 4 === 3 ? marigoldY : marigold, { pos: [x, yTop - i * r * 1.8, z], cast: false });
  ctx.b.geo(new THREE.SphereGeometry(r * 1.4, 8, 6), rose, { pos: [x, yTop - n * r * 1.8, z], cast: false });
}

function frameItem(ctx, o) {
  const fr = F.framedPicture(ctx, o);
  ctx.interact({ pos: new THREE.Vector3(o.x + Math.sin(o.rot || 0) * 0.9, o.y, o.z + Math.cos(o.rot || 0) * 0.9), r: 1.3, floor: o.floor, label: `${o.label || 'Picture'} · Put your own photo here`, key: 'F', action: (g) => g.ui.pickImage(fr) });
  return fr;
}

// =====================================================================
export function buildGround(ctx) {
  temple(ctx);
  foyer(ctx);
  living(ctx);
  dining(ctx);
  kitchen(ctx);
  store(ctx);
  washroom(ctx);
  atrium(ctx);
}

// ---------------------------------------------------------------------
function temple(ctx) {
  const { b, physics } = ctx;
  const fl = 0, y = 0;
  const X0 = -16, X1 = -5.5, Z0 = 0, Z1 = 12;
  const zc = 6;
  // inlaid marble border
  for (const [x, z, w, d] of [[(X0 + X1) / 2, Z0 + 0.5, X1 - X0 - 1, 0.12], [(X0 + X1) / 2, Z1 - 0.5, X1 - X0 - 1, 0.12], [X1 - 0.5, (Z0 + Z1) / 2, 0.12, Z1 - Z0 - 1]]) b.box(x, y, z, w, 0.008, d, M.marbleBlack, { cast: false });

  // ---- altar wall: red-gold damask
  b.box(X0 + 0.16, 0, zc, 0.02, CEIL, 7.6, M.damaskRed, { cast: false });

  // ---- marble mandir
  const px0 = X0 + 0.15, px1 = -13.0, pz0 = 2.4, pz1 = 9.6;
  const ph = 0.5;
  b.box((px0 + px1) / 2, 0, zc, px1 - px0, ph, pz1 - pz0, M.marble);
  b.box((px0 + px1) / 2, ph - 0.02, zc, px1 - px0 + 0.06, 0.04, pz1 - pz0 + 0.06, M.gold);
  for (let i = 0; i < 2; i++) b.box(px1 + 0.18 + i * 0.3, 0, zc, 0.3, ph - 0.17 * (i + 1), 3.2 - i * 0.4, M.marble);
  physics.addBox(px0, 0, pz0, px1 + 0.2, 1.4, pz1);
  // back panel with carved relief bands
  b.box(X0 + 0.32, ph, zc, 0.2, 3.1, pz1 - pz0, M.marble);
  const cols = [2.7, 4.95, 7.05, 9.3];
  const colX = -13.35;
  for (const cz of cols) {
    b.box(colX, ph, cz, 0.36, 0.22, 0.36, M.marble);
    b.lathe([[0.13, 0], [0.15, 0.06], [0.11, 0.12], [0.11, 1.2], [0.14, 1.28], [0.1, 1.36], [0.1, 1.55], [0.15, 1.62], [0.17, 1.72], [0.12, 1.78], [0.17, 1.8]], M.marble, { pos: [colX, ph + 0.22, cz], seg: 24 });
    for (const yy of [0.32, 1.0, 1.66]) b.cyl(colX, ph + 0.22 + yy, cz, 0.122, 0.122, 0.03, M.gold, { seg: 24 });
  }
  // entablature
  b.box(colX + 0.4, ph + 2.02, zc, 2.1, 0.3, pz1 - pz0 + 0.3, M.marble);
  b.box(colX + 0.4, ph + 2.32, zc, 2.2, 0.06, pz1 - pz0 + 0.4, M.gold);
  // cusped arches across each bay (front face)
  for (let i = 0; i < 3; i++) {
    const a = cols[i] + 0.18, c = cols[i + 1] - 0.18, w = c - a, mid = (a + c) / 2;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(-w / 2, 0.55); s.lineTo(w / 2, 0.55); s.lineTo(w / 2, 0);
    for (let k = 0; k <= 50; k++) { const t = k / 50, ang = Math.PI * t, cusp = Math.abs(Math.sin(t * Math.PI * 7)) * 0.05; s.lineTo(Math.cos(ang) * (w / 2 - cusp), Math.sin(ang) * (0.5 - cusp)); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 3 });
    b.geo(g, M.marble, { pos: [colX + 0.04, ph + 1.47, mid], rot: Math.PI / 2 });
  }
  // three shikhara domes with kalash finials
  for (const [cz, sc] of [[3.82, 0.8], [zc, 1.15], [8.18, 0.8]]) {
    const pts = [];
    for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([0.55 * sc * Math.cos(t * Math.PI / 2) * (1 + 0.08 * Math.sin(t * 12)), 0.75 * sc * Math.sin(t * Math.PI / 2)]); }
    b.lathe(pts, M.marble, { pos: [colX - 0.6, ph + 2.38, cz], seg: 32 });
    b.lathe([[0.12 * sc, 0], [0.16 * sc, 0.05], [0.08 * sc, 0.12], [0.1 * sc, 0.2], [0.03 * sc, 0.32], [0, 0.4 * sc]], M.goldPolish, { pos: [colX - 0.6, ph + 2.38 + 0.73 * sc, cz], seg: 16 });
    const flag = new THREE.PlaneGeometry(0.22 * sc, 0.14 * sc);
    b.geo(flag, M.fabSaffron, { pos: [colX - 0.6 + 0.12, ph + 2.38 + 0.75 * sc + 0.5 * sc, cz], rot: Math.PI / 2, cast: false });
  }
  // inner pedestals
  for (const [cz, w] of [[3.82, 1.7], [zc, 1.8], [8.18, 1.7]]) {
    b.box(-14.95, ph, cz, 1.0, 0.32, w, M.marble);
    b.box(-14.95, ph + 0.32, cz, 1.04, 0.03, w + 0.04, M.gold);
    b.box(-14.95, ph + 0.35, cz, 0.9, 0.012, w - 0.1, M.fabRed, { cast: false });
  }
  // golden sun-mandala behind the main murtis
  const sun = new THREE.Group(); sun.position.set(X0 + 0.45, ph + 1.65, zc);
  const disc = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.92, 64), new THREE.MeshStandardMaterial({ color: 0xf0c060, metalness: 1, roughness: 0.25, emissive: 0xff9a30, emissiveIntensity: 0.25, side: THREE.DoubleSide }));
  disc.rotation.y = Math.PI / 2; sun.add(disc);
  for (let i = 0; i < 36; i++) { const ray = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32, 4), M.goldPolish); const a = (i / 36) * Math.PI * 2; ray.position.set(0.01, Math.sin(a) * 1.08, Math.cos(a) * 1.08); ray.rotation.x = Math.PI / 2 - a; sun.add(ray); }
  ctx.dyn.add(bakeGroup(sun));
  ctx.anim((dt, t) => { sun.rotation.x = t * 0.05; });

  // murtis
  const pedTop = ph + 0.35;
  const kr = murti('krishna'); kr.position.set(-14.85, pedTop, zc - 0.42); kr.rotation.y = Math.PI / 2; ctx.dyn.add(kr);
  const ra = murti('radha'); ra.position.set(-14.85, pedTop, zc + 0.42); ra.rotation.y = Math.PI / 2; ctx.dyn.add(ra);
  const ga = ganeshaMurti(); ga.position.set(-14.9, pedTop, 8.18); ga.rotation.y = Math.PI / 2; ga.scale.setScalar(0.95); ctx.dyn.add(ga);
  const dv = murti('devi'); dv.position.set(-14.85, pedTop + 0.05, 3.82); dv.rotation.y = Math.PI / 2; ctx.dyn.add(dv);
  b.cyl(-14.85, pedTop, 3.82, 0.42, 0.46, 0.06, M.goldPolish, { seg: 32 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.sphere(-14.85 + Math.sin(a) * 0.38, pedTop + 0.08, 3.82 + Math.cos(a) * 0.38, 0.07, new THREE.MeshStandardMaterial({ color: 0xf080a0, roughness: 0.6 }), { scale: [0.6, 0.5, 1.2], rot: a }); }

  // garlands across the shrine front + hanging strands
  for (let i = 0; i < 3; i++) garlandStrand(ctx, [colX + 0.25, ph + 1.98, cols[i] + 0.1], [colX + 0.25, ph + 1.98, cols[i + 1] - 0.1], 0.35);
  for (const cz of cols) hangingStrand(ctx, colX + 0.25, ph + 1.95, cz, 1.0);
  garlandStrand(ctx, [colX + 0.6, ph + 2.33, pz0 + 0.1], [colX + 0.6, ph + 2.33, pz1 - 0.1], 0.06, 80, 0.03);
  // mango-leaf toran over the entrance arch
  for (let i = 0; i < 15; i++) {
    const zz = 7.35 + i * 0.2;
    const g = new THREE.PlaneGeometry(0.08, 0.26); g.translate(0, -0.13, 0);
    b.geo(g, leafGreen, { pos: [-5.66, 3.15, zz], rot: Math.PI / 2, cast: false });
  }
  garlandStrand(ctx, [-5.68, 3.18, 7.3], [-5.68, 3.18, 10.2], 0.14, 30, 0.03);

  // flowers & diyas along the platform edge
  for (let i = 0; i < 9; i++) {
    const zz = pz0 + 0.5 + i * (pz1 - pz0 - 1) / 8;
    b.lathe([[0, 0], [0.05, 0], [0.06, 0.03], [0.0, 0.03]], M.terracotta, { pos: [px1 - 0.1, ph, zz], seg: 12 });
    flame(ctx, px1 - 0.1, ph + 0.03, zz, 0.7);
    b.sphere(px1 - 0.35, ph + 0.03, zz + 0.2, 0.04, i % 2 ? marigold : rose, { seg: 8, segH: 6 });
  }
  // kalash with coconut and mango leaves
  b.lathe([[0, 0], [0.1, 0], [0.15, 0.08], [0.15, 0.16], [0.08, 0.26], [0.1, 0.3], [0.0, 0.3]], M.copper, { pos: [px1 - 0.45, ph, zc], seg: 24 });
  b.sphere(px1 - 0.45, ph + 0.38, zc, 0.09, new THREE.MeshStandardMaterial({ color: 0x6a4020, roughness: 0.9 }), { scale: [1, 1.2, 1] });
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const g = new THREE.PlaneGeometry(0.06, 0.2); g.translate(0, 0.1, 0); b.geo(g, leafGreen, { pos: [px1 - 0.45 + Math.sin(a) * 0.06, ph + 0.3, zc + Math.cos(a) * 0.06], rot: [0.9, a, 0, 'YXZ'], cast: false }); }

  // samai lamps
  const lamps = [samai(ctx, -12.6, 0, 2.8, fl, 1.35), samai(ctx, -12.6, 0, 9.2, fl, 1.35)];
  void lamps;

  // shiva lingam and nandi
  b.box(-9.6, 0, 1.4, 1.6, 0.12, 1.6, M.marbleBlack);
  const li = shivaLingam(); li.position.set(-9.6, 0.12, 1.25); li.rotation.y = Math.PI; ctx.dyn.add(li);
  physics.addCyl(-9.6, 1.25, 0.5, 0, 0.9);
  const nd = nandi(); nd.position.set(-9.6, 0.0, 3.1); nd.rotation.y = Math.PI; ctx.dyn.add(nd);
  physics.addCyl(-9.6, 3.1, 0.4, 0, 0.7);
  const drip = li.userData.drip; let dy = 0;
  ctx.anim((dt) => { dy = (dy + dt * 1.5) % 1; drip.position.y = 1.25 - dy * 0.75; drip.scale.setScalar(1 - dy * 0.3); });
  ctx.interact({ pos: [-9.6, 0.9, 2.3], r: 1.4, floor: fl, label: 'Offer water (abhishek)', action: (g) => { g.audio.water(2); g.audio.bell(1.2); g.player.emote = 'pray'; } });

  // big temple bells
  const bells = [];
  for (const [bx, bz] of [[-12.4, 4.0], [-12.4, 8.0], [-6.2, 8.75]]) {
    const grp = new THREE.Group(); grp.position.set(bx, CEIL, bz);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.1, 4), M.brass); chain.position.y = -0.55; grp.add(chain);
    const bell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.2], [0.04, 0.2], [0.07, 0.15], [0.09, 0.05], [0.13, -0.05], [0.14, -0.08], [0.0, -0.06]].map(([r, yy]) => new THREE.Vector2(r, yy)), 24), M.brass);
    bell.position.y = -1.28; bell.castShadow = true; grp.add(bell);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), M.bronze); clapper.position.y = -1.36; grp.add(clapper);
    ctx.dyn.add(bakeGroup(grp));
    const st = { grp, ang: 0, vel: 0 };
    bells.push(st);
    ctx.interact({ pos: [bx, 1.6, bz], r: 1.3, floor: fl, label: 'Ring the temple bell', action: (g) => { st.vel += 2.4; g.audio.bell(bz === 8.75 ? 1.12 : 1); } });
  }
  ctx.anim((dt) => { for (const s of bells) { s.vel += -s.ang * 22 * dt; s.vel *= Math.exp(-1.2 * dt); s.ang += s.vel * dt; s.grp.rotation.z = s.ang * 0.35; } });

  // conch on a stand
  b.cyl(-12.3, 0, 5.0, 0.12, 0.14, 0.75, M.teak, { seg: 16, collide: true });
  const conchG = new THREE.LatheGeometry([[0, 0], [0.05, 0.02], [0.08, 0.08], [0.07, 0.16], [0.04, 0.22], [0.0, 0.26]].map(([r, yy]) => new THREE.Vector2(r, yy)), 18);
  b.geo(conchG, M.ceramic, { pos: [-12.3, 0.8, 5.0], rot: [0, 0, Math.PI / 2.3, 'XYZ'] });
  ctx.interact({ pos: [-12.0, 1.0, 5.0], r: 1.0, floor: fl, label: 'Blow the shankh', action: (g) => { g.audio.conch(); g.player.emote = 'namaste'; } });

  // aarti thali on a small stand
  b.cyl(-12.3, 0, 7.0, 0.12, 0.14, 0.75, M.teak, { seg: 16, collide: true });
  b.cyl(-12.3, 0.75, 7.0, 0.22, 0.2, 0.02, M.brass, { seg: 32 });
  const thaliFlame = flame(ctx, -12.3, 0.8, 7.0, 1.3);
  b.sphere(-12.22, 0.79, 7.08, 0.03, new THREE.MeshStandardMaterial({ color: 0xd01010 }), { seg: 8 });
  b.sphere(-12.38, 0.79, 6.94, 0.035, marigold, { seg: 8 });
  // aarti performer ring of light
  const aartiRing = new THREE.Group(); aartiRing.visible = false; ctx.dyn.add(aartiRing);
  const af = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M.flameCore); aartiRing.add(af);
  const afl = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), M.glow); aartiRing.add(afl);
  let aartiT = 0;
  ctx.anim((dt, t, g) => {
    if (aartiT <= 0) { aartiRing.visible = false; return; }
    aartiT -= dt; aartiRing.visible = true;
    const a = t * 2.4;
    aartiRing.position.set(-12.9, 1.45 + Math.sin(a) * 0.35, zc + Math.cos(a) * 0.35);
    if (g) afl.quaternion.copy(g.camera.quaternion);
    if (Math.random() < dt * 1.4) g && g.audio.bell(1 + Math.random() * 0.15);
  });
  ctx.interact({ pos: [-11.9, 1.0, 7.0], r: 1.0, floor: fl, label: 'Perform aarti', action: (g) => { aartiT = 9; g.player.emote = 'pray'; g.audio.conch(); setTimeout(() => g.audio.bell(), 700); g.ui.toast('ॐ जय जगदीश हरे…', 4000); if (!g.tanpura.playing) g.tanpura.play(); } });
  void thaliFlame;

  // incense with smoke
  b.cyl(-12.6, 0.0, 6.0, 0.05, 0.06, 0.62, M.brass, { seg: 12 });
  for (let i = 0; i < 3; i++) b.cyl(-12.6 + (i - 1) * 0.015, 0.62, 6.0, 0.002, 0.002, 0.25, new THREE.MeshStandardMaterial({ color: 0x5a2010 }), { seg: 4, rot: [0, 0, (i - 1) * 0.15, 'XYZ'] });
  smoke(ctx, -12.6, 0.88, 6.0);

  // rangoli & asanas for sitting
  const rg = new THREE.PlaneGeometry(2.4, 2.4); rg.rotateX(-Math.PI / 2);
  b.geo(rg, M.rangoli, { pos: [-8.0, 0.014, 8.75], uv: 'keep', cast: false });
  F.rug(ctx, { x: -10.6, z: zc, y: 0, w: 2.0, d: 4.6, mat: M.rugTemple });
  for (const dz of [-1.4, 0, 1.4]) {
    b.geo(cushion(0.75, 0.1, 0.75, 0.35), M.fabSaffron, { pos: [-10.6, 0.06, zc + dz] });
    ctx.seat({ x: -10.6, z: zc + dz, y: 0, yaw: -Math.PI / 2, mode: 'meditate', seatH: 0.1, floor: fl, label: 'Sit and meditate', r: 0.95, exit: [-9.6, zc + dz] });
  }
  // a tanpura resting on a stand for bhajans
  tanpuraProp(ctx, -11.2, 0, 10.6, -Math.PI / 2 - 0.3);
  ctx.seat({ x: -10.4, z: 10.4, y: 0, yaw: -Math.PI / 2, mode: 'play:tanpura', seatH: 0.1, floor: fl, label: 'Sit with the tanpura', instrument: 'tanpura', exit: [-9.4, 10.4] });
  b.geo(cushion(0.8, 0.1, 0.8, 0.35), M.fabRed, { pos: [-10.4, 0.06, 10.4] });

  // ceiling lotus medallion and lights
  const med = []; for (let i = 0; i <= 10; i++) { const t = i / 10; med.push([1.6 * t, -0.25 * Math.sin(t * Math.PI) + (t > 0.9 ? -0.02 : 0)]); }
  b.lathe(med, M.marble, { pos: [-10.6, CEIL - 0.01, zc], seg: 48, rot: [Math.PI, 0, 0, 'XYZ'] });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; b.sphere(-10.6 + Math.sin(a) * 1.1, CEIL - 0.1, zc + Math.cos(a) * 1.1, 0.22, M.marble, { scale: [0.35, 0.18, 1], rot: a, seg: 12, segH: 8 }); }
  b.cyl(-10.6, CEIL - 0.32, zc, 0.12, 0.08, 0.1, M.goldPolish, { seg: 24 });
  F.chandelier(ctx, { x: -10.6, z: zc, yTop: CEIL - 0.3, size: 0.8, floor: fl, drop: 0.6 });
  ctx.light({ pos: [-13.2, 2.6, zc], floor: fl, intensity: 22, distance: 6, color: 0xffb070, dayScale: 0.85 });
  ctx.light({ pos: [-12.8, 1.8, 3.6], floor: fl, intensity: 8, distance: 5, color: 0xff9a50, flicker: 1 });
  ctx.light({ pos: [-12.8, 1.8, 8.4], floor: fl, intensity: 8, distance: 5, color: 0xff9a50, flicker: 1 });

  // ---- pictures of the gods on the walls
  const pics = [
    // south wall (facing +z)
    { x: -14.7, z: 0.09, rot: 0, deity: 'shiva' }, { x: -12.6, z: 0.09, rot: 0, deity: 'durga' }, { x: -10.5, z: 0.09, rot: 0, deity: 'hanuman' }, { x: -8.4, z: 0.09, rot: 0, deity: 'saraswati' },
    // north wall (facing -z)
    { x: -10.75, z: 11.91, rot: Math.PI, deity: 'lakshmi', w: 1.0, h: 1.33 }, { x: -15.15, z: 11.91, rot: Math.PI, deity: 'krishna', w: 0.7, h: 0.93 }, { x: -6.45, z: 11.91, rot: Math.PI, deity: 'ganesha', w: 0.75, h: 1.0 },
    // east wall facing the altar
    { x: -5.59, z: 5.35, rot: -Math.PI / 2, deity: 'om', w: 1.2, h: 1.6, glow: true },
  ];
  for (const p of pics) frameItem(ctx, { x: p.x, z: p.z, y: 1.85, rot: p.rot, w: p.w || 0.85, h: p.h || 1.13, tex: deityTexture(p.deity), floor: fl, id: 'temple-' + p.deity, label: DEITY_NAMES[p.deity], glow: p.glow });
  // small brass picture lights over each frame
  for (const p of pics) {
    const off = 0.12;
    b.box(p.x + Math.sin(p.rot) * off, 1.85 + (p.h || 1.13) / 2 + 0.16, p.z + Math.cos(p.rot) * off, Math.abs(Math.cos(p.rot)) * 0.5 + 0.04, 0.04, Math.abs(Math.sin(p.rot)) * 0.5 + 0.04, M.brass);
  }
  // 3D shadow-box reliefs (layered parallax pictures)
  shadowBox(ctx, -13.65, 1.8, 0.1, 0, 'ganesha', fl);
  shadowBox(ctx, -7.35, 1.8, 0.1, 0, 'krishna', fl);
  // frames on the floor-stand easel near the entrance
  easel(ctx, -6.6, 0, 4.4, -Math.PI / 2 - 0.5, 'yantra', fl);
}

function tanpuraProp(ctx, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const wood = M.teak;
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.32, 28, 20), M.woodLacquer); gourd.scale.set(1, 0.85, 1); gourd.position.y = 0.32; gourd.castShadow = true; g.add(gourd);
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), wood); top.position.set(0, 0.36, 0.27); top.rotation.x = -0.1; g.add(top);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 1.25, 16), wood); neck.position.y = 1.15; neck.castShadow = true; g.add(neck);
  for (let i = 0; i < 4; i++) { const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.12, 8), M.walnut); peg.rotation.z = Math.PI / 2; peg.position.set(0, 1.55 + i * 0.07, 0); g.add(peg); }
  const strs = [];
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 1.4, 4), M.steel); s.position.set(-0.015 + i * 0.01, 1.0, 0.07); s.rotation.x = 0.05; s.userData.keep = true; g.add(s); strs.push(s); }
  for (const yy of [0.62, 0.9, 1.3]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.008, 6, 20), M.gold); r.rotation.x = Math.PI / 2; r.position.y = yy; g.add(r); }
  g.rotation.z = 0.12;
  ctx.dyn.add(bakeGroup(g));
  const prev = ctx.world.onPluck;
  ctx.world.onPluck = (i) => { prev && prev(i); const s = strs[i]; if (s) s.userData.v = 1; };
  ctx.anim((dt, t) => { for (const s of strs) { const v = s.userData.v || 0; s.scale.x = s.scale.z = 1 + v * 2.5 * Math.abs(Math.sin(t * 60)); s.userData.v = Math.max(0, v - dt * 0.8); } });
  ctx.physics.addCyl(x, z, 0.35, y, y + 1.2);
}

function shadowBox(ctx, x, y, z, rot, deity, floor) {
  // layered picture: painted background + raised arch + figure cut-out for real depth
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const box = new THREE.Mesh(roundedBox(0.95, 1.2, 0.16, 0.02), M.gold); box.position.z = 0.08; g.add(box);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.06, 0.02), M.ceramicBlack); inner.position.z = 0.15; g.add(inner);
  const tex = deityTexture(deity);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, color: 0x9a8a80 })); back.position.z = 0.165; g.add(back);
  const fig = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.02), new THREE.MeshStandardMaterial({ map: tex, alphaMap: figureMask(), alphaTest: 0.5, roughness: 0.5 })); fig.position.z = 0.215; g.add(fig);
  const archMask = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.06), new THREE.MeshStandardMaterial({ map: tex, alphaMap: archMaskTex(), alphaTest: 0.5, roughness: 0.4, metalness: 0.3 })); archMask.position.z = 0.25; g.add(archMask);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.06), M.glass); glass.position.z = 0.27; g.add(glass);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  ctx.dyn.add(bakeGroup(g));
  ctx.interact({ pos: new THREE.Vector3(x + Math.sin(rot) * 0.9, y, z + Math.cos(rot) * 0.9), r: 1.1, floor, label: `Bow to ${DEITY_NAMES[deity]} (3D relief)`, action: (g) => { g.player.emote = 'namaste'; g.ui.toast(`🙏 ${DEITY_NAMES[deity]}`); } });
}
let _fig, _arch;
function figureMask() {
  if (_fig) return _fig;
  const c = document.createElement('canvas'); c.width = 256; c.height = 340;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 340);
  g.fillStyle = '#fff'; g.beginPath(); g.ellipse(128, 120, 70, 70, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(128, 215, 95, 95, 0, 0, 7); g.fill(); g.fillRect(40, 250, 176, 60);
  _fig = new THREE.CanvasTexture(c); return _fig;
}
function archMaskTex() {
  if (_arch) return _arch;
  const c = document.createElement('canvas'); c.width = 256; c.height = 340;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 340);
  g.fillStyle = '#000'; g.beginPath(); g.moveTo(26, 330); g.lineTo(26, 120); g.quadraticCurveTo(26, 22, 128, 18); g.quadraticCurveTo(230, 22, 230, 120); g.lineTo(230, 330); g.fill();
  _arch = new THREE.CanvasTexture(c); return _arch;
}

function easel(ctx, x, y, z, rot, deity, floor) {
  const b = ctx.b;
  const c = Math.cos(rot), s = Math.sin(rot);
  for (const sx of [-1, 1]) b.box(x + c * sx * 0.3, y, z - s * sx * 0.3, 0.04, 1.7, 0.04, M.teak, { rot: [0.12, rot, 0, 'YXZ'] });
  b.box(x - s * 0.25, y, z - c * 0.25, 0.04, 1.6, 0.04, M.teak, { rot: [-0.25, rot, 0, 'YXZ'] });
  frameItem(ctx, { x: x + s * 0.08, z: z + c * 0.08, y: 1.25, rot, w: 0.6, h: 0.8, tex: deityTexture(deity), floor, id: 'easel-' + deity, label: 'Shri Yantra' });
  ctx.physics.addCyl(x, z, 0.35, y, y + 1.7);
}

export function smoke(ctx, x, y, z) {
  const n = 60;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3), life = new Float32Array(n);
  for (let i = 0; i < n; i++) { life[i] = Math.random(); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const mat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), size: 0.12, transparent: true, opacity: 0.35, depthWrite: false, color: 0xd8d4cc });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  ctx.dyn.add(pts);
  ctx.anim((dt, t) => {
    for (let i = 0; i < n; i++) {
      life[i] += dt * 0.25; if (life[i] > 1) life[i] -= 1;
      const L = life[i];
      pos[i * 3] = x + Math.sin(L * 9 + i) * 0.04 * L + Math.sin(t * 0.7) * 0.05 * L;
      pos[i * 3 + 1] = y + L * 1.3;
      pos[i * 3 + 2] = z + Math.cos(L * 7 + i * 2) * 0.05 * L;
    }
    geo.attributes.position.needsUpdate = true;
  });
}

// ---------------------------------------------------------------------
function foyer(ctx) {
  const { b } = ctx;
  const fl = 0;
  F.rug(ctx, { x: 0, z: 8.6, y: 0, w: 2.4, d: 5.6, mat: M.rugLiving });
  F.chandelier(ctx, { x: 0, z: 8.6, yTop: CEIL, size: 1.25, floor: fl, drop: 1.0 });
  // consoles with brass urlis of floating flowers & candles, kept clear of the temple and dining arches
  for (const sx of [-1, 1]) {
    const x = sx * 5.05, z = 6.35;
    F.table(ctx, { x, z, y: 0, w: 0.45, d: 1.3, h: 0.85, top: M.marbleBlack, leg: M.gold, rot: 0 });
    b.cyl(x, 0.85, z, 0.2, 0.14, 0.1, M.brass, { seg: 32 });
    b.cyl(x, 0.93, z, 0.18, 0.18, 0.005, M.water, { seg: 32, cast: false });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; b.sphere(x + Math.cos(a) * 0.12, 0.94, z + Math.sin(a) * 0.12, 0.03, i % 2 ? marigold : rose, { seg: 8 }); }
    flame(ctx, x, 0.95, z, 0.8);
  }
  F.plant(ctx, { x: -4.85, z: 11.35, y: 0, size: 1.15, kind: 'palm', pot: M.ceramicBlack, seed: 2 });
  for (const sx of [-1, 1]) {
    // benches
    b.geo(cushion(1.3, 0.12, 0.45, 0.2), M.fabEmerald, { pos: [sx * 4.75, 0.46, 3.0], rot: Math.PI / 2 });
    b.box(sx * 4.75, 0, 3.0, 0.45, 0.42, 1.3, M.walnut, { collide: true });
    ctx.seat({ x: sx * 4.75, z: 3.0, y: 0, yaw: -sx * Math.PI / 2, seatH: 0.5, floor: fl, label: 'Sit on the bench', exit: [sx * 4.0, 3.0] });
  }
  // welcome painting facing the entrance
  frameItem(ctx, { x: -3.0, z: 5.6, y: 1.9, rot: 0, w: 0.75, h: 1.0, tex: deityTexture('ganesha'), floor: fl, id: 'foyer-ganesha', label: 'Shri Ganesha' });
  frameItem(ctx, { x: 3.0, z: 5.6, y: 1.9, rot: 0, w: 0.75, h: 1.0, tex: deityTexture('lakshmi'), floor: fl, id: 'foyer-lakshmi', label: 'Maa Lakshmi' });
  // shoe cabinet & a mirror
  b.box(4.3, 0, 11.6, 1.6, 0.9, 0.42, M.walnut, { collide: true });
  b.box(4.3, 1.2, 11.86, 1.2, 1.3, 0.03, M.chrome);
  // shubh-labh plaque above the door (inside)
  const plaque = canvasPlaque('शुभ  ॐ  लाभ', '#7a1a04', '#f6d27a');
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.32), new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.4, metalness: 0.3 }));
  pm.position.set(0, 3.42, 11.83); pm.rotation.y = Math.PI; ctx.dyn.add(pm);
}

export function canvasPlaque(text, bg, fg, w = 512, h = 104) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.font = `bold ${h * 0.5}px "Tiro Devanagari Hindi", "Noto Serif Devanagari", "Kohinoor Devanagari", "Nirmala UI", Georgia, serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------
function living(ctx) {
  const { b } = ctx;
  const fl = 0;
  F.rug(ctx, { x: -10.75, z: -4.6, y: 0, w: 4.4, d: 5.6, mat: M.rugLiving, rot: Math.PI / 2 });
  F.sofa(ctx, { x: -10.75, z: -7.2, y: 0, rot: 0, len: 3.4, seats: 3, mat: M.fabCream, cushionMat: M.fabCream, floor: fl });
  F.sofa(ctx, { x: -14.6, z: -4.1, y: 0, rot: Math.PI / 2, len: 2.4, seats: 2, mat: M.fabTeal, floor: fl });
  F.armchair(ctx, { x: -6.9, z: -4.6, y: 0, rot: -Math.PI / 2 - 0.3, mat: M.leatherTan, floor: fl });
  F.table(ctx, { x: -10.75, z: -4.2, y: 0, w: 1.6, d: 0.9, h: 0.42, top: M.marbleGreen, leg: M.gold });
  b.sphere(-10.4, 0.5, -4.2, 0.09, M.brass, { seg: 16 });
  for (let i = 0; i < 3; i++) b.box(-11.1, 0.42 + i * 0.03, -4.1, 0.32 - i * 0.03, 0.03, 0.24, [M.fabRed, M.fabNavy, M.fabMustard][i]);
  F.fireplace(ctx, { x: -10.75, z: -0.3, y: 0, rot: Math.PI, w: 1.8, floor: fl });
  const screenTex = makeTvTexture();
  const tv = F.tv(ctx, { x: -10.75, z: -0.12, y: 1.55, rot: Math.PI, w: 2.0, tex: screenTex.tex });
  ctx.anim((dt, t) => screenTex.draw(t));
  ctx.interact({ pos: [-10.75, 1.0, -2.4], r: 1.4, floor: fl, label: 'Change the channel', action: () => screenTex.next() });
  void tv;
  for (const sx of [-1, 1]) F.floorLamp(ctx, { x: -10.75 + sx * 2.3, z: -7.4, y: 0, floor: fl });
  F.bookshelf(ctx, { x: -5.85, z: -8.6, y: 0, rot: -Math.PI / 2, w: 2.4, h: 2.6 });
  F.plant(ctx, { x: -15.3, z: -11.3, y: 0, size: 1.3, kind: 'tall', seed: 11 });
  F.plant(ctx, { x: -6.3, z: -0.8, y: 0, size: 1.0, kind: 'monstera', seed: 12 });
  F.plant(ctx, { x: -15.3, z: -0.7, y: 0, size: 1.0, kind: 'palm', seed: 13 });
  // wooden jhoola (swing) hanging from the ceiling
  jhoola(ctx, -13.4, 0, -10.2, 0, fl, CEIL);
  frameItem(ctx, { x: -10.75, z: -11.88, y: 1.9, rot: 0, w: 1.3, h: 0.9, tex: landscapeTexture(), floor: fl, id: 'living-art', label: 'Painting' });
}

export function jhoola(ctx, x, y, z, rot, floor, ceilY) {
  const g = new THREE.Group(); g.position.set(x, y + ceilY, z); g.rotation.y = rot;
  const seat = new THREE.Group(); seat.position.y = -ceilY + 0.5; g.add(seat);
  const plank = new THREE.Mesh(roundedBox(1.6, 0.08, 0.6, 0.02), M.teak); plank.castShadow = true; seat.add(plank);
  const back = new THREE.Mesh(roundedBox(1.6, 0.5, 0.06, 0.02), M.teak); back.position.set(0, 0.3, -0.28); back.rotation.x = -0.15; seat.add(back);
  const cush = new THREE.Mesh(cushion(1.5, 0.1, 0.52, 0.3), M.fabSaffron); cush.position.y = 0.09; seat.add(cush);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const len = ceilY - 0.5;
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 5), M.brass); ch.position.set(sx * 0.75, -len / 2, sz * 0.26); g.add(ch);
  }
  for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), M.brass); r.position.set(sx * 0.75, -0.04, 0); g.add(r); }
  // garland of bells
  for (let i = 0; i < 6; i++) { const bl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), M.gold); bl.position.set(-0.6 + i * 0.24, 0.05, 0.31); seat.add(bl); }
  ctx.dyn.add(bakeGroup(g));
  const st = { a: 0, v: 0, occupied: false };
  ctx.anim((dt) => {
    if (st.occupied) { st.v += (-st.a * 3.2) * dt; if (Math.abs(st.a) < 0.02 && Math.abs(st.v) < 0.05) st.v += 0.35; }
    else st.v += -st.a * 3.2 * dt - st.v * 0.6 * dt;
    st.a += st.v * dt;
    g.rotation.x = st.a * 0.5;
  });
  const swingPos = () => {
    const ang = st.a * 0.5, L = ceilY - 0.5;
    const dz = Math.sin(ang) * L, dy = L - Math.cos(ang) * L;
    const c = Math.cos(rot), s = Math.sin(rot);
    return [x + s * dz, y + dy, z + c * dz];
  };
  const it = ctx.seat({ x, z, y, yaw: rot, mode: 'swing', seatH: 0.55, floor, label: 'Sit on the jhoola', exit: [x + Math.sin(rot) * 1.0, z + Math.cos(rot) * 1.0], getPos: () => { st.occupied = true; return swingPos(); } });
  ctx.anim((dt, t, game) => { if (game && game.player && game.player.seat !== it.seat) st.occupied = false; });
  ctx.physics.addBoxRot(x, y, z, 1.6, 0.9, 0.6, rot);
  return it;
}

function makeTvTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let ch = 0, last = -1;
  const scenes = [
    (t) => { const gr = g.createLinearGradient(0, 0, 0, 288); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(0.6, '#ffd08a'); gr.addColorStop(1, '#2a4a6a'); g.fillStyle = gr; g.fillRect(0, 0, 512, 288); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(256, 170 - Math.sin(t * 0.2) * 20, 40, 0, 7); g.fill(); g.fillStyle = '#1a2a3a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 100 - 50, 288); g.lineTo(i * 100 + 20, 190 + (i % 2) * 20); g.lineTo(i * 100 + 90, 288); g.fill(); } g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '20px Georgia'; g.fillText('Himalaya Live', 18, 32); },
    (t) => { g.fillStyle = '#120808'; g.fillRect(0, 0, 512, 288); for (let i = 0; i < 40; i++) { const h = 40 + Math.abs(Math.sin(t * 3 + i * 0.6)) * 160; g.fillStyle = `hsl(${30 + i * 2},90%,${50 + (i % 3) * 8}%)`; g.fillRect(16 + i * 12, 260 - h, 8, h); } g.fillStyle = '#ffd796'; g.font = '22px Georgia'; g.fillText('Raag Yaman · Live in concert', 18, 34); },
    (t) => { g.fillStyle = '#0a1a10'; g.fillRect(0, 0, 512, 288); g.fillStyle = '#2a7a3a'; g.fillRect(0, 150, 512, 138); g.fillStyle = '#fff'; g.beginPath(); g.arc(256 + Math.sin(t) * 150, 140 - Math.abs(Math.sin(t * 2)) * 80, 8, 0, 7); g.fill(); g.fillStyle = '#ffd796'; g.font = '22px Georgia'; g.fillText('Cricket · IND 284/3', 18, 34); },
  ];
  return {
    tex,
    draw(t) { const f = Math.floor(t * 12); if (f === last) return; last = f; scenes[ch](t); tex.needsUpdate = true; },
    next() { ch = (ch + 1) % scenes.length; },
  };
}

let _land;
export function landscapeTexture() {
  if (_land) return _land;
  const c = document.createElement('canvas'); c.width = 640; c.height = 440;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 440); sky.addColorStop(0, '#f2b06a'); sky.addColorStop(0.5, '#f7dca6'); sky.addColorStop(1, '#6a8a6a');
  g.fillStyle = sky; g.fillRect(0, 0, 640, 440);
  g.fillStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.arc(470, 150, 40, 0, 7); g.fill();
  for (const [col, base, amp] of [['#8a7aa0', 260, 80], ['#5a6a7a', 300, 60], ['#3a5a4a', 340, 40]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, 440); for (let x = 0; x <= 640; x += 16) g.lineTo(x, base - Math.abs(Math.sin(x * 0.012 + base)) * amp); g.lineTo(640, 440); g.fill(); }
  g.fillStyle = '#e8eef0'; g.fillRect(250, 380, 140, 10);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${Math.random() * 60},${Math.random() * 40},0,.05)`; g.fillRect(Math.random() * 640, Math.random() * 440, 3, 3); }
  _land = new THREE.CanvasTexture(c); _land.colorSpace = THREE.SRGBColorSpace;
  return _land;
}

// ---------------------------------------------------------------------
function dining(ctx) {
  const { b } = ctx;
  const fl = 0;
  F.rug(ctx, { x: 10.75, z: 6.2, y: 0, w: 3.4, d: 5.6, mat: M.rugBed, rot: Math.PI / 2 });
  F.table(ctx, { x: 10.75, z: 6.2, y: 0, w: 3.6, d: 1.15, h: 0.76, top: M.marbleBlack, leg: M.walnut, pedestal: true });
  for (let i = 0; i < 4; i++) {
    const x = 9.4 + i * 0.9;
    F.chair(ctx, { x, z: 5.05, y: 0, rot: 0, seatMat: M.fabEmerald, floor: fl, label: 'Sit at the dining table' });
    F.chair(ctx, { x, z: 7.35, y: 0, rot: Math.PI, seatMat: M.fabEmerald, floor: fl, label: 'Sit at the dining table' });
  }
  F.chair(ctx, { x: 8.4, z: 6.2, y: 0, rot: Math.PI / 2, seatMat: M.fabRed, floor: fl });
  F.chair(ctx, { x: 13.1, z: 6.2, y: 0, rot: -Math.PI / 2, seatMat: M.fabRed, floor: fl });
  // thalis on the table
  for (let i = 0; i < 4; i++) for (const zz of [5.6, 6.8]) {
    b.cyl(9.4 + i * 0.9, 0.765, zz, 0.16, 0.15, 0.015, M.silver, { seg: 28 });
    for (let k = 0; k < 3; k++) b.cyl(9.4 + i * 0.9 + (k - 1) * 0.07, 0.78, zz + (zz < 6 ? -0.06 : 0.06), 0.03, 0.025, 0.025, M.silver, { seg: 12 });
  }
  b.cyl(10.75, 0.765, 6.2, 0.12, 0.08, 0.2, M.brass, { seg: 24 });
  for (let i = 0; i < 7; i++) b.sphere(10.75 + Math.sin(i) * 0.05, 0.98 + (i % 3) * 0.04, 6.2 + Math.cos(i) * 0.05, 0.05, i % 2 ? marigold : rose, { seg: 8 });
  F.chandelier(ctx, { x: 10.75, z: 6.2, yTop: CEIL, size: 1.0, floor: fl, drop: 1.1 });
  // crockery cabinet
  F.wardrobe(ctx, { x: 15.6, z: 6.2, y: 0, rot: -Math.PI / 2, w: 2.6, h: 2.2, d: 0.5, mat: M.woodLacquer });
  F.plant(ctx, { x: 15.2, z: 11.3, y: 0, size: 1.2, kind: 'palm', seed: 21 });
  F.plant(ctx, { x: 6.2, z: 0.8, y: 0, size: 1.0, kind: 'tall', seed: 22 });
  frameItem(ctx, { x: 10.75, z: 0.1, y: 1.9, rot: 0, w: 1.4, h: 0.95, tex: landscapeTexture(), floor: fl, id: 'dining-art', label: 'Painting' });
}

// ---------------------------------------------------------------------
function kitchen(ctx) {
  const { b } = ctx;
  const fl = 0;
  // back splash tiles
  b.box(10.75, 0.9, -11.82, 10.4, 0.85, 0.02, M.kitchenWall, { cast: false });
  b.box(15.82, 0.9, -6.2, 0.02, 0.85, 10.6, M.kitchenWall, { cast: false });
  F.kitchenRun(ctx, { x0: 7.4, x1: 15.85, z: -11.85, y: 0, axis: 'x', side: 1, floor: fl });
  F.kitchenRun(ctx, { x0: -11.2, x1: -1.2, z: 15.85, y: 0, axis: 'z', side: -1, floor: fl, upper: true });
  // tall fridge
  b.geo(roundedBox(0.95, 2.1, 0.75, 0.03), M.steel, { pos: [6.3, 1.05, -11.4] });
  b.box(6.72, 0.9, -11.0, 0.03, 0.9, 0.03, M.chrome);
  ctx.physics.addBoxC(6.3, 0, -11.4, 0.95, 2.1, 0.75);
  ctx.interact({ pos: [6.3, 1.0, -10.4], r: 1.0, floor: fl, label: 'Grab something cold', action: (g) => { g.audio.door(false); g.ui.toast('Mango lassi, perfectly chilled.'); } });
  // sink under the window
  b.box(10.75, 0.86, -11.5, 0.9, 0.05, 0.5, M.steel, { cast: false });
  b.cyl(10.75, 0.92, -11.75, 0.015, 0.015, 0.35, M.chrome, { seg: 8 });
  ctx.interact({ pos: [10.75, 1.0, -10.9], r: 1.0, floor: fl, label: 'Wash the dishes', action: (g) => g.audio.water(3) });
  // stove + chimney
  b.box(15.55, 0.92, -6.2, 0.55, 0.02, 0.9, M.ceramicBlack, { cast: false });
  for (const dz of [-0.22, 0.22]) b.cyl(15.55, 0.94, -6.2 + dz, 0.09, 0.09, 0.02, M.blackMetal, { seg: 16 });
  b.box(15.6, 2.1, -6.2, 0.5, 0.25, 1.0, M.steel);
  b.box(15.75, 2.35, -6.2, 0.2, 1.35, 0.35, M.steel);
  // kettle / pot
  b.cyl(15.55, 0.96, -6.42, 0.1, 0.12, 0.14, M.copper, { seg: 20 });
  b.cyl(15.55, 0.96, -5.98, 0.12, 0.13, 0.12, M.steel, { seg: 20 });
  const burners = [flame(ctx, 15.55, 0.95, -6.42, 0.9), flame(ctx, 15.55, 0.95, -5.98, 0.9)];
  burners.forEach((f) => (f.visible = false));
  const steam = new THREE.Group(); ctx.dyn.add(steam);
  let chai = 0;
  ctx.anim((dt, t, g) => {
    if (chai > 0) {
      chai -= dt;
      burners.forEach((f) => (f.visible = true));
      if (chai <= 0) { burners.forEach((f) => (f.visible = false)); g && g.ui.toast('Your chai is ready. ☕ Adrak, elaichi, just right.', 3500); }
    }
  });
  ctx.interact({ pos: [14.9, 1.0, -6.2], r: 1.1, floor: fl, label: 'Make masala chai', action: (g) => { if (chai > 0) return; chai = 7; g.audio.noise(g.audio.sfx, { dur: 7, type: 'lowpass', f: 900, gain: 0.05, attack: 1.5 }); g.ui.toast('Boiling milk, ginger and cardamom…'); } });
  // spice rack & jars
  for (let i = 0; i < 8; i++) b.cyl(9.0 + i * 0.18, 1.48, -11.75, 0.05, 0.05, 0.12, M.glass, { seg: 12, cast: false });
  for (let i = 0; i < 8; i++) b.cyl(9.0 + i * 0.18, 1.48, -11.75, 0.045, 0.045, 0.08, new THREE.MeshStandardMaterial({ color: [0xd0a020, 0xa02010, 0x5a3010, 0xe0c080, 0x2a6a1a, 0xc06010, 0x8a2010, 0xf0e0b0][i], roughness: 0.9 }), { seg: 10 });
  // island with stools
  F.table(ctx, { x: 10.5, z: -6.0, y: 0, w: 2.8, d: 1.1, h: 0.92, top: M.marble, leg: M.woodLacquer, pedestal: true });
  b.box(10.5, 0, -6.0, 2.6, 0.88, 0.9, M.woodLacquer);
  for (let i = 0; i < 3; i++) {
    const x = 9.6 + i * 0.9;
    b.cyl(x, 0, -4.9, 0.18, 0.2, 0.02, M.chrome, { seg: 16 });
    b.cyl(x, 0.02, -4.9, 0.025, 0.025, 0.62, M.chrome, { seg: 8 });
    b.geo(cushion(0.38, 0.06, 0.38, 0.3), M.leather, { pos: [x, 0.66, -4.9] });
    ctx.seat({ x, z: -4.9, y: 0, yaw: Math.PI, seatH: 0.68, floor: fl, label: 'Sit at the island', exit: [x, -4.1] });
    ctx.physics.addCyl(x, -4.9, 0.2, 0, 0.7);
  }
  // fruit bowl
  b.cyl(10.5, 0.92, -6.0, 0.2, 0.12, 0.08, M.ceramic, { seg: 20 });
  for (let i = 0; i < 6; i++) b.sphere(10.5 + Math.sin(i * 1.3) * 0.1, 1.0 + (i % 2) * 0.04, -6.0 + Math.cos(i * 1.3) * 0.1, 0.045, new THREE.MeshStandardMaterial({ color: [0xffa020, 0xd01020, 0x60b020][i % 3], roughness: 0.5 }), { seg: 10 });
  for (let i = 0; i < 3; i++) F.pendant(ctx, { x: 9.6 + i * 0.9, z: -6.0, yTop: CEIL, drop: 1.4, floor: fl, r: 0.18 });
  F.plant(ctx, { x: 6.2, z: -0.8, y: 0, size: 0.8, kind: 'bush', seed: 31 });
}

// ---------------------------------------------------------------------
function store(ctx) {
  const { b } = ctx;
  const fl = 0;
  // metal shelving
  for (const [x, z, rot] of [[-5.1, -8.8, -Math.PI / 2], [-1.0, -8.8, Math.PI / 2], [-3.0, -11.6, 0]]) {
    const len = rot === 0 ? 2.6 : 4.0;
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 0; i < 4; i++) b.box(x, 0.1 + i * 0.6, z, rot === 0 ? len : 0.5, 0.03, rot === 0 ? 0.5 : len, M.steel);
    for (const e of [-1, 1]) for (const d of [-1, 1]) b.box(x + (rot === 0 ? e * len / 2 : d * 0.24), 0, z + (rot === 0 ? d * 0.24 : e * len / 2), 0.03, 2.0, 0.03, M.steel);
    // boxes & jars
    let k = 0;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
      const t = -len / 2 + 0.3 + j * (len - 0.6) / 4;
      const px = x + (rot === 0 ? t : 0), pz = z + (rot === 0 ? 0 : t);
      const kind = (k++ * 7 + i) % 4;
      if (kind === 0) b.box(px, 0.13 + i * 0.6, pz, 0.36, 0.3, 0.32, M.paper);
      else if (kind === 1) b.cyl(px, 0.13 + i * 0.6, pz, 0.1, 0.1, 0.28, M.glass, { seg: 12, cast: false });
      else if (kind === 2) b.cyl(px, 0.13 + i * 0.6, pz, 0.14, 0.16, 0.32, M.fabSand, { seg: 12 });
      else b.box(px, 0.13 + i * 0.6, pz, 0.3, 0.22, 0.28, M.fabMustard);
    }
    void c; void s;
    if (rot === 0) ctx.physics.addBoxC(x, 0, z, len, 2.0, 0.5); else ctx.physics.addBoxC(x, 0, z, 0.5, 2.0, len);
  }
  // rice sacks & steel trunks
  // (kept against the back shelves so the doorway stays clear)
  for (let i = 0; i < 3; i++) b.geo(cushion(0.5, 0.7, 0.35, 0.15), M.fabSand, { pos: [-2.4 + i * 0.55, 0.36, -10.85], rot: 0.2 * i });
  b.geo(roundedBox(0.9, 0.5, 0.55, 0.03), M.steel, { pos: [-3.9, 0.25, -10.85] });
  ctx.physics.addBoxC(-3.05, 0, -10.85, 2.9, 0.8, 0.7);
  b.cyl(-3.0, CEIL - 0.6, -8.8, 0.004, 0.004, 0.6, M.blackMetal, { seg: 4 });
  b.sphere(-3.0, CEIL - 0.68, -8.8, 0.06, M.lampWarm, { seg: 12 });
  ctx.light({ pos: [-3.0, CEIL - 0.8, -8.8], floor: fl, intensity: 6, distance: 6, color: 0xffd0a0 });
  ctx.interact({ pos: [-3.0, 1.0, -7.4], r: 1.6, floor: fl, label: 'Look through the storeroom', action: (g) => g.ui.toast(['Basmati, atta, dal, ghee — stocked for a month.', 'Diwali diyas and rangoli colours, neatly packed.', 'Grandma’s pickles. Hands off!'][Math.floor(Math.random() * 3)]) });
}

// ---------------------------------------------------------------------
function washroom(ctx) {
  const fl = 0;
  F.toilet(ctx, { x: 4.6, z: -11.5, y: 0, rot: 0, floor: fl });
  F.vanity(ctx, { x: 1.4, z: -11.6, y: 0, rot: 0, w: 1.4, sinks: 1, top: M.marbleBlack, body: M.walnut, floor: fl });
  ctx.b.box(5.35, 1.0, -9.0, 0.06, 0.03, 0.8, M.chrome);
  ctx.b.box(5.3, 0.6, -9.0, 0.04, 0.6, 0.6, M.fabWhite);
  F.plant(ctx, { x: -0.1, z: -6.0, y: 0, size: 0.7, kind: 'bush', seed: 41 });
  ctx.light({ pos: [2.5, 2.9, -9.0], floor: fl, intensity: 9, distance: 6 });
}

function atrium(ctx) {
  for (const [x, z] of [[-4.7, -4.7], [4.7, -4.7], [-4.7, 4.7], [4.7, 4.7]]) F.plant(ctx, { x, z, y: 0, size: 1.4, kind: z > 0 ? 'palm' : 'tall', pot: M.ceramicBlack, seed: Math.round(x * 3 + z) });
}
