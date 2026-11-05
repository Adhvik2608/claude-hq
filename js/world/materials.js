import * as THREE from 'three';
import * as T from './textures.js';

// Shared material library. Textures use world-metre UVs, so `repeat` = 1 / tile size.
export const M = {};
export const TEX = {};

const tick = () => new Promise((r) => setTimeout(r, 0));

function rep(tex, size) { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1 / size, 1 / size); return t; }

function std(opts) { return new THREE.MeshStandardMaterial(opts); }
function phys(opts) { return new THREE.MeshPhysicalMaterial(opts); }

export async function initMaterials(progress = () => {}) {
  const steps = [];
  const add = (label, fn) => steps.push([label, fn]);

  add('Polishing marble', () => {
    TEX.marbleW = T.marble(1024, { seed: 3 });
    TEX.marbleB = T.marble(512, { base: [26, 24, 26], vein: [196, 160, 98], seed: 9, sharp: 10, normal: false });
    TEX.marbleBeige = T.marble(512, { base: [226, 208, 182], vein: [168, 140, 108], seed: 14, normal: false });
    TEX.marbleGreen = T.marble(512, { base: [24, 64, 52], vein: [200, 230, 210], seed: 17, sharp: 12, normal: false });
  });
  add('Laying wooden floors', () => {
    TEX.oak = T.wood(1024, { seed: 11 });
    TEX.walnut = T.wood(512, { base: [104, 64, 38], dark: [50, 28, 15], planks: 3, seams: false, seed: 13, normal: false });
    TEX.teak = T.wood(512, { base: [168, 110, 58], dark: [110, 64, 30], planks: 3, seams: false, seed: 19, normal: false });
    TEX.ash = T.wood(512, { base: [212, 182, 146], dark: [168, 132, 96], planks: 5, seed: 23 });
  });
  add('Setting tiles', () => {
    TEX.bath = T.tiles(512, { base: [214, 210, 204], grout: [170, 166, 160], n: 2, marbleish: true, seed: 5 });
    TEX.terrazzo = T.tiles(512, { base: [196, 188, 176], grout: [160, 152, 142], n: 2, var: 6, marbleish: true, seed: 8 });
    TEX.pool = T.tiles(512, { base: [60, 160, 190], grout: [210, 235, 240], n: 16, var: 26, seed: 6 });
    TEX.wash = T.tiles(512, { base: [44, 52, 58], grout: [90, 96, 100], n: 4, var: 8, seed: 12 });
    TEX.kitchenWall = T.tiles(256, { base: [236, 233, 226], grout: [200, 196, 190], n: 8, var: 4, seed: 33 });
  });
  add('Plastering walls', () => {
    TEX.plaster = T.plaster(512, { base: [236, 232, 226] });
    TEX.stone = T.stone(512);
    TEX.concrete = T.concrete(512);
    TEX.paving = T.paving(512);
    TEX.grass = T.grass(512);
  });
  add('Weaving fabrics', () => {
    TEX.fabric = T.fabric(256);
    TEX.fabricFine = T.fabric(256, { weave: 128, amt: 10, seed: 72 });
    TEX.water = T.waterNormal(512);
    TEX.books = T.bookSpines();
    TEX.damask = T.damask(512);
    TEX.damaskGold = T.damask(512, { base: '#6a1418', ink: 'rgba(240,190,100,0.5)' });
    TEX.jali = T.jali(512);
    TEX.rangoli = T.rangoli(1024);
    TEX.rugTemple = T.persianRug(1024, 1536, { field: '#8a1a1c', border: '#2a1450', accent: '#e0ad52', seed: 3 });
    TEX.rugLiving = T.persianRug(1024, 1536, { field: '#1d3550', border: '#6d1a1e', accent: '#d8b273', ivory: '#efe5cf', seed: 5 });
    TEX.rugMusic = T.persianRug(1024, 1536, { field: '#6b1b2b', border: '#173a33', accent: '#e8c27a', seed: 8 });
    TEX.rugBed = T.persianRug(1024, 1536, { field: '#c9b48e', border: '#7c3a2a', accent: '#5a7290', ivory: '#f4ead6', seed: 11 });
  });

  for (let i = 0; i < steps.length; i++) {
    progress(steps[i][0], i / steps.length);
    await tick();
    steps[i][1]();
  }

  // ---- walls & ceilings
  const wall = (hex, rough = 0.92) => std({ color: hex, map: rep(TEX.plaster.map, 3), normalMap: rep(TEX.plaster.normal, 3), normalScale: new THREE.Vector2(0.35, 0.35), roughness: rough });
  M.wallWhite = wall(0xf3efe8);
  M.wallIvory = wall(0xf1e4cc);
  M.wallSage = wall(0xb9c2a8);
  M.wallTerracotta = wall(0xc47c5a);
  M.wallBlue = wall(0x9fb4c4);
  M.wallBlush = wall(0xe7c3b8);
  M.wallMaroon = wall(0x7a2424);
  M.wallSaffron = wall(0xe7a858);
  M.wallNavy = wall(0x1a2338);
  M.wallCharcoal = wall(0x3a3633);
  M.wallOlive = wall(0x8a8a5c);
  M.wallMint = wall(0xcfe0d4);
  M.ceiling = std({ color: 0xfbf8f2, roughness: 0.95, map: rep(TEX.plaster.map, 4) });
  M.damask = std({ map: rep(TEX.damask, 1.4), roughness: 0.75 });
  M.damaskRed = std({ map: rep(TEX.damaskGold, 1.2), roughness: 0.6, metalness: 0.1 });
  M.kitchenWall = std({ map: rep(TEX.kitchenWall.map, 1.2), normalMap: rep(TEX.kitchenWall.normal, 1.2), roughness: 0.25 });

  // ---- floors
  M.marble = std({ map: rep(TEX.marbleW.map, 2.6), normalMap: rep(TEX.marbleW.normal, 2.6), normalScale: new THREE.Vector2(0.2, 0.2), roughness: 0.11, envMapIntensity: 1.1 });
  M.marbleWall = std({ map: rep(TEX.marbleW.map, 3), roughness: 0.18 });
  M.marbleBlack = std({ map: rep(TEX.marbleB.map, 2), roughness: 0.12, envMapIntensity: 1.2 });
  M.marbleBeige = std({ map: rep(TEX.marbleBeige.map, 2.4), roughness: 0.14 });
  M.marbleGreen = std({ map: rep(TEX.marbleGreen.map, 1.6), roughness: 0.1 });
  M.marbleStatue = phys({ color: 0xfffbf4, map: rep(TEX.marbleW.map, 1.2), roughness: 0.22, sheen: 0.4, sheenColor: new THREE.Color(0xfff2e0), clearcoat: 0.25 });
  M.oak = std({ map: rep(TEX.oak.map, 2.2), normalMap: rep(TEX.oak.normal, 2.2), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.38 });
  M.ash = std({ map: rep(TEX.ash.map, 2.4), normalMap: rep(TEX.ash.normal, 2.4), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.42 });
  M.walnut = std({ map: rep(TEX.walnut.map, 1.2), roughness: 0.45 });
  M.teak = std({ map: rep(TEX.teak.map, 1.2), roughness: 0.4 });
  M.woodLacquer = phys({ map: rep(TEX.walnut.map, 1.4), roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  M.pianoBlack = phys({ color: 0x050505, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.03 });
  M.bathTile = std({ map: rep(TEX.bath.map, 1.8), normalMap: rep(TEX.bath.normal, 1.8), roughness: 0.18 });
  M.terrazzo = std({ map: rep(TEX.terrazzo.map, 1.6), normalMap: rep(TEX.terrazzo.normal, 1.6), roughness: 0.2 });
  M.washTile = std({ map: rep(TEX.wash.map, 1.6), normalMap: rep(TEX.wash.normal, 1.6), roughness: 0.3 });
  M.poolTile = std({ map: rep(TEX.pool.map, 2), normalMap: rep(TEX.pool.normal, 2), roughness: 0.25 });
  M.deck = std({ map: rep(TEX.teak.map, 1.5), roughness: 0.6, color: 0xc8a888 });

  // ---- exterior
  M.stone = std({ map: rep(TEX.stone.map, 2.4), normalMap: rep(TEX.stone.normal, 2.4), roughness: 0.85 });
  M.extPlaster = std({ color: 0xf2e8d8, map: rep(TEX.plaster.map, 3), normalMap: rep(TEX.plaster.normal, 3), roughness: 0.9 });
  M.extDark = std({ color: 0x3b3430, roughness: 0.6 });
  M.concrete = std({ map: rep(TEX.concrete.map, 3), normalMap: rep(TEX.concrete.normal, 3), roughness: 0.9 });
  M.paving = std({ map: rep(TEX.paving.map, 3), normalMap: rep(TEX.paving.normal, 3), roughness: 0.8 });
  M.grass = std({ map: rep(TEX.grass.map, 5), normalMap: rep(TEX.grass.normal, 5), roughness: 0.95 });
  M.soil = std({ color: 0x4a3324, roughness: 1 });
  M.terracotta = std({ color: 0xb5643c, roughness: 0.8 });
  M.leaf = std({ color: 0xffffff, vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
  M.bark = std({ color: 0x5a4434, roughness: 0.95 });

  // ---- glass & metal
  M.glass = phys({ color: 0xdfeff2, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.16, envMapIntensity: 1.4, depthWrite: false, side: THREE.DoubleSide });
  M.glassRail = phys({ color: 0xcfe6e6, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.2, envMapIntensity: 1.2, depthWrite: false, side: THREE.DoubleSide });
  M.glassFrost = phys({ color: 0xf2f6f6, metalness: 0, roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
  M.glassTint = phys({ color: 0x9fb8b8, roughness: 0.05, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  M.gold = std({ color: 0xd9a54a, metalness: 1, roughness: 0.28 });
  M.goldPolish = std({ color: 0xf0c060, metalness: 1, roughness: 0.14 });
  M.brass = std({ color: 0xc89a46, metalness: 1, roughness: 0.32 });
  M.copper = std({ color: 0xc87850, metalness: 1, roughness: 0.3 });
  M.chrome = std({ color: 0xf2f2f2, metalness: 1, roughness: 0.06 });
  M.steel = std({ color: 0xb8bcc0, metalness: 1, roughness: 0.32 });
  M.blackMetal = std({ color: 0x1b1b1d, metalness: 0.8, roughness: 0.4 });
  M.bronze = std({ color: 0x8a5a2c, metalness: 1, roughness: 0.38 });
  M.silver = std({ color: 0xd8d8de, metalness: 1, roughness: 0.2 });

  // ---- fabrics & soft
  const fab = (hex, rough = 0.9, sheen = 0.6) => phys({ color: hex, map: rep(TEX.fabric.map, 0.6), normalMap: rep(TEX.fabric.normal, 0.6), normalScale: new THREE.Vector2(0.5, 0.5), roughness: rough, sheen, sheenRoughness: 0.6, sheenColor: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.35) });
  M.fabCream = fab(0xe9dfcc);
  M.fabSand = fab(0xcbb497);
  M.fabTeal = fab(0x1f5d62);
  M.fabEmerald = fab(0x1b5a3c);
  M.fabRed = fab(0x8c1d22, 0.8, 0.9);
  M.fabMaroon = fab(0x5c1420, 0.8, 0.9);
  M.fabSaffron = fab(0xe08a2a, 0.85, 0.8);
  M.fabGold = fab(0xd6a446, 0.7, 1);
  M.fabGrey = fab(0x7a7672);
  M.fabCharcoal = fab(0x34312f);
  M.fabNavy = fab(0x1d2a44);
  M.fabBlush = fab(0xe0b2a8);
  M.fabMustard = fab(0xc79a32);
  M.fabWhite = fab(0xf6f3ee, 0.95, 0.4);
  M.fabPlum = fab(0x4c2340);
  M.linen = phys({ color: 0xf7f3ea, map: rep(TEX.fabricFine.map, 0.4), roughness: 0.95, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) });
  M.leather = phys({ color: 0x5a3220, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  M.leatherTan = phys({ color: 0x9a6338, roughness: 0.5, clearcoat: 0.25 });
  M.ceramic = phys({ color: 0xfbfbfa, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  M.ceramicBlack = phys({ color: 0x141414, roughness: 0.1, clearcoat: 1 });
  M.plastic = std({ color: 0x1c1c1e, roughness: 0.4 });
  M.plasticWhite = std({ color: 0xf0f0f0, roughness: 0.35 });
  M.rubber = std({ color: 0x111111, roughness: 0.9 });
  M.paper = std({ color: 0xf5efe2, roughness: 0.9 });
  M.books = std({ map: rep(TEX.books, 1.2), roughness: 0.8 });
  M.jaliWood = std({ map: rep(TEX.teak.map, 1), alphaMap: TEX.jali, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 });
  M.jaliMarble = std({ color: 0xfffaf0, map: rep(TEX.marbleW.map, 2), alphaMap: TEX.jali, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.25 });

  // ---- emissive
  M.lampWarm = std({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 5, roughness: 0.6 });
  M.lampSoft = std({ color: 0xfff6e8, emissive: 0xffd9a0, emissiveIntensity: 1.6, roughness: 0.7, side: THREE.DoubleSide });
  M.ledStrip = std({ color: 0xffffff, emissive: 0xffc988, emissiveIntensity: 6 });
  M.ledCool = std({ color: 0xffffff, emissive: 0xbfe6ff, emissiveIntensity: 5 });
  M.flame = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.2, 2.1, 0.55), transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  M.flameCore = new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.4, 3), toneMapped: false });
  M.glow = new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(1.6, 0.9, 0.35), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  M.screen = std({ color: 0x050608, roughness: 0.2, metalness: 0.2 });
  M.fairy = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.9, 1.5), toneMapped: false });

  // ---- water
  const wn = TEX.water.clone(); wn.needsUpdate = true; wn.repeat.set(0.25, 0.25);
  M.water = phys({ color: 0x2d9ab8, roughness: 0.02, metalness: 0, transmission: 0, transparent: true, opacity: 0.78, normalMap: wn, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.02 });
  M.waterStill = phys({ color: 0x5a8a8f, roughness: 0.03, transparent: true, opacity: 0.85, normalMap: wn, normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 1 });

  // ---- rugs
  M.rugTemple = std({ map: TEX.rugTemple, roughness: 0.95 });
  M.rugLiving = std({ map: TEX.rugLiving, roughness: 0.95 });
  M.rugMusic = std({ map: TEX.rugMusic, roughness: 0.95 });
  M.rugBed = std({ map: TEX.rugBed, roughness: 0.95 });
  M.rangoli = std({ map: TEX.rangoli, transparent: true, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  progress('Materials ready', 1);
  return M;
}

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function colorMat(hex, opts = {}) { return std({ color: hex, roughness: 0.6, ...opts }); }
