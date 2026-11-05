import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Physically based sky, sun with shadows, moon, stars and a time-of-day controller.
export class SkySystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    const sky = this.sky = new Sky();
    sky.scale.setScalar(4500);
    const u = sky.material.uniforms;
    u.turbidity.value = 6; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86;
    scene.add(sky);

    const sun = this.sun = new THREE.DirectionalLight(0xfff0dc, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const c = sun.shadow.camera; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 220;
    sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.035;
    sun.target.position.set(0, 6, 4);
    scene.add(sun, sun.target);

    this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4a38, 0.5);
    scene.add(this.hemi);

    // stars
    const n = 2200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u1 = Math.random(), v1 = Math.random();
      const th = 2 * Math.PI * u1, ph = Math.acos(2 * v1 - 1);
      const r = 2600;
      const y = Math.abs(Math.cos(ph)) * r;
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
      const w = 0.7 + Math.random() * 0.3, tint = Math.random();
      col[i * 3] = w; col[i * 3 + 1] = w * (0.9 + tint * 0.1); col[i * 3 + 2] = w * (0.85 + (1 - tint) * 0.2);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false }));
    this.stars.renderOrder = -1;
    scene.add(this.stars);

    // moon
    const mc = document.createElement('canvas'); mc.width = mc.height = 128;
    const g = mc.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,250,235,1)'); rg.addColorStop(0.42, 'rgba(250,244,225,1)'); rg.addColorStop(0.5, 'rgba(220,225,255,0.25)'); rg.addColorStop(1, 'rgba(200,210,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(180,175,160,.35)'; for (const [x, y, r] of [[52, 50, 9], [74, 70, 7], [60, 78, 5], [78, 48, 4]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
    scene.add(this.moon);

    scene.fog = new THREE.Fog(0xcfd8e0, 90, 520);
    this.hour = 17;
    this.night = 0;
    this.listeners = new Set();
    this.dir = new THREE.Vector3();
  }

  on(fn) { this.listeners.add(fn); }

  setTime(h) {
    this.hour = ((h % 24) + 24) % 24;
    const phi = ((this.hour - 6) / 12) * Math.PI;      // 0 at sunrise, PI at sunset
    const elev = Math.sin(phi) * THREE.MathUtils.degToRad(62);
    const dir = this.dir.set(Math.cos(phi) * Math.cos(elev), Math.sin(elev), Math.sin(phi) * Math.cos(elev) * 0.85 + 0.25).normalize();
    // fold night: keep the sky shader slightly below the horizon for twilight
    const day = THREE.MathUtils.smoothstep(dir.y, -0.12, 0.12);
    const golden = Math.exp(-((dir.y - 0.08) ** 2) / 0.012);
    this.night = 1 - day;
    this.sky.material.uniforms.sunPosition.value.copy(dir).multiplyScalar(1000);
    this.sky.material.uniforms.rayleigh.value = 1.2 + golden * 1.4;
    this.sky.material.uniforms.turbidity.value = 5 + golden * 4;
    this.sky.visible = day > 0.01;

    const sun = this.sun;
    sun.position.copy(sun.target.position).addScaledVector(dir.y > 0 ? dir : new THREE.Vector3(-dir.x, 0.6, -dir.z).normalize(), 90);
    const warm = new THREE.Color(0xffb46a), noon = new THREE.Color(0xfff4e6), moonC = new THREE.Color(0x9fb4ff);
    if (dir.y > 0) {
      sun.color.copy(noon).lerp(warm, golden * 0.85);
      sun.intensity = 3.2 * THREE.MathUtils.smoothstep(dir.y, 0.0, 0.18);
    } else {
      sun.color.copy(moonC);
      sun.intensity = 0.35 * this.night;
    }
    this.hemi.intensity = 0.15 + day * 0.45;
    this.hemi.color.set(0xcfe3ff).lerp(new THREE.Color(0x203060), this.night);
    this.hemi.groundColor.set(0x5a4a38).lerp(new THREE.Color(0x10121a), this.night);
    this.scene.environmentIntensity = 0.32 + day * 0.5;
    this.stars.material.opacity = THREE.MathUtils.smoothstep(this.night, 0.4, 1);
    const fogDay = new THREE.Color(0xd8dde2).lerp(new THREE.Color(0xf0c49a), golden * 0.7);
    this.scene.fog.color.copy(fogDay).lerp(new THREE.Color(0x0a0e1c), this.night);
    this.scene.background = this.night > 0.98 ? new THREE.Color(0x05070f) : null;
    if (!this.sky.visible) this.scene.background = new THREE.Color(0x070a16);
    // moon opposite the sun
    const md = new THREE.Vector3(-dir.x, Math.max(0.25, -dir.y), -dir.z * 0.6 - 0.4).normalize();
    this.moon.position.copy(md).multiplyScalar(2400);
    this.moon.lookAt(0, 0, 0);
    this.moon.material.opacity = THREE.MathUtils.smoothstep(this.night, 0.3, 0.9);
    this.renderer.toneMappingExposure = 0.95 + this.night * 0.15 - golden * 0.05;
    for (const f of this.listeners) f(this);
  }

  setShadowSize(n) {
    this.sun.shadow.mapSize.set(n, n);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
  }

  label() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
  }
}
