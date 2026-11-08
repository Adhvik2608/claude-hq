import * as THREE from 'three';
import { M } from '../materials.js';
import { CEIL, floorY } from '../../config.js';
import { roundedBox, cushion, tube } from '../builder.js';
import { bakeGroup } from '../builder.js';
import * as F from '../furniture.js';
import { deityTexture, DEITY_NAMES, murti, flame } from '../deities.js';
import { garlandStrand, jhoola, landscapeTexture, canvasPlaque } from './ground.js';

function frameItem(ctx, o) {
  const fr = F.framedPicture(ctx, o);
  ctx.interact({ pos: new THREE.Vector3(o.x + Math.sin(o.rot || 0) * 0.9, o.y, o.z + Math.cos(o.rot || 0) * 0.9), r: 1.2, floor: o.floor, label: `${o.label || 'Picture'} · Put your own photo here`, key: 'F', action: (g) => g.ui.pickImage(fr) });
  return fr;
}

export function buildUpper(ctx) {
  ctx.setLayer(1);
  music(ctx, 1);
  library(ctx, 1);
  yoga(ctx, 1);
  sunroom(ctx, 1);
  for (const n of [1, 2, 3]) { ctx.setLayer(n); gallery(ctx, n); }
  ctx.setLayer(2);
  bedroom(ctx, 2);
  bathroom(ctx, 2);
  guest(ctx, 2);
  study(ctx, 2);
  lounge(ctx, 2);
  ctx.setLayer(3);
  suite(ctx, 3);
  spa(ctx, 3);
  cinema(ctx, 3);
  tea(ctx, 3);
}

// =====================================================================
// Instruments as 3D props
function harmoniumProp(ctx, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const box = new THREE.Mesh(roundedBox(0.62, 0.24, 0.34, 0.01), M.woodLacquer); box.position.y = 0.12; g.add(box);
  const keys = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.1), M.ceramic); keys.position.set(0, 0.245, 0.1); g.add(keys);
  for (let i = 0; i < 16; i++) { if ([1, 3, 6, 8, 10, 13, 15].includes(i % 12)) continue; const k = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.06), M.ceramicBlack); k.position.set(-0.26 + i * 0.033, 0.258, 0.08); g.add(k); }
  const bell = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.06), M.fabRed); bell.position.set(0, 0.14, -0.2); g.add(bell);
  for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), M.ceramic); st.rotation.x = Math.PI / 2; st.position.set(-0.22 + i * 0.09, 0.2, 0.18); g.add(st); }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.005), M.brass); grille.position.set(0, 0.12, 0.172); g.add(grille);
  bell.userData.keep = true;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ctx.dyn.add(bakeGroup(g));
  ctx.anim((dt, t, game) => { const playing = game && game.ui && game.ui.dockOpen === 'harmonium'; bell.scale.z = playing ? 1 + Math.sin(t * 3.2) * 0.6 : 1; bell.position.z = -0.2 - (bell.scale.z - 1) * 0.03; });
  return g;
}
function tablaProp(ctx, x, y, z, rot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const dayan = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.26, 24), M.teak); dayan.position.set(0.14, 0.17, 0); dayan.rotation.x = 0.25; g.add(dayan);
  const dh = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), M.paper); dh.rotation.x = -Math.PI / 2; dh.position.y = 0.131; dayan.add(dh);
  const ds = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), M.ceramicBlack); ds.rotation.x = -Math.PI / 2; ds.position.y = 0.132; dayan.add(ds);
  const bayan = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), M.copper); bayan.rotation.x = Math.PI; bayan.position.set(-0.14, 0.12, 0); g.add(bayan);
  const bh = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), M.paper); bh.rotation.x = -Math.PI / 2; bh.position.set(-0.14, 0.121, 0); g.add(bh);
  const bs = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), M.ceramicBlack); bs.rotation.x = -Math.PI / 2; bs.position.set(-0.16, 0.122, 0.02); g.add(bs);
  for (const px of [0.14, -0.14]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 20), M.fabRed); ring.rotation.x = Math.PI / 2; ring.position.set(px, 0.03, 0); g.add(ring); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ctx.dyn.add(bakeGroup(g));
  return g;
}
function sitarProp(ctx, x, y, z, rot, lean = 0.9) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rot;
  const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), M.woodLacquer); gourd.scale.set(1, 1, 0.75); g.add(gourd);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.0, 0.04), M.teak); neck.position.y = 0.6; g.add(neck);
  for (let i = 0; i < 18; i++) { const fr = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.003, 4, 10, Math.PI), M.brass); fr.position.set(0, 0.2 + i * 0.05, 0.03); g.add(fr); }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), M.woodLacquer); top.position.y = 0.9; top.position.z = -0.05; g.add(top);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.1, 6), M.walnut); p.rotation.z = Math.PI / 2; p.position.set(0, 0.98 + i * 0.03, 0); g.add(p); }
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1.1, 4), M.steel); s.position.set(0, 0.5, 0.06); g.add(s);
  g.rotation.z = lean;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ctx.dyn.add(bakeGroup(g));
  return g;
}
function grandPiano(ctx, x, y, z, rot) {
  const b = ctx.b;
  const s = new THREE.Shape();
  s.moveTo(-0.75, 0); s.lineTo(0.75, 0); s.lineTo(0.75, 0.4); s.bezierCurveTo(0.75, 1.1, 0.2, 1.0, 0.1, 1.5); s.bezierCurveTo(0.0, 2.0, -0.2, 2.1, -0.5, 2.1); s.bezierCurveTo(-0.7, 2.1, -0.75, 1.9, -0.75, 1.6); s.lineTo(-0.75, 0);
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 24 });
  body.rotateX(Math.PI / 2);
  const c = Math.cos(rot), sn = Math.sin(rot);
  const P = (lx, ly, lz) => [x + lx * c + lz * sn, y + ly, z - lx * sn + lz * c];
  b.geo(body, M.pianoBlack, { pos: P(0, 0.98, -0.1), rot: rot + Math.PI });
  // lid propped open
  const lid = new THREE.ShapeGeometry(s, 24); lid.rotateX(-Math.PI / 2);
  const lidM = new THREE.Matrix4().makeRotationY(rot + Math.PI).multiply(new THREE.Matrix4().makeRotationZ(-0.55));
  lidM.setPosition(...P(0.75, 1.0, -0.1));
  b.geo(lid, M.pianoBlack, { m: lidM.multiply(new THREE.Matrix4().makeTranslation(-0.75, 0, 0)) });
  // keyboard
  b.box(...P(0, 0.72, 0.05), 1.42, 0.06, 0.22, M.pianoBlack, { rot });
  b.box(...P(0, 0.75, 0.08), 1.36, 0.03, 0.15, M.ceramic, { rot });
  for (let i = 0; i < 36; i++) { if (![1, 3, 6, 8, 10].includes(i % 12)) continue; b.box(...P(-0.66 + i * 0.038, 0.765, 0.05), 0.018, 0.025, 0.09, M.ceramicBlack, { rot }); }
  for (const [lx, lz] of [[-0.62, 0.0], [0.62, 0.0], [-0.3, -1.8]]) b.cyl(...P(lx, 0, lz - 0.1), 0.05, 0.045, 0.66, M.pianoBlack, { seg: 12 });
  // bench
  b.geo(roundedBox(0.9, 0.08, 0.38, 0.02), M.pianoBlack, { pos: P(0, 0.48, 0.65), rot });
  b.geo(cushion(0.86, 0.06, 0.34, 0.2), M.leather, { pos: P(0, 0.54, 0.65), rot });
  for (const lx of [-0.4, 0.4]) for (const lz of [0.5, 0.8]) b.box(...P(lx, 0, lz), 0.04, 0.46, 0.04, M.pianoBlack, { rot });
  ctx.physics.addBoxRot(...P(0, 0, -0.95), 1.6, 1.0, 2.1, rot);
}

