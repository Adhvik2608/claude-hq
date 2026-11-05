import * as THREE from 'three';
import { M } from './materials.js';
import { toTexture } from './textures.js';
import { Avatar } from '../character/avatar.js';
import { tube, bakeGroup } from './builder.js';

// =====================================================================
// Tanjore-style devotional paintings, painted procedurally on canvas.
// =====================================================================
const W = 512, H = 680;
const INK = '#2a1206';

function gold(g, x0, y0, x1, y1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.25, '#e9b44c'); gr.addColorStop(0.5, '#a8701e'); gr.addColorStop(0.75, '#f6d27a'); gr.addColorStop(1, '#9a6418');
  return gr;
}
function gems(g, pts, r = 5) {
  for (const [x, y, c] of pts) {
    g.fillStyle = c || (Math.random() < 0.5 ? '#c0182a' : '#1a8a4a');
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, 7); g.fill();
  }
}
function background(g, c1, c2) {
  const gr = g.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.45, W * 0.8);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
}
// ornate arch (prabhavali) with pillars and a drape
function prabhavali(g, col = null) {
  g.save();
  g.lineWidth = 18; g.strokeStyle = gold(g, 0, 0, W, H);
  g.beginPath(); g.moveTo(40, H - 30); g.lineTo(40, 250); g.quadraticCurveTo(40, 60, W / 2, 46); g.quadraticCurveTo(W - 40, 60, W - 40, 250); g.lineTo(W - 40, H - 30); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#7a4a10';
  g.beginPath(); g.moveTo(52, H - 30); g.lineTo(52, 252); g.quadraticCurveTo(52, 74, W / 2, 60); g.quadraticCurveTo(W - 52, 74, W - 52, 252); g.lineTo(W - 52, H - 30); g.stroke();
  const pts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const a = Math.PI * (1 - t); pts.push([W / 2 + Math.cos(a) * (W / 2 - 40), 250 - Math.sin(a) * 196]); }
  gems(g, pts, 5);
  for (let y = 280; y < H - 40; y += 34) gems(g, [[40, y], [W - 40, y]], 5);
  // swagged drape at the top
  g.fillStyle = col || '#9a1020';
  for (let i = 0; i < 5; i++) { const x0 = 70 + i * 74; g.beginPath(); g.moveTo(x0, 92); g.quadraticCurveTo(x0 + 37, 140, x0 + 74, 92); g.lineTo(x0 + 74, 86); g.lineTo(x0, 86); g.fill(); }
  g.strokeStyle = gold(g, 0, 80, W, 140); g.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const x0 = 70 + i * 74; g.beginPath(); g.moveTo(x0, 92); g.quadraticCurveTo(x0 + 37, 140, x0 + 74, 92); g.stroke(); }
  g.restore();
}
function halo(g, x, y, r) {
  const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
  gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.6, '#f2c45a'); gr.addColorStop(1, 'rgba(230,160,40,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.strokeStyle = gold(g, x - r, y - r, x + r, y + r); g.lineWidth = 6; g.beginPath(); g.arc(x, y, r * 0.78, 0, 7); g.stroke();
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82); g.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); g.strokeStyle = 'rgba(160,100,20,.6)'; g.lineWidth = 2; g.stroke(); }
}
function crown(g, x, y, w, h) {
  g.save();
  g.fillStyle = gold(g, x - w / 2, y - h, x + w / 2, y);
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - w / 2, y); g.lineTo(x - w * 0.42, y - h * 0.55); g.lineTo(x - w * 0.25, y - h * 0.7); g.lineTo(x - w * 0.12, y - h * 0.9); g.lineTo(x, y - h); g.lineTo(x + w * 0.12, y - h * 0.9); g.lineTo(x + w * 0.25, y - h * 0.7); g.lineTo(x + w * 0.42, y - h * 0.55); g.lineTo(x + w / 2, y); g.closePath();
  g.fill(); g.stroke();
  g.beginPath(); g.ellipse(x, y - 2, w / 2 + 4, 8, 0, 0, 7); g.fill(); g.stroke();
  gems(g, [[x, y - h * 0.55, '#c0182a'], [x - w * 0.25, y - h * 0.3, '#1a8a4a'], [x + w * 0.25, y - h * 0.3, '#1a8a4a'], [x, y - h * 0.85, '#fff']], 6);
  g.restore();
}
function eyes(g, x, y, s, look = 0) {
  for (const sx of [-1, 1]) {
    const ex = x + sx * s * 0.42;
    g.fillStyle = '#fffaf0'; g.strokeStyle = INK; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(ex - s * 0.26, y); g.quadraticCurveTo(ex, y - s * 0.2, ex + s * 0.3 * (sx), y - s * 0.04); g.quadraticCurveTo(ex, y + s * 0.16, ex - s * 0.26, y); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(ex - s * 0.26, y); g.quadraticCurveTo(ex, y - s * 0.2, ex + s * 0.3, y - s * 0.04); g.quadraticCurveTo(ex, y + s * 0.16, ex - s * 0.26, y); g.fill(); g.stroke();
    g.fillStyle = '#1a0c06'; g.beginPath(); g.arc(ex + look * s * 0.06, y - s * 0.02, s * 0.085, 0, 7); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(ex - s * 0.28, y - s * 0.2); g.quadraticCurveTo(ex, y - s * 0.34, ex + s * 0.3, y - s * 0.22); g.stroke();
  }
}
function face(g, x, y, s, skin, { tilak = 'u', fem = false, lips = '#b0202a' } = {}) {
  g.fillStyle = skin; g.strokeStyle = INK; g.lineWidth = 2.4;
  g.beginPath(); g.ellipse(x, y, s * 0.92, s * 1.08, 0, 0, 7); g.fill(); g.stroke();
  // ears + earrings
  for (const sx of [-1, 1]) {
    g.fillStyle = skin; g.beginPath(); g.ellipse(x + sx * s * 0.95, y + s * 0.05, s * 0.14, s * 0.26, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = gold(g, x - s, y, x + s, y + s); g.beginPath(); g.arc(x + sx * s * 0.98, y + s * 0.4, s * 0.12, 0, 7); g.fill();
  }
  eyes(g, x, y - s * 0.05, s);
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x - s * 0.04, y - s * 0.02); g.quadraticCurveTo(x - s * 0.12, y + s * 0.32, x + s * 0.04, y + s * 0.34); g.stroke();
  g.fillStyle = lips; g.beginPath(); g.moveTo(x - s * 0.22, y + s * 0.55); g.quadraticCurveTo(x, y + s * 0.47, x + s * 0.22, y + s * 0.55); g.quadraticCurveTo(x, y + s * 0.7, x - s * 0.22, y + s * 0.55); g.fill();
  if (tilak === 'u') { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - s * 0.1, y - s * 0.62); g.lineTo(x - s * 0.06, y - s * 0.3); g.moveTo(x + s * 0.1, y - s * 0.62); g.lineTo(x + s * 0.06, y - s * 0.3); g.stroke(); g.fillStyle = '#d01818'; g.fillRect(x - s * 0.025, y - s * 0.62, s * 0.05, s * 0.32); }
  else if (tilak === 'dot') { g.fillStyle = '#d01818'; g.beginPath(); g.arc(x, y - s * 0.35, s * 0.08, 0, 7); g.fill(); }
  else if (tilak === 'shiva') { g.strokeStyle = '#f4efe6'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - s * 0.45, y - s * 0.62 + i * 8); g.lineTo(x + s * 0.45, y - s * 0.62 + i * 8); g.stroke(); } g.fillStyle = '#d01818'; g.beginPath(); g.ellipse(x, y - s * 0.52, s * 0.05, s * 0.1, 0, 0, 7); g.fill(); }
  if (fem) { g.fillStyle = gold(g, x, y, x + s, y + s); g.beginPath(); g.arc(x + s * 0.2, y + s * 0.33, s * 0.1, 0, 7); g.fill(); }
}
function lotus(g, x, y, w, c1 = '#f07aa0', c2 = '#c03a6a') {
  for (let row = 0; row < 2; row++) {
    const n = row ? 7 : 9, pw = w / n * 1.4;
    for (let i = 0; i < n; i++) {
      const px = x - w / 2 + (i + 0.5) * (w / n), py = y + (row ? -10 : 8);
      const gr = g.createLinearGradient(px, py - 40, px, py + 10); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.strokeStyle = INK; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px - pw / 2, py + 10); g.quadraticCurveTo(px - pw / 2, py - 28, px, py - 44); g.quadraticCurveTo(px + pw / 2, py - 28, px + pw / 2, py + 10); g.closePath(); g.fill(); g.stroke();
    }
  }
  g.fillStyle = '#3d7a3a'; g.beginPath(); g.ellipse(x, y + 24, w * 0.6, 12, 0, 0, 7); g.fill();
}
function body(g, x, y, s, skin, garment, { arms = 2, seated = true, hold = null } = {}) {
  g.strokeStyle = INK; g.lineWidth = 2.2;
  // torso
  g.fillStyle = skin;
  g.beginPath(); g.moveTo(x - s * 0.9, y); g.quadraticCurveTo(x - s * 1.1, y + s * 0.9, x - s * 0.7, y + s * 1.6); g.lineTo(x + s * 0.7, y + s * 1.6); g.quadraticCurveTo(x + s * 1.1, y + s * 0.9, x + s * 0.9, y); g.closePath(); g.fill(); g.stroke();
  // necklaces
  for (let i = 0; i < 3; i++) { g.strokeStyle = gold(g, x - s, y, x + s, y + s); g.lineWidth = 4 - i; g.beginPath(); g.arc(x, y - s * 0.3 + i * 5, s * (0.55 + i * 0.18), 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); }
  gems(g, [[x, y + s * 0.42 + 6, '#c0182a']], 6);
  // garment (dhoti / saree) lower body
  g.fillStyle = garment; g.strokeStyle = INK; g.lineWidth = 2;
  if (seated) { g.beginPath(); g.moveTo(x - s * 0.75, y + s * 1.5); g.quadraticCurveTo(x - s * 1.9, y + s * 1.9, x - s * 1.7, y + s * 2.35); g.lineTo(x + s * 1.7, y + s * 2.35); g.quadraticCurveTo(x + s * 1.9, y + s * 1.9, x + s * 0.75, y + s * 1.5); g.closePath(); g.fill(); g.stroke(); }
  else { g.beginPath(); g.moveTo(x - s * 0.75, y + s * 1.5); g.lineTo(x - s * 1.0, y + s * 3.5); g.lineTo(x + s * 1.0, y + s * 3.5); g.lineTo(x + s * 0.75, y + s * 1.5); g.closePath(); g.fill(); g.stroke(); }
  g.strokeStyle = gold(g, 0, y, W, y + s * 2); g.lineWidth = 5; g.beginPath(); g.moveTo(x - s * 0.75, y + s * 1.52); g.lineTo(x + s * 0.75, y + s * 1.52); g.stroke();
  // arms
  const arm = (ax, ay, bx, by, cx, cy) => { g.strokeStyle = INK; g.lineWidth = s * 0.34 + 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(bx, by, cx, cy); g.stroke(); g.strokeStyle = skin; g.lineWidth = s * 0.34; g.stroke(); g.fillStyle = gold(g, cx - 10, cy - 10, cx + 10, cy + 10); g.beginPath(); g.arc((bx + cx) / 2, (by + cy) / 2, s * 0.17, 0, 7); g.fill(); };
  arm(x - s * 0.8, y + s * 0.15, x - s * 1.3, y + s * 0.9, x - s * 0.9, y + s * 1.35);
  arm(x + s * 0.8, y + s * 0.15, x + s * 1.35, y + s * 0.6, x + s * 1.05, y + s * 0.05);
  // blessing hand (abhaya)
  g.fillStyle = skin; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(x + s * 1.05, y - s * 0.08, s * 0.16, s * 0.24, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#c01818'; g.beginPath(); g.arc(x + s * 1.05, y - s * 0.05, 3, 0, 7); g.fill();
  if (arms === 4) {
    arm(x - s * 0.75, y + s * 0.05, x - s * 1.6, y - s * 0.2, x - s * 1.5, y - s * 0.75);
    arm(x + s * 0.75, y + s * 0.05, x + s * 1.65, y - s * 0.2, x + s * 1.55, y - s * 0.75);
    return [[x - s * 1.5, y - s * 0.8], [x + s * 1.55, y - s * 0.8]];
  }
  return [];
}

const PAINTERS = {
  ganesha(g) {
    background(g, '#c8302a', '#5a0c10'); prabhavali(g, '#1a5a32');
    halo(g, W / 2, 255, 120);
    lotus(g, W / 2, 560, 300);
    const s = 60, x = W / 2, y = 330;
    const skin = '#f2a070';
    const hands = body(g, x, y, s, skin, '#d4a017', { arms: 4 });
    // big belly
    g.fillStyle = skin; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + s * 1.05, s * 0.85, s * 0.7, 0, 0, 7); g.fill(); g.stroke();
    // head
    g.fillStyle = skin; g.beginPath(); g.ellipse(x, y - s * 0.95, s * 0.95, s * 0.9, 0, 0, 7); g.fill(); g.stroke();
    // ears (fans)
    for (const sx of [-1, 1]) { g.fillStyle = '#f7b48a'; g.beginPath(); g.moveTo(x + sx * s * 0.6, y - s * 1.5); g.quadraticCurveTo(x + sx * s * 2.0, y - s * 1.8, x + sx * s * 1.9, y - s * 0.7); g.quadraticCurveTo(x + sx * s * 1.6, y - s * 0.1, x + sx * s * 0.7, y - s * 0.45); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = gold(g, 0, 0, W, H); g.lineWidth = 4; g.stroke(); g.strokeStyle = INK; g.lineWidth = 2; }
    // trunk curling to his left
    g.lineCap = 'round';
    g.strokeStyle = INK; g.lineWidth = s * 0.5 + 4; g.beginPath(); g.moveTo(x, y - s * 0.7); g.bezierCurveTo(x - s * 0.1, y + s * 0.2, x + s * 0.7, y + s * 0.3, x + s * 0.55, y - s * 0.1); g.stroke();
    g.strokeStyle = skin; g.lineWidth = s * 0.5; g.stroke();
    g.fillStyle = '#fff8e8'; g.beginPath(); g.moveTo(x - s * 0.4, y - s * 0.55); g.quadraticCurveTo(x - s * 0.55, y - s * 0.2, x - s * 0.38, y - s * 0.15); g.lineTo(x - s * 0.3, y - s * 0.5); g.fill();
    eyes(g, x, y - s * 1.05, s * 0.9);
    g.fillStyle = '#d01818'; g.beginPath(); g.ellipse(x, y - s * 1.5, s * 0.08, s * 0.2, 0, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - s * 0.45, y - s * 1.35 + i * 6); g.lineTo(x + s * 0.45, y - s * 1.35 + i * 6); g.stroke(); }
    crown(g, x, y - s * 1.62, s * 1.3, s * 1.2);
    // modak bowl & lotus & axe
    g.fillStyle = gold(g, 0, 0, W, H); g.beginPath(); g.ellipse(x - s * 0.9, y + s * 1.45, s * 0.35, s * 0.14, 0, 0, Math.PI); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = '#f4ecd8'; g.beginPath(); g.moveTo(x - s * 1.15 + i * 18, y + s * 1.45); g.quadraticCurveTo(x - s * 1.1 + i * 18, y + s * 1.1, x - s * 1.05 + i * 18, y + s * 1.45); g.fill(); }
    if (hands.length) { lotusFlower(g, hands[0][0], hands[0][1] - 10, 20); axe(g, hands[1][0], hands[1][1]); }
    // mouse
    g.fillStyle = '#6a6a72'; g.strokeStyle = INK; g.beginPath(); g.ellipse(x + 150, 600, 26, 16, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(x + 124, 596, 12, 10, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x + 176, 600); g.quadraticCurveTo(x + 200, 590, x + 205, 610); g.stroke();
  },
  krishna(g) {
    background(g, '#1f6a4a', '#08261a'); prabhavali(g, '#a01018');
    halo(g, W / 2, 200, 110);
    const s = 50, x = W / 2, y = 262;
    const skin = '#3a68b0';
    // standing figure in tribhanga
    body(g, x, y, s, skin, '#f2c21a', { seated: false });
    // flute across
    g.strokeStyle = '#7a4a1a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * 0.4, y - s * 0.45); g.lineTo(x + s * 2.6, y + s * 0.25); g.stroke();
    g.strokeStyle = gold(g, 0, 0, W, H); g.lineWidth = 3; for (let i = 0; i < 4; i++) { const t = 0.2 + i * 0.2; g.beginPath(); g.arc(x - s * 0.4 + (s * 3) * t, y - s * 0.45 + s * 0.7 * t, 4, 0, 7); g.stroke(); }
    face(g, x, y - s * 0.9, s, skin, { tilak: 'u' });
    crown(g, x, y - s * 1.85, s * 1.2, s * 1.1);
    peacock(g, x + s * 0.55, y - s * 2.6, 0.9);
    // garland
    g.lineWidth = 7; for (let i = 0; i < 26; i++) { const t = i / 25; const a = Math.PI * (0.15 + t * 0.7); g.strokeStyle = ['#ff6a10', '#ffd21a', '#e0103a'][i % 3]; g.beginPath(); g.arc(x + Math.cos(a) * s * 1.05, y - s * 0.1 + Math.sin(a) * s * 2.2, 3.5, 0, 7); g.stroke(); }
    // cow
    g.fillStyle = '#f4efe4'; g.strokeStyle = INK; g.lineWidth = 2;
    g.beginPath(); g.ellipse(120, 590, 64, 34, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(170, 560, 22, 18, 0.4, 0, 7); g.fill(); g.stroke();
    for (const lx of [80, 100, 140, 160]) { g.beginPath(); g.moveTo(lx, 615); g.lineTo(lx, 650); g.stroke(); }
    g.fillStyle = '#d01818'; g.beginPath(); g.arc(176, 556, 3, 0, 7); g.fill();
  },
  shiva(g) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#20305a'); sky.addColorStop(0.6, '#5a74a8'); sky.addColorStop(1, '#1c2440');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e8eef8'; g.beginPath(); g.moveTo(0, 360); g.lineTo(110, 200); g.lineTo(180, 290); g.lineTo(256, 150); g.lineTo(340, 280); g.lineTo(410, 210); g.lineTo(W, 340); g.lineTo(W, 420); g.lineTo(0, 420); g.fill();
    g.fillStyle = '#9fb0cc'; g.beginPath(); g.moveTo(256, 150); g.lineTo(300, 290); g.lineTo(230, 300); g.fill();
    prabhavali(g, '#2a2a6a');
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(W / 2, 140, 60, 0, 7); g.globalAlpha = 0.15; g.fill(); g.globalAlpha = 1;
    const s = 56, x = W / 2, y = 330, skin = '#7d9ac2';
    // tiger skin seat
    g.fillStyle = '#e09a2a'; g.beginPath(); g.ellipse(x, 600, 190, 40, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a1206'; g.lineWidth = 6; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x - 160 + i * 40, 580); g.lineTo(x - 150 + i * 40, 620); g.stroke(); }
    body(g, x, y, s, skin, '#c8822a');
    // snake
    g.strokeStyle = '#2f6a3a'; g.lineWidth = 9; g.beginPath(); g.arc(x, y - s * 0.15, s * 0.75, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    g.fillStyle = '#2f6a3a'; g.beginPath(); g.ellipse(x + s * 0.7, y - s * 0.55, 10, 14, 0.4, 0, 7); g.fill();
    // jata (matted hair) + Ganga + moon
    g.fillStyle = '#3a2410'; g.beginPath(); g.ellipse(x, y - s * 2.15, s * 0.65, s * 0.55, 0, 0, 7); g.fill();
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + sx * s * 0.8, y - s * 1.5); g.quadraticCurveTo(x + sx * s * 1.5, y - s * 1.0, x + sx * s * 1.3, y - s * 0.2); g.lineTo(x + sx * s * 1.05, y - s * 0.3); g.quadraticCurveTo(x + sx * s * 1.2, y - s * 1.0, x + sx * s * 0.6, y - s * 1.4); g.fill(); }
    face(g, x, y - s * 0.95, s, skin, { tilak: 'shiva' });
    g.strokeStyle = 'rgba(200,230,255,.85)'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 10, y - s * 2.6); g.bezierCurveTo(x + 40, y - s * 3.4, x + 90, y - s * 3.2, x + 110, y - s * 3.8); g.stroke();
    g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(x - s * 0.35, y - s * 2.35, 14, 0, 7); g.fill(); g.fillStyle = '#3a2410'; g.beginPath(); g.arc(x - s * 0.28, y - s * 2.4, 12, 0, 7); g.fill();
    // third eye
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y - s * 1.55, 5, 9, 0, 0, 7); g.fill(); g.fillStyle = '#d01818'; g.beginPath(); g.ellipse(x, y - s * 1.55, 2.5, 5, 0, 0, 7); g.fill();
    // trishul with damru
    g.strokeStyle = '#7a7a82'; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 150, 600); g.lineTo(x + 150, 210); g.stroke();
    g.fillStyle = '#bfc4cc'; g.beginPath(); g.moveTo(x + 150, 170); g.lineTo(x + 140, 215); g.lineTo(x + 160, 215); g.fill();
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(x + 150 + sx * 24, 185); g.quadraticCurveTo(x + 150 + sx * 26, 222, x + 150, 225); g.lineTo(x + 150 + sx * 4, 218); g.quadraticCurveTo(x + 150 + sx * 18, 215, x + 150 + sx * 24, 185); g.fill(); }
    g.fillStyle = '#a0602a'; g.beginPath(); g.moveTo(x + 136, 250); g.lineTo(x + 164, 270); g.lineTo(x + 164, 250); g.lineTo(x + 136, 270); g.fill();
    // rudraksha mala in hand
    g.fillStyle = '#5a2a12'; for (let i = 0; i < 12; i++) g.fillRect(x - s * 1.0 + Math.sin(i) * 6, y + s * 1.3 + i * 4, 6, 4);
  },
  lakshmi(g) {
    background(g, '#7a1028', '#2a0410'); prabhavali(g, '#1a4a8a');
    halo(g, W / 2, 205, 110);
    // water + elephants
    g.fillStyle = '#2a6a8a'; g.fillRect(56, 560, W - 112, 90);
    const elephant = (ex, dir) => { g.fillStyle = '#e8e6ea'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(ex, 470, 50, 40, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(ex + dir * 40, 430, 26, 30, 0, 0, 7); g.fill(); g.stroke(); g.lineWidth = 12; g.beginPath(); g.moveTo(ex + dir * 55, 440); g.quadraticCurveTo(ex + dir * 90, 380, ex + dir * 70, 330); g.stroke(); g.strokeStyle = '#e8e6ea'; g.lineWidth = 9; g.stroke(); g.fillStyle = '#d4a017'; g.fillRect(ex - 30, 440, 50, 12); };
    elephant(110, 1); elephant(W - 110, -1);
    lotus(g, W / 2, 590, 260);
    const s = 48, x = W / 2, y = 268, skin = '#f4c09a';
    const hands = body(g, x, y, s, skin, '#c8102e', { arms: 4, seated: false });
    face(g, x, y - s * 0.9, s, skin, { tilak: 'dot', fem: true });
    // hair + crown
    g.fillStyle = '#1a0c06'; g.beginPath(); g.ellipse(x, y - s * 1.3, s * 1.02, s * 0.6, 0, Math.PI, 0); g.fill();
    crown(g, x, y - s * 1.85, s * 1.2, s * 1.1);
    if (hands.length) { lotusFlower(g, hands[0][0], hands[0][1] - 8, 24); lotusFlower(g, hands[1][0], hands[1][1] - 8, 24); }
    // coins falling
    for (let i = 0; i < 9; i++) { g.fillStyle = gold(g, 0, 0, W, H); g.beginPath(); g.ellipse(x + s * 1.1 + (i % 3) * 8, y + s * 0.3 + i * 22, 8, 5, 0, 0, 7); g.fill(); }
  },
  saraswati(g) {
    background(g, '#e8eef6', '#6a86b0'); prabhavali(g, '#d4a017');
    halo(g, W / 2, 205, 110);
    lotus(g, W / 2, 575, 280, '#ffffff', '#d8d0e0');
    const s = 50, x = W / 2, y = 280, skin = '#f6d0b0';
    body(g, x, y, s, skin, '#fbfaf6');
    // veena diagonally
    g.strokeStyle = '#6a3a14'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * 2.1, y + s * 1.9); g.lineTo(x + s * 2.0, y - s * 0.6); g.stroke();
    g.fillStyle = '#8a4a1a'; g.beginPath(); g.arc(x - s * 1.9, y + s * 1.7, 34, 0, 7); g.fill(); g.beginPath(); g.arc(x + s * 1.9, y - s * 0.55, 22, 0, 7); g.fill();
    g.strokeStyle = '#f4e4b4'; g.lineWidth = 1; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x - s * 2.1, y + s * 1.9 + i * 2); g.lineTo(x + s * 2.0, y - s * 0.6 + i * 2); g.stroke(); }
    face(g, x, y - s * 0.9, s, skin, { tilak: 'dot', fem: true });
    g.fillStyle = '#1a0c06'; g.beginPath(); g.ellipse(x, y - s * 1.3, s * 1.02, s * 0.6, 0, Math.PI, 0); g.fill();
    crown(g, x, y - s * 1.85, s * 1.1, s * 1.0);
    // swan
    g.fillStyle = '#ffffff'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(400, 600, 50, 26, 0, 0, 7); g.fill(); g.stroke();
    g.lineWidth = 10; g.strokeStyle = INK; g.beginPath(); g.moveTo(370, 590); g.quadraticCurveTo(350, 540, 372, 520); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 7; g.stroke();
    g.fillStyle = '#e08a10'; g.beginPath(); g.moveTo(372, 515); g.lineTo(352, 522); g.lineTo(372, 525); g.fill();
  },
  hanuman(g) {
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#f2a040'); sky.addColorStop(1, '#a0301a');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    prabhavali(g, '#1a5a32');
    halo(g, W / 2, 210, 110);
    const s = 52, x = W / 2, y = 290, skin = '#e0601a';
    body(g, x, y, s, skin, '#d81a10');
    face(g, x, y - s * 0.95, s, skin, { tilak: 'u' });
    crown(g, x, y - s * 1.9, s * 1.2, s * 1.1);
    // mace on shoulder
    g.strokeStyle = gold(g, 0, 0, W, H); g.lineWidth = 9; g.beginPath(); g.moveTo(x - s * 0.9, y + s * 1.4); g.lineTo(x - s * 1.8, y - s * 1.2); g.stroke();
    g.fillStyle = gold(g, x - 140, y - 140, x - 60, y - 40); g.beginPath(); g.arc(x - s * 1.95, y - s * 1.5, 40, 0, 7); g.fill();
    g.strokeStyle = '#7a4a10'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x - s * 1.95, y - s * 1.5, 40 - i * 6, 0, 7); g.stroke(); }
    // mountain in hand
    g.fillStyle = '#3a7a3a'; g.beginPath(); g.moveTo(x + s * 0.7, y - s * 0.1); g.lineTo(x + s * 1.5, y - s * 1.4); g.lineTo(x + s * 2.4, y - s * 0.1); g.fill();
    g.fillStyle = '#7ab04a'; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(x + s * 1.1 + (i % 4) * 20, y - s * 0.4 - Math.floor(i / 4) * 22, 7, 0, 7); g.fill(); }
    lotus(g, W / 2, 575, 290, '#f0a040', '#c04010');
  },
  durga(g) {
    background(g, '#e04a10', '#5a0a04'); prabhavali(g, '#1a1a6a');
    halo(g, W / 2, 300, 210);
    const s = 120, x = W / 2, y = 330, skin = '#f4b07a';
    g.fillStyle = '#1a0c06'; g.beginPath(); g.ellipse(x, y + 40, s * 1.2, s * 1.6, 0, 0, 7); g.fill();
    face(g, x, y, s, skin, { tilak: 'none', fem: true, lips: '#a0101a' });
    g.fillStyle = '#d01818'; g.beginPath(); g.arc(x, y - s * 0.38, 12, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y - s * 0.62, 6, 12, 0, 0, 7); g.fill(); g.fillStyle = '#1a0c06'; g.beginPath(); g.arc(x, y - s * 0.62, 4, 0, 7); g.fill();
    // nath (nose ring)
    g.strokeStyle = gold(g, 0, 0, W, H); g.lineWidth = 4; g.beginPath(); g.arc(x + 26, y + s * 0.32, 26, -0.6, 2.3); g.stroke();
    crown(g, x, y - s * 0.95, s * 1.6, s * 1.1);
    gems(g, [[x - s * 0.5, y - s * 1.2], [x + s * 0.5, y - s * 1.2], [x, y - s * 1.6, '#fff']], 8);
  },
  om(g) {
    const gr = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W);
    gr.addColorStop(0, '#ffcf6a'); gr.addColorStop(0.45, '#f08a1a'); gr.addColorStop(1, '#6a1a04');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; g.strokeStyle = 'rgba(255,240,180,.25)'; g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * 140, H / 2 + Math.sin(a) * 140); g.lineTo(W / 2 + Math.cos(a) * 400, H / 2 + Math.sin(a) * 400); g.stroke(); }
    halo(g, W / 2, H / 2 - 10, 190);
    g.fillStyle = '#7a1a04'; g.font = 'bold 260px "Tiro Devanagari Hindi", "Noto Serif Devanagari", "Kohinoor Devanagari", "Nirmala UI", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ॐ', W / 2, H / 2 + 6);
    g.fillStyle = gold(g, 0, 0, W, H); g.fillText('ॐ', W / 2 - 4, H / 2);
    lotus(g, W / 2, H - 70, 300);
  },
  yantra(g) {
    g.fillStyle = '#5a0a1a'; g.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = 210;
    g.strokeStyle = gold(g, 0, 0, W, H); g.lineWidth = 6;
    g.strokeRect(cx - R - 20, cy - R - 20, (R + 20) * 2, (R + 20) * 2);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.fillStyle = i % 2 ? '#c8302a' : '#e08a2a'; g.beginPath(); g.ellipse(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, 22, 40, a + Math.PI / 2, 0, 7); g.fill(); }
    g.fillStyle = '#f2d06a'; g.beginPath(); g.arc(cx, cy, R * 0.72, 0, 7); g.fill();
    g.lineWidth = 3; g.strokeStyle = '#7a1a04';
    const tri = (r, up, dy) => { g.beginPath(); for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (up ? 0 : Math.PI) + (i / 3) * Math.PI * 2; g.lineTo(cx + Math.cos(a) * r, cy + dy + Math.sin(a) * r); } g.closePath(); g.stroke(); };
    for (let i = 0; i < 4; i++) tri(R * (0.68 - i * 0.12), true, -i * 6);
    for (let i = 0; i < 5; i++) tri(R * (0.66 - i * 0.11), false, i * 6);
    g.fillStyle = '#c8102e'; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill();
  },
  buddha(g) {
    background(g, '#2a4a3a', '#0a1a12');
    halo(g, W / 2, 240, 150);
    lotus(g, W / 2, 590, 320, '#f4d0d8', '#b07080');
    const s = 60, x = W / 2, y = 330, skin = '#d8a04a';
    body(g, x, y, s, skin, '#b0501a');
    face(g, x, y - s * 0.95, s, skin, { tilak: 'none' });
    g.fillStyle = '#2a1a10'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(x - s * 0.8 + (i % 8) * s * 0.23, y - s * 1.75 - Math.floor(i / 8) * 12, 9, 0, 7); g.fill(); }
    g.beginPath(); g.arc(x, y - s * 2.35, 22, 0, 7); g.fill();
    // closed eyes overlay
    g.fillStyle = skin; g.fillRect(x - s * 0.7, y - s * 1.15, s * 1.4, s * 0.25);
    g.strokeStyle = INK; g.lineWidth = 2.5; for (const sx of [-1, 1]) { g.beginPath(); g.arc(x + sx * s * 0.38, y - s * 1.08, s * 0.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
  },
};

