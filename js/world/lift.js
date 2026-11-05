import * as THREE from 'three';
import { LIFT, STAIR, FLOORS, floorY, FH } from '../config.js';
import { M } from './materials.js';
import { tube } from './builder.js';

// A cylindrical glass lift running through the centre of the spiral stair.
export class Lift {
  constructor(scene, physics, audio) {
    this.audio = audio;
    this.y = 0;
    this.v = 0;
    this.floor = 0;
    this.target = 0;
    this.doors = 0;         // 0 closed .. 1 open
    this.doorTarget = 0;
    this.state = 'idle';
    this.idleTime = 0;
    this.queue = [];
    this.dy = 0;
    this.top = floorY(4);
    this.listeners = new Set();

    const g = this.group = new THREE.Group();
    g.name = 'lift';
    scene.add(g);
    const R = LIFT.shaftR;
    const H = this.top + 3.4;

    // ---- shaft (static)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true), M.glassTint);
    shaft.position.y = H / 2; shaft.renderOrder = 2;
    g.add(shaft);
    const shaftFrame = new THREE.Group();
    for (let n = 0; n <= 4; n++) {
      for (const dy of [0.02, 2.62]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.01, 0.035, 8, 72), M.brass);
        ring.rotation.x = Math.PI / 2; ring.position.y = floorY(n) + dy;
        shaftFrame.add(ring);
      }
    }
    for (let i = 0; i < 6; i++) {
      const a = LIFT.doorHalf + 0.02 + i * (Math.PI * 2 - 2 * LIFT.doorHalf - 0.04) / 5;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, H, 8), M.brass);
      post.position.set(Math.sin(a) * (R + 0.01), H / 2, Math.cos(a) * (R + 0.01));
      shaftFrame.add(post);
    }
    // crown (machine room cover) under the pavilion dome
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.35, 48), M.gold);
    crown.position.y = H + 0.1; shaftFrame.add(crown);
    g.add(shaftFrame);

    // landing doors: curved glass leaves that slide around the shaft
    this.landingDoors = [];
    for (let n = 0; n <= 4; n++) {
      const leaves = [];
      for (const s of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 2.55, 24, 1, true, s < 0 ? -LIFT.doorHalf : 0, LIFT.doorHalf), M.glassFrost);
        leaf.position.y = floorY(n) + 0.05 + 1.275;
        const pivot = new THREE.Group(); pivot.add(leaf); g.add(pivot);
        const edge = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.55, 6), M.brass);
        const ea = s < 0 ? -0.01 : 0.01;
        edge.position.set(Math.sin(ea) * (R + 0.03), leaf.position.y, Math.cos(ea) * (R + 0.03));
        pivot.add(edge);
        leaves.push({ pivot, s });
      }
      this.landingDoors.push(leaves);
      // floor number plate above the door
      const plate = makePlate(FLOORS[n].short);
      plate.position.set(0, floorY(n) + 2.82, R + 0.06);
      g.add(plate);
    }

    // ---- cabin (moves)
    const cab = this.cabin = new THREE.Group();
    const r = LIFT.r;
    const floorDisc = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.12, 64), M.marbleBlack);
    floorDisc.position.y = -0.06; floorDisc.receiveShadow = true; cab.add(floorDisc);
    const inlay = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.52, 64), M.gold); inlay.rotation.x = -Math.PI / 2; inlay.position.y = 0.002; cab.add(inlay);
    const ceil = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.14, 64), M.gold);
    ceil.position.y = 2.72; cab.add(ceil);
    const light = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.9, 64), M.ledStrip); light.rotation.x = Math.PI / 2; light.position.y = 2.645; cab.add(light);
    const gap = LIFT.doorHalf + 0.02;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 2.58, 64, 1, true, gap, Math.PI * 2 - 2 * gap), M.glassRail);
    wall.position.y = 1.35; cab.add(wall);
    for (const y of [0.04, 0.95, 2.64]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, y === 0.95 ? 0.022 : 0.03, 8, 72, Math.PI * 2 - 2 * gap), y === 0.95 ? M.chrome : M.gold);
      t.rotation.x = Math.PI / 2; t.rotation.z = -Math.PI / 2 + gap; t.position.y = y;
      if (y === 0.95) t.scale.setScalar(0.96);
      cab.add(t);
    }
    for (const a of [gap, -gap]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.66, 10), M.gold);
      post.position.set(Math.sin(a) * r, 1.33, Math.cos(a) * r); cab.add(post);
    }
    // control panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.03), M.blackMetal);
    const pa = gap + 0.2;
    panel.position.set(Math.sin(pa) * (r - 0.04), 1.2, Math.cos(pa) * (r - 0.04)); panel.rotation.y = pa + Math.PI;
    cab.add(panel);
    for (let i = 0; i < 5; i++) {
      const btn = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), M.lampWarm);
      btn.position.set(0, -0.16 + i * 0.08, 0.017); btn.rotation.y = Math.PI * 0; panel.add(btn);
    }
    // cabin door leaves
    this.cabDoors = [];
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.02, r + 0.02, 2.56, 24, 1, true, s < 0 ? -LIFT.doorHalf : 0, LIFT.doorHalf), M.glassRail);
      leaf.position.y = 1.32;
      const pivot = new THREE.Group(); pivot.add(leaf); cab.add(pivot);
      const e = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.56, 6), M.gold);
      const ea = s < 0 ? -0.01 : 0.01; e.position.set(Math.sin(ea) * (r + 0.02), 1.32, Math.cos(ea) * (r + 0.02)); pivot.add(e);
      this.cabDoors.push({ pivot, s });
    }
    // cables
    for (const a of [1.2, 3.3, 5.2]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 4), M.steel);
      c.position.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
      c.userData.cable = true; cab.add(c);
    }
    this.cables = cab.children.filter((c) => c.userData.cable);
    this.cabLight = new THREE.PointLight(0xffd6a0, 6, 5, 2);
    this.cabLight.position.y = 2.3; cab.add(this.cabLight);
    g.add(cab);

    // ---- physics
    physics.addDisc(STAIR.cx, STAIR.cz, R - 0.02, () => this.y, 0.25, 'lift');
    physics.addDisc(STAIR.cx, STAIR.cz, R - 0.02, () => this.y + 2.95, 0.2, 'lift');
    const gaps = [];
    for (let n = 0; n <= 4; n++) gaps.push({ a0: -LIFT.doorHalf + 0.06, a1: LIFT.doorHalf - 0.06, y0: floorY(n) - 0.5, y1: floorY(n) + 0.5, open: () => this.doors > 0.7 && Math.abs(this.y - floorY(n)) < 0.04 });
    physics.addArc(STAIR.cx, STAIR.cz, R, -1, H, gaps);
    this.update(0);
  }

  on(fn) { this.listeners.add(fn); }
  emit() { for (const f of this.listeners) f(this); }

  currentFloor() { return Math.max(0, Math.min(4, Math.round(this.y / FH))); }

  call(n) {
    if (this.state === 'idle' && Math.abs(this.y - floorY(n)) < 0.02) { this.doorTarget = 1; this.idleTime = 0; if (this.doors < 0.5) this.audio?.liftDoor(); return; }
    if (!this.queue.includes(n) && this.target !== n) this.queue.push(n);
    this.emit();
  }

  go(n) { this.call(n); }

  update(dt, playerInside = false) {
    const prevY = this.y;
    if (this.state === 'idle') {
      this.idleTime += dt;
      if (this.queue.length) {
        this.target = this.queue.shift();
        if (Math.abs(this.y - floorY(this.target)) < 0.02) { this.doorTarget = 1; }
        else { this.state = 'closing'; this.doorTarget = 0; if (this.doors > 0.1) this.audio?.liftDoor(); }
        this.emit();
      } else if (this.doors > 0.95 && this.idleTime > 7 && !playerInside) { this.doorTarget = 0; }
    }
    if (this.state === 'closing' && this.doors < 0.02) { this.state = 'moving'; this.audio?.liftHum(true); this.emit(); }
    if (this.state === 'moving') {
      const ty = floorY(this.target);
      const d = ty - this.y, dir = Math.sign(d);
      const vmax = 2.6, acc = 1.6;
      const stopDist = (this.v * this.v) / (2 * acc);
      if (Math.abs(d) <= stopDist + 0.01) this.v = Math.max(0.12, Math.abs(this.v) - acc * dt) * dir;
      else this.v = Math.min(vmax, Math.abs(this.v) + acc * dt) * dir;
      this.y += this.v * dt;
      if ((dir > 0 && this.y >= ty) || (dir < 0 && this.y <= ty) || Math.abs(d) < 0.005) {
        this.y = ty; this.v = 0; this.state = 'opening'; this.doorTarget = 1; this.idleTime = 0;
        this.audio?.liftHum(false); this.audio?.ding(); this.audio?.liftDoor();
        this.emit();
      }
    }
    if (this.state === 'opening' && this.doors > 0.98) { this.state = 'idle'; this.idleTime = 0; this.emit(); }

    const speed = this.doorTarget > this.doors ? 1.4 : 1.6;
    this.doors += Math.sign(this.doorTarget - this.doors) * Math.min(Math.abs(this.doorTarget - this.doors), speed * dt);
    this.dy = this.y - prevY;

    // visuals
    this.cabin.position.y = this.y;
    const open = smooth(this.doors) * (LIFT.doorHalf * 1.85);
    for (const d of this.cabDoors) d.pivot.rotation.y = d.s < 0 ? -open : open;
    const fl = this.currentFloor();
    for (let n = 0; n <= 4; n++) {
      const here = Math.abs(this.y - floorY(n)) < 0.04;
      const o = here ? open : 0;
      for (const d of this.landingDoors[n]) d.pivot.rotation.y = d.s < 0 ? -o : o;
    }
    for (const c of this.cables) { const len = this.top + 3.3 - (this.y + 2.8); c.scale.y = Math.max(0.01, len); c.position.y = 2.8 + len / 2; }
    this.floor = fl;
  }
}

function smooth(t) { return t * t * (3 - 2 * t); }

function makePlate(text) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#1a120a'; g.fillRect(0, 0, 128, 64);
  g.strokeStyle = '#d9a54a'; g.lineWidth = 4; g.strokeRect(3, 3, 122, 58);
  g.fillStyle = '#ffcf7a'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 64, 35);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6 }));
  return m;
}