// =====================================================================
function music(ctx, n) {
  const { b, physics } = ctx;
  const y = floorY(n);
  // acoustic slat panels
  for (let i = 0; i < 40; i++) b.box(-15.8, y + 0.3, -11.6 + i * 0.29, 0.06, 3.0, 0.07, M.walnut, { cast: false });
  // ---- classical baithak stage
  const sx0 = -15.7, sx1 = -10.6, sz0 = 2.6, sz1 = 11.6, sh = 0.25;
  b.box((sx0 + sx1) / 2, y, (sz0 + sz1) / 2, sx1 - sx0, sh, sz1 - sz0, M.teak);
  b.box(sx1, y, (sz0 + sz1) / 2, 0.04, sh + 0.01, sz1 - sz0, M.gold);
  physics.addRect(sx0, sz0, sx1, sz1, y + sh, sh, 'wood');
  // white gaddi + bolsters
  b.geo(cushion(sx1 - sx0 - 0.3, 0.08, sz1 - sz0 - 0.3, 0.15), M.linen, { pos: [(sx0 + sx1) / 2, y + sh + 0.04, (sz0 + sz1) / 2] });
  for (let i = 0; i < 4; i++) { const g = new THREE.CapsuleGeometry(0.13, 0.5, 6, 16); g.rotateZ(Math.PI / 2); g.rotateY(Math.PI / 2); b.geo(g, M.fabMaroon, { pos: [-15.25, y + sh + 0.2, 3.6 + i * 2.2] }); }
  // backdrop: carved arch + Saraswati painting + spotlights
  frameItem(ctx, { x: -15.72, z: 7.1, y: y + 2.0, rot: Math.PI / 2, w: 1.1, h: 1.47, tex: deityTexture('saraswati'), floor: n, id: 'music-saraswati', label: 'Maa Saraswati' });
  for (const z of [3.0, 11.2]) b.lathe([[0.12, 0], [0.14, 0.1], [0.1, 0.2], [0.1, 3.0], [0.15, 3.1], [0.15, 3.2]], M.teak, { pos: [-15.6, y + sh, z], seg: 16 });
  garlandStrand(ctx, [-15.55, y + 3.2, 3.0], [-15.55, y + 3.2, 11.2], 0.6, 70, 0.04);
  ctx.light({ pos: [-13.0, y + 3.3, 5.0], floor: n, intensity: 18, distance: 6, color: 0xffc890 });
  ctx.light({ pos: [-13.0, y + 3.3, 9.0], floor: n, intensity: 18, distance: 6, color: 0xffc890 });
  // performer positions face the audience (+x)
  const yaw = Math.PI / 2;
  const cam = (z) => ({ pos: [-10.0, y + 1.6, z + 0.6], look: [-13.0, y + 0.8, z] });
  harmoniumProp(ctx, -12.55, y + sh + 0.04, 9.2, yaw);
  ctx.world.instruments.harmonium = ctx.seat({ x: -13.15, z: 9.2, y: y, yaw, mode: 'play:harmonium', seatH: sh + 0.08, floor: n, label: 'Play the harmonium', instrument: 'harmonium', cam: cam(9.2), exit: [-10.2, 9.2] });
  tablaProp(ctx, -12.6, y + sh + 0.04, 7.3, yaw);
  ctx.world.instruments.tabla = ctx.seat({ x: -13.15, z: 7.3, y: y, yaw, mode: 'play:tabla', seatH: sh + 0.08, floor: n, label: 'Play the tabla', instrument: 'tabla', cam: cam(7.3), exit: [-10.2, 7.3] });
  sitarProp(ctx, -12.8, y + sh + 0.45, 5.15, yaw + 0.2, 0.95);
  ctx.world.instruments.sitar = ctx.seat({ x: -13.15, z: 5.3, y: y, yaw, mode: 'play:sitar', seatH: sh + 0.08, floor: n, label: 'Play the sitar', instrument: 'sitar', cam: cam(5.3), exit: [-10.2, 5.3] });
  // bansuri on a velvet stand
  b.box(-12.4, y + sh, 3.5, 0.5, 0.12, 0.2, M.fabMaroon);
  b.cyl(-12.4, y + sh + 0.14, 3.5, 0.012, 0.012, 0.55, new THREE.MeshStandardMaterial({ color: 0xb08040, roughness: 0.5 }), { seg: 10, rot: [0, 0, Math.PI / 2, 'XYZ'] });
  ctx.world.instruments.flute = ctx.seat({ x: -13.15, z: 3.5, y: y, yaw, mode: 'play:flute', seatH: sh + 0.08, floor: n, label: 'Play the bansuri', instrument: 'flute', cam: cam(3.5), exit: [-10.2, 3.5] });
  // tanpuras on the stage
  for (const [z, r] of [[10.7, yaw + 0.2], [6.3, yaw - 0.25]]) {
    const g = new THREE.Group(); g.position.set(-14.5, y + sh, z); g.rotation.y = r;
    const gourd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), M.woodLacquer); gourd.scale.set(1, 0.85, 1); gourd.position.y = 0.3; gourd.castShadow = true; g.add(gourd);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.2, 14), M.teak); neck.position.y = 1.1; neck.castShadow = true; g.add(neck);
    for (const yy of [0.6, 0.9, 1.25]) { const rr = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.007, 6, 18), M.gold); rr.rotation.x = Math.PI / 2; rr.position.y = yy; g.add(rr); }
    g.rotation.z = -0.15;
    ctx.dyn.add(bakeGroup(g));
  }
  ctx.world.instruments.tanpura = ctx.seat({ x: -14.0, z: 10.0, y: y, yaw, mode: 'play:tanpura', seatH: sh + 0.08, floor: n, label: 'Play the tanpura', instrument: 'tanpura', exit: [-10.2, 10.0] });
  // audience seating
  for (let i = 0; i < 5; i++) {
    const z = 3.6 + i * 1.8;
    b.geo(cushion(0.7, 0.12, 0.7, 0.3), [M.fabSaffron, M.fabTeal, M.fabRed][i % 3], { pos: [-9.2, y + 0.07, z] });
    ctx.seat({ x: -9.2, z, y, yaw: -Math.PI / 2, mode: 'sitFloor', seatH: 0.14, floor: n, label: 'Sit and listen', r: 0.8, exit: [-8.2, z] });
  }
  F.sofa(ctx, { x: -6.4, z: 7.2, y, rot: -Math.PI / 2, len: 2.6, seats: 3, mat: M.fabMaroon, floor: n, label: 'Sit and listen' });
  F.rug(ctx, { x: -8.9, z: 7.2, y, w: 2.6, d: 8.6, mat: M.rugMusic });
  F.chandelier(ctx, { x: -10.75, z: 7.0, yTop: y + CEIL, size: 1.1, floor: n, drop: 0.9 });
  // instrument wall (decor): veena, sarangi, guitars
  veenaWall(ctx, -10.75, y, -11.82);
  for (let i = 0; i < 3; i++) guitarWall(ctx, -14.6 + i * 0.75, y + 1.5, -11.8, [M.woodLacquer, M.teak, M.ash][i]);
  // ---- western corner: grand piano, drums, vinyl
  grandPiano(ctx, -11.6, y, -5.6, Math.PI / 2 + 0.25);
  ctx.world.instruments.piano = ctx.seat({ x: -11.6 + Math.sin(Math.PI / 2 + 0.25) * 0.65, z: -5.6 + Math.cos(Math.PI / 2 + 0.25) * 0.65, y, yaw: Math.PI / 2 + 0.25 + Math.PI, mode: 'play:piano', seatH: 0.52, floor: n, label: 'Play the grand piano', instrument: 'piano', cam: { pos: [-8.6, y + 1.9, -3.9], look: [-11.4, y + 0.9, -5.6] }, exit: [-10.2, -4.4] });
  F.rug(ctx, { x: -11.2, z: -6.0, y, w: 4.2, d: 4.8, mat: M.rugLiving, rot: 0.2 });
  drums(ctx, -7.4, y, -10.2);
  F.armchair(ctx, { x: -7.0, z: -5.0, y, rot: -Math.PI / 2 - 0.5, mat: M.leather, floor: n });
  F.armchair(ctx, { x: -7.0, z: -2.6, y, rot: -Math.PI / 2 - 0.2, mat: M.leather, floor: n });
  F.bookshelf(ctx, { x: -15.6, z: -6.5, y, rot: Math.PI / 2, w: 2.2, h: 2.2, d: 0.4 });
  F.plant(ctx, { x: -6.1, z: -11.4, y, size: 1.2, kind: 'palm', seed: 61 });
  F.plant(ctx, { x: -6.1, z: 11.4, y, size: 1.2, kind: 'monstera', seed: 62 });
  const plaque = canvasPlaque('संगीत  ·  SANGEET', '#2a1206', '#f6d27a');
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.36), new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.4, metalness: 0.4 }));
  pm.position.set(-5.6, y + 3.15, 0); pm.rotation.y = Math.PI / 2; ctx.dyn.add(pm);
}