function lotusFlower(g, x, y, r) {
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38; g.fillStyle = i % 2 ? '#f07aa0' : '#e0507a'; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.25, r * 0.6, a + Math.PI / 2, 0, 7); g.fill(); }
}
function axe(g, x, y) { g.strokeStyle = '#7a4a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y + 30); g.lineTo(x, y - 30); g.stroke(); g.fillStyle = '#c0c4cc'; g.beginPath(); g.moveTo(x, y - 30); g.quadraticCurveTo(x + 28, y - 30, x + 30, y - 6); g.lineTo(x, y - 14); g.fill(); }
function peacock(g, x, y, s) {
  g.save(); g.translate(x, y); g.rotate(0.35); g.scale(s, s);
  g.fillStyle = '#1a6a3a'; g.beginPath(); g.ellipse(0, 0, 16, 46, 0, 0, 7); g.fill();
  g.fillStyle = '#2a8ab0'; g.beginPath(); g.ellipse(0, -18, 11, 16, 0, 0, 7); g.fill();
  g.fillStyle = '#d4a017'; g.beginPath(); g.ellipse(0, -18, 7, 10, 0, 0, 7); g.fill();
  g.fillStyle = '#0a1a5a'; g.beginPath(); g.ellipse(0, -18, 4, 6, 0, 0, 7); g.fill();
  g.restore();
}

const cache = {};
export function deityTexture(name) {
  if (cache[name]) return cache[name];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  (PAINTERS[name] || PAINTERS.om)(g);
  // aged varnish + vignette
  const v = g.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(30,12,0,.45)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  const t = toTexture(c, { repeat: false });
  cache[name] = t;
  return t;
}
export const DEITIES = ['ganesha', 'krishna', 'shiva', 'lakshmi', 'saraswati', 'hanuman', 'durga', 'om', 'yantra', 'buddha'];
export const DEITY_NAMES = { ganesha: 'Shri Ganesha', krishna: 'Shri Krishna', shiva: 'Mahadev', lakshmi: 'Maa Lakshmi', saraswati: 'Maa Saraswati', hanuman: 'Shri Hanuman', durga: 'Maa Durga', om: 'Om', yantra: 'Shri Yantra', buddha: 'Buddha' };

// =====================================================================
// 3D murtis
// =====================================================================
function silk(hex) { return new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.42, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.5) }); }

