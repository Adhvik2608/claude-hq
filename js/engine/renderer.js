import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const QUALITY = {
  low:    { label: 'Low',    pixel: 0.85, shadow: 1024, bloom: false, ao: false, msaa: 0 },
  medium: { label: 'Medium', pixel: 1.25, shadow: 2048, bloom: true,  ao: false, msaa: 4 },
  high:   { label: 'High',   pixel: 2.0,  shadow: 4096, bloom: true,  ao: false, msaa: 4 },
  ultra:  { label: 'Ultra',  pixel: 2.0,  shadow: 4096, bloom: true,  ao: true,  msaa: 4 },
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.r = r;
    this.scale = 1;       // dynamic resolution multiplier
    this.qualityKey = (matchMedia('(pointer: coarse)').matches ? 'medium' : 'high');
    try { const q = localStorage.getItem('dh.quality'); if (q && QUALITY[q]) this.qualityKey = q; } catch (e) {}
    const pm = new THREE.PMREMGenerator(r);
    this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.composer = null;
    this.frameTimes = [];
    this.autoScale = true;
  }

  get quality() { return QUALITY[this.qualityKey]; }

  setup(scene, camera) {
    this.scene = scene; this.camera = camera;
    scene.environment = this.envTex;
    this.rebuild();
    addEventListener('resize', () => this.resize());
  }

  setQuality(key) {
    if (!QUALITY[key]) return;
    this.qualityKey = key;
    try { localStorage.setItem('dh.quality', key); } catch (e) {}
    this.scale = 1;
    this.rebuild();
    this.onQuality && this.onQuality(this.quality);
  }

  rebuild() {
    const q = this.quality;
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    const w = innerWidth, h = innerHeight;
    this.r.setPixelRatio(Math.min(devicePixelRatio || 1, q.pixel) * this.scale);
    this.r.setSize(w, h, false);
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: q.msaa });
    const c = new EffectComposer(this.r, rt);
    c.setPixelRatio(this.r.getPixelRatio());
    c.setSize(w, h);
    c.addPass(new RenderPass(this.scene, this.camera));
    if (q.ao) {
      const ao = new GTAOPass(this.scene, this.camera, w, h);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.8;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1 });
      c.addPass(ao);
    }
    if (q.bloom) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.45, 3.2);
      c.addPass(this.bloom);
    } else this.bloom = null;
    c.addPass(new OutputPass());
    this.composer = c;
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.r.setPixelRatio(Math.min(devicePixelRatio || 1, this.quality.pixel) * this.scale);
    this.r.setSize(w, h, false);
    this.composer.setPixelRatio(this.r.getPixelRatio());
    this.composer.setSize(w, h);
  }

  // Simple dynamic resolution: drop the pixel ratio when frames get slow, recover when fast.
  adapt(dt) {
    if (!this.autoScale) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    let s = this.scale;
    if (avg > 1 / 38 && s > 0.55) s = Math.max(0.55, s - 0.15);
    else if (avg < 1 / 58 && s < 1) s = Math.min(1, s + 0.1);
    if (s !== this.scale) { this.scale = s; this.resize(); }
  }

  render(scene, camera) {
    if (scene !== this.scene || camera !== this.camera) {
      // studio / alternative views: plain render with tone mapping
      this.r.setRenderTarget(null);
      this.r.render(scene, camera);
      return;
    }
    this.composer.render();
  }
}
