import * as THREE from 'three';
import { makeNoise2D, fbm, mulberry32, clamp } from '../util/noise.js';

// Procedural, tileable PBR-ish textures painted on canvases at load time.

let maxAniso = 8;
export function setAnisotropy(a) { maxAniso = a; }

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function toTexture(c, { srgb = true, repeat = true, aniso = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso ? maxAniso : 1;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  return t;
}

// Paint pixels from a function (u,v) -> [r,g,b] (0..255) and optionally a height (0..1)
function paint(size, fn, wantHeight = false) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const H = wantHeight ? new Float32Array(size * size) : null;
  const out = [0, 0, 0, 0];
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      out[3] = 0.5;
      fn(u, v, out);
      const i = (y * size + x) * 4;
      d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = 255;
      if (H) H[y * size + x] = out[3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return { c, H };
}

export function normalFromHeight(H, size, strength = 2) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
    const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
    let nx = -dx, ny = dy, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false });
}

const mix = (a, b, t) => a + (b - a) * t;

// ---------- Marble ----------
export function marble(size = 1024, { base = [242, 239, 233], vein = [120, 118, 118], vein2 = null, seed = 3, scale = 3, sharp = 7, warp = 5.5, normal = true } = {}) {
  const n = makeNoise2D(seed, scale);
  const n2 = makeNoise2D(seed + 7, scale * 2);
  const n3 = makeNoise2D(seed + 13, 4);
  const { c, H } = paint(size, (u, v, o) => {
    const t = fbm(n, u * scale, v * scale, 6);
    const s = fbm(n2, u * scale * 2, v * scale * 2, 4);
    const cl = fbm(n3, u * 4, v * 4, 5);
    // a few long, directional veins (diagonal), softly warped
    const w = Math.sin((u * 1 + v * 2) * Math.PI * 2 + t * warp * 0.75);
    let veinAmt = Math.pow(1 - Math.abs(w), sharp * 1.6) * (0.55 + cl * 0.6);
    const w2 = Math.sin((u * 2 - v * 1) * Math.PI * 2 + s * 3.2 + t * 2);
    veinAmt += Math.pow(1 - Math.abs(w2), 40) * 0.35;
    veinAmt = clamp(veinAmt, 0, 1);
    const cloud = (cl - 0.5) * 26 + (s - 0.5) * 8;
    const vc = vein2 && s > 0.55 ? vein2 : vein;
    o[0] = mix(base[0] + cloud, vc[0], veinAmt * 0.8);
    o[1] = mix(base[1] + cloud, vc[1], veinAmt * 0.8);
    o[2] = mix(base[2] + cloud * 0.9, vc[2], veinAmt * 0.8);
    o[3] = 0.5 - veinAmt * 0.04;
  }, normal);
  return { map: toTexture(c), normal: normal ? normalFromHeight(H, size, 1.5) : null };
}

// ---------- Wood ----------
export function wood(size = 1024, { base = [150, 98, 58], dark = [92, 55, 30], planks = 6, seams = true, seed = 11, rings = 18, normal = true, herring = false } = {}) {
  const n = makeNoise2D(seed, 8);
  const rnd = mulberry32(seed);
  const plankTone = Array.from({ length: planks * 4 }, () => 0.82 + rnd() * 0.3);
  const plankOff = Array.from({ length: planks * 4 }, () => rnd());
  const { c, H } = paint(size, (u, v, o) => {
    const row = Math.floor(v * planks);
    const off = plankOff[row % plankOff.length];
    const seg = Math.floor(u * 2 + off * 2) ;
    const id = (row * 3 + seg) % plankTone.length;
    const tone = plankTone[id];
    const lv = v * planks - row;
    const g = fbm(n, u * 8 + id * 3.1, lv * 0.6 + id, 5);
    const ring = Math.sin((lv * 3 + g * 6 + plankOff[id] * 10) * rings * 0.35);
    const grain = Math.pow(Math.abs(ring), 0.6);
    const fiber = fbm(n, u * 64, lv * 3 + id * 7, 3);
    let t = clamp(0.55 * grain + 0.45 * fiber, 0, 1);
    let r = mix(dark[0], base[0], t) * tone, gg = mix(dark[1], base[1], t) * tone, b = mix(dark[2], base[2], t) * tone;
    let h = 0.5 + (fiber - 0.5) * 0.15;
    if (seams) {
      const ev = Math.min(lv, 1 - lv) * size / planks;
      const eu = Math.abs(((u * 2 + off * 2) % 1)) * size / 2;
      const eu2 = Math.min(eu, size / 2 - eu);
      const e = Math.min(ev, eu2);
      if (e < 1.6) { const k = 0.55 + e * 0.2; r *= k; gg *= k; b *= k; h -= 0.35 * (1.6 - e); }
    }
    o[0] = r; o[1] = gg; o[2] = b; o[3] = h;
  }, normal);
  return { map: toTexture(c), normal: normal ? normalFromHeight(H, size, 2.5) : null };
}