function mukut(scale = 1) {
  const g = new THREE.Group();
  const pts = [[0.095, 0], [0.1, 0.03], [0.085, 0.06], [0.09, 0.09], [0.07, 0.13], [0.075, 0.16], [0.045, 0.22], [0.05, 0.25], [0.02, 0.31], [0.006, 0.36], [0, 0.37]].map(([r, y]) => new THREE.Vector2(r * scale, y * scale));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), M.goldPolish); m.castShadow = true; g.add(m);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const j = new THREE.Mesh(new THREE.SphereGeometry(0.011 * scale, 8, 6), i % 2 ? rubyMat() : emeraldMat()); j.position.set(Math.sin(a) * 0.098 * scale, 0.045 * scale, Math.cos(a) * 0.098 * scale); g.add(j); }
  const front = new THREE.Mesh(new THREE.SphereGeometry(0.018 * scale, 10, 8), rubyMat()); front.position.set(0, 0.11 * scale, 0.08 * scale); g.add(front);
  return g;
}
let _ruby, _emerald;
function rubyMat() { return _ruby || (_ruby = new THREE.MeshPhysicalMaterial({ color: 0xc0102a, roughness: 0.05, clearcoat: 1, emissive: 0x300008 })); }
function emeraldMat() { return _emerald || (_emerald = new THREE.MeshPhysicalMaterial({ color: 0x0a8a4a, roughness: 0.05, clearcoat: 1, emissive: 0x002010 })); }

