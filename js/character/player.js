import * as THREE from 'three';
import { Animator } from './animator.js';
import { dampAngle } from '../util/noise.js';

const G = 15, JUMP = 5.4, WALK = 2.1, RUN = 5.6, STEP = 0.42;

export class Player {
  constructor(avatar, physics) {
    this.avatar = avatar;
    this.anim = new Animator(avatar);
    this.physics = physics;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = Math.PI;
    this.grounded = true;
    this.groundTag = 'stone';
    this.radius = 0.27;
    this.height = 1.72;
    this.seat = null;
    this.emote = null;
    this.inWater = false;
    this.waterY = -Infinity;
    this.stepDist = 0;
    this.turn = 0;
    this.ceil = 1e9;
    this.frozen = false;
    this.onStep = null;
    this.onLand = null;
  }

  place(x, y, z, yaw) {
    this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.yaw = yaw ?? this.yaw; this.grounded = true;
    this.seat = null; this.emote = null;
    const p = this.physics.probe(x, z, y + 0.5, STEP);
    if (p.ground > -1e8) this.pos.y = p.ground;
    this.sync(0, true);
  }

  sit(seat) {
    this.seat = seat;
    this.emote = null;
    this.vel.set(0, 0, 0);
    this.prevPos = this.pos.clone();
  }

  stand() {
    const s = this.seat;
    if (!s) return;
    this.seat = null;
    const ex = s.exit || [s.pos[0] + Math.sin(s.yaw) * 0.75, s.pos[2] + Math.cos(s.yaw) * 0.75];
    const y = s.floorY ?? this.pos.y;
    const p = this.physics.probe(ex[0], ex[1], y + 0.6, STEP + 0.2);
    this.pos.set(ex[0], p.ground > -1e8 ? p.ground : y, ex[1]);
    this.grounded = true;
  }

  update(dt, input, camYaw, lift) {
    const ph = this.physics;
    if (this.seat) {
      const s = this.seat;
      const sp = typeof s.getPos === 'function' ? s.getPos() : s.pos;
      this.pos.set(sp[0], sp[1], sp[2]);
      this.yaw = dampAngle(this.yaw, s.getYaw ? s.getYaw() : s.yaw, 10, dt);
      this.sync(dt);
      return;
    }

    // ---- desired horizontal velocity
    const ax = input.moveAxis();
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let dx = rx * ax.x + fx * ax.y, dz = rz * ax.x + fz * ax.y;
    const mag = Math.hypot(dx, dz);
    const running = input.sprinting();
    let maxSpeed = (running ? RUN : WALK) * Math.min(1, mag);
    if (this.inWater) maxSpeed *= 0.45;
    if (this.frozen) maxSpeed = 0;
    if (mag > 0.01) { dx /= mag; dz /= mag; this.emote = null; }
    const tx = dx * maxSpeed, tz = dz * maxSpeed;
    const accel = this.grounded ? (mag > 0.01 ? 14 : 18) : 3;
    this.vel.x += (tx - this.vel.x) * (1 - Math.exp(-accel * dt));
    this.vel.z += (tz - this.vel.z) * (1 - Math.exp(-accel * dt));

    // ---- facing
    if (mag > 0.01 && !this.frozen) {
      const target = Math.atan2(dx, dz);
      const before = this.yaw;
      this.yaw = dampAngle(this.yaw, target, running ? 9 : 11, dt);
      let dy = this.yaw - before; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.turn += (dy / Math.max(dt, 1e-4) - this.turn) * (1 - Math.exp(-6 * dt));
    } else this.turn *= Math.exp(-6 * dt);

    // ---- jump
    if (input.hit('Space') && this.grounded && !this.frozen) {
      this.vel.y = this.inWater ? 3.2 : JUMP;
      this.grounded = false;
      this.emote = null;
      this.onJump && this.onJump();
    }

    // ---- carried by the lift
    if (this.grounded && this.groundTag === 'lift' && lift) this.pos.y += lift.dy;

    // ---- horizontal move with collision
    const old = this.pos.clone();
    const sub = Math.max(1, Math.ceil(Math.hypot(this.vel.x, this.vel.z) * dt / 0.12));
    for (let i = 0; i < sub; i++) {
      const sx = this.pos.x, sz = this.pos.z;
      this.pos.x += this.vel.x * dt / sub;
      this.pos.z += this.vel.z * dt / sub;
      ph.resolve(this.pos, this.radius, this.height, { x: sx, z: sz });
      if (!ph.fits(this.pos.x, this.pos.z, this.pos.y, this.height, STEP)) {
        // try sliding along one axis at a time
        const nx = this.pos.x, nz = this.pos.z;
        this.pos.x = nx; this.pos.z = sz;
        if (!ph.fits(this.pos.x, this.pos.z, this.pos.y, this.height, STEP)) {
          this.pos.x = sx; this.pos.z = nz;
          if (!ph.fits(this.pos.x, this.pos.z, this.pos.y, this.height, STEP)) { this.pos.x = sx; this.pos.z = sz; }
        }
      }
    }
    const moved = Math.hypot(this.pos.x - old.x, this.pos.z - old.z);

    // ---- vertical
    let pr = ph.probe(this.pos.x, this.pos.z, this.pos.y, STEP);
    if (this.grounded) {
      if (pr.ground > -1e8 && pr.ground >= this.pos.y - 0.5 && pr.ground <= this.pos.y + STEP) {
        this.pos.y = pr.ground; this.vel.y = 0; this.groundTag = pr.tag;
      } else this.grounded = false;
    }
    if (!this.grounded) {
      this.vel.y -= G * dt * (this.inWater ? 0.35 : 1);
      if (this.inWater) this.vel.y *= Math.exp(-2.5 * dt);
      this.pos.y += this.vel.y * dt;
      pr = ph.probe(this.pos.x, this.pos.z, this.pos.y, Math.max(0.05, -this.vel.y * dt + 0.05));
      if (pr.ground > -1e8 && this.pos.y <= pr.ground) {
        const v = this.vel.y;
        this.pos.y = pr.ground; this.vel.y = 0; this.grounded = true; this.groundTag = pr.tag;
        this.anim.landed(v);
        this.onLand && this.onLand(v, pr.tag);
      }
      if (this.pos.y + this.height > pr.ceil && this.vel.y > 0) { this.pos.y = pr.ceil - this.height; this.vel.y = 0; }
    }
    this.ceil = pr.ceil;
    if (this.pos.y < -30) this.onFall && this.onFall();

    // water
    this.inWater = this.pos.y < this.waterY - 0.4;

    // footsteps
    if (this.grounded && moved > 0.0005) {
      this.stepDist += moved;
      const stride = running ? 1.0 : 0.72;
      if (this.stepDist > stride) { this.stepDist = 0; this.onStep && this.onStep(this.groundTag, running, this.inWater); }
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.sync(dt);
  }

  sync(dt, snap = false) {
    this.avatar.root.position.copy(this.pos);
    this.avatar.root.rotation.y = this.yaw;
    const s = this.seat;
    const mode = s ? s.mode : this.emote ? 'emote:' + this.emote : this.inWater ? 'swim' : 'walk';
    this.anim.update(dt, {
      mode, speed: s ? 0 : this.speed || 0, grounded: this.grounded, vy: this.vel.y, turn: this.turn,
      seatH: s ? (s.seatH ?? 0.45) : 0, snap, lookYaw: this.lookYaw,
    });
  }

  headPos(out) {
    return out.set(this.pos.x, this.pos.y + this.height * this.avatar.look.height * 0.92, this.pos.z);
  }
}