// ---------- Tiles ----------
export function tiles(size = 512, { base = [205, 200, 192], grout = [140, 135, 128], n: count = 4, var: vr = 10, seed = 5, marbleish = false, normal = true, hex = false } = {}) {
  const nz = makeNoise2D(seed, 4);
  const rnd = mulberry32(seed);
  const tone = Array.from({ length: 64 }, () => (rnd() - 0.5) * vr);
  const { c, H } = paint(size, (u, v, o) => {
    const gx = u * count, gy = v * count;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy;
    const e = Math.min(fx, 1 - fx, fy, 1 - fy) * size / count;
    const t = tone[(ix * 7 + iy * 13) & 63];
    const s = fbm(nz, u * 4, v * 4, 4);
    let r = base[0] + t + (s - 0.5) * (marbleish ? 30 : 10), g = base[1] + t + (s - 0.5) * (marbleish ? 30 : 10), b = base[2] + t + (s - 0.5) * (marbleish ? 28 : 10);
    let h = 0.6;
    if (e < 2.2) { const k = clamp((2.2 - e) / 1.2, 0, 1); r = mix(r, grout[0], k); g = mix(g, grout[1], k); b = mix(b, grout[2], k); h = 0.6 - k * 0.5; }
    o[0] = r; o[1] = g; o[2] = b; o[3] = h;
  }, normal);
  return { map: toTexture(c), normal: normal ? normalFromHeight(H, size, 2) : null };
}

// ---------- Plaster / paint ----------
export function plaster(size = 512, { base = [236, 230, 220], amt = 7, seed = 21 } = {}) {
  const n = makeNoise2D(seed, 8);
  const { c, H } = paint(size, (u, v, o) => {
    const s = fbm(n, u * 8, v * 8, 5);
    const k = (s - 0.5) * amt * 2;
    o[0] = base[0] + k; o[1] = base[1] + k; o[2] = base[2] + k; o[3] = s;
  }, true);
  return { map: toTexture(c), normal: normalFromHeight(H, size, 0.9) };
}

// ---------- Exterior stone (sandstone blocks) ----------
export function stone(size = 512, { base = [214, 182, 140], seed = 31, rows = 4 } = {}) {
  const n = makeNoise2D(seed, 8);
  const rnd = mulberry32(seed);
  const tone = Array.from({ length: 64 }, () => (rnd() - 0.5) * 26);
  const { c, H } = paint(size, (u, v, o) => {
    const row = Math.floor(v * rows);
    const off = (row % 2) * 0.5;
    const cu = u * 2 + off;
    const col = Math.floor(cu);
    const fx = cu - col, fy = v * rows - row;
    const e = Math.min(fx * size / 2, (1 - fx) * size / 2, fy * size / rows, (1 - fy) * size / rows);
    const t = tone[(row * 5 + col * 3) & 63];
    const s = fbm(n, u * 8, v * 8, 5);
    const s2 = fbm(n, u * 32, v * 32, 2);
    let r = base[0] + t + (s - 0.5) * 40 + (s2 - 0.5) * 16, g = base[1] + t * 0.9 + (s - 0.5) * 34 + (s2 - 0.5) * 14, b = base[2] + t * 0.8 + (s - 0.5) * 28 + (s2 - 0.5) * 12;
    let h = 0.55 + (s - 0.5) * 0.3;
    if (e < 3) { const k = clamp((3 - e) / 2, 0, 1); r = mix(r, base[0] * 0.62, k); g = mix(g, base[1] * 0.62, k); b = mix(b, base[2] * 0.62, k); h -= k * 0.4; }
    o[0] = r; o[1] = g; o[2] = b; o[3] = h;
  }, true);
  return { map: toTexture(c), normal: normalFromHeight(H, size, 3) };
}