function veenaWall(ctx, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y + 1.6, z + 0.25); g.rotation.z = 0.15;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 12), M.woodLacquer); neck.rotation.z = Math.PI / 2; g.add(neck);
  for (const sx of [-0.8, 0.6]) { const gr = new THREE.Mesh(new THREE.SphereGeometry(sx < 0 ? 0.24 : 0.17, 20, 14), M.woodLacquer); gr.position.x = sx; g.add(gr); }
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 10), M.gold); head.rotation.z = -Math.PI / 2; head.position.x = 0.95; g.add(head);
  for (let i = 0; i < 20; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.02, 0.1), M.brass); f.position.set(-0.5 + i * 0.05, 0.05, 0); g.add(f); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  ctx.dyn.add(bakeGroup(g));
}
function guitarWall(ctx, x, y, z, mat) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, 0.19, 0.22, 0, Math.PI * 2);
  const h1 = new THREE.Path(); h1.absellipse(0, 0.05, 0.05, 0.05, 0, Math.PI * 2, true); s.holes.push(h1);
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 });
  ctx.b.geo(body, mat, { pos: [x, y - 0.25, z] });
  const up = new THREE.Shape(); up.absellipse(0, 0, 0.15, 0.16, 0, Math.PI * 2);
  ctx.b.geo(new THREE.ExtrudeGeometry(up, { depth: 0.09, bevelEnabled: false }), mat, { pos: [x, y + 0.02, z] });
  ctx.b.box(x, y + 0.1, z + 0.08, 0.05, 0.62, 0.025, M.walnut);
  ctx.b.box(x, y + 0.72, z + 0.08, 0.08, 0.14, 0.03, M.walnut);
}
function drums(ctx, x, y, z) {
  const b = ctx.b;
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x8a1020, roughness: 0.2, clearcoat: 1, metalness: 0.2 });
  b.cyl(x, y + 0.05, z, 0.28, 0.28, 0.42, shell, { seg: 28, rot: [Math.PI / 2, 0, 0, 'XYZ'] });
  b.cyl(x - 0.45, y + 0.4, z + 0.3, 0.17, 0.17, 0.16, shell, { seg: 24 });
  b.cyl(x + 0.4, y + 0.55, z + 0.1, 0.13, 0.13, 0.12, shell, { seg: 24 });
  b.cyl(x - 0.1, y + 0.75, z + 0.0, 0.11, 0.11, 0.1, shell, { seg: 24 });
  for (const [cx, cz, h, r] of [[x - 0.7, z - 0.1, 0.95, 0.2], [x + 0.75, z - 0.2, 1.1, 0.24]]) { b.cyl(cx, y, cz, 0.012, 0.012, h, M.chrome, { seg: 6 }); b.cyl(cx, y + h, cz, r, r, 0.006, M.gold, { seg: 24 }); }
  b.cyl(x - 0.2, y, z + 0.6, 0.18, 0.15, 0.5, M.blackMetal, { seg: 16 });
  ctx.physics.addCyl(x, z, 0.8, y, y + 1.2);
  ctx.interact({ pos: [x, y + 1.0, z + 0.9], r: 1.2, floor: 1, label: 'Hit the drums', action: (g) => { g.ui.inst.tabla.hit('Ge'); setTimeout(() => g.ui.inst.tabla.hit('Te'), 140); setTimeout(() => g.ui.inst.tabla.hit('Dha'), 280); } });
}

