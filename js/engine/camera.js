import * as THREE from 'three';
import { clamp, damp } from '../util/noise.js';

// Third-person orbit camera with wall avoidance, plus first-person and cinematic modes.
export class FollowCamera {
  constructor(camera, physics) {
    this.cam = camera;
    this.physics = physics;
    this.yaw = Math.PI;      // camera looks along -Z by default (behind a player facing -Z)
    this.pitch = 0.18;
    this.dist = 4.2;
    this.targetDist = 4.2;
    this.curDist = 4.2;
    this.firstPerson = false;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.override = null;    // {pos, look} for seated framing
    this.sens = 0.0042;
    this._d = new THREE.Vector3();
    this._o = new THREE.Vector3();
    this.initialized = false;
  }

  applyInput(look, zoom) {
    this.yaw -= look.dx * this.sens;
    this.pitch = clamp(this.pitch + look.dy * this.sens, -1.1, 1.25);
    if (zoom) {
      this.targetDist = clamp(this.targetDist + zoom * 0.45, 1.2, 9);
      if (this.firstPerson && zoom > 0) this.firstPerson = false;
    }
  }

  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  update(dt, focus, ceiling) {
    // focus: world point near the head
    if (!this.initialized) { this.smoothTarget.copy(focus); this.initialized = true; }
    this.smoothTarget.x = damp(this.smoothTarget.x, focus.x, 18, dt);
    this.smoothTarget.z = damp(this.smoothTarget.z, focus.z, 18, dt);
    this.smoothTarget.y = damp(this.smoothTarget.y, focus.y, 10, dt);
    const t = this.smoothTarget;

    if (this.override) {
      const o = this.override;
      this.cam.position.lerp(o.pos, 1 - Math.exp(-4 * dt));
      this._o.lerp(o.look, 1 - Math.exp(-5 * dt));
      this.cam.lookAt(this._o);
      return;
    }
    this._o.copy(t);

    if (this.firstPerson) {
      this.cam.position.copy(t);
      const dir = this._d.set(-Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
      this.cam.lookAt(t.x + dir.x, t.y + dir.y, t.z + dir.z);
      return;
    }

    const dir = this._d.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    // keep the camera under the ceiling indoors
    let want = this.targetDist;
    const hit = this.physics.raycast(t, dir, want + 0.3);
    if (hit < want + 0.3) want = Math.max(0.35, hit - 0.3);
    // shrink quickly, grow slowly
    this.curDist = want < this.curDist ? damp(this.curDist, want, 30, dt) : damp(this.curDist, want, 3, dt);
    const p = this.cam.position.set(t.x + dir.x * this.curDist, t.y + dir.y * this.curDist, t.z + dir.z * this.curDist);
    if (ceiling !== undefined && p.y > ceiling - 0.25) p.y = ceiling - 0.25;
    this.cam.lookAt(t.x, t.y - 0.05, t.z);
  }
}
