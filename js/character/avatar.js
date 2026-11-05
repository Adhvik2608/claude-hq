import * as THREE from 'three';
import { makeNoise2D } from '../util/noise.js';

// Procedurally built, fully customisable character. Rigid parts hang off a joint
// hierarchy that the Animator drives. Faces +Z in local space.

export const SKIN_TONES = ['#f6d7c3', '#eec1a1', '#e0ac85', '#c98e65', '#b67650', '#9a5f3e', '#7c4a2f', '#5c3521', '#3f2416'];
export const HAIR_COLORS = ['#0e0a08', '#2a1a10', '#4a2c1a', '#7a4a2a', '#a8703c', '#d8b070', '#e8d3a8', '#b8b4ae', '#f2f0ec', '#8c1f1f', '#c0462a', '#2c3e8c', '#6a2c8c', '#1f6a5a', '#e07ab0'];
export const EYE_COLORS = ['#2a1608', '#4a2a12', '#6e4220', '#8a6a2a', '#5a7a3a', '#3a6a5a', '#3a5a8a', '#6a8ab0', '#7a7a80', '#a07020'];
export const CLOTH_COLORS = ['#f4ede0', '#e9dcc0', '#1c1c20', '#3a3d44', '#7a7f88', '#1e2d4a', '#2f5a8c', '#6aa0c8', '#1f5a46', '#5f8a4a', '#c9a24a', '#e08a2a', '#c0392b', '#8c1d2a', '#5a2a4a', '#e7a3b5', '#a07a5a', '#6b4226', '#ffffff', '#d9c7f0'];

export const OPTIONS = {
  bodyShape: [['masc', 'Broad'], ['neutral', 'Neutral'], ['femme', 'Curvy']],
  faceShape: [['oval', 'Oval'], ['round', 'Round'], ['square', 'Square'], ['heart', 'Heart'], ['long', 'Long'], ['diamond', 'Diamond']],
  eyeType: [['almond', 'Almond'], ['round', 'Round'], ['hooded', 'Hooded'], ['upturned', 'Upturned'], ['downturned', 'Downturned'], ['monolid', 'Monolid'], ['wide', 'Big & bright']],
  brows: [['natural', 'Natural'], ['thick', 'Bold'], ['thin', 'Thin'], ['arched', 'Arched'], ['straight', 'Straight']],
  nose: [['straight', 'Straight'], ['button', 'Button'], ['wide', 'Wide'], ['aquiline', 'Aquiline'], ['small', 'Petite']],
  lips: [['natural', 'Natural'], ['full', 'Full'], ['thin', 'Thin'], ['smile', 'Smiling']],
  hair: [['short', 'Short'], ['buzz', 'Buzz'], ['quiff', 'Quiff'], ['sidepart', 'Side part'], ['medium', 'Wavy'], ['curly', 'Curly'], ['afro', 'Afro'], ['long', 'Long'], ['bob', 'Bob'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['braid', 'Braid'], ['spiky', 'Spiky'], ['bald', 'Bald']],
  beard: [['none', 'None'], ['stubble', 'Stubble'], ['short', 'Short beard'], ['full', 'Full beard'], ['goatee', 'Goatee']],
  mustache: [['none', 'None'], ['classic', 'Classic'], ['thin', 'Pencil'], ['handlebar', 'Handlebar']],
  top: [['kurta', 'Kurta'], ['tshirt', 'T-shirt'], ['shirt', 'Shirt'], ['hoodie', 'Hoodie'], ['nehru', 'Nehru jacket'], ['tank', 'Tank'], ['dress', 'Dress'], ['sweater', 'Sweater']],
  bottom: [['jeans', 'Jeans'], ['trousers', 'Trousers'], ['pajama', 'Pajama'], ['dhoti', 'Dhoti'], ['shorts', 'Shorts'], ['skirt', 'Long skirt']],
  shoes: [['sneakers', 'Sneakers'], ['loafers', 'Loafers'], ['juttis', 'Juttis'], ['boots', 'Boots'], ['sandals', 'Sandals'], ['barefoot', 'Barefoot']],
  glasses: [['none', 'None'], ['round', 'Round'], ['square', 'Square'], ['aviator', 'Aviator'], ['sun', 'Sunglasses']],
  forehead: [['none', 'None'], ['bindi', 'Bindi'], ['tilak', 'Tilak'], ['tripundra', 'Tripundra']],
  headwear: [['none', 'None'], ['cap', 'Cap'], ['pagdi', 'Pagdi'], ['beanie', 'Beanie'], ['headphones', 'Headphones']],
};

export const DEFAULT_LOOK = {
  height: 1.0, build: 0.5, bodyShape: 'neutral', skin: '#c98e65',
  faceShape: 'oval', eyeType: 'almond', eyeColor: '#4a2a12', eyeSize: 1, brows: 'natural', nose: 'straight', lips: 'natural', lipColor: '#a85a50',
  hair: 'quiff', hairColor: '#1a120c', beard: 'none', mustache: 'none',
  top: 'kurta', topColor: '#f4ede0', accent: '#c9a24a', bottom: 'pajama', bottomColor: '#f4ede0', shoes: 'juttis', shoeColor: '#8c1d2a',
  glasses: 'none', forehead: 'none', headwear: 'none', earrings: false, watch: true, mala: false,
};

export function randomLook() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const o = (k) => pick(OPTIONS[k])[0];
  const femme = Math.random() < 0.5;
  return {
    ...DEFAULT_LOOK,
    height: 0.94 + Math.random() * 0.12, build: Math.random(), bodyShape: femme ? 'femme' : pick(['masc', 'neutral']),
    skin: pick(SKIN_TONES), faceShape: o('faceShape'), eyeType: o('eyeType'), eyeColor: pick(EYE_COLORS), eyeSize: 0.92 + Math.random() * 0.2,
    brows: o('brows'), nose: o('nose'), lips: o('lips'), lipColor: pick(['#a85a50', '#b0485a', '#8a3a3a', '#c06a6a', '#7a3a30']),
    hair: femme ? pick(['long', 'bob', 'ponytail', 'bun', 'braid', 'curly', 'medium']) : pick(['short', 'buzz', 'quiff', 'sidepart', 'medium', 'curly', 'afro', 'spiky']),
    hairColor: pick(HAIR_COLORS.slice(0, 9)), beard: femme ? 'none' : pick(['none', 'none', 'stubble', 'short', 'full', 'goatee']),
    mustache: femme ? 'none' : pick(['none', 'none', 'classic', 'thin']),
    top: femme ? pick(['kurta', 'dress', 'tshirt', 'sweater', 'shirt']) : pick(['kurta', 'tshirt', 'shirt', 'hoodie', 'nehru', 'sweater']),
    topColor: pick(CLOTH_COLORS), accent: pick(CLOTH_COLORS), bottom: o('bottom'), bottomColor: pick(CLOTH_COLORS), shoes: o('shoes'), shoeColor: pick(CLOTH_COLORS),
    glasses: Math.random() < 0.25 ? o('glasses') : 'none', forehead: Math.random() < 0.3 ? o('forehead') : 'none', headwear: Math.random() < 0.15 ? o('headwear') : 'none',
    earrings: femme && Math.random() < 0.6, watch: Math.random() < 0.5, mala: Math.random() < 0.25,
  };
}