// =====================================================================
function library(ctx, n) {
  const y = floorY(n);
  for (let i = 0; i < 4; i++) F.bookshelf(ctx, { x: 6.6 + i * 2.25, z: 0.3, y, rot: 0, w: 2.2, h: 3.2, shelves: 8 });
  for (let i = 0; i < 2; i++) F.bookshelf(ctx, { x: 15.65, z: 5.9 + (i - 0.5) * 2.4, y, rot: -Math.PI / 2, w: 2.2, h: 3.2, shelves: 8 });
  F.rug(ctx, { x: 10.75, z: 7.2, y, w: 3.6, d: 4.6, mat: M.rugMusic, rot: Math.PI / 2 });
  F.armchair(ctx, { x: 9.2, z: 8.0, y, rot: Math.PI * 0.75, mat: M.leather, floor: n, label: 'Sit and read' });
  F.armchair(ctx, { x: 12.4, z: 8.0, y, rot: -Math.PI * 0.75, mat: M.leather, floor: n, label: 'Sit and read' });
  F.table(ctx, { x: 10.8, z: 6.6, y, round: true, w: 0.8, h: 0.5, top: M.walnut, leg: M.walnut });
  F.floorLamp(ctx, { x: 8.2, z: 9.3, y, floor: n });
  F.floorLamp(ctx, { x: 13.4, z: 9.3, y, floor: n });
  // globe
  ctx.b.cyl(14.6, y, 10.8, 0.25, 0.3, 0.05, M.walnut, { seg: 16 });
  ctx.b.cyl(14.6, y + 0.05, 10.8, 0.03, 0.03, 0.7, M.brass, { seg: 8 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 20), new THREE.MeshStandardMaterial({ map: globeTex(), roughness: 0.5 }));
  globe.position.set(14.6, y + 0.98, 10.8); globe.rotation.z = 0.4; ctx.dyn.add(globe);
  ctx.anim((dt) => { globe.rotation.y += dt * 0.1; });
  // reading desk
  F.table(ctx, { x: 7.4, z: 10.6, y, w: 1.6, d: 0.8, top: M.walnut });
  F.tableLamp(ctx, { x: 6.9, z: 10.8, y: y + 0.76, floor: n, base: M.brass });
  F.chair(ctx, { x: 7.4, z: 9.9, y, rot: Math.PI, seatMat: M.leather, floor: n, label: 'Sit at the desk' });
  F.plant(ctx, { x: 15.2, z: 11.3, y, size: 1.0, kind: 'tall', seed: 71 });
}
let _globe;
function globeTex() {
  if (_globe) return _globe;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#d8c79a'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#8a6a3a';
  for (const [x, y, w, h] of [[60, 60, 90, 70], [100, 140, 50, 80], [230, 50, 80, 60], [250, 110, 60, 90], [330, 60, 120, 70], [400, 160, 50, 40]]) { g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0.3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(90,60,30,.3)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(i * 43, 0); g.lineTo(i * 43, 256); g.stroke(); }
  _globe = new THREE.CanvasTexture(c); _globe.colorSpace = THREE.SRGBColorSpace; return _globe;
}

function yoga(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = 8.2 + i * 2.2, z = -8.4 + j * 3.4;
    b.box(x, y, z, 0.65, 0.008, 1.85, [M.fabTeal, M.fabBlush, M.fabSaffron][(i + j) % 3], { cast: false });
    ctx.seat({ x, z: z + 0.3, y, yaw: Math.PI, mode: 'meditate', seatH: 0.02, floor: n, label: 'Meditate on the mat', r: 0.9, exit: [x + 0.8, z] });
  }
  // bronze Buddha on a stone plinth
  b.box(10.75, y, -11.3, 1.4, 0.6, 0.9, M.stone);
  const bud = murti('buddha'); bud.position.set(10.75, y + 0.6, -11.3); bud.rotation.y = 0; ctx.dyn.add(bud);
  ctx.physics.addBoxC(10.75, y, -11.3, 1.4, 1.6, 0.9);
  frameItem(ctx, { x: 15.72, z: -6.0, y: y + 1.9, rot: -Math.PI / 2, w: 0.85, h: 1.13, tex: deityTexture('buddha'), floor: n, id: 'yoga-buddha', label: 'Buddha' });
  // singing bowl
  b.cyl(13.4, y, -10.9, 0.2, 0.22, 0.4, M.teak, { seg: 16, collide: true });
  b.sphere(13.4, y + 0.48, -10.9, 0.12, M.bronze, { thetaLen: Math.PI / 2, rot: [Math.PI, 0, 0, 'XYZ'] });
  ctx.interact({ pos: [13.4, y + 1.0, -10.2], r: 1.1, floor: n, label: 'Ring the singing bowl', action: (g) => g.audio.bell(0.5, true) });
  // water wall
  b.box(5.75, y, -6.0, 0.12, 2.6, 2.2, M.stone);
  b.box(5.83, y + 0.15, -6.0, 0.02, 2.35, 2.0, M.water, { cast: false });
  b.box(6.0, y, -6.0, 0.4, 0.2, 2.2, M.marbleBlack, { collide: true });
  for (let i = 0; i < 6; i++) F.plant(ctx, { x: 15.4, z: -1.0 - i * 1.9, y, size: 0.8 + (i % 2) * 0.3, kind: i % 2 ? 'palm' : 'bush', seed: 80 + i });
  ctx.light({ pos: [10.75, y + 1.6, -10.5], floor: n, intensity: 8, distance: 4, color: 0xffb070 });
}

function sunroom(ctx, n) {
  const y = floorY(n);
  for (const [x, rot] of [[-3.2, 0.5], [-1.6, -0.2], [2.4, -0.5]]) F.armchair(ctx, { x, z: 9.4, y, rot: rot + Math.PI, mat: M.fabSand, floor: n, label: 'Sit in the sun' });
  F.table(ctx, { x: -2.4, z: 8.4, y, round: true, w: 0.7, h: 0.45, top: M.marble, leg: M.brass });
  for (let i = 0; i < 5; i++) F.plant(ctx, { x: -4.9 + i * 2.45, z: 11.4, y, size: 0.8 + (i % 3) * 0.2, kind: ['palm', 'monstera', 'tall'][i % 3], seed: 90 + i });
  // balcony furniture
  const by = y;
  F.chair(ctx, { x: -3.6, z: 13.6, y: by, rot: 0, mat: M.teak, seatMat: M.fabWhite, floor: n, label: 'Sit on the balcony' });
  F.chair(ctx, { x: -2.2, z: 13.6, y: by, rot: 0, mat: M.teak, seatMat: M.fabWhite, floor: n, label: 'Sit on the balcony' });
  F.table(ctx, { x: -2.9, z: 14.2, y: by, round: true, w: 0.6, h: 0.6, top: M.marble, leg: M.blackMetal });
  for (const x of [-5.0, 5.0, 3.4]) F.plant(ctx, { x, z: 14.5, y: by, size: 0.8, kind: 'bush', seed: 100 + x });
}