function peacockFeather() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#1a7a3a'; g.beginPath(); g.ellipse(32, 90, 26, 70, 0, 0, 7); g.fill();
  g.fillStyle = '#2a9ac0'; g.beginPath(); g.ellipse(32, 52, 17, 24, 0, 0, 7); g.fill();
  g.fillStyle = '#e0b020'; g.beginPath(); g.ellipse(32, 52, 11, 15, 0, 0, 7); g.fill();
  g.fillStyle = '#0a1a6a'; g.beginPath(); g.ellipse(32, 52, 6, 9, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.17), new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 }));
}

function poseJoints(av, pose) {
  for (const [k, v] of Object.entries(pose)) { const j = av.j[k]; if (j) j.rotation.set(v[0], v[1], v[2]); }
}

function garland(r = 0.14, drop = 0.22) {
  const g = new THREE.Group();
  const cols = [0xff7a10, 0xffc21a, 0xe0103a, 0xffffff];
  const mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  for (let i = 0; i < 44; i++) {
    const t = i / 43, a = Math.PI * (0.05 + t * 0.9);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), mats[i % 4]);
    m.position.set(Math.cos(a) * r, -Math.sin(a) * drop, 0.08 + Math.sin(a) * 0.02);
    g.add(m);
  }
  return g;
}

