import * as THREE from 'three';
import { roundedBox, bakeGroup } from './builder.js';
import { M } from './materials.js';

// Animated doors that open as you approach. Hinged, double and sliding glass.
export class Doors {
  constructor(physics, audio) {
    this.physics = physics;
    this.audio = audio;
    this.list = [];
    this.group = new THREE.Group();
    this.group.name = 'doors';
  }

  // axis: 'x' (wall runs along X) or 'z'. (cx, cz) centre of opening, y0 floor.
  add({ kind = 'hinge', axis, cx, cz, y0, w, h, floor, mat = M.walnut, t = 0.055 }) {
    const d = { kind, axis, cx, cz, y0, w, h, floor, open: 0, target: 0, side: 1, panels: [], sound: 0 };
    const along = axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const makePanel = (pw, glass) => {
      const g = new THREE.Group();
      if (glass) {
        const frame = new THREE.Mesh(roundedBox(pw, h - 0.02, t, 0.01, 1), M.blackMetal);
        frame.scale.set(1, 1, 0.6);
        const pane = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.08, h - 0.1, 0.02), M.glass);
        g.add(frame, pane);
        frame.visible = false; // slim look: show only edges
        const edgeMat = M.blackMetal;
        for (const [ex, ey, ew, eh] of [[0, h / 2 - 0.03, pw, 0.06], [0, -h / 2 + 0.03, pw, 0.06], [-pw / 2 + 0.03, 0, 0.06, h], [pw / 2 - 0.03, 0, 0.06, h]]) {
          const e = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, 0.05), edgeMat); e.position.set(ex, ey, 0); e.castShadow = true; g.add(e);
        }
        const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.04), M.chrome); hdl.position.set(pw / 2 - 0.12, 0, 0.05); g.add(hdl);
      } else {
        const slab = new THREE.Mesh(roundedBox(pw, h - 0.02, t, 0.008, 1), mat);
        slab.castShadow = true; slab.receiveShadow = true;
        g.add(slab);
        // raised panels for a crafted look
        const rows = h > 2.8 ? 3 : 2;
        for (let i = 0; i < rows; i++) {
          const ph = (h - 0.4) / rows - 0.12;
          const py = -h / 2 + 0.2 + (i + 0.5) * ((h - 0.4) / rows);
          for (const s of [1, -1]) {
            const p = new THREE.Mesh(roundedBox(pw - 0.22, ph, 0.02, 0.008, 1), mat);
            p.position.set(0, py, s * (t / 2 + 0.004)); g.add(p);
          }
        }
        for (const s of [1, -1]) {
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), M.brass);
          knob.position.set(pw / 2 - 0.09, -0.12, s * 0.06); g.add(knob);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.01), M.brass);
          plate.position.set(pw / 2 - 0.09, -0.12, s * 0.035); g.add(plate);
        }
      }
      return bakeGroup(g);
    };

    const origin = new THREE.Vector3(cx, y0 + h / 2, cz);
    const base = axis === 'x' ? 0 : -Math.PI / 2;
    if (kind === 'slide') {
      for (const s of [-1, 1]) {
        const pw = w / 2 + 0.04;
        const p = makePanel(pw, true);
        const pivot = new THREE.Group();
        pivot.position.copy(origin).addScaledVector(along, s * w / 4);
        pivot.rotation.y = base;
        pivot.add(p);
        this.group.add(pivot);
        d.panels.push({ pivot, s, home: pivot.position.clone(), along, pw });
      }
    } else {
      const n = kind === 'double' || kind === 'main' ? 2 : 1;
      const pw = w / n;
      for (let i = 0; i < n; i++) {
        const s = i === 0 ? -1 : 1; // hinge on the -along end (s=-1) or +along end
        const p = makePanel(pw, false);
        p.position.x = -s * pw / 2;  // panel extends from hinge toward the centre
        const pivot = new THREE.Group();
        pivot.position.copy(origin).addScaledVector(along, s * w / 2);
        pivot.rotation.y = base;
        pivot.add(p);
        this.group.add(pivot);
        d.panels.push({ pivot, s, base });
      }
    }
    // collider while closed
    const th = 0.12;
    d.box = axis === 'x'
      ? this.physics.addBox(cx - w / 2, y0, cz - th / 2, cx + w / 2, y0 + h, cz + th / 2)
      : this.physics.addBox(cx - th / 2, y0, cz - w / 2, cx + th / 2, y0 + h, cz + w / 2);
    this.list.push(d);
    return d;
  }

  update(dt, p) {
    for (const d of this.list) {
      const dx = p.x - d.cx, dz = p.z - d.cz;
      const near = Math.abs(p.y - d.y0) < 1.5 && dx * dx + dz * dz < (d.kind === 'main' ? 9 : 4.4);
      if (near && d.target === 0) {
        // swing away from the player
        d.side = (d.axis === 'x' ? dz : dx) > 0 ? 1 : -1;
        d.target = 1;
        if (this.audio) this.audio.door(d.kind === 'slide');
      } else if (!near && d.target === 1) d.target = 0;
      const k = d.target ? 5 : 3;
      d.open += (d.target - d.open) * (1 - Math.exp(-k * dt));
      if (d.kind === 'slide') {
        for (const pn of d.panels) pn.pivot.position.copy(pn.home).addScaledVector(pn.along, pn.s * d.open * (pn.pw * 0.92));
      } else {
        const ang = d.open * 1.45;
        for (const pn of d.panels) {
          // for a hinge at -along end, positive rotation swings the panel toward -perp
          const dir = d.axis === 'x' ? d.side : -d.side;
          pn.pivot.rotation.y = pn.base + ang * dir * (pn.s === -1 ? 1 : -1);
        }
      }
      d.box.enabled = d.open < 0.3;
    }
  }
}