function gallery(ctx, n) {
  const y = floorY(n);
  const arts = [['krishna', 'ganesha', 'om'], ['shiva', 'lakshmi', 'yantra'], ['hanuman', 'saraswati', 'durga']][n - 1];
  for (let i = 0; i < 3; i++) {
    const z = -6.4 - i * 2.0;
    const d = arts[i];
    frameItem(ctx, { x: -5.32, z, y: y + 1.85, rot: Math.PI / 2, w: 0.8, h: 1.07, tex: deityTexture(d), floor: n, id: `gal${n}-${i}`, label: DEITY_NAMES[d] });
    frameItem(ctx, { x: 5.32, z, y: y + 1.85, rot: -Math.PI / 2, w: 0.8, h: 1.07, tex: i === 1 ? landscapeTexture() : deityTexture(arts[(i + 1) % 3]), floor: n, id: `gal${n}-r${i}`, label: i === 1 ? 'Painting' : DEITY_NAMES[arts[(i + 1) % 3]] });
  }
  F.sofa(ctx, { x: 0, z: -9.4, y, rot: Math.PI, len: 2.8, seats: 3, mat: [M.fabCream, M.fabEmerald, M.fabPlum][n - 1], floor: n, label: 'Sit and enjoy the view', back: true });
  F.rug(ctx, { x: 0, z: -8.8, y, w: 3.4, d: 2.6, mat: M.rugLiving });
  F.plant(ctx, { x: -4.7, z: -11.3, y, size: 1.2, kind: 'palm', seed: 110 + n });
  F.plant(ctx, { x: 4.7, z: -11.3, y, size: 1.2, kind: 'tall', seed: 120 + n });
  // a sculpture on a pedestal
  ctx.b.box(4.6, y, 4.6, 0.5, 1.0, 0.5, M.marbleBlack, { collide: true });
  ctx.b.lathe([[0, 0], [0.14, 0], [0.2, 0.12], [0.12, 0.35], [0.06, 0.45], [0.09, 0.55], [0.0, 0.55]], [M.copper, M.ceramic, M.goldPolish][n - 1], { pos: [4.6, y + 1.0, 4.6], seg: 24 });
  ctx.b.box(-4.6, y, 4.6, 0.5, 1.0, 0.5, M.marbleBlack, { collide: true });
  F.plant(ctx, { x: -4.6, z: 4.6, y: y + 1.0, size: 0.6, kind: 'bush', pot: M.ceramic, potH: 0.25, seed: 130 + n, collide: false });
}

// =====================================================================
function bedroom(ctx, n) {
  const y = floorY(n);
  F.rug(ctx, { x: -12.2, z: 6.0, y, w: 3.2, d: 4.4, mat: M.rugBed, rot: Math.PI / 2 });
  F.bed(ctx, { x: -14.6, z: 6.0, y, rot: Math.PI / 2, w: 2.0, l: 2.2, sheet: M.linen, blanket: M.fabNavy, headboard: M.fabSand, floor: n, label: 'Lie down in bed' });
  for (const dz of [-1.5, 1.5]) {
    ctx.b.geo(roundedBox(0.5, 0.55, 0.45, 0.02), M.walnut, { pos: [-15.55, y + 0.275, 6.0 + dz] });
    F.tableLamp(ctx, { x: -15.55, z: 6.0 + dz, y: y + 0.55, floor: n });
  }
  frameItem(ctx, { x: -15.9, z: 6.0, y: y + 2.3, rot: Math.PI / 2, w: 1.5, h: 0.9, tex: landscapeTexture(), floor: n, id: 'bed-art', label: 'Painting' });
  F.wardrobe(ctx, { x: -12.0, z: 0.4, y, rot: 0, w: 3.0, h: 2.5, d: 0.6, mat: M.woodLacquer });
  F.table(ctx, { x: -8.6, z: 11.3, y, w: 1.4, d: 0.65, top: M.walnut });
  F.chair(ctx, { x: -8.6, z: 10.6, y, rot: Math.PI, seatMat: M.fabNavy, floor: n, label: 'Sit at the desk' });
  F.tableLamp(ctx, { x: -9.1, z: 11.4, y: y + 0.76, floor: n });
  F.armchair(ctx, { x: -6.7, z: 8.4, y, rot: -Math.PI / 2 - 0.5, mat: M.fabMustard, floor: n });
  F.plant(ctx, { x: -6.1, z: 11.3, y, size: 1.0, kind: 'monstera', seed: 141 });
  F.plant(ctx, { x: -15.3, z: 11.3, y, size: 1.1, kind: 'palm', seed: 142 });
  // dresser with mirror
  ctx.b.geo(roundedBox(1.4, 0.8, 0.45, 0.02), M.walnut, { pos: [-7.2, y + 0.4, 0.35] });
  ctx.b.geo(roundedBox(0.9, 1.0, 0.03, 0.02), M.chrome, { pos: [-7.2, y + 1.45, 0.15] });
  ctx.physics.addBoxC(-7.2, y, 0.35, 1.4, 0.8, 0.45);
}

function bathroom(ctx, n) {
  const y = floorY(n);
  F.bathtub(ctx, { x: -12.0, z: -8.6, y, rot: Math.PI / 2, floor: n, len: 1.8 });
  F.shower(ctx, { x: -15.15, z: -1.0, y, w: 1.5, d: 1.6, floor: n, rot: Math.PI / 2 });
  F.vanity(ctx, { x: -5.85, z: -7.0, y, rot: -Math.PI / 2, w: 1.8, sinks: 2, top: M.marble, body: M.walnut, floor: n });
  F.toilet(ctx, { x: -15.6, z: -5.2, y, rot: Math.PI / 2, floor: n });
  ctx.b.box(-15.85, y + 1.0, -9.5, 0.04, 0.03, 1.2, M.goldPolish);
  ctx.b.box(-15.82, y + 0.5, -9.5, 0.03, 0.5, 1.1, M.fabWhite, { cast: false });
  F.plant(ctx, { x: -6.3, z: -11.3, y, size: 1.0, kind: 'palm', seed: 151 });
  F.plant(ctx, { x: -9.3, z: -11.3, y, size: 0.7, kind: 'bush', seed: 152 });
  for (let i = 0; i < 5; i++) flame(ctx, -13.1 + i * 0.12, y + 0.62, -9.6, 0.5);
  F.pendant(ctx, { x: -12.0, z: -8.6, yTop: y + CEIL, drop: 1.0, floor: n, r: 0.3, mat: M.goldPolish });
}

function guest(ctx, n) {
  const y = floorY(n);
  F.rug(ctx, { x: 12.6, z: 6.0, y, w: 3.0, d: 4.0, mat: M.rugLiving, rot: Math.PI / 2 });
  F.bed(ctx, { x: 14.6, z: 6.0, y, rot: -Math.PI / 2, w: 1.7, l: 2.1, blanket: M.fabBlush, headboard: M.fabCream, floor: n, label: 'Lie down' });
  for (const dz of [-1.3, 1.3]) { ctx.b.geo(roundedBox(0.45, 0.5, 0.4, 0.02), M.ash, { pos: [15.55, y + 0.25, 6.0 + dz] }); F.tableLamp(ctx, { x: 15.55, z: 6.0 + dz, y: y + 0.5, floor: n }); }
  F.wardrobe(ctx, { x: 10.0, z: 0.4, y, rot: 0, w: 2.4, h: 2.4, mat: M.ash });
  F.armchair(ctx, { x: 7.0, z: 9.6, y, rot: Math.PI * 0.75, mat: M.fabBlush, floor: n });
  F.plant(ctx, { x: 6.2, z: 11.3, y, size: 1.0, kind: 'tall', seed: 161 });
  frameItem(ctx, { x: 15.9, z: 6.0, y: y + 2.2, rot: -Math.PI / 2, w: 0.75, h: 1.0, tex: deityTexture('ganesha'), floor: n, id: 'guest-ganesha', label: 'Shri Ganesha' });
}