// ---------- Grass ----------
export function grass(size = 512, seed = 41) {
  const n = makeNoise2D(seed, 8);
  const n2 = makeNoise2D(seed + 1, 64);
  const { c, H } = paint(size, (u, v, o) => {
    const s = fbm(n, u * 8, v * 8, 5);
    const b = n2(u * 64, v * 64);
    const blade = Math.pow(n2(u * 128 + 3, v * 128), 3);
    o[0] = 58 + s * 50 + blade * 30; o[1] = 92 + s * 62 + b * 26 + blade * 40; o[2] = 34 + s * 20; o[3] = b * 0.6 + blade * 0.4;
  }, true);
  return { map: toTexture(c), normal: normalFromHeight(H, size, 2.5) };
}

export function paving(size = 512, seed = 51) {
  return stone(size, { base: [176, 168, 156], seed, rows: 6 });
}

export function concrete(size = 512, { base = [180, 178, 172], seed = 61 } = {}) {
  return plaster(size, { base, amt: 14, seed });
}

// ---------- Fabric weave ----------
export function fabric(size = 256, { base = [200, 190, 175], seed = 71, weave = 64, amt = 18 } = {}) {
  const n = makeNoise2D(seed, 8);
  const { c, H } = paint(size, (u, v, o) => {
    const a = Math.sin(u * weave * Math.PI * 2) * 0.5 + 0.5;
    const b = Math.sin(v * weave * Math.PI * 2) * 0.5 + 0.5;
    const w = (Math.floor(u * weave) + Math.floor(v * weave)) % 2 ? a : b;
    const s = fbm(n, u * 8, v * 8, 3);
    const k = (w - 0.5) * amt + (s - 0.5) * 10;
    o[0] = base[0] + k; o[1] = base[1] + k; o[2] = base[2] + k; o[3] = w;
  }, true);
  return { map: toTexture(c), normal: normalFromHeight(H, size, 1.2) };
}

// ---------- Water normal (tileable ripples) ----------
export function waterNormal(size = 512, seed = 81) {
  const n = makeNoise2D(seed, 8);
  const H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = fbm(n, x / size * 8, y / size * 8, 5);
  return normalFromHeight(H, size, 6);
}