// Marble murti built from the avatar system and dressed in silks and gold.
export function murti(kind) {
  const marble = M.marbleStatue;
  let look, skin = marble;
  if (kind === 'krishna') look = { bodyShape: 'neutral', height: 0.62, faceShape: 'oval', eyeType: 'almond', eyeSize: 1.15, hair: 'long', hairColor: '#120a06', top: 'kurta', topColor: '#f0b818', accent: '#c01830', bottom: 'dhoti', bottomColor: '#f0b818', shoes: 'barefoot', forehead: 'tilak', mala: true, watch: false, lips: 'smile', lipColor: '#b02030', earrings: true };
  else if (kind === 'radha') look = { bodyShape: 'femme', height: 0.6, faceShape: 'oval', eyeType: 'almond', eyeSize: 1.15, hair: 'long', hairColor: '#120a06', top: 'dress', topColor: '#d0144a', accent: '#f0c040', bottom: 'skirt', bottomColor: '#d0144a', shoes: 'barefoot', forehead: 'bindi', earrings: true, watch: false, lips: 'smile', lipColor: '#b02030' };
  else if (kind === 'devi') look = { bodyShape: 'femme', height: 0.62, faceShape: 'oval', eyeType: 'wide', eyeSize: 1.2, hair: 'long', hairColor: '#120a06', top: 'dress', topColor: '#b0101a', accent: '#f0c040', bottom: 'skirt', bottomColor: '#b0101a', shoes: 'barefoot', forehead: 'bindi', earrings: true, watch: false, mala: true, lipColor: '#a01020' };
  else if (kind === 'buddha') look = { bodyShape: 'neutral', height: 0.9, faceShape: 'round', eyeType: 'hooded', hair: 'curly', hairColor: '#3a3028', top: 'kurta', topColor: '#b0501a', accent: '#b0501a', bottom: 'dhoti', bottomColor: '#b0501a', shoes: 'barefoot', watch: false, lips: 'smile' };
  if (kind === 'buddha') skin = new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 0.85, roughness: 0.35 });
  const av = new Avatar(look, { skinMat: skin, topMat: kind === 'buddha' ? skin : silk(look.topColor), bottomMat: kind === 'buddha' ? skin : silk(look.bottomColor), hairMat: kind === 'buddha' ? skin : undefined });
  const hc = av.j.headCenter;
  if (kind !== 'buddha') {
    const cr = mukut(1); cr.position.set(0, 0.07, -0.005); hc.add(cr);
    const g = garland(); av.j.chest.add(g); g.position.set(0, 0.36, 0.02);
  } else {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), skin); bun.position.set(0, 0.13, -0.01); hc.add(bun);
  }
  if (kind === 'krishna') {
    const f = peacockFeather(); f.position.set(0.04, 0.38, -0.02); f.rotation.z = -0.35; hc.add(f);
    const flute = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.42, 10), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.5 }));
    flute.rotation.z = Math.PI / 2 - 0.18; flute.position.set(-0.17, -0.07, 0.11); hc.add(flute);
    for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 6, 12), M.gold); band.rotation.y = Math.PI / 2; band.position.set(-0.05 - i * 0.12, -0.07 + i * 0.02, 0.11); hc.add(band); }
    poseJoints(av, {
      hips: [0, 0.1, 0.06], chest: [0, -0.1, -0.05], neck: [0, 0, 0], head: [0.05, -0.25, 0.16],
      shoulderL: [-1.15, 0.0, -0.45], elbowL: [-1.55, 0.7, 0], wristL: [0.2, 0, 0.3],
      shoulderR: [-1.2, 0.0, -0.7], elbowR: [-1.55, 0.7, 0], wristR: [0.2, 0, 0.2],
      thighL: [0.05, 0, -0.08], kneeL: [0.12, 0, 0], thighR: [-0.08, 0.2, 0.22], kneeR: [0.25, 0, 0], ankleR: [0.4, 0, 0],
    });
  } else if (kind === 'radha') {
    poseJoints(av, { hips: [0, -0.15, -0.04], head: [0.08, 0.2, -0.1], shoulderL: [-0.4, 0, 0.15], elbowL: [-1.4, 0, 0], wristL: [-0.6, 0, 0], shoulderR: [-0.2, 0, -0.2], elbowR: [-0.5, 0, 0] });
    const lotusM = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf06a90, roughness: 0.6 })); lotusM.position.set(0, -0.12, 0.02); av.j.wristL.add(lotusM);
  } else if (kind === 'devi' || kind === 'buddha') {
    const crossed = { thighL: [-1.45, -0.55, 0.75], thighR: [-1.45, 0.55, -0.75], kneeL: [2.55, 0, 0], kneeR: [2.55, 0, 0], ankleL: [-0.4, 0, -0.5], ankleR: [-0.4, 0, 0.5] };
    av.j.hips.position.y = 0.12;
    if (kind === 'devi') poseJoints(av, { ...crossed, shoulderR: [-0.4, 0, -0.35], elbowR: [-1.7, 0, 0], wristR: [-0.2, 0, 0], shoulderL: [-0.6, 0, 0.3], elbowL: [-0.6, 0.3, 0], wristL: [0.6, 0, 0], head: [0.05, 0, 0] });
    else poseJoints(av, { ...crossed, shoulderL: [-0.35, 0, 0.18], shoulderR: [-0.35, 0, -0.18], elbowL: [-0.95, 0.4, 0], elbowR: [-0.95, -0.4, 0], wristL: [0.4, 0, -0.6], wristR: [0.4, 0, 0.6], head: [0.12, 0, 0] });
    av.setBlink(kind === 'buddha' ? 0.85 : 0);
  }
  if (kind === 'krishna' || kind === 'radha') av.setBlink(0);
  av.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return bakeGroup(av.root);
}