function study(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  F.table(ctx, { x: 11.0, z: -8.0, y, w: 2.0, d: 0.9, top: M.walnut, leg: M.blackMetal });
  F.chair(ctx, { x: 11.0, z: -7.3, y, rot: Math.PI, style: 'office', seatMat: M.leather, floor: n, label: 'Sit at the desk' });
  // monitors
  const monTex = codeTexture();
  for (const dx of [-0.42, 0.42]) {
    b.box(11.0 + dx, y + 0.76, -8.25, 0.06, 0.25, 0.06, M.blackMetal);
    b.box(11.0 + dx, y + 1.0, -8.3, 0.66, 0.4, 0.03, M.plastic);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: monTex.tex, toneMapped: false }));
    scr.position.set(11.0 + dx, y + 1.2, -8.28); ctx.dyn.add(scr);
  }
  ctx.anim((dt, t) => monTex.draw(t));
  b.box(11.0, y + 0.765, -7.85, 0.45, 0.02, 0.15, M.plastic);
  for (let i = 0; i < 4; i++) F.bookshelf(ctx, { x: 6.6 + i * 2.25, z: -11.65, y, rot: 0, w: 2.2, h: 2.6 });
  F.sofa(ctx, { x: 14.6, z: -3.4, y, rot: -Math.PI / 2, len: 2.2, seats: 2, mat: M.leather, floor: n });
  b.box(6.0, y + 1.0, -4.0, 0.03, 1.2, 2.0, M.plasticWhite);
  F.plant(ctx, { x: 6.2, z: -0.8, y, size: 1.0, kind: 'monstera', seed: 171 });
  F.floorLamp(ctx, { x: 15.2, z: -1.2, y, floor: n });
}
function codeTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 150;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = -1;
  return { tex, draw(t) { const f = Math.floor(t * 2); if (f === last) return; last = f; g.fillStyle = '#0d1117'; g.fillRect(0, 0, 256, 150); for (let i = 0; i < 14; i++) { const w = 20 + ((i * 37 + f * 13) % 160); g.fillStyle = ['#ff7b72', '#79c0ff', '#d2a8ff', '#7ee787', '#ffa657'][(i + f) % 5]; g.fillRect(10 + (i % 3) * 10, 8 + i * 10, w, 4); } tex.needsUpdate = true; } };
}

