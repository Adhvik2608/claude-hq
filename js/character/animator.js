// Procedural animation for the Avatar: locomotion, jumping, sitting, lying,
// playing instruments and emotes, all blended smoothly.

const JOINTS = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'thighL', 'thighR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'fingersL', 'fingersR'];

export class Animator {
  constructor(avatar) {
    this.av = avatar;
    this.t = 0;
    this.phase = 0;
    this.blinkT = 2;
    this.blink = 0;
    this.land = 0;
    this.strike = { L: 0, R: 0 };
    this.cur = {};
    this.hipY = 0.95;
    this.bodyRot = 0;
    this.bodyY = 0;
    this.bodyZ = 0;
    this.sway = 0;
    this.swayV = 0;
    for (const j of JOINTS) this.cur[j] = [0, 0, 0];
    this.look = { yaw: 0, pitch: 0 };
  }

  hit(side = 'R') { this.strike[side] = 1; }

  update(dt, s) {
    this.t += dt;
    const t = this.t;
    const P = {};
    for (const j of JOINTS) P[j] = [0, 0, 0];
    let hipY = 0.95, bodyRot = 0, bodyY = 0, bodyZ = 0;
    const mode = s.mode || 'walk';
    const speed = s.speed || 0;
    for (const k of ['L', 'R']) this.strike[k] = Math.max(0, this.strike[k] - dt * 6);

    const armsHang = (amt = 1) => {
      P.shoulderL[2] += 0.07 * amt; P.shoulderR[2] -= 0.07 * amt;
      P.elbowL[0] -= 0.14 * amt; P.elbowR[0] -= 0.14 * amt;
      P.fingersL[0] -= 0.25; P.fingersR[0] -= 0.25;
    };
    const breathe = () => {
      const b = Math.sin(t * 1.7);
      P.chest[0] += b * 0.012; P.spine[0] += b * 0.006;
      P.shoulderL[2] += b * 0.01; P.shoulderR[2] -= b * 0.01;
    };
    const crossLegs = () => {
      for (const [side, sg] of [['L', 1], ['R', -1]]) {
        P['thigh' + side] = [-1.45, -sg * 0.55, sg * 0.75];
        P['knee' + side] = [2.55, 0, 0];
        P['ankle' + side] = [-0.4, 0, -sg * 0.5];
      }
    };
    const sitChair = () => {
      for (const side of ['L', 'R']) { P['thigh' + side] = [-1.55, 0, side === 'L' ? 0.08 : -0.08]; P['knee' + side] = [1.5, 0, 0]; P['ankle' + side] = [0.05, 0, 0]; }
    };

    if (mode === 'walk' || mode === 'swim') {
      if (!s.grounded && mode === 'walk') {
        // airborne
        const up = s.vy > 0;
        P.thighL = [up ? -0.75 : -0.35, 0, 0.05]; P.thighR = [up ? -0.15 : 0.15, 0, -0.05];
        P.kneeL = [up ? 1.2 : 0.5, 0, 0]; P.kneeR = [up ? 0.6 : 0.3, 0, 0];
        P.shoulderL = [-0.4, 0, 0.55]; P.shoulderR = [-0.25, 0, -0.55];
        P.elbowL = [-0.6, 0, 0]; P.elbowR = [-0.5, 0, 0];
        P.spine[0] = 0.08; P.head[0] = -0.06;
        hipY = 0.95;
      } else {
        const run = Math.min(1, Math.max(0, (speed - 2.6) / 2.4));
        const walkAmt = Math.min(1, speed / 1.4);
        const strideLen = 1.25 + run * 1.1;
        this.phase += dt * (speed / strideLen) * Math.PI * 2;
        const ph = this.phase, sn = Math.sin(ph), cs = Math.cos(ph);
        const A = (0.42 + run * 0.28) * walkAmt, B = (0.75 + run * 0.7) * walkAmt;
        P.thighL[0] = -sn * A; P.thighR[0] = sn * A;
        P.kneeL[0] = B * Math.pow(Math.max(0, cs), 1.4) + 0.05 * walkAmt;
        P.kneeR[0] = B * Math.pow(Math.max(0, -cs), 1.4) + 0.05 * walkAmt;
        P.ankleL[0] = sn * 0.18 * walkAmt; P.ankleR[0] = -sn * 0.18 * walkAmt;
        const armA = (0.38 + run * 0.4) * walkAmt;
        P.shoulderL[0] = sn * armA; P.shoulderR[0] = -sn * armA;
        P.shoulderL[2] = 0.08 + run * 0.08; P.shoulderR[2] = -0.08 - run * 0.08;
        P.elbowL[0] = -0.22 - run * 1.15 - Math.max(0, -sn) * 0.25 * walkAmt; P.elbowR[0] = -0.22 - run * 1.15 - Math.max(0, sn) * 0.25 * walkAmt;
        P.fingersL[0] = -0.3 - run * 0.9; P.fingersR[0] = -0.3 - run * 0.9;
        P.hips[1] = sn * 0.1 * walkAmt; P.chest[1] = -sn * 0.14 * walkAmt;
        P.hips[2] = cs * 0.03 * walkAmt;
        P.spine[0] = 0.04 * walkAmt + run * 0.22; P.neck[0] = -run * 0.12;
        hipY = 0.95 - 0.012 * walkAmt - run * 0.03 + Math.abs(cs) * (0.018 + run * 0.03) * walkAmt;
        if (walkAmt < 0.05) { armsHang(); breathe(); P.hips[2] = Math.sin(t * 0.6) * 0.015; P.head[1] = Math.sin(t * 0.33) * 0.25 * (s.lookAround ?? 1); }
        if (mode === 'swim') {
          const sp = Math.sin(t * 2.4);
          P.shoulderL = [-1.3 - sp * 0.3, 0, 0.3 + sp * 0.5]; P.shoulderR = [-1.3 - sp * 0.3, 0, -0.3 - sp * 0.5];
          P.elbowL = [-0.3, 0, 0]; P.elbowR = [-0.3, 0, 0];
          P.spine[0] = 0.25;
        }
        // landing squash
        hipY -= this.land * 0.1; P.kneeL[0] += this.land * 0.4; P.kneeR[0] += this.land * 0.4; P.thighL[0] -= this.land * 0.25; P.thighR[0] -= this.land * 0.25;
      }
      // lean into turns
      bodyZ = -(s.turn || 0) * 0.05 * Math.min(1, speed / 3);
    } else if (mode === 'sit' || mode === 'toilet' || mode === 'swing' || mode === 'play:piano' || mode === 'recline') {
      sitChair();
      hipY = s.seatH + 0.1;
      breathe();
      armsHang(0.5);
      P.shoulderL[0] = -0.35; P.shoulderR[0] = -0.35; P.elbowL[0] = -0.9; P.elbowR[0] = -0.9;
      P.shoulderL[2] = 0.12; P.shoulderR[2] = -0.12;
      P.spine[0] = -0.05; P.head[1] = Math.sin(t * 0.3) * 0.2;
      if (mode === 'recline') { P.spine[0] = -0.4; P.chest[0] = -0.1; P.neck[0] = 0.25; P.thighL[0] = -1.3; P.thighR[0] = -1.3; P.kneeL[0] = 0.6; P.kneeR[0] = 0.6; }
      if (mode === 'toilet') { P.spine[0] = 0.18; P.shoulderL[0] = -0.6; P.shoulderR[0] = -0.6; P.elbowL[0] = -1.2; P.elbowR[0] = -1.2; P.head[0] = 0.15; }
      if (mode === 'swing') { P.shoulderL = [-0.2, 0, 0.5]; P.shoulderR = [-0.2, 0, -0.5]; P.elbowL = [-1.6, 0, 0]; P.elbowR = [-1.6, 0, 0]; P.kneeL[0] = 1.2 + Math.sin(t * 1.6) * 0.3; P.kneeR[0] = 1.2 + Math.sin(t * 1.6) * 0.3; }
      if (mode === 'play:piano') {
        P.spine[0] = 0.08;
        const l = this.strike.L, r = this.strike.R;
        P.shoulderL = [-0.75, 0.0, 0.2 + Math.sin(t * 2.1) * 0.05]; P.shoulderR = [-0.75, 0.0, -0.2 - Math.cos(t * 1.7) * 0.05];
        P.elbowL = [-0.85, 0.3, 0]; P.elbowR = [-0.85, -0.3, 0];
        P.wristL[0] = 0.25 + l * 0.35; P.wristR[0] = 0.25 + r * 0.35;
        P.head[0] = 0.2;
      }
    } else if (mode === 'sitFloor' || mode === 'meditate' || mode.startsWith('play:')) {
      crossLegs();
      hipY = (s.seatH ?? 0) + 0.12;
      breathe();
      P.spine[0] = 0.02;
      P.shoulderL = [-0.35, 0, 0.18]; P.shoulderR = [-0.35, 0, -0.18];
      P.elbowL = [-0.75, 0.2, 0]; P.elbowR = [-0.75, -0.2, 0];
      P.wristL = [0.3, 0, 0]; P.wristR = [0.3, 0, 0];
      const l = this.strike.L, r = this.strike.R;
      if (mode === 'meditate') { P.wristL = [0.6, 0, -0.6]; P.wristR = [0.6, 0, 0.6]; P.head[0] = 0.08; }
      if (mode === 'play:harmonium') {
        P.spine[0] = 0.12;
        P.shoulderR = [-0.95, 0, -0.08]; P.elbowR = [-0.75, -0.2, 0]; P.wristR = [0.35 + r * 0.25, 0, 0];
        const pump = Math.sin(t * 3.2);
        P.shoulderL = [-0.55 - pump * 0.12, 0.2, 0.45]; P.elbowL = [-1.0 - pump * 0.2, 0.3, 0];
        P.head[0] = 0.18; P.head[1] = Math.sin(t * 0.5) * 0.08;
      }
      if (mode === 'play:tabla') {
        P.spine[0] = 0.16;
        P.shoulderL = [-0.62, 0.1, 0.32]; P.shoulderR = [-0.62, -0.1, -0.32];
        P.elbowL = [-1.0 + l * 0.25, 0.2, 0]; P.elbowR = [-1.0 + r * 0.25, -0.2, 0];
        P.wristL = [0.55 - l * 0.9, 0, 0]; P.wristR = [0.55 - r * 0.9, 0, 0];
        P.head[0] = 0.16; P.head[2] = Math.sin(t * 2) * 0.05;
      }
      if (mode === 'play:sitar') {
        P.chest[1] = -0.2;
        P.shoulderL = [-1.1, 0.4, 0.75]; P.elbowL = [-1.2, 0, 0]; P.wristL = [0.4, 0, 0.5];
        P.shoulderR = [-0.7, 0, -0.15]; P.elbowR = [-0.9, -0.4, 0]; P.wristR = [0.3 - r * 0.4, 0, 0];
        P.head[1] = 0.35; P.head[0] = 0.1;
      }
      if (mode === 'play:tanpura') {
        P.shoulderR = [-0.9, -0.1, -0.25]; P.elbowR = [-0.5, 0, 0]; P.wristR = [0.1 - r * 0.3, 0, 0];
        P.shoulderL = [-0.5, 0.2, 0.3]; P.elbowL = [-1.2, 0, 0];
        P.head[1] = -0.15; P.head[0] = 0.06;
      }
      if (mode === 'play:flute') {
        P.shoulderL = [-1.25, 0.0, -0.35]; P.elbowL = [-1.7, 0.6, 0];
        P.shoulderR = [-1.15, 0.0, -0.55]; P.elbowR = [-1.65, 0.6, 0];
        P.wristL = [0.2, 0, 0.3 + l * 0.1]; P.wristR = [0.2, 0, 0.2 + r * 0.1];
        P.head[2] = 0.18; P.head[1] = -0.2; P.chest[1] = 0.1;
      }
    } else if (mode === 'lie') {
      bodyRot = -Math.PI / 2;
      hipY = 0.95;
      bodyY = s.seatH + 0.1;
      breathe();
      P.shoulderL = [0, 0, 0.25]; P.shoulderR = [0, 0, -0.25]; P.elbowL[0] = -0.4; P.elbowR[0] = -0.4;
      P.thighL = [0, 0, 0.05]; P.thighR = [0, 0, -0.05]; P.kneeL[0] = 0.1; P.kneeR[0] = 0.1;
      P.head[0] = -0.25; P.head[1] = Math.sin(t * 0.2) * 0.1;
    } else if (mode.startsWith('emote:')) {
      armsHang(); breathe();
      const e = mode.slice(6);
      if (e === 'namaste') {
        P.shoulderL = [-0.5, -0.3, 0.32]; P.shoulderR = [-0.5, 0.3, -0.32];
        P.elbowL = [-1.95, 0.0, 0]; P.elbowR = [-1.95, 0.0, 0];
        P.wristL = [0, 0, -0.55]; P.wristR = [0, 0, 0.55];
        P.head[0] = 0.22 + Math.max(0, Math.sin(t * 1.2)) * 0.1; P.spine[0] = 0.12;
      } else if (e === 'wave') {
        P.shoulderR = [-0.3, 0, -2.5]; P.elbowR = [0, 0, -0.4 + Math.sin(t * 9) * 0.45];
        P.head[2] = -0.1;
      } else if (e === 'dance') {
        const b = Math.sin(t * 6.3), b2 = Math.sin(t * 3.15);
        P.shoulderL = [-0.3, 0, 1.9 + b * 0.5]; P.shoulderR = [-0.3, 0, -1.9 + b * 0.5];
        P.elbowL = [-0.8 + b2 * 0.4, 0, 0]; P.elbowR = [-0.8 - b2 * 0.4, 0, 0];
        P.wristL = [0, b * 0.8, 0]; P.wristR = [0, -b * 0.8, 0];
        P.hips[2] = b2 * 0.12; P.chest[2] = -b2 * 0.1; P.hips[1] = b2 * 0.25;
        P.kneeL[0] = 0.25 + Math.max(0, b) * 0.35; P.kneeR[0] = 0.25 + Math.max(0, -b) * 0.35;
        P.thighL[0] = -0.12 - Math.max(0, b) * 0.2; P.thighR[0] = -0.12 - Math.max(0, -b) * 0.2;
        hipY = 0.93 - Math.abs(b) * 0.03; P.head[2] = -b2 * 0.12;
      } else if (e === 'clap') {
        const c = (Math.sin(t * 9) + 1) / 2;
        P.shoulderL = [-0.9, -0.2, 0.15 + c * 0.25]; P.shoulderR = [-0.9, 0.2, -0.15 - c * 0.25];
        P.elbowL = [-1.0, 0, 0]; P.elbowR = [-1.0, 0, 0];
        P.wristL = [0, 0, -0.9]; P.wristR = [0, 0, 0.9];
      } else if (e === 'pray') {
        P.shoulderL = [-0.9, -0.2, 0.2]; P.shoulderR = [-0.9, 0.2, -0.2];
        P.elbowL = [-1.0, 0, 0]; P.elbowR = [-1.0, 0, 0];
        P.wristL = [0.6, 0, -0.5]; P.wristR = [0.6, 0, 0.5]; P.head[0] = 0.3;
      }
    }

    // head look (camera-driven, subtle)
    if (s.lookYaw !== undefined && (mode === 'walk' && speed < 0.3)) { P.head[1] += Math.max(-0.7, Math.min(0.7, s.lookYaw)) * 0.6; P.neck[1] += Math.max(-0.7, Math.min(0.7, s.lookYaw)) * 0.25; }

    // ---- apply with damping
    const k = 1 - Math.exp(-(s.snap ? 60 : 12) * dt);
    const J = this.av.j;
    for (const j of JOINTS) {
      const c = this.cur[j], p = P[j];
      c[0] += (p[0] - c[0]) * k; c[1] += (p[1] - c[1]) * k; c[2] += (p[2] - c[2]) * k;
      const o = J[j]; if (o) o.rotation.set(c[0], c[1], c[2]);
    }
    const kb = 1 - Math.exp(-(s.snap ? 60 : 8) * dt);
    this.hipY += (hipY - this.hipY) * k;
    this.bodyRot += (bodyRot - this.bodyRot) * kb;
    this.bodyY += (bodyY - this.bodyY) * kb;
    this.bodyZ += (bodyZ - this.bodyZ) * kb;
    J.hips.position.y = this.hipY;
    const body = J.body;
    body.rotation.x = this.bodyRot;
    body.rotation.z = this.bodyZ;
    const S = body.scale.x;
    if (Math.abs(this.bodyRot) > 0.01) {
      // lying: rotate around the hips so they stay above the root
      const a = this.bodyRot, w = Math.min(1, Math.abs(a) / (Math.PI / 2));
      const Y = this.hipY * S + (this.bodyY - this.hipY * S) * w;
      body.position.set(0, Y - this.hipY * S * Math.cos(a), -this.hipY * S * Math.sin(a));
    } else body.position.set(0, 0, 0);
    this.land = Math.max(0, this.land - dt * 4);

    // blink
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = 1; this.blinkT = 2.5 + Math.random() * 3.5; }
    const closed = mode === 'meditate' || mode === 'lie' ? 1 : 0;
    this.blink = Math.max(closed, this.blink - dt * 9);
    this.av.setBlink(Math.min(1, this.blink));

    // hair sway
    if (this.av.hairSway) {
      const target = Math.min(0.6, speed * 0.07) + (s.grounded === false ? -0.25 * Math.sign(s.vy || 0) : 0);
      this.swayV += ((target - this.sway) * 60 - this.swayV * 8) * dt;
      this.sway += this.swayV * dt;
      this.av.hairSway.rotation.x = this.sway * 0.6 + Math.sin(t * 2.2) * 0.01;
    }
    if (this.av.skirtMesh) this.av.skirtMesh.rotation.x = Math.min(0.15, speed * 0.02);
  }

  landed(v) { this.land = Math.min(1, Math.abs(v) / 9); }
}