// Ganesha murti in polished brass with a silk dhoti.
export function ganeshaMurti() {
  const g = new THREE.Group();
  const brass = M.goldPolish, cloth = silk(0xd0141c), skin = M.brass;
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  // lotus pedestal
  add(new THREE.CylinderGeometry(0.42, 0.46, 0.12, 40), brass, 0, 0.06, 0);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + row * 0.2;
    add(new THREE.SphereGeometry(0.09, 12, 8), row ? M.goldPolish : M.brass, Math.sin(a) * (0.36 - row * 0.06), 0.15 + row * 0.05, Math.cos(a) * (0.36 - row * 0.06), 0.55, 0.35, 1, -0.5, a, 0);
  }
  // crossed legs and dhoti
  add(new THREE.SphereGeometry(0.3, 28, 18), cloth, 0, 0.3, 0.02, 1.15, 0.38, 0.9);
  for (const s of [-1, 1]) add(new THREE.CapsuleGeometry(0.07, 0.22, 6, 12), skin, s * 0.09, 0.3, 0.16, 1, 1, 1, Math.PI / 2, 0, s * 1.2);
  // belly and chest
  add(new THREE.SphereGeometry(0.22, 32, 24), skin, 0, 0.52, 0.04, 1.05, 1, 0.95);
  add(new THREE.SphereGeometry(0.17, 28, 20), skin, 0, 0.7, -0.01, 1.15, 0.9, 0.85);
  add(new THREE.TorusGeometry(0.18, 0.02, 8, 32), brass, 0, 0.58, 0.03, 1.1, 1, 0.9, Math.PI / 2, 0, 0);
  // sacred thread
  add(new THREE.TorusGeometry(0.2, 0.006, 6, 40), M.fabWhite, 0, 0.6, 0.02, 1, 1.3, 0.8, 0.2, 0, 0.6);
  // arms (four)
  const arm = (s, up) => {
    const a = new THREE.Group(); a.position.set(s * 0.17, 0.74, 0); g.add(a);
    const u = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 6, 10), skin); u.position.y = -0.08; a.add(u);
    const f = new THREE.Group(); f.position.y = -0.17; a.add(f);
    const fm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 6, 10), skin); fm.position.y = -0.07; f.add(fm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin); hand.position.y = -0.16; hand.scale.set(1, 1.1, 0.6); f.add(hand);
    const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.008, 6, 16), brass); bangle.rotation.x = Math.PI / 2; bangle.position.y = -0.11; f.add(bangle);
    if (up) { a.rotation.set(0, 0, s * 2.0); f.rotation.set(0, 0, -s * 1.6); }
    else { a.rotation.set(-0.5, 0, s * 0.5); f.rotation.set(-1.3, 0, 0); }
    return { a, f, hand };
  };
  const upL = arm(-1, true), upR = arm(1, true), loL = arm(-1, false), loR = arm(1, false);
  // modak bowl in lower left hand, blessing in lower right
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), brass); bowl.position.y = -0.2; loL.f.add(bowl);
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 8), M.fabWhite); m.position.set((i - 1) * 0.03, -0.17, 0); loL.f.add(m); }
  loR.f.rotation.set(-1.8, 0, 0);
  // axe and noose in upper hands
  const axeH = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 6), M.walnut); axeH.position.y = -0.2; upR.f.add(axeH);
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16, 1, false, 0, Math.PI), M.chrome); blade.rotation.x = Math.PI / 2; blade.position.set(0, -0.32, 0); upR.f.add(blade);
  const noose = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.007, 6, 20), brass); noose.position.y = -0.22; upL.f.add(noose);
  // head
  const head = new THREE.Group(); head.position.set(0, 0.98, 0.02); g.add(head);
  const hm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), skin); hm.scale.set(1, 1.05, 0.95); head.add(hm);
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), skin); ear.scale.set(1.0, 1.15, 0.12); ear.position.set(s * 0.19, 0.0, -0.03); ear.rotation.y = s * 0.45; head.add(ear);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.01, 6, 32), brass); rim.scale.set(1, 1.15, 1); rim.position.copy(ear.position); rim.rotation.y = s * 0.45 + Math.PI / 2 * 0; rim.rotation.set(0, s * 0.45, 0); head.add(rim);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), M.ceramic); eye.position.set(s * 0.06, 0.04, 0.135); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), M.ceramicBlack); pupil.position.set(s * 0.06, 0.04, 0.152); head.add(pupil);
  }
  // trunk: tapered tube curling to his left
  const pts = [[0, -0.02, 0.14], [0.0, -0.12, 0.18], [0.02, -0.22, 0.19], [0.07, -0.29, 0.17], [0.12, -0.28, 0.14], [0.13, -0.22, 0.13]].map((p) => new THREE.Vector3(...p));
  const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.055, 14);
  const tp = tg.attributes.position, curve = new THREE.CatmullRomCurve3(pts);
  for (let i = 0; i < tp.count; i++) {
    const seg = Math.floor(i / 15) / 40;
    const c = curve.getPoint(Math.min(1, seg));
    const v = new THREE.Vector3(tp.getX(i), tp.getY(i), tp.getZ(i)).sub(c).multiplyScalar(1 - seg * 0.62).add(c);
    tp.setXYZ(i, v.x, v.y, v.z);
  }
  tg.computeVertexNormals();
  const trunk = new THREE.Mesh(tg, skin); trunk.castShadow = true; head.add(trunk);
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.05 - i * 0.004, 0.004, 4, 16), brass); const p = curve.getPoint(0.1 + i * 0.12); r.position.copy(p); r.lookAt(curve.getPoint(0.12 + i * 0.12).add(head.position)); head.add(r); }
  const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.09, 8), M.ceramic); tusk.position.set(-0.06, -0.08, 0.13); tusk.rotation.set(1.9, 0, 0.3); head.add(tusk);
  const stub = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.03, 8), M.ceramic); stub.position.set(0.06, -0.07, 0.13); stub.rotation.set(1.9, 0, -0.3); head.add(stub);
  const tilak = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.05), new THREE.MeshStandardMaterial({ color: 0xd01010 })); tilak.position.set(0, 0.1, 0.152); tilak.rotation.x = -0.3; head.add(tilak);
  const cr = mukut(1.3); cr.position.set(0, 0.13, -0.01); head.add(cr);
  // mooshak (mouse)
  const mouse = new THREE.Group(); mouse.position.set(0.3, 0.12, 0.38); g.add(mouse);
  const mb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), M.silver); mb.scale.set(1, 0.8, 1.4); mouse.add(mb);
  const mh = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.07, 12), M.silver); mh.rotation.x = Math.PI / 2; mh.position.z = 0.09; mouse.add(mh);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M.silver); e.position.set(s * 0.025, 0.035, 0.06); mouse.add(e); }
  const tail = new THREE.Mesh(tube([[0, 0, -0.06], [0.03, -0.01, -0.12], [0.0, -0.03, -0.16]], 0.005, 12, 4), M.silver); mouse.add(tail);
  const mod = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.04, 8), M.fabWhite); mod.position.set(0, -0.02, 0.13); mouse.add(mod);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return bakeGroup(g);
}