// ---------- Persian rug (drawn) ----------
export function persianRug(w = 1024, h = 1536, { field = '#7d1a1f', border = '#13284a', accent = '#d9a94e', ivory = '#efe3c8', seed = 7 } = {}) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = border; g.fillRect(0, 0, w, h);
  const bands = [[0.02, ivory], [0.035, border], [0.085, accent], [0.095, field]];
  // border bands
  for (const [inset, col] of bands) { g.fillStyle = col; g.fillRect(w * inset, w * inset, w - 2 * w * inset, h - 2 * w * inset); }
  // border motifs
  g.save();
  g.fillStyle = accent;
  const bw = w * 0.05;
  for (let i = 0; i < 26; i++) {
    const t = (i + 0.5) / 26;
    for (const [x, y] of [[t * w, w * 0.06], [t * w, h - w * 0.06]]) { flower(g, x, y, bw * 0.32, 6, accent, ivory); }
  }
  for (let i = 0; i < 38; i++) {
    const t = (i + 0.5) / 38;
    for (const [x, y] of [[w * 0.06, t * h], [w - w * 0.06, t * h]]) { flower(g, x, y, bw * 0.3, 6, accent, ivory); }
  }
  g.restore();
  // field lattice
  g.save();
  g.beginPath(); g.rect(w * 0.1, w * 0.1, w * 0.8, h - w * 0.2); g.clip();
  for (let y = 0; y < 14; y++) for (let x = 0; x < 9; x++) {
    const px = w * 0.1 + (x + (y % 2) * 0.5) * w * 0.8 / 8, py = w * 0.1 + y * (h - w * 0.2) / 13;
    flower(g, px, py, w * 0.022, 8, y % 3 === 0 ? ivory : accent, border);
    g.strokeStyle = 'rgba(217,169,78,.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(px - 30, py); g.lineTo(px, py - 30); g.lineTo(px + 30, py); g.lineTo(px, py + 30); g.closePath(); g.stroke();
  }
  g.restore();
  // central medallion
  const cx = w / 2, cy = h / 2;
  for (let r = 6; r >= 1; r--) {
    g.fillStyle = r % 2 ? border : accent;
    star(g, cx, cy, w * 0.05 * r, w * 0.04 * r, 16);
    g.fill();
  }
  g.fillStyle = ivory; flower(g, cx, cy, w * 0.07, 12, ivory, field);
  // corner spandrels
  g.fillStyle = border;
  for (const [x, y] of [[w * 0.1, w * 0.1], [w * 0.9, w * 0.1], [w * 0.1, h - w * 0.1], [w * 0.9, h - w * 0.1]]) {
    g.beginPath(); g.arc(x, y, w * 0.18, 0, Math.PI * 2); g.fill();
    flower(g, x, y, w * 0.06, 10, accent, ivory);
  }
  // fibre noise
  const img = g.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const k = (rnd() - 0.5) * 26; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
  g.putImageData(img, 0, 0);
  return toTexture(c, { repeat: false });
}

function star(g, cx, cy, r1, r2, n) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1;
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  g.closePath();
}

export function flower(g, cx, cy, r, petals, col, center) {
  g.save(); g.translate(cx, cy);
  g.fillStyle = col;
  for (let i = 0; i < petals; i++) {
    g.rotate((Math.PI * 2) / petals);
    g.beginPath(); g.ellipse(0, -r * 0.6, r * 0.28, r * 0.6, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = center; g.beginPath(); g.arc(0, 0, r * 0.3, 0, Math.PI * 2); g.fill();
  g.restore();
}

// ---------- Rangoli (alpha decal) ----------
export function rangoli(size = 1024) {
  const c = canvas(size);
  const g = c.getContext('2d');
  const cx = size / 2, cy = size / 2;
  const cols = ['#ff3b6b', '#ffb200', '#ff6a00', '#19b56b', '#2a7bff', '#8d3bff', '#ffffff', '#ffd700'];
  g.translate(cx, cy);
  const ring = (r, n, w, colA, colB, shape) => {
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate((i / n) * Math.PI * 2);
      g.fillStyle = i % 2 ? colA : colB;
      g.beginPath();
      if (shape === 'petal') { g.moveTo(0, -r + w); g.quadraticCurveTo(w * 0.9, -r - w * 0.5, 0, -r - w * 1.6); g.quadraticCurveTo(-w * 0.9, -r - w * 0.5, 0, -r + w); }
      else if (shape === 'dot') { g.arc(0, -r, w * 0.35, 0, Math.PI * 2); }
      else { g.moveTo(0, -r + w); g.lineTo(w * 0.7, -r); g.lineTo(0, -r - w); g.lineTo(-w * 0.7, -r); }
      g.fill(); g.restore();
    }
  };
  const R = size * 0.48;
  ring(R * 0.92, 48, R * 0.05, cols[6], cols[7], 'dot');
  ring(R * 0.78, 24, R * 0.1, cols[0], cols[1], 'petal');
  ring(R * 0.6, 16, R * 0.11, cols[3], cols[4], 'petal');
  ring(R * 0.62, 32, R * 0.04, cols[6], cols[6], 'dot');
  ring(R * 0.44, 12, R * 0.1, cols[2], cols[5], 'petal');
  ring(R * 0.3, 8, R * 0.08, cols[1], cols[0], 'diamond');
  g.fillStyle = cols[7]; g.beginPath(); g.arc(0, 0, R * 0.14, 0, Math.PI * 2); g.fill();
  g.fillStyle = cols[0]; g.beginPath(); g.arc(0, 0, R * 0.09, 0, Math.PI * 2); g.fill();
  // diya flames in the centre ring
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate(i / 8 * Math.PI * 2 + 0.2);
    g.fillStyle = '#fff2a8'; g.beginPath(); g.ellipse(0, -R * 0.2, R * 0.015, R * 0.03, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // powder grain
  const img = g.getImageData(0, 0, size, size), d = img.data; const rnd = mulberry32(9);
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) { const k = (rnd() - 0.5) * 50; d[i] += k; d[i + 1] += k; d[i + 2] += k; if (rnd() < 0.05) d[i + 3] *= 0.5; } }
  g.putImageData(img, 0, 0);
  return toTexture(c, { repeat: false });
}

