import * as THREE from 'three';
import { Avatar, OPTIONS, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS, randomLook } from '../character/avatar.js';
import { Animator } from '../character/animator.js';

const $ = (id) => document.getElementById(id);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

const TABS = [
  ['body', 'Body'], ['face', 'Face'], ['eyes', 'Eyes'], ['hair', 'Hair'], ['outfit', 'Outfit'], ['extras', 'Extras'],
];

export class Creator {
  constructor(game, ui) {
    this.g = game; this.ui = ui;
    this.tab = 'body';
    this.scene = new THREE.Scene();
    this.scene.environment = game.renderer.envTex;
    this.scene.environmentIntensity = 0.55;
    const bg = document.createElement('canvas'); bg.width = 16; bg.height = 256;
    const c = bg.getContext('2d'); const gr = c.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#3a2416'); gr.addColorStop(0.55, '#1c120c'); gr.addColorStop(1, '#0c0705');
    c.fillStyle = gr; c.fillRect(0, 0, 16, 256);
    const bt = new THREE.CanvasTexture(bg); bt.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bt;
    this.cam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 100);
    const key = new THREE.DirectionalLight(0xffe2c0, 2.6); key.position.set(2.5, 4, 3); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -1.5; key.shadow.camera.right = 1.5; key.shadow.camera.top = 2.5; key.shadow.camera.bottom = -0.5; key.shadow.bias = -0.0005;
    const rim = new THREE.DirectionalLight(0x9fc0ff, 1.8); rim.position.set(-3, 3, -3);
    const fill = new THREE.HemisphereLight(0xfff0e0, 0x302018, 0.6);
    this.scene.add(key, rim, fill);
    // pedestal
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 64), new THREE.MeshPhysicalMaterial({ color: 0xf1ebe2, roughness: 0.15, clearcoat: 0.6 }));
    ped.position.y = -0.06; ped.receiveShadow = true; this.scene.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.012, 8, 96), new THREE.MeshStandardMaterial({ color: 0xe0b050, metalness: 1, roughness: 0.25 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; this.scene.add(ring);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshStandardMaterial({ color: 0x1a110c, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.12; floor.receiveShadow = true; this.scene.add(floor);
    // floating diya lights
    this.motes = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc070, toneMapped: false }));
      m.userData = { a: Math.random() * 6.28, r: 1.2 + Math.random() * 1.4, y: 0.3 + Math.random() * 2, s: 0.1 + Math.random() * 0.2 };
      this.scene.add(m); this.motes.push(m);
    }
    this.rotY = 0.35; this.dist = 4.2; this.target = new THREE.Vector3(0, 0.95, 0);
    this.camT = { dist: 4.2, y: 0.95 };
    this.bindDrag();
  }

  bindDrag() {
    const cv = this.g.renderer.canvas;
    let down = null;
    cv.addEventListener('pointerdown', (e) => { if (this.g.state === 'creator') down = e.clientX; });
    addEventListener('pointermove', (e) => { if (down !== null && this.g.state === 'creator') { this.rotY += (e.clientX - down) * 0.01; down = e.clientX; } });
    addEventListener('pointerup', () => { down = null; });
    cv.addEventListener('wheel', (e) => { if (this.g.state === 'creator') this.camT.dist = Math.max(0.8, Math.min(5.5, this.camT.dist + Math.sign(e.deltaY) * 0.35)); }, { passive: true });
  }

  open(from) {
    const g = this.g;
    this.from = from;
    this.prevState = g.state;
    g.state = 'creator';
    this.ui.close();
    this.look = { ...g.avatar.look };
    if (!this.preview) {
      this.preview = new Avatar(this.look);
      this.anim = new Animator(this.preview);
      this.scene.add(this.preview.root);
    } else this.preview.setLook(this.look);
    $('title').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('creator').classList.remove('hidden');
    $('ccName').value = g.name || '';
    $('ccRandom').onclick = () => { this.look = randomLook(); this.apply(); this.renderBody(); };
    $('ccDone').onclick = () => this.done();
    this.renderTabs();
    this.renderBody();
  }

  done() {
    const g = this.g;
    g.avatar.setLook(this.look);
    try { localStorage.setItem('dh.look', JSON.stringify(this.look)); } catch (e) {}
    const name = $('ccName').value.trim();
    g.name = name;
    try { localStorage.setItem('dh.name', name); } catch (e) {}
    g.world.setName && g.world.setName(name);
    $('creator').classList.add('hidden');
    if (this.from === 'play') { g.state = 'play'; $('hud').classList.remove('hidden'); }
    else { g.startPlay(); }
  }

  renderTabs() {
    const t = $('ccTabs'); t.innerHTML = '';
    for (const [id, label] of TABS) {
      const b = h(`<button class="chip ${id === this.tab ? 'on' : ''}">${label}</button>`);
      b.onclick = () => { this.tab = id; this.renderTabs(); this.renderBody(); };
      t.appendChild(b);
    }
    const close = ['face', 'eyes', 'hair'].includes(this.tab);
    this.camT.dist = close ? 1.05 : 4.2; this.camT.y = close ? 1.6 : 0.95;
  }

  apply() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.preview.setLook(this.look); });
  }

  chips(key, label) {
    const wrap = h(`<div><h4>${label}</h4><div class="chips"></div></div>`);
    const c = wrap.querySelector('.chips');
    for (const [v, l] of OPTIONS[key]) {
      const b = h(`<button class="chip ${this.look[key] === v ? 'on' : ''}">${l}</button>`);
      b.onclick = () => { this.look[key] = v; c.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b)); this.apply(); };
      c.appendChild(b);
    }
    return wrap;
  }

  swatches(key, label, colors) {
    const wrap = h(`<div><h4>${label}</h4><div class="swatches"></div></div>`);
    const c = wrap.querySelector('.swatches');
    const mark = () => c.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x.dataset.c === this.look[key]));
    for (const col of colors) {
      const b = h(`<button class="sw" style="background:${col}" data-c="${col}" aria-label="${col}"></button>`);
      b.onclick = () => { this.look[key] = col; mark(); this.apply(); };
      c.appendChild(b);
    }
    const custom = h(`<label class="sw sw-custom" title="Custom colour"><input type="color" value="${this.look[key]}"/></label>`);
    custom.querySelector('input').oninput = (e) => { this.look[key] = e.target.value; mark(); this.apply(); };
    c.appendChild(custom);
    mark();
    return wrap;
  }

  range(key, label, min, max, step) {
    const w = h(`<div class="ctl"><label>${label}</label><input type="range" min="${min}" max="${max}" step="${step}" value="${this.look[key]}"/><output>${Math.round(((this.look[key] - min) / (max - min)) * 100)}</output></div>`);
    const r = w.querySelector('input');
    this.ui.rangeFill(r);
    r.oninput = () => { this.look[key] = +r.value; this.ui.rangeFill(r); w.querySelector('output').textContent = Math.round(((r.value - min) / (max - min)) * 100); this.apply(); };
    return w;
  }

  toggle(key, label) {
    const b = h(`<button class="chip ${this.look[key] ? 'on' : ''}">${label}</button>`);
    b.onclick = () => { this.look[key] = !this.look[key]; b.classList.toggle('on', this.look[key]); this.apply(); };
    return b;
  }

  renderBody() {
    const body = $('ccBody'); body.innerHTML = '';
    const add = (el) => body.appendChild(el);
    switch (this.tab) {
      case 'body':
        add(this.chips('bodyShape', 'Body shape'));
        add(h('<h4>Proportions</h4>'));
        add(this.range('height', 'Height', 0.9, 1.1, 0.005));
        add(this.range('build', 'Build', 0, 1, 0.01));
        add(this.swatches('skin', 'Skin tone', SKIN_TONES));
        break;
      case 'face':
        add(this.chips('faceShape', 'Face shape'));
        add(this.chips('nose', 'Nose'));
        add(this.chips('lips', 'Lips'));
        add(this.swatches('lipColor', 'Lip colour', ['#a85a50', '#b0485a', '#8a3a3a', '#c06a6a', '#7a3a30', '#d07a78', '#6a2a2a']));
        add(this.chips('brows', 'Eyebrows'));
        break;
      case 'eyes':
        add(this.chips('eyeType', 'Eye shape'));
        add(this.swatches('eyeColor', 'Eye colour', EYE_COLORS));
        add(h('<h4>Size</h4>'));
        add(this.range('eyeSize', 'Eye size', 0.85, 1.2, 0.01));
        break;
      case 'hair':
        add(this.chips('hair', 'Hairstyle'));
        add(this.swatches('hairColor', 'Hair colour', HAIR_COLORS));
        add(this.chips('beard', 'Beard'));
        add(this.chips('mustache', 'Mustache'));
        break;
      case 'outfit':
        add(this.chips('top', 'Top'));
        add(this.swatches('topColor', 'Top colour', CLOTH_COLORS));
        add(this.swatches('accent', 'Accent / trim', CLOTH_COLORS));
        add(this.chips('bottom', 'Bottom'));
        add(this.swatches('bottomColor', 'Bottom colour', CLOTH_COLORS));
        add(this.chips('shoes', 'Footwear'));
        add(this.swatches('shoeColor', 'Footwear colour', CLOTH_COLORS));
        break;
      case 'extras':
        add(this.chips('glasses', 'Glasses'));
        add(this.chips('forehead', 'Forehead'));
        add(this.chips('headwear', 'Headwear'));
        { const w = h('<div><h4>Accessories</h4><div class="chips"></div></div>'); const c = w.querySelector('.chips'); c.append(this.toggle('earrings', 'Earrings'), this.toggle('watch', 'Watch'), this.toggle('mala', 'Rudraksha mala')); add(w); }
        break;
    }
  }

  render(dt) {
    const g = this.g;
    if (!this.preview) return;
    const narrow = innerWidth < 760;
    this.dist += (this.camT.dist - this.dist) * (1 - Math.exp(-6 * dt));
    this.target.y += (this.camT.y - this.target.y) * (1 - Math.exp(-6 * dt));
    this.preview.root.rotation.y = this.rotY;
    this.anim.update(dt, { mode: 'walk', speed: 0, grounded: true, lookAround: 0.4 });
    // place the character left of the panel on wide screens
    const off = narrow ? 0 : 0.18 * this.dist;
    this.cam.aspect = innerWidth / innerHeight; this.cam.updateProjectionMatrix();
    this.cam.position.set(off, this.target.y + (narrow ? -this.dist * 0.35 + 0.15 : 0.1), this.dist);
    this.cam.lookAt(off, this.target.y - (narrow ? this.dist * 0.18 : 0), 0);
    const t = performance.now() / 1000;
    for (const m of this.motes) { const u = m.userData; m.position.set(Math.cos(u.a + t * u.s) * u.r, u.y + Math.sin(t * 0.7 + u.a) * 0.1, Math.sin(u.a + t * u.s) * u.r - 0.5); }
    g.renderer.render(this.scene, this.cam);
  }
}