export function shivaLingam() {
  const g = new THREE.Group();
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x18181a, roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const add = (geo, mat, y = 0, sx = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.scale.set(sx, 1, sz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  add(new THREE.CylinderGeometry(0.42, 0.48, 0.18, 40), stone, 0.09);
  const yoni = add(new THREE.CylinderGeometry(0.36, 0.4, 0.1, 40), stone, 0.23, 1, 1);
  const spout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.36), stone); spout.position.set(0, 0.24, 0.42); g.add(spout);
  add(new THREE.CapsuleGeometry(0.15, 0.22, 10, 24), stone, 0.46);
  // tripundra in sandal paste
  const ash = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.9 });
  for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.006, 4, 24, Math.PI * 0.55), ash); t.rotation.set(0, Math.PI / 2 - Math.PI * 0.275 + Math.PI / 2, 0); t.rotation.set(Math.PI / 2, 0, Math.PI * 0.225); t.position.y = 0.48 + i * 0.03; g.add(t); }
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc01010 })); dot.position.set(0, 0.52, 0.15); g.add(dot);
  // bilva leaves and flowers
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const f = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff8a10 : 0xffffff, roughness: 0.8 })); f.position.set(Math.sin(a) * 0.3, 0.29, Math.cos(a) * 0.3); g.add(f); }
  // copper kalash dripping water (abhishek)
  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M.copper); pot.position.y = 1.35; g.add(pot);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1.2, 4), M.brass); chain.position.y = 2.0; g.add(chain);
  const drip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.water); drip.position.y = 1.2; drip.userData.keep = true; g.add(drip);
  g.userData.drip = drip;
  return bakeGroup(g);
}

