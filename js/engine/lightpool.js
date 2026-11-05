import * as THREE from 'three';

// A fixed number of point lights reassigned to the light fixtures nearest the
// viewer. Keeping the count constant avoids shader recompiles.
export class LightPool {
  constructor(scene, count = 8) {
    this.lights = [];
    this.anchors = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffd2a0, 0, 9, 2);
      l.userData = { anchor: null, target: 0 };
      scene.add(l);
      this.lights.push(l);
    }
    this.timer = 0;
    this.nightBoost = 1;
    this.t = 0;
  }

  // a: {pos:[x,y,z], color, intensity, distance, floor, flicker}
  add(a) { this.anchors.push({ color: 0xffd2a0, intensity: 18, distance: 9, flicker: 0, ...a, v: new THREE.Vector3(...a.pos) }); }

  update(dt, viewer, floor, outdoors, night) {
    this.t += dt;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.25;
      const cand = [];
      for (const a of this.anchors) {
        if (a.night && night < 0.3) continue;
        const sameFloor = a.floor === floor || (a.floor === 'ext' && (outdoors || night > 0.3));
        if (!sameFloor && !(a.floor === floor + 1 || a.floor === floor - 1)) continue;
        let d = a.v.distanceToSquared(viewer);
        if (!sameFloor) d += 400;
        cand.push([d, a]);
      }
      cand.sort((p, q) => p[0] - q[0]);
      const chosen = cand.slice(0, this.lights.length).map((c) => c[1]);
      // keep lights already bound to a chosen anchor
      const free = [];
      for (const l of this.lights) {
        const idx = chosen.indexOf(l.userData.anchor);
        if (idx >= 0) chosen[idx] = null; else free.push(l);
      }
      for (const a of chosen) {
        if (!a) continue;
        const l = free.shift(); if (!l) break;
        l.userData.anchor = a;
        l.position.copy(a.v); l.color.set(a.color); l.distance = a.distance;
        l.intensity = 0;
      }
      for (const l of free) l.userData.anchor = null;
    }
    const k = 1 - Math.exp(-6 * dt);
    for (const l of this.lights) {
      const a = l.userData.anchor;
      let target = 0;
      if (a) {
        target = a.intensity * (a.dayScale !== undefined ? a.dayScale + (1 - a.dayScale) * night : 0.55 + 0.45 * night);
        if (a.flicker) target *= 1 + Math.sin(this.t * 13 + a.v.x * 3) * 0.06 * a.flicker + Math.sin(this.t * 31 + a.v.z) * 0.04 * a.flicker;
        if (a.on === false) target = 0;
      }
      l.intensity += (target - l.intensity) * k;
      l.visible = true;
    }
  }
}