// ---------------------------------------------------------------------------
// geometry helpers
function limb(r0, r1, L, seg = 18) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 - (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0001, r0 * Math.cos(a)), r0 * Math.sin(a))); }
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0001, r1 * Math.cos(a)), -L - r1 * Math.sin(a))); }
  pts[0].x = 0.0001; pts[pts.length - 1].x = 0.0001;
  return new THREE.LatheGeometry(pts, seg);
}
function lathe(profile, seg = 32) { return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)), seg); }
const mesh = (g, m, cast = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; };
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const FACE = {
  oval: { jaw: 0.8, chin: 0.1, point: 0.4, cheek: 0.03, len: 1.04, wid: 0.98 },
  round: { jaw: 0.95, chin: 0.02, point: 0.1, cheek: 0.07, len: 0.96, wid: 1.05 },
  square: { jaw: 1.02, chin: 0.05, point: 0.0, cheek: 0.02, len: 1.0, wid: 1.04, square: 1 },
  heart: { jaw: 0.7, chin: 0.13, point: 0.8, cheek: 0.07, len: 1.02, wid: 1.03 },
  long: { jaw: 0.84, chin: 0.13, point: 0.4, cheek: 0.01, len: 1.12, wid: 0.95 },
  diamond: { jaw: 0.74, chin: 0.12, point: 0.6, cheek: 0.12, len: 1.04, wid: 0.97 },
};
const HEAD = { rx: 0.09, ry: 0.115, rz: 0.104 };

// head surface position for a unit direction (shared by head, hair and beard shells)
function headPoint(d, shape, out) {
  const f = FACE[shape] || FACE.oval;
  let x = d.x, y = d.y, z = d.z;
  // lower face: narrow jaw, extend chin
  if (y < 0) {
    const t = sstep(0, -1, y);
    const jaw = 1 + (f.jaw - 1) * t;
    let xs = jaw;
    if (f.square) xs = 1 + (f.jaw - 1) * t * t; // keep jaw width longer
    x *= xs;
    if (z > 0) z *= 1 - 0.06 * t;
    y *= 1 + f.chin * t;
    // pointed chin
    const front = Math.max(0, z);
    x *= 1 - f.point * 0.25 * t * t * front;
  }
  // cheekbones
  const cg = Math.exp(-((y + 0.05) ** 2) / 0.04) * Math.exp(-((Math.abs(x) - 0.62) ** 2) / 0.06) * Math.max(0, z);
  x *= 1 + f.cheek * cg * Math.sign(x) * Math.sign(x);
  // flatter face, rounder back
  if (z > 0.2) z *= 1 - 0.07 * sstep(0.2, 0.9, d.z);
  if (z < 0 && y > -0.3) z *= 1.06;
  out.set(x * HEAD.rx * f.wid, y * HEAD.ry * f.len, z * HEAD.rz);
  return out;
}

function eyeSockets(p, look) {
  // returns inward offset near eye positions
  const ex = 0.034, ey = 0.012;
  let k = 0;
  for (const sx of [1, -1]) {
    const dx = p.x - sx * ex, dy = p.y - ey;
    k += Math.exp(-(dx * dx + dy * dy * 1.6) / 0.00028);
  }
  return k;
}

function irisTexture(hex) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const col = new THREE.Color(hex);
  const dark = col.clone().multiplyScalar(0.45), light = col.clone().lerp(new THREE.Color(0xffffff), 0.25);
  const rg = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  rg.addColorStop(0, '#' + light.getHexString()); rg.addColorStop(0.55, hex); rg.addColorStop(0.86, '#' + dark.getHexString()); rg.addColorStop(1, '#0a0605');
  g.fillStyle = rg; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
  for (let i = 0; i < 70; i++) { const a = (i / 70) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 20, 64 + Math.sin(a) * 20); g.lineTo(64 + Math.cos(a + 0.05) * 54, 64 + Math.sin(a + 0.05) * 54); g.stroke(); }
  g.fillStyle = '#050303'; g.beginPath(); g.arc(64, 64, 22, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(50, 48, 7, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

let strandTex = null;
function hairStrands() {
  if (strandTex) return strandTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 256, v = 90 + Math.random() * 120;
    g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 0.6 + Math.random() * 1.2;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (Math.random() - 0.5) * 12, 90, x + (Math.random() - 0.5) * 12, 170, x + (Math.random() - 0.5) * 8, 256); g.stroke();
  }
  strandTex = new THREE.CanvasTexture(c); strandTex.wrapS = strandTex.wrapT = THREE.RepeatWrapping; strandTex.repeat.set(6, 2);
  return strandTex;
}
let fringeTex = null;
function fringeAlpha() {
  if (fringeTex) return fringeTex;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#000';
  for (let x = 0; x < 256; x += 3) { const h = 18 + Math.random() * 40; g.fillRect(x, 256 - h, 3, h); }
  fringeTex = new THREE.CanvasTexture(c);
  return fringeTex;
}

// ---------------------------------------------------------------------------
export class Avatar {
  constructor(look = DEFAULT_LOOK, opts = {}) {
    this.root = new THREE.Group();
    this.root.name = 'avatar';
    this.opts = opts;
    this.look = { ...DEFAULT_LOOK, ...look };
    this.build();
  }

  setLook(look) { this.look = { ...DEFAULT_LOOK, ...look }; this.build(); }