function lounge(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  F.sofa(ctx, { x: 0, z: 10.6, y, rot: Math.PI, len: 3.4, seats: 3, mat: M.fabCharcoal, cushionMat: M.fabGrey, floor: n });
  for (const [x, z, c] of [[-3.6, 8.0, M.fabMustard], [3.6, 8.0, M.fabTeal]]) {
    b.geo(cushion(0.9, 0.55, 0.9, 0.5), c, { pos: [x, y + 0.27, z] });
    ctx.seat({ x, z, y, yaw: x < 0 ? Math.PI / 2 : -Math.PI / 2, seatH: 0.4, floor: n, label: 'Flop on the bean bag', exit: [x + (x < 0 ? 0.9 : -0.9), z] });
    ctx.physics.addCyl(x, z, 0.4, y, y + 0.6);
  }
  // carrom board
  b.box(0, y, 7.6, 0.9, 0.62, 0.9, M.walnut, { collide: true });
  b.box(0, y + 0.62, 7.6, 0.86, 0.04, 0.86, M.ash);
  const carrom = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), new THREE.MeshStandardMaterial({ map: carromTex(), roughness: 0.3 }));
  carrom.rotation.x = -Math.PI / 2; carrom.position.set(0, y + 0.665, 7.6); ctx.dyn.add(carrom);
  const coins = [];
  for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 14), i === 0 ? new THREE.MeshStandardMaterial({ color: 0xc01020 }) : i % 2 ? M.ceramic : M.ceramicBlack); const a = i * 0.7; c.position.set(Math.cos(a) * 0.04 * (i ? 1 : 0), y + 0.67, 7.6 + Math.sin(a) * 0.04 * (i ? 1 : 0)); ctx.dyn.add(c); coins.push(c); }
  ctx.interact({ pos: [0, y + 1.0, 6.7], r: 1.1, floor: n, label: 'Strike on the carrom board', action: (g) => { coins.forEach((c) => { c.userData.v = new THREE.Vector2((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2); }); g.audio.tone(g.audio.sfx, { f: 900, dur: 0.06, gain: 0.2 }); } });
  ctx.anim((dt) => { for (const c of coins) { const v = c.userData.v; if (!v) continue; c.position.x += v.x * dt; c.position.z += v.y * dt; v.multiplyScalar(Math.exp(-2.5 * dt)); if (Math.abs(c.position.x) > 0.36) { c.position.x = Math.sign(c.position.x) * 0.36; v.x *= -0.7; } if (Math.abs(c.position.z - 7.6) > 0.36) { c.position.z = 7.6 + Math.sign(c.position.z - 7.6) * 0.36; v.y *= -0.7; } } });
  F.rug(ctx, { x: 0, z: 8.6, y, w: 3.4, d: 4.2, mat: M.rugMusic, rot: Math.PI / 2 });
  F.plant(ctx, { x: -4.8, z: 11.3, y, size: 1.0, kind: 'palm', seed: 181 });
  F.plant(ctx, { x: 4.8, z: 11.3, y, size: 1.0, kind: 'monstera', seed: 182 });
}
let _carrom;
function carromTex() {
  if (_carrom) return _carrom;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f0d8a8'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = '#2a1206'; g.lineWidth = 3;
  g.beginPath(); g.arc(256, 256, 60, 0, 7); g.stroke(); g.beginPath(); g.arc(256, 256, 14, 0, 7); g.stroke();
  for (const [x, y] of [[18, 18], [494, 18], [18, 494], [494, 494]]) { g.fillStyle = '#1a0a04'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); }
  for (const s of [[70, 80, 442, 80], [70, 432, 442, 432], [80, 70, 80, 442], [432, 70, 432, 442]]) { g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[2], s[3]); g.stroke(); }
  g.fillStyle = '#c01020'; for (const [x, y] of [[80, 80], [432, 80], [80, 432], [432, 432]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  _carrom = new THREE.CanvasTexture(c); _carrom.colorSpace = THREE.SRGBColorSpace; return _carrom;
}

// =====================================================================
function suite(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  F.rug(ctx, { x: -12.4, z: 4.5, y, w: 3.6, d: 4.6, mat: M.rugBed, rot: Math.PI / 2 });
  F.bed(ctx, { x: -14.55, z: 4.5, y, rot: Math.PI / 2, w: 2.2, l: 2.3, sheet: M.linen, blanket: M.fabPlum, headboard: M.fabGold, frameMat: M.woodLacquer, canopy: true, floor: n, label: 'Lie down in the suite' });
  for (const dz of [-1.7, 1.7]) { b.geo(roundedBox(0.55, 0.55, 0.45, 0.02), M.woodLacquer, { pos: [-15.55, y + 0.275, 4.5 + dz] }); F.tableLamp(ctx, { x: -15.55, z: 4.5 + dz, y: y + 0.55, floor: n, base: M.goldPolish }); }
  F.chandelier(ctx, { x: -11.5, z: 4.5, yTop: y + CEIL, size: 1.0, floor: n, drop: 0.8 });
  // lounge by the balcony
  F.sofa(ctx, { x: -8.5, z: 9.4, y, rot: -Math.PI / 2, len: 2.4, seats: 2, mat: M.fabEmerald, floor: n, label: 'Sit on the velvet sofa' });
  F.armchair(ctx, { x: -10.6, z: 10.4, y, rot: Math.PI * 0.8, mat: M.fabGold, floor: n });
  F.table(ctx, { x: -9.7, z: 9.6, y, round: true, w: 0.7, h: 0.45, top: M.marble, leg: M.goldPolish });
  // dressing table
  b.geo(roundedBox(1.3, 0.75, 0.45, 0.02), M.woodLacquer, { pos: [-7.0, y + 0.375, -2.6] });
  b.geo(new THREE.CircleGeometry(0.45, 32), M.chrome, { pos: [-7.0, y + 1.5, -2.82] });
  b.geo(new THREE.TorusGeometry(0.46, 0.03, 8, 40), M.goldPolish, { pos: [-7.0, y + 1.5, -2.81] });
  ctx.physics.addBoxC(-7.0, y, -2.6, 1.3, 0.75, 0.45);
  F.chair(ctx, { x: -7.0, z: -2.0, y, rot: Math.PI, seatMat: M.fabBlush, mat: M.goldPolish, floor: n, label: 'Sit at the dressing table' });
  // walk-in wardrobe wall
  // (stops short of the spa door at x = -12)
  F.wardrobe(ctx, { x: -14.35, z: -2.6, y, rot: 0, w: 3.2, h: 2.8, d: 0.6, mat: M.woodLacquer, handle: M.goldPolish, doors: 4 });
  F.plant(ctx, { x: -6.0, z: 11.4, y, size: 1.2, kind: 'palm', seed: 191 });
  frameItem(ctx, { x: -5.62, z: 8.0, y: y + 1.9, rot: -Math.PI / 2, w: 0.85, h: 1.13, tex: deityTexture('krishna'), floor: n, id: 'suite-krishna', label: 'Shri Krishna' });
  // grand balcony
  const by = y;
  jhoola(ctx, -13.0, by, 14.2, 0, n, 2.9);
  // a pergola frame to hang the swing from
  for (const sx of [-1, 1]) b.box(-13.0 + sx * 1.0, by, 14.2, 0.1, 2.95, 0.1, M.teak, { collide: true });
  b.box(-13.0, by + 2.9, 14.2, 2.2, 0.12, 0.14, M.teak);
  for (let i = 0; i < 3; i++) F.chair(ctx, { x: -6.0 + i * 1.6, z: 13.4, y: by, rot: 0, mat: M.teak, seatMat: M.fabWhite, floor: n, label: 'Sit on the balcony' });
  F.table(ctx, { x: -4.4, z: 14.4, y: by, w: 1.8, d: 0.8, top: M.teak, leg: M.blackMetal });
  for (const x of [-15.4, -9.5, 4.8]) F.plant(ctx, { x, z: 15.0, y: by, size: 1.0, kind: 'palm', seed: 200 + x });
  // string lights along the balcony rail
  for (let i = 0; i < 40; i++) { const x = -15.8 + i * 0.54; const sag = Math.sin((i % 8) / 8 * Math.PI) * 0.18; b.sphere(x, by + 1.25 - sag, 15.45, 0.025, M.fairy, { seg: 6, segH: 4, cast: false }); }
  ctx.light({ pos: [-6, by + 1.8, 14], floor: n, intensity: 6, distance: 8, color: 0xffc070, night: true });
}

function spa(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  // sunken-look jacuzzi
  b.box(-12.0, y, -8.6, 3.0, 0.6, 2.4, M.marble);
  b.box(-12.0, y + 0.55, -8.6, 2.6, 0.04, 2.0, M.water, { cast: false });
  ctx.physics.addBoxC(-12.0, y, -8.6, 3.0, 0.6, 2.4);
  for (let i = 0; i < 8; i++) flame(ctx, -13.4 + i * 0.4, y + 0.62, -7.45, 0.5);
  ctx.seat({ x: -12.0, z: -8.6, y: y + 0.2, yaw: 0, mode: 'lie', seatH: 0.1, floor: n, label: 'Relax in the jacuzzi', exit: [-12.0, -6.6] });
  ctx.interact({ pos: [-10.3, y + 0.9, -8.6], r: 1.0, floor: n, label: 'Turn on the jets', key: 'F', action: (g) => g.audio.water(6) });
  F.shower(ctx, { x: -15.0, z: -11.0, y, w: 1.6, d: 1.6, floor: n, rot: 0 });
  F.vanity(ctx, { x: -8.4, z: -11.6, y, rot: 0, w: 1.8, sinks: 2, top: M.marbleBlack, body: M.woodLacquer, floor: n });
  F.toilet(ctx, { x: -6.0, z: -10.0, y, rot: -Math.PI / 2, floor: n });
  F.plant(ctx, { x: -15.3, z: -3.6, y, size: 1.1, kind: 'palm', seed: 211 });
  F.plant(ctx, { x: -6.2, z: -3.6, y, size: 0.8, kind: 'bush', seed: 212 });
  ctx.light({ pos: [-12.0, y + 2.6, -8.6], floor: n, intensity: 10, distance: 6, color: 0xffc890 });
}

function cinema(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  // screen
  const sc = cinemaTexture();
  b.box(15.75, y + 0.3, 0, 0.1, 3.2, 8.2, M.ceramicBlack);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 3.0), new THREE.MeshBasicMaterial({ map: sc.tex, toneMapped: false }));
  scr.position.set(15.68, y + 1.85, 0); scr.rotation.y = -Math.PI / 2; ctx.dyn.add(scr);
  ctx.anim((dt, t) => sc.draw(t));
  ctx.light({ pos: [13.5, y + 1.8, 0], floor: n, intensity: 10, distance: 9, color: 0x9fb0ff });
  // tiered recliners either side of a centre aisle (0.2 m risers, so every row can be stepped onto)
  for (let row = 0; row < 3; row++) {
    const x = 11.6 - row * 2.2, ry = y + row * 0.2;
    for (const sz of [-1, 1]) {
      if (row) { b.box(x, y, sz * 2.8, 2.0, row * 0.2, 3.6, M.fabCharcoal); ctx.physics.addRect(x - 1.0, sz * 2.8 - 1.8, x + 1.0, sz * 2.8 + 1.8, ry, row * 0.2 + 0.01, 'fabric'); }
      for (const dz of [0.7, 2.1]) {
        F.sofa(ctx, { x, z: sz * dz + sz * 0.65, y: ry, rot: Math.PI / 2, len: 1.05, depth: 1.0, seats: 1, mat: M.fabRed, cushionMat: M.fabRed, floor: n, label: 'Watch the movie' });
      }
    }
  }
  // aisle lights
  for (let i = 0; i < 6; i++) b.box(6.6 + i * 1.6, y + 0.01, 0, 0.12, 0.01, 0.12, M.ledStrip, { cast: false });
  // patch recliner seats into 'recline'
  for (const it of ctx.world.interactables) if (it.label === 'Watch the movie' && it.seat) { it.seat.mode = 'recline'; it.seat.cam = { pos: [5.8, y + 2.6, it.pos.z * 0.3], look: [15.6, y + 1.8, 0] }; }
  // star ceiling
  const stars = new THREE.BufferGeometry();
  const p = []; for (let i = 0; i < 400; i++) p.push(5.8 + Math.random() * 10, y + CEIL - 0.02, -11.8 + Math.random() * 23.6);
  stars.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const st = new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xfff4d6, size: 0.04, toneMapped: false }));
  ctx.dyn.add(st);
  // popcorn machine
  b.box(6.4, y, -10.8, 0.6, 0.8, 0.6, M.fabRed, { collide: true });
  b.box(6.4, y + 0.8, -10.8, 0.6, 0.7, 0.6, M.glass, { cast: false });
  for (let i = 0; i < 30; i++) b.sphere(6.2 + Math.random() * 0.4, y + 0.85 + Math.random() * 0.25, -11.0 + Math.random() * 0.4, 0.025, M.paper, { seg: 5, segH: 4, cast: false });
  ctx.interact({ pos: [6.4, y + 1.0, -10.0], r: 1.0, floor: n, label: 'Grab popcorn', action: (g) => g.ui.toast('Masala popcorn! 🍿') });
  for (let i = 0; i < 12; i++) b.box(5.7, y + 0.05, -11.5 + i * 2.1, 0.04, 0.04, 0.5, M.ledStrip, { cast: false });
  ctx.interact({ pos: [9.0, y + 1.0, 4.8], r: 1.4, floor: n, label: 'Next film', action: () => sc.next() });
}
function cinemaTexture() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 304;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let ch = 0, last = -1;
  const films = [
    (t) => { const gr = g.createLinearGradient(0, 0, 0, 304); gr.addColorStop(0, '#0a1030'); gr.addColorStop(1, '#3a1a4a'); g.fillStyle = gr; g.fillRect(0, 0, 768, 304); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) / 8})`; g.fillRect((i * 97 + t * 8) % 768, (i * 53) % 220, 2, 2); } g.fillStyle = '#ffd796'; g.beginPath(); g.arc(560, 90, 36, 0, 7); g.fill(); g.fillStyle = '#05060c'; g.beginPath(); g.moveTo(0, 304); for (let x = 0; x <= 768; x += 32) g.lineTo(x, 230 - Math.abs(Math.sin(x * 0.01)) * 60); g.lineTo(768, 304); g.fill(); g.fillStyle = '#fff'; g.font = 'italic 34px Georgia'; g.fillText('Swapna · a night under the stars', 40, 280); },
    (t) => { g.fillStyle = '#1a0a04'; g.fillRect(0, 0, 768, 304); for (let i = 0; i < 12; i++) { const x = 384 + Math.sin(t * 0.8 + i) * 300; g.fillStyle = `hsla(${(i * 30 + t * 20) % 360},90%,60%,.7)`; g.beginPath(); g.arc(x, 152 + Math.cos(t + i * 2) * 90, 30 + i * 2, 0, 7); g.fill(); } g.fillStyle = '#fff'; g.font = 'bold 40px Georgia'; g.fillText('Holi · festival of colours', 40, 60); },
  ];
  return { tex, draw(t) { const f = Math.floor(t * 15); if (f === last) return; last = f; films[ch](t); tex.needsUpdate = true; }, next() { ch = (ch + 1) % films.length; } };
}

function tea(ctx, n) {
  const y = floorY(n);
  const { b } = ctx;
  // diwan (low seating) along the walls
  for (const [x, z, rot, len] of [[-4.9, 8.8, Math.PI / 2, 4.6], [4.9, 8.8, -Math.PI / 2, 4.6]]) {
    F.sofa(ctx, { x, z, y, rot, len, seats: 3, depth: 0.9, mat: M.fabSaffron, cushionMat: M.fabMaroon, floor: n, label: 'Sit for chai', arms: false });
  }
  F.rug(ctx, { x: 0, z: 8.8, y, w: 3.6, d: 4.8, mat: M.rugTemple });
  F.table(ctx, { x: 0, z: 8.8, y, w: 1.4, d: 0.8, h: 0.35, top: M.brass, leg: M.teak });
  // brass kettle and cups
  b.lathe([[0, 0], [0.1, 0], [0.14, 0.08], [0.12, 0.2], [0.05, 0.26], [0.03, 0.32], [0, 0.32]], M.brass, { pos: [0, y + 0.35, 8.8] });
  for (let i = 0; i < 4; i++) b.cyl(-0.5 + i * 0.33, y + 0.35, 8.55, 0.035, 0.03, 0.07, M.ceramic, { seg: 12 });
  smokeLite(ctx, 0, y + 0.7, 8.8);
  // hanging lanterns
  for (let i = 0; i < 5; i++) {
    const x = -3.2 + i * 1.6;
    b.cyl(x, y + CEIL - 0.9, 7.2, 0.003, 0.003, 0.9, M.brass, { seg: 4 });
    b.cyl(x, y + CEIL - 1.25, 7.2, 0.12, 0.12, 0.35, M.lampWarm, { seg: 8 });
    b.cyl(x, y + CEIL - 1.25, 7.2, 0.14, 0.14, 0.04, M.brass, { seg: 8 });
  }
  ctx.light({ pos: [0, y + 2.3, 7.2], floor: n, intensity: 10, distance: 7, color: 0xffa860 });
  F.plant(ctx, { x: -4.8, z: 11.3, y, size: 1.1, kind: 'monstera', seed: 221 });
  F.plant(ctx, { x: 4.8, z: 11.3, y, size: 1.1, kind: 'palm', seed: 222 });
  ctx.interact({ pos: [0, y + 0.9, 9.6], r: 1.2, floor: n, label: 'Pour a cup of chai', action: (g) => { g.audio.water(1.2); g.ui.toast('Kadak chai, just the way you like it.'); } });
}

function smokeLite(ctx, x, y, z) {
  const parts = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthWrite: false })); ctx.dyn.add(m); parts.push(m); }
  ctx.anim((dt, t) => { parts.forEach((m, i) => { const L = (t * 0.3 + i / 6) % 1; m.position.set(x + Math.sin(L * 6 + i) * 0.03, y + L * 0.5, z); m.scale.setScalar(1 + L * 3); m.material.opacity = 0.18 * (1 - L); }); });
}