export function nandi() {
  const g = new THREE.Group();
  const stone = new THREE.MeshPhysicalMaterial({ color: 0x2a2826, roughness: 0.25, clearcoat: 0.6 });
  const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, mat = stone) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.BoxGeometry(0.5, 0.08, 0.8), 0, 0.04, 0);
  add(new THREE.SphereGeometry(0.22, 24, 16), 0, 0.28, -0.05, 1, 0.85, 1.6);
  add(new THREE.SphereGeometry(0.12, 16, 12), 0, 0.5, -0.05, 1, 0.9, 1.1);
  add(new THREE.SphereGeometry(0.13, 20, 14), 0, 0.42, 0.28, 0.85, 1.1, 1.0);
  add(new THREE.SphereGeometry(0.09, 16, 12), 0, 0.5, 0.42, 0.8, 1.0, 1.3);
  for (const s of [-1, 1]) {
    add(new THREE.ConeGeometry(0.025, 0.12, 8), s * 0.07, 0.64, 0.4, 1, 1, 1).rotation.z = -s * 0.5;
    add(new THREE.SphereGeometry(0.04, 8, 6), s * 0.11, 0.58, 0.37, 0.5, 1, 1);
    add(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), s * 0.13, 0.12, 0.15, 1, 1, 1).rotation.x = Math.PI / 2;
  }
  add(new THREE.TorusGeometry(0.13, 0.015, 6, 20), 0, 0.42, 0.2, 1, 1, 1, M.brass).rotation.x = 0.4;
  add(new THREE.SphereGeometry(0.03, 8, 6), 0, 0.33, 0.33, 1, 1, 1, M.brass);
  const cloth = add(new THREE.BoxGeometry(0.42, 0.02, 0.5), 0, 0.46, -0.08, 1, 1, 1, silk(0xc01018));
  cloth.rotation.x = 0.05;
  return bakeGroup(g);
}

// Brass samai (oil lamp) with flickering flames
export function samai(ctx, x, y, z, floor, h = 1.3) {
  const b = ctx.b;
  b.lathe([[0, 0], [0.18, 0], [0.2, 0.03], [0.08, 0.08], [0.05, 0.2], [0.06, 0.3], [0.025, 0.45], [0.03, h * 0.6], [0.02, h * 0.62], [0.025, h - 0.12], [0.16, h - 0.08], [0.18, h - 0.04], [0.0, h - 0.03]], M.brass, { pos: [x, y, z], seg: 32 });
  b.lathe([[0, 0], [0.012, 0], [0.04, 0.05], [0.0, 0.12]], M.goldPolish, { pos: [x, y + h - 0.03, z], seg: 12 });
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    flames.push(flame(ctx, x + Math.sin(a) * 0.15, y + h - 0.02, z + Math.cos(a) * 0.15));
  }
  ctx.light({ pos: [x, y + h + 0.15, z], floor, intensity: 4, distance: 5, color: 0xff9a40, flicker: 2, dayScale: 0.7 });
  ctx.physics.addCyl(x, z, 0.2, y, y + h);
  return flames;
}

// All diya flames share three instanced meshes (outer, core, glow billboard).
const FLAMES = { list: [], meshes: null, cap: 400 };
export function flame(ctx, x, y, z, s = 1) {
  const h = { x, y, z, s, visible: true, ph: Math.random() * 10 };
  if (!FLAMES.meshes) {
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.016 * (1 - t * 0.5), t * 0.06)); }
    const fg = new THREE.LatheGeometry(pts, 10);
    const gg = new THREE.PlaneGeometry(0.12, 0.16); gg.translate(0, 0.03, 0);
    const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, FLAMES.cap); m.count = 0; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); (ctx.dynRoot || ctx.dyn).add(m); return m; };
    FLAMES.meshes = { outer: mk(fg, M.flame), inner: mk(fg, M.flameCore), glow: mk(gg, M.glow) };
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), qi = new THREE.Quaternion();
    ctx.anim((dt, t, game) => {
      const { outer, inner, glow } = FLAMES.meshes;
      const camQ = game ? game.camera.quaternion : qi;
      let n = 0;
      for (const f of FLAMES.list) {
        if (!f.visible) continue;
        const k = 1 + Math.sin(t * 17 + f.ph) * 0.12 + Math.sin(t * 29 + f.ph * 2) * 0.08;
        p.set(f.x, f.y, f.z);
        e.set(0, 0, Math.sin(t * 7 + f.ph) * 0.08); q.setFromEuler(e);
        sc.set(f.s / Math.sqrt(k), f.s * k, f.s / Math.sqrt(k));
        mtx.compose(p, q, sc); outer.setMatrixAt(n, mtx);
        sc.multiplyScalar(0.5); sc.y *= 1.2; mtx.compose(p, q, sc); inner.setMatrixAt(n, mtx);
        sc.set(f.s, f.s, f.s); mtx.compose(p, camQ, sc); glow.setMatrixAt(n, mtx);
        n++;
      }
      outer.count = inner.count = glow.count = n;
      outer.instanceMatrix.needsUpdate = inner.instanceMatrix.needsUpdate = glow.instanceMatrix.needsUpdate = true;
    });
  }
  if (FLAMES.list.length < FLAMES.cap) FLAMES.list.push(h);
  return h;
}
