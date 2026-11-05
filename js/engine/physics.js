// Lightweight character physics: vertical-cylinder player against axis-aligned boxes,
// cylinders and curved walls, standing on walkable surfaces (slabs, ramps, the spiral
// stair and the moving lift floor).

const BOX_STEP = 0.12;   // boxes lower than this above the feet do not block

export class Physics {
  constructor() {
    this.boxes = [];
    this.cyls = [];
    this.arcs = [];
    this.surfaces = [];
    this.cell = 4;
    this.grid = new Map();
    this._buf = [];
  }

  // ---------- obstacles ----------
  addBox(x0, y0, z0, x1, y1, z1, opts = {}) {
    const b = {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1),
      y0: Math.min(y0, y1), y1: Math.max(y0, y1),
      z0: Math.min(z0, z1), z1: Math.max(z0, z1),
      enabled: true, cam: opts.cam ?? false, tag: opts.tag || null,
    };
    this.boxes.push(b);
    this._index(b);
    return b;
  }
  // centre/size helper
  addBoxC(x, y, z, w, h, d, opts) { return this.addBox(x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2, opts); }

  // a box rotated about Y is approximated by its bounding box of a thinner footprint
  addBoxRot(x, y, z, w, h, d, rot, opts) {
    const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot));
    const W = w * c + d * s, D = w * s + d * c;
    return this.addBoxC(x, y, z, W * 0.92, h, D * 0.92, opts);
  }

  addCyl(cx, cz, r, y0, y1) { const c = { cx, cz, r, y0, y1, enabled: true }; this.cyls.push(c); return c; }

  // Curved wall of radius R. gaps: [{a0, a1, y0, y1, open: () => bool}] angles atan2(dx, dz)
  addArc(cx, cz, R, y0, y1, gaps = [], opts = {}) {
    const a = { cx, cz, R, y0, y1, gaps, enabled: true, cam: opts.cam ?? false };
    this.arcs.push(a);
    return a;
  }

  _index(b) {
    const c = this.cell;
    for (let gx = Math.floor(b.x0 / c); gx <= Math.floor(b.x1 / c); gx++)
      for (let gz = Math.floor(b.z0 / c); gz <= Math.floor(b.z1 / c); gz++) {
        const k = gx * 100003 + gz;
        let list = this.grid.get(k);
        if (!list) this.grid.set(k, (list = []));
        list.push(b);
      }
  }

  _near(x, z, r) {
    const c = this.cell, out = this._buf; out.length = 0;
    const seen = this._seen || (this._seen = new Set()); seen.clear();
    for (let gx = Math.floor((x - r) / c); gx <= Math.floor((x + r) / c); gx++)
      for (let gz = Math.floor((z - r) / c); gz <= Math.floor((z + r) / c); gz++) {
        const list = this.grid.get(gx * 100003 + gz);
        if (!list) continue;
        for (const b of list) if (!seen.has(b)) { seen.add(b); out.push(b); }
      }
    return out;
  }

  // ---------- walkable surfaces ----------
  addRect(x0, z0, x1, z1, top, thick = 0.3, tag = 'stone', hole = null) {
    const s = {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), top, thick, tag, hole, enabled: true,
      sample(x, z, out) {
        if (!this.enabled || x < this.x0 || x > this.x1 || z < this.z0 || z > this.z1) return;
        const h = this.hole;
        if (h && (x - h.cx) ** 2 + (z - h.cz) ** 2 < h.r * h.r) return;
        out.push(this.top, this.top - this.thick, this.tag);
      },
    };
    this.surfaces.push(s);
    return s;
  }

  // Linear ramp: height goes y0 -> y1 along +axis between the rect bounds.
  addRamp(x0, z0, x1, z1, axis, y0, y1, tag = 'stone', thick = 0.3) {
    const s = {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1),
      sample(x, z, out) {
        if (x < this.x0 || x > this.x1 || z < this.z0 || z > this.z1) return;
        const t = axis === 'x' ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
        const h = y0 + (y1 - y0) * Math.min(1, Math.max(0, t));
        out.push(h, h - thick, tag);
      },
    };
    this.surfaces.push(s);
    return s;
  }

  // Spiral stair with flat landings at every floor. turnRise per full turn.
  addSpiral({ cx, cz, rIn, rOut, landing, turnRise, turns, baseY = 0, tag = 'marble' }) {
    const TAU = Math.PI * 2;
    const span = TAU - 2 * landing;
    const s = {
      sample(x, z, out) {
        const dx = x - cx, dz = z - cz;
        const r = Math.hypot(dx, dz);
        if (r < rIn || r > rOut) return;
        let th = Math.atan2(dx, dz); if (th < 0) th += TAU; // 0..2PI
        for (let k = 0; k <= turns; k++) {
          const yk = baseY + k * turnRise;
          // landing belonging to floor k (two halves: th<=landing and th>=TAU-landing)
          if (th <= landing || th >= TAU - landing) { out.push(yk, yk - 0.25, tag); }
          else if (k < turns) {
            const h = yk + turnRise * (th - landing) / span;
            out.push(h, h - 0.28, tag);
          }
        }
      },
    };
    this.surfaces.push(s);
    return s;
  }

  addDisc(cx, cz, r, getTop, thick = 0.2, tag = 'metal') {
    const s = {
      enabled: true,
      sample(x, z, out) {
        if (!this.enabled) return;
        if ((x - cx) ** 2 + (z - cz) ** 2 > r * r) return;
        const t = getTop();
        out.push(t, t - thick, tag);
      },
    };
    this.surfaces.push(s);
    return s;
  }

  // ---------- queries ----------
  // Returns {ground, tag, ceil} for a point and feet height.
  probe(x, z, y, stepUp = 0.42) {
    const buf = this._sbuf || (this._sbuf = []);
    buf.length = 0;
    for (const s of this.surfaces) s.sample(x, z, buf);
    let ground = -1e9, tag = null, ceil = 1e9;
    for (let i = 0; i < buf.length; i += 3) {
      const top = buf[i], bottom = buf[i + 1];
      if (top <= y + stepUp + 1e-4) { if (top > ground) { ground = top; tag = buf[i + 2]; } }
      else if (bottom < ceil) ceil = bottom;
    }
    return { ground, tag, ceil };
  }

  // Can a body of `height` stand with feet at y (or the ground it would step onto) at x,z?
  fits(x, z, y, height, stepUp = 0.42) {
    const p = this.probe(x, z, y, stepUp);
    const base = Math.max(y, p.ground);
    return p.ceil - base >= height - 0.02;
  }

  // Push a circle (player) out of all obstacles. prev = previous position (for arcs).
  resolve(pos, radius, height, prev) {
    const y = pos.y;
    for (let iter = 0; iter < 2; iter++) {
      const near = this._near(pos.x, pos.z, radius + 0.5);
      for (const b of near) {
        if (!b.enabled) continue;
        if (b.y1 <= y + BOX_STEP || b.y0 >= y + height) continue;
        const cx = Math.max(b.x0, Math.min(pos.x, b.x1));
        const cz = Math.max(b.z0, Math.min(pos.z, b.z1));
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2), push = radius - d;
          pos.x += (dx / d) * push; pos.z += (dz / d) * push;
        } else {
          // centre inside the box: push out along the smallest penetration
          const px0 = pos.x - b.x0, px1 = b.x1 - pos.x, pz0 = pos.z - b.z0, pz1 = b.z1 - pos.z;
          const m = Math.min(px0, px1, pz0, pz1);
          if (m === px0) pos.x = b.x0 - radius; else if (m === px1) pos.x = b.x1 + radius;
          else if (m === pz0) pos.z = b.z0 - radius; else pos.z = b.z1 + radius;
        }
      }
      for (const c of this.cyls) {
        if (!c.enabled || c.y1 <= y + BOX_STEP || c.y0 >= y + height) continue;
        const dx = pos.x - c.cx, dz = pos.z - c.cz, d = Math.hypot(dx, dz), m = c.r + radius;
        if (d < m && d > 1e-6) { pos.x = c.cx + (dx / d) * m; pos.z = c.cz + (dz / d) * m; }
      }
      for (const a of this.arcs) {
        if (!a.enabled || a.y1 <= y + BOX_STEP || a.y0 >= y + height) continue;
        const dx = pos.x - a.cx, dz = pos.z - a.cz, d = Math.hypot(dx, dz);
        if (Math.abs(d - a.R) >= radius) continue;
        let th = Math.atan2(dx, dz);
        let inGap = false;
        for (const g of a.gaps) {
          if (y < g.y0 || y > g.y1) continue;
          if (g.open && !g.open()) continue;
          if (angleIn(th, g.a0, g.a1)) { inGap = true; break; }
        }
        if (inGap) continue;
        const pd = prev ? Math.hypot(prev.x - a.cx, prev.z - a.cz) : d;
        const inside = pd < a.R;
        const target = inside ? a.R - radius : a.R + radius;
        if (d > 1e-6) { pos.x = a.cx + (dx / d) * target; pos.z = a.cz + (dz / d) * target; }
      }
    }
  }

  // Ray against camera-blocking boxes and slabs. Returns hit distance or Infinity.
  raycast(o, d, maxDist) {
    let best = maxDist;
    const test = (x0, y0, z0, x1, y1, z1) => {
      let tmin = 0, tmax = best;
      for (let ax = 0; ax < 3; ax++) {
        const oo = ax === 0 ? o.x : ax === 1 ? o.y : o.z;
        const dd = ax === 0 ? d.x : ax === 1 ? d.y : d.z;
        const lo = ax === 0 ? x0 : ax === 1 ? y0 : z0;
        const hi = ax === 0 ? x1 : ax === 1 ? y1 : z1;
        if (Math.abs(dd) < 1e-9) { if (oo < lo || oo > hi) return Infinity; continue; }
        let t1 = (lo - oo) / dd, t2 = (hi - oo) / dd;
        if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return Infinity;
      }
      return tmin;
    };
    for (const b of this.boxes) {
      if (!b.enabled || !b.cam) continue;
      const t = test(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1);
      if (t < best) best = t;
    }
    for (const s of this.surfaces) {
      if (s.x0 === undefined || s.thick === undefined || s.enabled === false) continue;
      const t = test(s.x0, s.top - s.thick, s.z0, s.x1, s.top, s.z1);
      if (t < best) {
        if (s.hole) {
          const hx = o.x + d.x * t, hz = o.z + d.z * t;
          if ((hx - s.hole.cx) ** 2 + (hz - s.hole.cz) ** 2 < s.hole.r * s.hole.r) continue;
        }
        best = t;
      }
    }
    return best;
  }
}

export function angleIn(th, a0, a1) {
  const TAU = Math.PI * 2;
  const n = (v) => ((v % TAU) + TAU) % TAU;
  const t = n(th), s = n(a0), e = n(a1);
  return s <= e ? t >= s && t <= e : t >= s || t <= e;
}