  mats() {
    const L = this.look, o = this.opts;
    const skinCol = new THREE.Color(L.skin);
    const cloth = (hex, rough = 0.85) => new THREE.MeshPhysicalMaterial({ color: hex, roughness: rough, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.3) });
    return {
      skin: o.skinMat || new THREE.MeshPhysicalMaterial({ color: skinCol, roughness: 0.55, sheen: 0.3, sheenRoughness: 0.5, sheenColor: skinCol.clone().lerp(new THREE.Color(0xffd0c0), 0.5), clearcoat: 0.04 }),
      lip: o.skinMat || new THREE.MeshPhysicalMaterial({ color: L.lipColor, roughness: 0.38, clearcoat: 0.2 }),
      hair: o.hairMat || new THREE.MeshStandardMaterial({ color: L.hairColor, roughness: 0.55, metalness: 0.0, bumpMap: hairStrands(), bumpScale: 1.2, roughnessMap: hairStrands() }),
      hairCurtain: o.hairMat || new THREE.MeshStandardMaterial({ color: L.hairColor, roughness: 0.55, bumpMap: hairStrands(), bumpScale: 1.2, alphaMap: fringeAlpha(), alphaTest: 0.5, side: THREE.DoubleSide }),
      top: o.topMat || cloth(L.topColor),
      accent: o.accentMat || new THREE.MeshStandardMaterial({ color: L.accent, roughness: 0.4, metalness: 0.35 }),
      bottom: o.bottomMat || cloth(L.bottomColor, L.bottom === 'jeans' ? 0.9 : 0.85),
      shoe: new THREE.MeshPhysicalMaterial({ color: L.shoeColor, roughness: L.shoes === 'loafers' || L.shoes === 'boots' ? 0.35 : 0.7, clearcoat: L.shoes === 'loafers' ? 0.7 : 0 }),
      sole: new THREE.MeshStandardMaterial({ color: L.shoes === 'sneakers' ? 0xf4f4f0 : 0x2a1a10, roughness: 0.8 }),
      sclera: new THREE.MeshPhysicalMaterial({ color: 0xf6f2ec, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }),
      iris: new THREE.MeshPhysicalMaterial({ map: irisTexture(L.eyeColor), roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1a0f0a, roughness: 0.8 }),
      brow: new THREE.MeshStandardMaterial({ color: new THREE.Color(L.hairColor).multiplyScalar(0.8), roughness: 0.9 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xe0b050, metalness: 1, roughness: 0.25 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 0.8, roughness: 0.3 }),
      lens: new THREE.MeshPhysicalMaterial({ color: L.glasses === 'sun' ? 0x101418 : 0xffffff, roughness: 0.02, transparent: true, opacity: L.glasses === 'sun' ? 0.85 : 0.12, depthWrite: false }),
      red: new THREE.MeshStandardMaterial({ color: 0xc0101a, roughness: 0.5 }),
      saffron: new THREE.MeshStandardMaterial({ color: 0xff7a10, roughness: 0.6 }),
      ash: new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.9 }),
      white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
    };
  }

  build() {
    const old = this.root.children.slice();
    for (const c of old) { this.root.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const L = this.look;
    const m = this.m = this.mats();
    const S = L.height;
    const B = L.build;           // 0..1
    const fem = L.bodyShape === 'femme' ? 1 : L.bodyShape === 'neutral' ? 0.35 : 0;
    const shW = 1 + (B - 0.5) * 0.22 - fem * 0.1;   // shoulder width factor
    const hipW = 1 + (B - 0.5) * 0.15 + fem * 0.1;
    const limbR = 1 + (B - 0.5) * 0.3;

    const J = this.j = {};
    const add = (name, parent, x, y, z) => { const o = new THREE.Group(); o.name = name; o.position.set(x, y, z); parent.add(o); J[name] = o; return o; };
    const body = add('body', this.root, 0, 0, 0);
    body.scale.setScalar(S);
    const hips = add('hips', body, 0, 0.95, 0);
    const spine = add('spine', hips, 0, 0.1, 0);
    const chest = add('chest', spine, 0, 0.18, 0);
    const neck = add('neck', chest, 0, 0.24, 0);
    const head = add('head', neck, 0, 0.07, 0.005);
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const sh = add('shoulder' + side, chest, s * 0.18 * shW, 0.195, -0.005);
      const el = add('elbow' + side, sh, 0, -0.28, 0);
      add('wrist' + side, el, 0, -0.25, 0);
      const th = add('thigh' + side, hips, s * 0.092 * hipW, -0.02, 0);
      const kn = add('knee' + side, th, 0, -0.44, 0);
      add('ankle' + side, kn, 0, -0.43, 0);
    }

    const top = L.top, bottom = L.bottom;
    const longTop = top === 'kurta' || top === 'dress';
    const sleeves = top === 'tank' ? 'none' : top === 'tshirt' || top === 'dress' ? 'short' : 'long';
    const skirt = bottom === 'skirt' || top === 'dress';

    // ---- torso
    const torsoMat = m.top;
    const lower = lathe([[0.0, -0.09], [0.12, -0.085], [0.155 * hipW, -0.05], [0.163 * hipW, 0.0], [0.15, 0.08], [0.142 - fem * 0.012, 0.13]], 32);
    const lowerMesh = mesh(lower, longTop || top === 'hoodie' || top === 'sweater' ? torsoMat : m.bottom);
    lowerMesh.scale.set(1, 1, 0.66); hips.add(lowerMesh);
    // belt line for shirts tucked
    if (!longTop && (top === 'shirt' || top === 'tank' || top === 'tshirt') && bottom !== 'dhoti' && bottom !== 'pajama' && !skirt) {
      const belt = mesh(new THREE.TorusGeometry(0.146, 0.012, 6, 40), m.dark); belt.rotation.x = Math.PI / 2; belt.position.y = 0.115; belt.scale.set(1, 0.66, 1); hips.add(belt);
    }
    const upperProfile = [[0.142 - fem * 0.012, -0.03], [0.15 - fem * 0.015, 0.06], [0.168, 0.2], [0.176 * shW, 0.29], [0.168 * shW, 0.35], [0.13 * shW, 0.4], [0.065, 0.425], [0.05, 0.44]];
    const upper = mesh(lathe(upperProfile, 36), torsoMat);
    upper.scale.set(1.0, 1, 0.64); spine.add(upper);
    if (fem > 0.5) {
      for (const s of [1, -1]) { const b = mesh(new THREE.SphereGeometry(0.056, 20, 14), torsoMat); b.position.set(s * 0.058, 0.215, 0.066); b.scale.set(1.05, 0.88, 0.72); b.rotation.y = s * 0.25; spine.add(b); }
    }
    // neck
    const neckMesh = mesh(limb(0.045, 0.05, 0.08, 16), m.skin); neckMesh.position.y = 0.1; neck.add(neckMesh);
    // collar / neckline details
    if (top === 'kurta' || top === 'nehru' || top === 'shirt') {
      const col = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.035, 24, 1, true), top === 'nehru' ? m.accent : torsoMat);
      col.position.y = 0.025; neck.add(col);
      const placket = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.01), m.accent); placket.position.set(0, 0.32, 0.112); placket.rotation.x = -0.18; spine.add(placket);
      for (let i = 0; i < 4; i++) { const bt = mesh(new THREE.SphereGeometry(0.006, 8, 6), m.gold); bt.position.set(0, 0.395 - i * 0.045, 0.118 - i * 0.004); spine.add(bt); }
    }
    if (top === 'nehru') {
      const vest = mesh(lathe([[0.156, -0.02], [0.17, 0.2], [0.18 * shW, 0.29], [0.16 * shW, 0.36], [0.07, 0.43]], 36), m.accent);
      vest.scale.set(1.04, 1, 0.68); spine.add(vest);
      const vlow = mesh(lathe([[0.165 * hipW, -0.04], [0.157, 0.08], [0.156, 0.14]], 32), m.accent); vlow.scale.set(1.04, 1, 0.68); hips.add(vlow);
    }
    if (top === 'hoodie') {
      const hood = mesh(new THREE.TorusGeometry(0.085, 0.035, 10, 30), torsoMat); hood.position.set(0, 0.42, -0.04); hood.rotation.x = Math.PI / 2 + 0.5; hood.scale.set(1.2, 1, 1); spine.add(hood);
      const pocket = mesh(new THREE.BoxGeometry(0.18, 0.08, 0.02), torsoMat); pocket.position.set(0, 0.1, 0.098); spine.add(pocket);
      for (const s of [1, -1]) { const str = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), m.white); str.position.set(s * 0.03, 0.33, 0.11); spine.add(str); }
    }
    if (top === 'sweater') {
      const rib = mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 40), torsoMat); rib.rotation.x = Math.PI / 2; rib.scale.set(1, 0.68, 1); rib.position.y = 0.14; hips.add(rib);
    }
    // kurta / dress skirt
    if (longTop) {
      const len = top === 'dress' ? 0.5 : 0.48;
      const flare = top === 'dress' ? 0.27 : 0.21;
      const sk = mesh(lathe([[0.152 * hipW, 0.12], [0.164 * hipW, 0.0], [0.18 * hipW, -0.12], [flare * hipW, -len], [flare * hipW - 0.01, -len - 0.012]], 40), torsoMat);
      sk.scale.set(1, 1, 0.78); hips.add(sk); this.skirtMesh = sk;
      sk.material = sk.material.clone(); sk.material.side = THREE.DoubleSide;
      const hem = mesh(new THREE.TorusGeometry(flare * hipW, 0.006, 6, 48), m.accent); hem.rotation.x = Math.PI / 2; hem.position.y = -len + 0.02; hem.scale.set(1, 0.78, 1); hips.add(hem);
    } else this.skirtMesh = null;
    if (skirt && !longTop) {
      const sk = mesh(lathe([[0.15 * hipW, 0.1], [0.17 * hipW, -0.05], [0.29, -0.82], [0.28, -0.84]], 40), m.bottom);
      sk.scale.set(1, 1, 0.8); sk.material = sk.material.clone(); sk.material.side = THREE.DoubleSide; hips.add(sk);
    }
    if (bottom === 'dhoti') {
      const sk = mesh(lathe([[0.16 * hipW, 0.1], [0.19 * hipW, -0.1], [0.2, -0.6], [0.18, -0.78], [0.17, -0.8]], 40), m.bottom);
      sk.scale.set(1.05, 1, 0.75); sk.material = sk.material.clone(); sk.material.side = THREE.DoubleSide; hips.add(sk); this.dhoti = sk;
    } else this.dhoti = null;

    // ---- arms
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const sh = J['shoulder' + side], el = J['elbow' + side], wr = J['wrist' + side];
      const ball = mesh(new THREE.SphereGeometry(0.047 * limbR, 18, 12), sleeves === 'none' ? m.skin : torsoMat); ball.scale.set(0.95, 0.92, 0.92); ball.position.set(-s * 0.012, -0.006, 0); sh.add(ball);
      sh.add(mesh(limb(0.047 * limbR, 0.04 * limbR, 0.27, 16), sleeves === 'long' ? torsoMat : m.skin));
      if (sleeves === 'short') { const sl = mesh(limb(0.056 * limbR, 0.052 * limbR, 0.14, 16), torsoMat); sh.add(sl); }
      el.add(mesh(limb(0.04 * limbR, 0.031 * limbR, 0.235, 16), sleeves === 'long' ? torsoMat : m.skin));
      if (sleeves === 'long') { const cuff = mesh(new THREE.CylinderGeometry(0.036 * limbR, 0.036 * limbR, 0.035, 16), top === 'kurta' ? m.accent : torsoMat); cuff.position.y = -0.225; el.add(cuff); }
      // hand: palm + mitten fingers + thumb
      const hand = new THREE.Group(); hand.name = 'hand' + side; wr.add(hand); J['hand' + side] = hand;
      const palm = mesh(new THREE.SphereGeometry(0.042, 16, 12), m.skin); palm.scale.set(0.75, 1.05, 0.42); palm.position.y = -0.045; hand.add(palm);
      const fingers = new THREE.Group(); fingers.position.y = -0.085; hand.add(fingers); J['fingers' + side] = fingers;
      for (let i = 0; i < 4; i++) {
        const f = mesh(limb(0.0085, 0.0075, 0.055 - Math.abs(i - 1.5) * 0.008, 8), m.skin);
        f.position.set((i - 1.5) * 0.0165 * s, 0, 0.002); fingers.add(f);
      }
      const thumb = mesh(limb(0.01, 0.009, 0.04, 8), m.skin); thumb.position.set(s * 0.03, -0.045, 0.018); thumb.rotation.z = s * 0.7; thumb.rotation.x = -0.4; hand.add(thumb);
      if (L.watch && side === 'L') { const w = mesh(new THREE.TorusGeometry(0.034, 0.008, 8, 24), m.metal); w.rotation.x = Math.PI / 2; w.position.y = -0.2; el.add(w); const face = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 20), m.gold); face.rotation.z = Math.PI / 2; face.position.set(0.038, -0.2, 0); el.add(face); }
    }

    // ---- legs
    const pantsLong = bottom === 'jeans' || bottom === 'trousers' || bottom === 'pajama';
    const pantsR = bottom === 'pajama' ? 1.18 : bottom === 'jeans' ? 1.0 : 1.06;
    for (const s of [1, -1]) {
      const side = s > 0 ? 'L' : 'R';
      const th = J['thigh' + side], kn = J['knee' + side], an = J['ankle' + side];
      const legMat = pantsLong || bottom === 'shorts' ? m.bottom : m.skin;
      th.add(mesh(limb(0.078 * limbR * (1 + fem * 0.08) * (pantsLong ? pantsR : 1), 0.056 * limbR * (pantsLong ? pantsR : 1), 0.43, 18), legMat));
      if (bottom === 'shorts') { /* thighs covered, shins skin */ }
      kn.add(mesh(limb(0.054 * limbR * (pantsLong ? pantsR : 1), 0.038 * limbR * (pantsLong ? pantsR * 1.05 : 1), 0.41, 16), pantsLong ? m.bottom : m.skin));
      if (bottom === 'jeans') { const seam = mesh(new THREE.TorusGeometry(0.043, 0.006, 6, 20), m.bottom); seam.rotation.x = Math.PI / 2; seam.position.y = -0.4; kn.add(seam); }
      // foot / shoe
      const foot = new THREE.Group(); foot.position.y = 0.0; an.add(foot); J['foot' + side] = foot;
      if (L.shoes === 'barefoot' || L.shoes === 'sandals') {
        const f = mesh(new THREE.SphereGeometry(0.05, 16, 10), m.skin); f.scale.set(0.85, 0.55, 2.0); f.position.set(0, -0.02, 0.05); foot.add(f);
        if (L.shoes === 'sandals') { const sole = mesh(new THREE.BoxGeometry(0.095, 0.02, 0.26), m.sole); sole.position.set(0, -0.045, 0.05); foot.add(sole); const strap = mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 20, Math.PI), m.shoe); strap.position.set(0, -0.03, 0.07); strap.rotation.y = Math.PI / 2; strap.rotation.z = Math.PI / 2; foot.add(strap); }
      } else {
        const shoe = mesh(new THREE.SphereGeometry(0.055, 18, 12), m.shoe); shoe.scale.set(0.95, 0.7, 2.25); shoe.position.set(0, -0.015, 0.05); foot.add(shoe);
        const sole = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 18), m.sole); sole.scale.set(1.0, 1, 2.6); sole.position.set(0, -0.05, 0.05); foot.add(sole);
        if (L.shoes === 'juttis') { const tip = mesh(new THREE.ConeGeometry(0.015, 0.06, 8), m.shoe); tip.position.set(0, -0.005, 0.19); tip.rotation.x = Math.PI / 2 - 0.6; foot.add(tip); const emb = mesh(new THREE.TorusGeometry(0.04, 0.005, 6, 20, Math.PI), m.gold); emb.position.set(0, 0.0, 0.06); emb.rotation.x = -Math.PI / 2 + 0.2; foot.add(emb); }
        if (L.shoes === 'boots') { const shaft = mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.14, 16), m.shoe); shaft.position.y = 0.05; foot.add(shaft); }
        if (L.shoes === 'sneakers') { const lace = mesh(new THREE.BoxGeometry(0.04, 0.012, 0.07), m.white); lace.position.set(0, 0.022, 0.07); lace.rotation.x = 0.3; foot.add(lace); }
      }
    }

    this.buildHead(head, m, fem);
    if (L.mala) {
      const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push([Math.sin(a) * 0.105, 0.36 + (Math.cos(a) > 0 ? -Math.cos(a) * 0.1 : 0), Math.cos(a) * 0.075]); }
      for (const p of pts) { const bead = mesh(new THREE.SphereGeometry(0.009, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a2a12, roughness: 0.4 })); bead.position.set(p[0], p[1] + 0.02, p[2] + 0.01); spine.add(bead); }
    }

    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.root.userData.avatar = this;
  }

  buildHead(head, m, fem) {
    const L = this.look;
    const shape = L.faceShape;
    const hc = new THREE.Group(); hc.position.y = 0.1; head.add(hc); this.j.headCenter = hc;
    // ---- skull
    const g = new THREE.SphereGeometry(1, 56, 40);
    const p = g.attributes.position;
    const d = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      headPoint(d, shape, o);
      const k = eyeSockets(o, L);
      if (o.z > 0) o.z -= k * 0.008;
      p.setXYZ(i, o.x, o.y, o.z);
    }
    g.computeVertexNormals();
    hc.add(mesh(g, m.skin));
    // ---- ears
    for (const s of [1, -1]) {
      const ear = mesh(new THREE.SphereGeometry(0.026, 14, 10), m.skin); ear.scale.set(0.4, 1.15, 0.75);
      ear.position.set(s * HEAD.rx * (FACE[shape]?.wid || 1) * 0.98, 0.0, -0.008); ear.rotation.y = s * 0.3; hc.add(ear);
      const inner = mesh(new THREE.SphereGeometry(0.015, 10, 8), new THREE.MeshStandardMaterial({ color: new THREE.Color(L.skin).multiplyScalar(0.8), roughness: 0.6 })); inner.scale.set(0.3, 1, 0.6);
      inner.position.set(s * HEAD.rx * (FACE[shape]?.wid || 1) * 1.02, 0.0, -0.004); hc.add(inner);
      if (L.earrings) { const er = mesh(new THREE.TorusGeometry(0.008, 0.002, 6, 16), m.gold); er.position.set(s * 0.093, -0.028, -0.005); er.rotation.y = Math.PI / 2; hc.add(er); const drop = mesh(new THREE.SphereGeometry(0.005, 8, 6), m.gold); drop.position.set(s * 0.093, -0.04, -0.005); hc.add(drop); }
    }
    // ---- eyes
    const et = L.eyeType;
    const size = (L.eyeSize || 1) * (et === 'wide' ? 1.14 : et === 'round' ? 1.06 : et === 'monolid' ? 0.92 : 1);
    const er = 0.0128 * size;
    const tilt = et === 'upturned' ? 0.16 : et === 'downturned' ? -0.14 : et === 'almond' ? 0.07 : 0;
    const openUp = et === 'hooded' ? -0.18 : et === 'monolid' ? -0.12 : et === 'round' || et === 'wide' ? -0.62 : -0.42;
    this.eyes = [];
    for (const s of [1, -1]) {
      const eg = new THREE.Group();
      eg.position.set(s * 0.0345, 0.012, 0.081 + (0.0128 - er) * 0.5);
      eg.rotation.z = s * tilt;
      hc.add(eg);
      const ball = mesh(new THREE.SphereGeometry(er, 24, 16), m.sclera, false); eg.add(ball);
      // iris cap
      const cap = new THREE.SphereGeometry(er * 1.004, 28, 8, 0, Math.PI * 2, 0, 0.6);
      const cp = cap.attributes.position, uv = cap.attributes.uv;
      const capR = Math.sin(0.6) * er;
      for (let i = 0; i < cp.count; i++) uv.setXY(i, 0.5 + cp.getX(i) / (2 * capR), 0.5 + cp.getZ(i) / (2 * capR));
      cap.rotateX(Math.PI / 2);
      const iris = mesh(cap, m.iris, false); eg.add(iris);
      this.eyes.push(iris);
      // lids
      const lidMat = m.skin;
      const upLid = new THREE.Group(); eg.add(upLid);
      const ul = mesh(new THREE.SphereGeometry(er * 1.12, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidMat, false); upLid.add(ul);
      const lash = mesh(new THREE.TorusGeometry(er * 1.1, 0.0012, 4, 20, Math.PI), m.dark, false); lash.rotation.x = 0; lash.position.z = 0; upLid.add(lash);
      lash.rotation.y = 0; lash.rotation.x = Math.PI / 2; lash.rotation.z = 0;
      const loLid = new THREE.Group(); eg.add(loLid);
      const ll = mesh(new THREE.SphereGeometry(er * 1.08, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), lidMat, false); loLid.add(ll);
      upLid.rotation.x = openUp; loLid.rotation.x = 0.62;
      eg.userData = { upLid, loLid, open: openUp };
      this.eyes.push(eg);
    }
    this.eyeGroups = this.eyes.filter((e) => e.isGroup);
    // ---- brows
    const bw = L.brows;
    const thick = bw === 'thick' ? 0.0042 : bw === 'thin' ? 0.0019 : 0.003;
    const archH = bw === 'arched' ? 0.008 : bw === 'straight' ? 0.001 : 0.004;
    for (const s of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; const x = s * (0.014 + t * 0.036); const y = 0.036 + Math.sin(t * Math.PI * 0.85) * archH - t * 0.003 + (et === 'hooded' ? -0.003 : 0); const z = 0.0945 - t * t * 0.015; pts.push(new THREE.Vector3(x, y, z)); }
      const tb = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, thick, 6);
      const brow = mesh(tb, m.brow, false); brow.scale.set(1, 1, 1); hc.add(brow);
    }
    // ---- nose
    const nt = L.nose;
    const ns = { straight: [1, 1, 1], button: [0.95, 0.8, 0.9], wide: [1.35, 0.95, 1], aquiline: [0.95, 1.1, 1.15], small: [0.8, 0.85, 0.85] }[nt] || [1, 1, 1];
    const bridge = mesh(limb(0.007 * ns[0], 0.011 * ns[0], 0.032 * ns[1], 10), m.skin); bridge.position.set(0, 0.022, 0.097); bridge.rotation.x = -0.32 * ns[2]; hc.add(bridge);
    const tip = mesh(new THREE.SphereGeometry(0.0108, 16, 12), m.skin); tip.scale.set(ns[0], 0.9, 1.0 * ns[2]); tip.position.set(0, -0.014 * ns[1], 0.11 + (ns[2] - 1) * 0.01); hc.add(tip);
    if (nt === 'aquiline') { const bump = mesh(new THREE.SphereGeometry(0.0075, 10, 8), m.skin); bump.position.set(0, 0.008, 0.106); hc.add(bump); }
    for (const s of [1, -1]) {
      const al = mesh(new THREE.SphereGeometry(0.0068, 12, 8), m.skin); al.scale.set(1.1 * ns[0], 0.8, 1); al.position.set(s * 0.011 * ns[0], -0.018 * ns[1], 0.103); hc.add(al);
      const nost = mesh(new THREE.SphereGeometry(0.0035, 8, 6), m.dark, false); nost.position.set(s * 0.0065 * ns[0], -0.024 * ns[1], 0.104); hc.add(nost);
    }
    // ---- mouth
    const lt = L.lips;
    const lipT = lt === 'full' ? 1.4 : lt === 'thin' ? 0.65 : 1;
    const smile = lt === 'smile' ? 0.35 : 0.05;
    const mouth = new THREE.Group(); mouth.position.set(0, -0.05, 0.0965); hc.add(mouth); this.j.mouth = mouth;
    const upperLip = mesh(new THREE.SphereGeometry(1, 20, 10), m.lip, false);
    upperLip.scale.set(0.0205, 0.0048 * lipT, 0.0075); upperLip.position.y = 0.0042;
    mouth.add(upperLip);
    const bow = mesh(new THREE.SphereGeometry(1, 12, 8), m.lip, false);
    bow.scale.set(0.007, 0.0034 * lipT, 0.006); bow.position.set(0, 0.0072, 0.0012); mouth.add(bow);
    const lowerLip = mesh(new THREE.SphereGeometry(1, 20, 10), m.lip, false);
    lowerLip.scale.set(0.0185, 0.0062 * lipT, 0.0082); lowerLip.position.y = -0.0048;
    mouth.add(lowerLip);
    const R2 = 0.05 / (0.35 + smile * 1.9), arc2 = 2 * Math.asin(Math.min(0.99, 0.0205 / R2));
    const line = mesh(new THREE.TorusGeometry(R2, 0.0011, 4, 20, arc2), m.dark, false);
    line.rotation.z = -Math.PI / 2 - arc2 / 2; line.position.y = R2 - 0.0002; line.position.z = 0.0055;
    mouth.add(line);
    // chin / cheek subtle definition handled by head shape

    // ---- hair
    this.buildHair(hc, m);
    // ---- facial hair
    if (L.beard !== 'none' || L.mustache !== 'none') this.buildBeard(hc, m);
    // ---- forehead marks
    if (L.forehead === 'bindi') { const bi = mesh(new THREE.CircleGeometry(0.0045, 16), m.red, false); bi.position.set(0, 0.05, 0.1015); bi.rotation.x = -0.35; hc.add(bi); }
    if (L.forehead === 'tilak') { const ti = mesh(new THREE.PlaneGeometry(0.006, 0.03), m.saffron, false); ti.position.set(0, 0.06, 0.1); ti.rotation.x = -0.42; hc.add(ti); const dot = mesh(new THREE.CircleGeometry(0.003, 12), m.red, false); dot.position.set(0, 0.046, 0.1025); dot.rotation.x = -0.35; hc.add(dot); }
    if (L.forehead === 'tripundra') { for (let i = 0; i < 3; i++) { const t = mesh(new THREE.PlaneGeometry(0.06, 0.0028), m.ash, false); t.position.set(0, 0.053 + i * 0.008, 0.099 - i * 0.002); t.rotation.x = -0.42; hc.add(t); } const dot = mesh(new THREE.CircleGeometry(0.003, 12), m.red, false); dot.position.set(0, 0.062, 0.1008); dot.rotation.x = -0.42; hc.add(dot); }
    // ---- glasses
    if (L.glasses !== 'none') {
      const gl = new THREE.Group(); gl.position.set(0, 0.012, 0.106); hc.add(gl);
      const rimM = L.glasses === 'aviator' ? m.gold : m.metal;
      for (const s of [1, -1]) {
        let rim;
        if (L.glasses === 'square') { rim = mesh(new THREE.TorusGeometry(0.019, 0.0022, 4, 4), rimM); rim.rotation.z = Math.PI / 4; rim.scale.set(1.15, 0.85, 1); }
        else if (L.glasses === 'aviator' || L.glasses === 'sun') { rim = mesh(new THREE.TorusGeometry(0.019, 0.0016, 6, 28), rimM); rim.scale.set(1.05, 0.95, 1); }
        else rim = mesh(new THREE.TorusGeometry(0.0175, 0.0018, 6, 28), rimM);
        rim.position.set(s * 0.0345, 0, 0); gl.add(rim);
        const lens = mesh(new THREE.CircleGeometry(0.018, 24), m.lens, false); lens.position.set(s * 0.0345, 0, -0.001); if (L.glasses === 'square') lens.scale.set(1.1, 0.85, 1); gl.add(lens);
        const temple = mesh(new THREE.BoxGeometry(0.002, 0.003, 0.11), rimM); temple.position.set(s * 0.09, 0.002, -0.055); gl.add(temple);
      }
      const br = mesh(new THREE.TorusGeometry(0.008, 0.0016, 4, 12, Math.PI), rimM); br.position.set(0, 0.002, 0); gl.add(br);
    }
    // ---- headwear
    if (L.headwear === 'cap') {
      const cap = mesh(new THREE.SphereGeometry(0.104, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.accent); cap.scale.set(0.99, 0.95, 1.06); cap.position.y = 0.035; hc.add(cap);
      const brim = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.006, 24, 1, false, -Math.PI / 2, Math.PI), m.accent); brim.scale.set(1, 1, 1.1); brim.position.set(0, 0.04, 0.07); brim.rotation.x = 0.12; hc.add(brim);
    } else if (L.headwear === 'pagdi') {
      for (let i = 0; i < 5; i++) { const t = mesh(new THREE.TorusGeometry(0.09 - i * 0.008, 0.022, 10, 36), m.accent); t.rotation.x = Math.PI / 2 + 0.15 - i * 0.04; t.position.set(0, 0.05 + i * 0.022, -0.005 - i * 0.004); t.scale.set(1.0, 1.15, 1); hc.add(t); }
      const top = mesh(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.accent); top.position.y = 0.12; hc.add(top);
      const jewel = mesh(new THREE.SphereGeometry(0.009, 10, 8), m.gold); jewel.position.set(0, 0.1, 0.098); hc.add(jewel);
    } else if (L.headwear === 'beanie') {
      const bn = mesh(new THREE.SphereGeometry(0.106, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), m.accent); bn.position.y = 0.022; bn.scale.set(1, 1.05, 1.04); hc.add(bn);
      const cuff = mesh(new THREE.TorusGeometry(0.098, 0.014, 8, 36), m.accent); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.03; cuff.scale.set(1, 1.08, 1); hc.add(cuff);
    } else if (L.headwear === 'headphones') {
      const band = mesh(new THREE.TorusGeometry(0.108, 0.008, 8, 36, Math.PI), m.metal); band.position.y = 0.0; band.rotation.y = Math.PI / 2; band.rotation.x = 0; hc.add(band);
      band.rotation.set(0, Math.PI / 2, 0);
      for (const s of [1, -1]) { const cup = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 20), m.accent); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.1, 0, 0); hc.add(cup); }
    }
  }

  // Hair shell: every vertex of a sphere is placed on the head surface plus a
  // style-dependent thickness; uncovered regions sink below the scalp.
  buildHair(hc, m) {
    const L = this.look, style = L.hair;
    this.hairSway = null;
    if (style === 'bald') return;
    const noise = makeNoise2D(5, 16);
    const hairline = (az, cover) => {
      const a = Math.abs(az);
      // elevation of the hairline as a function of azimuth (0 = front)
      const front = style === 'buzz' ? 0.7 : style === 'medium' || style === 'curly' || style === 'afro' ? 0.56 : 0.63;
      const pts = [[0, front], [0.55, front - 0.1], [1.0, 0.3], [1.3, cover ? -0.3 : 0.12], [1.7, cover ? -0.45 : -0.22], [2.3, -0.5], [Math.PI, -0.62]];
      for (let i = 1; i < pts.length; i++) if (a <= pts[i][0]) { const t = (a - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t; }
      return -0.62;
    };
    const coverEars = ['medium', 'long', 'bob', 'afro', 'curly'].includes(style);
    const thick = (d, az, el) => {
      const top = Math.max(0, d.y);
      switch (style) {
        case 'buzz': return 0.0035;
        case 'short': return 0.009 + 0.012 * top;
        case 'quiff': return 0.009 + 0.01 * top + 0.02 * Math.exp(-((az) ** 2) / 0.5) * sstep(0.35, 0.85, d.y) * Math.max(0, d.z + 0.5);
        case 'sidepart': return 0.01 + 0.016 * top + (az > 0.45 && az < 0.65 && d.y > 0.4 ? -0.006 : 0) + 0.008 * Math.max(0, -az) * top;
        case 'spiky': return 0.012 + 0.01 * top;
        case 'medium': return 0.016 + 0.014 * top + 0.006 * Math.sin(el * 18 + az * 4);
        case 'curly': return 0.024 + 0.012 * top + 0.012 * noise(az * 6 + 20, el * 9 + 20);
        case 'afro': return 0.055 + 0.03 * top + 0.012 * noise(az * 5 + 9, el * 7 + 3);
        case 'long': case 'bob': return 0.014 + 0.012 * top;
        default: return 0.007 + 0.006 * top; // bun, ponytail, braid: pulled back
      }
    };
    const g = new THREE.SphereGeometry(1, 96, 72);
    const p = g.attributes.position;
    const d = new THREE.Vector3(), o = new THREE.Vector3(), n = new THREE.Vector3();
    const shape = L.faceShape;
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      const az = Math.atan2(d.x, d.z), el = Math.asin(Math.max(-1, Math.min(1, d.y)));
      const line = hairline(az, coverEars);
      let cov = sstep(line - 0.1, line + 0.1, el);
      // keep the face clear (smoothly)
      cov *= 1 - sstep(0.3, 0.62, d.z) * (1 - sstep(0.4, 0.56, d.y));
      headPoint(d, shape, o);
      n.copy(o).normalize();
      const t = thick(d, az, el);
      // blend smoothly from just under the scalp to full thickness for a soft hairline
      const off = -0.004 + (t + 0.0055) * sstep(0.0, 0.6, cov);
      o.addScaledVector(n, off);
      p.setXYZ(i, o.x, o.y, o.z);
    }
    g.computeVertexNormals();
    const shell = mesh(g, m.hair); hc.add(shell);

    const back = new THREE.Group(); back.position.set(0, 0.02, -0.02); hc.add(back);
    if (style === 'long' || style === 'bob') {
      const len = style === 'long' ? 0.42 : 0.16;
      const geo = new THREE.PlaneGeometry(1, 1, 40, 14);
      const gp = geo.attributes.position, guv = geo.attributes.uv;
      for (let i = 0; i < gp.count; i++) {
        const u = gp.getX(i) + 0.5, v = 0.5 - gp.getY(i); // u 0..1 across, v 0..1 down
        const ab = -2.25 + u * 4.5; // angle measured from the back of the head
        const az = Math.PI + ab;
        const dd = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
        headPoint(dd, shape, o);
        const rad = Math.hypot(o.x, o.z) + 0.016;
        const down = v * len;
        // flare outward to clear shoulders and back
        const flare = sstep(0.08, 0.25, down) * (style === 'long' ? 0.07 : 0.03);
        const front = Math.abs(ab) > 1.6; // side locks in front of the shoulders
        const rr = rad + flare + (front ? 0.0 : 0.01 * v);
        gp.setXYZ(i, Math.sin(az) * rr * (front ? 0.95 : 1), -down + 0.0, Math.cos(az) * rr - (front ? 0 : 0.012 * v));
        guv.setXY(i, u * 2, 1 - v);
      }
      geo.computeVertexNormals();
      const curtain = mesh(geo, m.hairCurtain); back.add(curtain);
      this.hairSway = back;
    }
    if (style === 'bun') {
      const bun = mesh(new THREE.SphereGeometry(0.045, 20, 14), m.hair); bun.position.set(0, 0.1, -0.075); bun.scale.set(1, 0.85, 0.85); hc.add(bun);
      const tie = mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), m.accent); tie.position.set(0, 0.085, -0.06); tie.rotation.x = 0.9; hc.add(tie);
    }
    if (style === 'ponytail' || style === 'braid') {
      const tie = mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 16), m.accent); tie.position.set(0, 0.04, -0.105); tie.rotation.x = 0.4; hc.add(tie);
      const tail = new THREE.Group(); tail.position.set(0, 0.04, -0.11); hc.add(tail);
      if (style === 'ponytail') {
        const pts = [[0, 0, 0], [0, -0.06, -0.03], [0, -0.16, -0.035], [0, -0.28, -0.02]].map((q) => new THREE.Vector3(...q));
        const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.024, 10);
        const tp = tg.attributes.position;
        for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); const k = 1 - Math.min(1, -y / 0.3) * 0.7; tp.setX(i, tp.getX(i) * k); tp.setZ(i, (tp.getZ(i) + 0.03) * k - 0.03); }
        tg.computeVertexNormals();
        tail.add(mesh(tg, m.hair));
      } else {
        for (let i = 0; i < 9; i++) { const s = mesh(new THREE.SphereGeometry(0.02 - i * 0.0013, 12, 8), m.hair); s.position.set((i % 2 ? 0.006 : -0.006), -0.03 - i * 0.034, -0.02); s.scale.set(1, 1.3, 1); tail.add(s); }
        const end = mesh(new THREE.TorusGeometry(0.01, 0.004, 6, 12), m.accent); end.position.set(0, -0.33, -0.02); end.rotation.x = Math.PI / 2; tail.add(end);
      }
      this.hairSway = tail;
    }
    if (style === 'spiky') {
      for (let i = 0; i < 22; i++) {
        const az = (Math.random() - 0.5) * 3.6, el = 0.45 + Math.random() * 1.0;
        const dd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        headPoint(dd, shape, o);
        const sp = mesh(new THREE.ConeGeometry(0.014, 0.05, 6), m.hair); sp.position.copy(o).addScaledVector(dd, 0.012);
        sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dd.clone().add(new THREE.Vector3(0, 0.6, -0.3)).normalize());
        hc.add(sp);
      }
    }
    if (style === 'curly') {
      for (let i = 0; i < 70; i++) {
        const az = (Math.random() - 0.5) * 2 * 2.9, el = -0.2 + Math.random() * 1.6;
        if (Math.abs(az) < 0.8 && el < 0.35) continue;
        const dd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        headPoint(dd, shape, o);
        const c = mesh(new THREE.SphereGeometry(0.014 + Math.random() * 0.006, 8, 6), m.hair); c.position.copy(o).addScaledVector(dd, 0.026); hc.add(c);
      }
    }
  }

  buildBeard(hc, m) {
    const L = this.look;
    const shape = L.faceShape;
    const mat = L.beard === 'stubble' ? new THREE.MeshStandardMaterial({ color: new THREE.Color(L.hairColor).lerp(new THREE.Color(L.skin), 0.55), roughness: 0.9, transparent: true, opacity: 0.85 }) : m.hair;
    if (L.beard !== 'none') {
      const thick = L.beard === 'stubble' ? 0.0012 : L.beard === 'short' ? 0.007 : L.beard === 'goatee' ? 0.009 : 0.016;
      const g = new THREE.SphereGeometry(1, 48, 36);
      const p = g.attributes.position;
      const d = new THREE.Vector3(), o = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        d.fromBufferAttribute(p, i).normalize();
        let cov = sstep(-0.05, -0.3, d.y) * sstep(-0.35, 0.1, d.z);
        if (L.beard === 'goatee') cov *= sstep(0.45, 0.2, Math.abs(d.x)) * sstep(0.5, 0.8, d.z);
        // keep the lips clear
        const mx = Math.abs(d.x), my = d.y + 0.43;
        if (d.z > 0.7 && mx < 0.3 && Math.abs(my) < 0.1) cov = 0;
        headPoint(d, shape, o);
        n.copy(o).normalize();
        const t = cov > 0.02 ? thick * cov + 0.0015 : -0.004;
        if (L.beard === 'full') o.y -= cov * 0.012 * sstep(-0.6, -1, d.y);
        o.addScaledVector(n, t);
        p.setXYZ(i, o.x, o.y, o.z);
      }
      g.computeVertexNormals();
      hc.add(mesh(g, mat));
    }
    if (L.mustache !== 'none') {
      const r = L.mustache === 'handlebar' ? 0.03 : 0.022;
      const t = L.mustache === 'thin' ? 0.0022 : 0.0045;
      const mu = mesh(new THREE.TorusGeometry(r, t, 6, 24, L.mustache === 'handlebar' ? Math.PI * 1.25 : Math.PI), m.hair);
      mu.position.set(0, -0.04 + (L.mustache === 'handlebar' ? -0.01 : 0), 0.103);
      mu.rotation.z = L.mustache === 'handlebar' ? -Math.PI * 0.125 : 0;
      mu.scale.set(1, 0.35, 0.6);
      hc.add(mu);
    }
  }

  setBlink(k) {
    for (const eg of this.eyeGroups || []) {
      const u = eg.userData;
      u.upLid.rotation.x = u.open + (0.62 - u.open) * k + k * 0.15;
    }
  }
}