// ---------- Jali (pierced lattice) alpha map ----------
export function jali(size = 512) {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size);
  g.fillStyle = '#000';
  const n = 4, s = size / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const cx = (x + 0.5) * s, cy = (y + 0.5) * s;
    g.save(); g.translate(cx, cy);
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, -s * 0.26, s * 0.07, s * 0.17, 0, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(0, 0, s * 0.06, 0, Math.PI * 2); g.fill();
    g.restore();
    g.beginPath(); g.arc(x * s, y * s, s * 0.08, 0, Math.PI * 2); g.fill();
  }
  return toTexture(c, { srgb: false });
}

// ---------- Books on a shelf ----------
export function bookSpines(w = 512, h = 128, seed = 3) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const pal = ['#7a1f1f', '#1f3b5c', '#2f5a3a', '#c79a4b', '#5c2a4a', '#e2d5b5', '#28282e', '#8a4b22', '#3d6e74', '#a33b2b'];
  g.fillStyle = '#20140c'; g.fillRect(0, 0, w, h);
  let x = 0;
  while (x < w) {
    const bw = 8 + rnd() * 18, bh = h * (0.68 + rnd() * 0.3);
    const col = pal[Math.floor(rnd() * pal.length)];
    g.fillStyle = col; g.fillRect(x, h - bh, bw - 1, bh);
    g.fillStyle = 'rgba(255,220,150,.55)';
    if (rnd() < 0.7) { g.fillRect(x + 2, h - bh + bh * 0.15, bw - 5, 2); g.fillRect(x + 2, h - bh * 0.25, bw - 5, 2); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + bw - 3, h - bh, 2, bh);
    x += bw;
    if (rnd() < 0.06) x += 10;
  }
  return toTexture(c, { repeat: true });
}

// ---------- Damask wallpaper ----------
export function damask(size = 512, { base = '#2a1a26', ink = 'rgba(214,170,98,0.55)' } = {}) {
  const c = canvas(size);
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  g.fillStyle = ink;
  const motif = (x, y, s) => {
    g.save(); g.translate(x, y);
    for (const sx of [1, -1]) {
      g.save(); g.scale(sx, 1);
      g.beginPath(); g.moveTo(0, -s); g.bezierCurveTo(s * 0.6, -s * 0.7, s * 0.5, -s * 0.1, s * 0.12, 0); g.bezierCurveTo(s * 0.55, s * 0.2, s * 0.5, s * 0.75, 0, s); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(s * 0.45, -s * 0.05, s * 0.1, s * 0.22, 0.5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.restore();
  };
  motif(size * 0.25, size * 0.25, size * 0.2); motif(size * 0.75, size * 0.75, size * 0.2);
  motif(size * 0.75, size * 0.25, size * 0.08); motif(size * 0.25, size * 0.75, size * 0.08);
  return toTexture(c);
}

// Generic linear gradient canvas (for skies, screens, backdrops)
export function gradient(w, h, stops, vertical = true) {
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const gr = vertical ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
  for (const [t, col] of stops) gr.addColorStop(t, col);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  return toTexture(c, { repeat: false });
}

export function canvasTexture(w, h, draw, opts) {
  const c = canvas(w, h);
  draw(c.getContext('2d'), w, h);
  return toTexture(c, { repeat: false, ...opts });
}
