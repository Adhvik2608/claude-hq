import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Collects static geometry per material and merges it into a handful of meshes,
// which keeps draw calls low for a house full of furniture.

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function matrix(pos = [0, 0, 0], rot = 0, scale = 1) {
  if (typeof rot === 'number') _e.set(0, rot, 0); else _e.set(rot[0], rot[1], rot[2], rot[3] || 'XYZ');
  _q.setFromEuler(_e);
  if (typeof scale === 'number') _s.set(scale, scale, scale); else _s.set(scale[0], scale[1], scale[2]);
  _p.set(pos[0], pos[1], pos[2]);
  return _m.compose(_p, _q, _s).clone();
}

// Project UVs from world position by dominant normal axis (metres).
export function worldUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u; uv[i * 2 + 1] = v;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export class Builder {
  constructor(physics) {
    this.physics = physics;
    this.batches = new Map();
    this.layer = 'shell';
    this.layerGroups = new Map();
  }

  // geo: BufferGeometry in local space; m: Matrix4 (optional); uv: 'world' | 'keep'
  add(geo, mat, { m = null, uv = 'world', cast = true, receive = true, color = null } = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (uv === 'world' || !g.attributes.uv) worldUV(g);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (mat.vertexColors) {
      if (!g.attributes.color) {
        const c = new THREE.Color(color ?? 0xffffff);
        const arr = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      }
    } else if (g.attributes.color) g.deleteAttribute('color');
    g.morphAttributes = {};
    g.groups = [];
    const key = this.layer + '|' + mat.uuid + (cast ? 'c' : '') + (receive ? 'r' : '');
    let b = this.batches.get(key);
    if (!b) this.batches.set(key, (b = { mat, cast, receive, geos: [], layer: this.layer }));
    b.geos.push(g);
    return g;
  }

  // Axis-aligned (optionally Y-rotated) box. (x, z) centre, y bottom.
  box(x, y, z, w, h, d, mat, opts = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = matrix([x, y + h / 2, z], opts.rot || 0);
    this.add(g, mat, { ...opts, m });
    if (opts.collide) {
      const o = typeof opts.collide === 'object' ? opts.collide : {};
      if (opts.rot) this.physics.addBoxRot(x, y, z, w, h, d, opts.rot, o);
      else this.physics.addBoxC(x, y, z, w, h, d, o);
    }
    return g;
  }

  cyl(x, y, z, rTop, rBot, h, mat, opts = {}) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, opts.seg || 24, 1, !!opts.open);
    this.add(g, mat, { ...opts, m: matrix([x, y + h / 2, z], opts.rot || 0, opts.scale || 1) });
    if (opts.collide) this.physics.addCyl(x, z, Math.max(rTop, rBot), y, y + h);
    return g;
  }

  sphere(x, y, z, r, mat, opts = {}) {
    const g = new THREE.SphereGeometry(r, opts.seg || 20, opts.segH || 14, 0, Math.PI * 2, 0, opts.thetaLen || Math.PI);
    this.add(g, mat, { ...opts, m: matrix([x, y, z], opts.rot || 0, opts.scale || 1) });
    return g;
  }

  lathe(points, mat, opts = {}) {
    const pts = points.map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, opts.seg || 32);
    this.add(g, mat, { ...opts, m: matrix(opts.pos || [0, 0, 0], opts.rot || 0, opts.scale || 1) });
    return g;
  }

  geo(g, mat, opts = {}) {
    this.add(g, mat, { ...opts, m: opts.m || matrix(opts.pos || [0, 0, 0], opts.rot || 0, opts.scale || 1) });
    return g;
  }

  // Merge everything collected so far into meshes under `parent`.
  flush(parent, name = 'batch') {
    const out = [];
    for (const b of this.batches.values()) {
      if (!b.geos.length) continue;
      // keep merged buffers reasonably sized
      const chunks = [];
      let cur = [], verts = 0;
      for (const g of b.geos) {
        cur.push(g); verts += g.attributes.position.count;
        if (verts > 400000) { chunks.push(cur); cur = []; verts = 0; }
      }
      if (cur.length) chunks.push(cur);
      for (const c of chunks) {
        const merged = mergeGeometries(c, false);
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, b.mat);
        mesh.name = name;
        mesh.castShadow = b.cast; mesh.receiveShadow = b.receive;
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        let lg = this.layerGroups.get(b.layer);
        if (!lg) { lg = new THREE.Group(); lg.name = 'layer-' + b.layer; parent.add(lg); this.layerGroups.set(b.layer, lg); }
        lg.add(mesh);
        out.push(mesh);
      }
      for (const g of b.geos) g.dispose();
    }
    this.batches.clear();
    return out;
  }
}

// A few reusable geometry makers ------------------------------------------

export function roundedBox(w, h, d, r = 0.04, seg = 3) {
  // cheap rounded box: a box whose vertices are pulled onto rounded corners
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const p = g.attributes.position;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-hx, Math.min(hx, v.x)), Math.max(-hy, Math.min(hy, v.y)), Math.max(-hz, Math.min(hz, v.z)));
    const dlt = v.clone().sub(c);
    if (dlt.lengthSq() > 0) { dlt.setLength(r); v.copy(c).add(dlt); }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function cushion(w, h, d, puff = 0.35) {
  const g = roundedBox(w, h, d, Math.min(w, h, d) * 0.45, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), z = p.getZ(i) / (d / 2), y = p.getY(i);
    const k = (1 - x * x) * (1 - z * z);
    if (y > 0) p.setY(i, y + k * h * puff * 0.5);
    else p.setY(i, y - k * h * puff * 0.2);
  }
  g.computeVertexNormals();
  return g;
}

// Extruded 2D shape lying on XZ (shape in x/z, extruded upward by depth)
export function slabShape(shape, depth, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  return g;
}

// A tube along a list of points
export function tube(points, r, seg = 64, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), closed);
  return new THREE.TubeGeometry(curve, seg, r, radial, closed);
}

// Catenary-ish garland points between a and b with sag
export function sagPoints(a, b, sag, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t));
  }
  return pts;
}

// Merge every static mesh under `group` into one mesh per material (keeps the
// group's own transform so it can still be moved/animated as a whole).
// Meshes flagged with userData.keep (and their subtrees) are left untouched.
export function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map();
  const remove = [];
  const skip = new Set();
  group.traverse((o) => { if (o.userData && o.userData.keep) o.traverse((c) => skip.add(c)); });
  group.traverse((o) => {
    if (!o.isMesh || skip.has(o) || Array.isArray(o.material) || o.isInstancedMesh) return;
    if (!o.visible) { remove.push(o); return; }
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.morphAttributes = {}; g.groups = [];
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 'c' : '');
    if (!byMat.has(key)) byMat.set(key, { mat: o.material, cast: o.castShadow, geos: [] });
    byMat.get(key).geos.push(g);
    remove.push(o);
  });
  for (const o of remove) if (o.parent) o.parent.remove(o);
  // drop empty groups
  const empties = [];
  group.traverse((o) => { if (o !== group && !o.isMesh && o.children.length === 0 && !(o.userData && o.userData.keep) && !o.isLight && !o.isPoints) empties.push(o); });
  for (const o of empties) if (o.parent) o.parent.remove(o);
  for (const { mat, cast, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = cast; m.receiveShadow = true;
    group.add(m);
  }
  return group;
}
