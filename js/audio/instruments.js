// Playable instruments. Every instrument reads Sa from the tanpura so the whole
// music room is always in the scale you chose.

export const THAATS = {
  Bilawal: [0, 2, 4, 5, 7, 9, 11], Kalyan: [0, 2, 4, 6, 7, 9, 11], Khamaj: [0, 2, 4, 5, 7, 9, 10], Bhairav: [0, 1, 4, 5, 7, 8, 11],
  Poorvi: [0, 1, 4, 6, 7, 8, 11], Marwa: [0, 1, 4, 6, 7, 9, 11], Kafi: [0, 2, 3, 5, 7, 9, 10], Asavari: [0, 2, 3, 5, 7, 8, 10],
  Bhairavi: [0, 1, 3, 5, 7, 8, 10], Todi: [0, 1, 3, 6, 7, 8, 11],
};

// chromatic keyboard mapping (relative semitones from Sa)
export const CHROMA_KEYS = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16, Quote: 17 };
// sargam mapping: [octave, degree]
export const SARGAM_KEYS = {
  KeyZ: [-1, 0], KeyX: [-1, 1], KeyC: [-1, 2], KeyV: [-1, 3], KeyB: [-1, 4], KeyN: [-1, 5], KeyM: [-1, 6],
  KeyA: [0, 0], KeyS: [0, 1], KeyD: [0, 2], KeyF: [0, 3], KeyG: [0, 4], KeyH: [0, 5], KeyJ: [0, 6], KeyK: [1, 0],
  KeyQ: [1, 0], KeyW: [1, 1], KeyE: [1, 2], KeyR: [1, 3], KeyT: [1, 4], KeyY: [1, 5], KeyU: [1, 6], KeyI: [2, 0],
};

function bus(audio, send = 0.35, gain = 1) {
  const ctx = audio.ensure();
  const g = ctx.createGain(); g.gain.value = gain;
  g.connect(audio.music);
  const s = ctx.createGain(); s.gain.value = send; g.connect(s).connect(audio.reverb);
  return g;
}

function bufferFrom(ctx, data) { const b = ctx.createBuffer(1, data.length, ctx.sampleRate); b.copyToChannel(data, 0); return b; }

// ---------------------------------------------------------------------------
export class Harmonium {
  constructor(audio, getSa) {
    this.audio = audio; this.getSa = getSa;
    this.notes = new Map();
    this.octave = 0;
    this.stops = { bass: true, female: true };
    this.drones = {};
  }
  init() {
    if (this.out) return;
    const ctx = this.audio.ensure();
    this.out = bus(this.audio, 0.22, 0.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.Q.value = 0.4;
    const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1150; pk.gain.value = 4; pk.Q.value = 1;
    const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 280; body.gain.value = 3; body.Q.value = 0.9;
    this.bellows = ctx.createGain(); this.bellows.gain.value = 1;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.31; const lg = ctx.createGain(); lg.gain.value = 0.045; lfo.connect(lg).connect(this.bellows.gain); lfo.start();
    this.in = ctx.createGain();
    this.in.connect(body).connect(pk).connect(lp).connect(this.bellows).connect(this.out);
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { const a = 1 / Math.pow(k, 0.82) * (k >= 3 && k <= 7 ? 1.25 : 1) * (k % 2 === 0 ? 0.82 : 1); const ph = (k * 1.618) % (Math.PI * 2); re[k] = a * Math.cos(ph); im[k] = a * Math.sin(ph); }
    this.wave = ctx.createPeriodicWave(re, im);
  }
  freq(semi) { return this.getSa() * Math.pow(2, (semi + this.octave * 12) / 12); }
  noteOn(semi) {
    this.init();
    if (this.notes.has(semi)) return;
    const ctx = this.audio.ctx, t = ctx.currentTime, f = this.freq(semi);
    const g = ctx.createGain(); g.gain.value = 0; g.connect(this.in);
    const oscs = [];
    const mk = (fr, gain, det = 0) => { const o = ctx.createOscillator(); o.setPeriodicWave(this.wave); o.frequency.value = fr; o.detune.value = det; const og = ctx.createGain(); og.gain.value = gain; o.connect(og).connect(g); o.start(t); oscs.push(o); };
    mk(f, 0.34);
    if (this.stops.female) mk(f, 0.22, 5.5);
    if (this.stops.bass) mk(f / 2, 0.22, -1.5);
    for (const o of oscs) { o.frequency.setValueAtTime(o.frequency.value * 0.994, t); o.frequency.exponentialRampToValueAtTime(o.frequency.value, t + 0.06); }
    g.gain.setTargetAtTime(0.42, t, 0.025);
    this.notes.set(semi, { g, oscs });
  }
  noteOff(semi) {
    const n = this.notes.get(semi); if (!n) return;
    this.notes.delete(semi);
    const t = this.audio.ctx.currentTime;
    n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0, t, 0.06);
    for (const o of n.oscs) o.stop(t + 0.5);
  }
  allOff() { for (const k of [...this.notes.keys()]) this.noteOff(k); }
  drone(name, on) {
    this.init();
    if (on && !this.drones[name]) {
      const semi = name === 'Sa' ? -12 : -5;
      const ctx = this.audio.ctx, t = ctx.currentTime, f = this.getSa() * Math.pow(2, semi / 12);
      const g = ctx.createGain(); g.gain.value = 0; g.connect(this.in);
      const o = ctx.createOscillator(); o.setPeriodicWave(this.wave); o.frequency.value = f; o.connect(g); o.start(t);
      g.gain.setTargetAtTime(0.16, t, 0.3);
      this.drones[name] = { g, oscs: [o], semi };
    } else if (!on && this.drones[name]) {
      const n = this.drones[name]; delete this.drones[name];
      const t = this.audio.now; n.g.gain.setTargetAtTime(0, t, 0.2); n.oscs.forEach((o) => o.stop(t + 1.5));
    }
  }
  retune() {
    const t = this.audio.now;
    for (const n of Object.values(this.drones)) n.oscs[0].frequency.setTargetAtTime(this.getSa() * Math.pow(2, n.semi / 12), t, 0.3);
  }
}

// ---------------------------------------------------------------------------
// Tabla: strokes synthesised from modal partials and noise, re-tuned to Sa.
export const TAALS = {
  Teentaal: { beats: 16, marks: { 1: 'X', 5: '2', 9: '0', 13: '3' }, bols: ['Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Dhin', 'Dhin', 'Dha', 'Dha', 'Tin', 'Tin', 'Ta', 'Ta', 'Dhin', 'Dhin', 'Dha'], bpm: 120 },
  Ektaal: { beats: 12, marks: { 1: 'X', 3: '0', 5: '2', 7: '0', 9: '3', 11: '4' }, bols: ['Dhin', 'Dhin', 'Dha Ge', 'Ti Ra Ki Ta', 'Tu', 'Na', 'Kat', 'Ta', 'Dha Ge', 'Ti Ra Ki Ta', 'Dhi', 'Na'], bpm: 90 },
  Jhaptaal: { beats: 10, marks: { 1: 'X', 3: '2', 6: '0', 8: '3' }, bols: ['Dhi', 'Na', 'Dhi', 'Dhi', 'Na', 'Ti', 'Na', 'Dhi', 'Dhi', 'Na'], bpm: 110 },
  Rupak: { beats: 7, marks: { 1: '0', 4: '1', 6: '2' }, bols: ['Tin', 'Tin', 'Na', 'Dhi', 'Na', 'Dhi', 'Na'], bpm: 110 },
  Keherwa: { beats: 8, marks: { 1: 'X', 5: '0' }, bols: ['Dha', 'Ge', 'Na', 'Ti', 'Na', 'Ke', 'Dhi', 'Na'], bpm: 140 },
  Dadra: { beats: 6, marks: { 1: 'X', 4: '0' }, bols: ['Dha', 'Dhi', 'Na', 'Dha', 'Tu', 'Na'], bpm: 150 },
};
export const TABLA_PADS = [
  ['Ke', 'bayan', 'KeyA'], ['Ge', 'bayan', 'KeyS'], ['Dha', 'both', 'KeyD'], ['Dhin', 'both', 'KeyF'],
  ['Na', 'dayan', 'KeyJ'], ['Tin', 'dayan', 'KeyK'], ['Tun', 'dayan', 'KeyL'], ['Te', 'dayan', 'KeyU'], ['Tirakita', 'both', 'KeyI'],
];

export class Tabla {
  constructor(audio, getSa) {
    this.audio = audio; this.getSa = getSa;
    this.bufs = null; this.tunedFor = 0;
    this.playing = false; this.taal = 'Teentaal'; this.bpm = 120; this.manjira = true;
    this.listeners = new Set();
  }
  on(fn) { this.listeners.add(fn); }
  init() {
    if (this.out) return;
    this.audio.ensure();
    this.out = bus(this.audio, 0.18, 0.9);
  }
  ensureTuned() {
    this.init();
    const sa = this.getSa();
    if (this.bufs && Math.abs(sa - this.tunedFor) < 0.01) return;
    this.tunedFor = sa;
    const ctx = this.audio.ctx, sr = ctx.sampleRate;
    const D = sa * 2, Bf = sa * 0.75;
    const make = (dur, fn) => { const n = Math.floor(dur * sr), d = new Float32Array(n); fn(d, sr); return d; };
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const modes = (d, f0, parts, gain = 1, att = 0.0015) => {
      for (const [m, a, dec] of parts) {
        const w = 2 * Math.PI * f0 * m / sr;
        for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] += Math.sin(w * i) * a * gain * Math.exp(-t / dec) * Math.min(1, t / att); }
      }
    };
    const noise = (d, dur, gain, cut = 0.5) => { let lp = 0; const n = Math.floor(dur * sr); for (let i = 0; i < Math.min(n, d.length); i++) { lp += (rnd() - lp) * cut; d[i] += lp * gain * (1 - i / n) ** 2; } };
    const glide = (d, f0, ratio, glideT, parts, gain) => {
      for (const [m, a, dec] of parts) {
        let ph = 0;
        for (let i = 0; i < d.length; i++) { const t = i / sr; const f = f0 * m * (1 + (ratio - 1) * Math.min(1, t / glideT) ** 0.7); ph += 2 * Math.PI * f / sr; d[i] += Math.sin(ph) * a * gain * Math.exp(-t / dec) * Math.min(1, t / 0.003); }
      }
    };
    const B = {};
    B.Na = make(0.9, (d) => { modes(d, D, [[1, 0.22, 0.3], [2, 0.9, 0.42], [3, 0.5, 0.3], [4, 0.3, 0.22], [5, 0.18, 0.16], [6, 0.08, 0.1]], 0.55); noise(d, 0.01, 0.35, 0.8); });
    B.Tin = make(1.3, (d) => { modes(d, D, [[1, 0.6, 0.75], [2, 0.85, 0.65], [3, 0.4, 0.45], [4, 0.2, 0.3], [5, 0.1, 0.2]], 0.5, 0.004); noise(d, 0.012, 0.18, 0.5); });
    B.Tun = make(1.6, (d) => { modes(d, D, [[1, 1, 1.1], [2, 0.3, 0.6], [3, 0.12, 0.4]], 0.55, 0.004); noise(d, 0.01, 0.15, 0.3); });
    B.Te = make(0.2, (d) => { noise(d, 0.05, 0.6, 0.45); modes(d, D, [[1, 0.25, 0.04], [2.3, 0.15, 0.03]], 0.6); });
    B.Ra = make(0.18, (d) => { noise(d, 0.04, 0.45, 0.6); modes(d, D, [[1, 0.2, 0.03]], 0.6); });
    B.Ke = make(0.25, (d) => { noise(d, 0.05, 0.6, 0.12); modes(d, Bf, [[1, 0.6, 0.05], [1.6, 0.2, 0.03]], 0.6); });
    B.Ge = make(1.4, (d) => { glide(d, Bf, 1.22, 0.32, [[1, 1, 0.75], [1.52, 0.22, 0.4], [2.0, 0.12, 0.3]], 0.75); noise(d, 0.015, 0.25, 0.15); });
    const mix = (...arr) => { const n = Math.max(...arr.map((a) => a.length)); const d = new Float32Array(n); for (const a of arr) for (let i = 0; i < a.length; i++) d[i] += a[i]; return d; };
    B.Dha = mix(B.Na, B.Ge);
    B.Dhin = mix(B.Tin, B.Ge);
    B.Dhi = mix(B.Tin, B.Ge);
    B.Ti = B.Te; B.Ta = B.Na; B.Tu = B.Tun; B.Ki = B.Ke; B.Ka = B.Ke; B.Kat = B.Ke; B.Gha = B.Ge;
    B.Manjira = make(1.2, (d) => { modes(d, 2350, [[1, 0.3, 0.6], [1.47, 0.22, 0.45], [2.09, 0.16, 0.35], [2.74, 0.1, 0.25], [3.6, 0.06, 0.2]], 0.35, 0.0008); noise(d, 0.01, 0.2, 0.9); });
    this.bufs = {};
    for (const k of Object.keys(B)) this.bufs[k] = bufferFrom(ctx, B[k]);
  }
  hit(bol, t = this.audio.now, gain = 1) {
    this.ensureTuned();
    if (bol === 'Tirakita') { const step = 0.075; ['Ti', 'Ra', 'Ki', 'Ta'].forEach((b, i) => this.hit(b === 'Ta' ? 'Te' : b, t + i * step, 0.7)); return; }
    const buf = this.bufs[bol]; if (!buf) return;
    const ctx = this.audio.ctx;
    const s = ctx.createBufferSource(); s.buffer = buf;
    s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.006;
    const g = ctx.createGain(); g.gain.value = gain * (0.85 + Math.random() * 0.15);
    s.connect(g).connect(this.out); s.start(t);
  }
  start() {
    this.ensureTuned();
    this.playing = true;
    this.beat = 0;
    this.next = this.audio.now + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 40);
    this.emit();
  }
  stop() { this.playing = false; clearInterval(this.timer); this.emit(); }
  emit() { for (const f of this.listeners) f({ playing: this.playing }); }
  schedule() {
    if (!this.playing) return;
    const T = TAALS[this.taal];
    const spb = 60 / this.bpm;
    const ahead = document.hidden ? 4 : 0.25;
    if (Math.abs(this.getSa() - this.tunedFor) > 0.01) this.ensureTuned();
    while (this.next < this.audio.now + ahead) {
      const idx = this.beat % T.beats;
      const parts = T.bols[idx].split(' ');
      parts.forEach((b, i) => this.hit(b === 'Ki' ? 'Ke' : b, this.next + (i * spb) / parts.length, i ? 0.8 : 1));
      if (this.manjira && T.marks[idx + 1] && T.marks[idx + 1] !== '0') this.hit('Manjira', this.next, idx === 0 ? 0.5 : 0.3);
      const at = this.next;
      setTimeout(() => { for (const f of this.listeners) f({ beat: idx }); }, Math.max(0, (at - this.audio.now) * 1000));
      this.next += spb;
      this.beat++;
    }
  }
}

// ---------------------------------------------------------------------------
// Sitar: a buzzy jawari pluck rendered once by the tanpura worker, then pitched.
export class Sitar {
  constructor(audio, tanpura) {
    this.audio = audio; this.tanpura = tanpura;
    this.buf = null; this.thaat = 'Bilawal'; this.meend = true; this.last = null;
    this.reqId = 0;
  }
  init() {
    if (this.out) return;
    const ctx = this.audio.ensure();
    this.out = bus(this.audio, 0.3, 0.75);
    try { this.worker = new Worker(new URL('./tanpura-worker.js', import.meta.url)); this.worker.onmessage = (e) => { if (e.data.id === this.reqId) this.buf = bufferFrom(ctx, e.data.bufs[0]); }; } catch (e) {}
  }
  ensure() {
    this.init();
    const f = this.tanpura.saFreq() * 2;
    if (this.forF && Math.abs(this.forF - f) < 0.01) return;
    this.forF = f;
    this.worker && this.worker.postMessage({ id: ++this.reqId, sr: this.audio.ctx.sampleRate, strings: [{ f0: f, dur: 3.6, tau1: 1.9, jawari: 1.15, bright: 1.0, seed: 5, pluck: 0.07, gain: 1 }] });
  }
  semis(oct, deg) { return oct * 12 + THAATS[this.thaat][deg]; }
  play(semi) {
    this.ensure();
    if (!this.buf) return;
    const ctx = this.audio.ctx, t = ctx.currentTime;
    const rate = Math.pow(2, (semi - 12) / 12);
    if (this.meend && this.last && t - this.last.t < 0.35 && this.last.src) {
      // glide the ringing string to the new note (meend)
      this.last.src.playbackRate.cancelScheduledValues(t);
      this.last.src.playbackRate.setValueAtTime(this.last.rate, t);
      this.last.src.playbackRate.linearRampToValueAtTime(rate, t + 0.16);
      this.last.g.gain.setTargetAtTime(this.last.g.gain.value * 0.95, t, 0.1);
      this.last.rate = rate; this.last.t = t;
      return;
    }
    const s = ctx.createBufferSource(); s.buffer = this.buf; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = 0.9;
    s.connect(g).connect(this.out); s.start(t);
    this.last = { src: s, g, rate, t };
  }
}

// ---------------------------------------------------------------------------
export class Flute {
  constructor(audio, getSa) { this.audio = audio; this.getSa = getSa; this.thaat = 'Bilawal'; this.held = new Set(); }
  init() {
    if (this.out) return;
    const ctx = this.audio.ensure();
    this.out = bus(this.audio, 0.45, 0.6);
    const o = this.osc = ctx.createOscillator(); o.type = 'sine';
    const o2 = this.osc2 = ctx.createOscillator(); o2.type = 'triangle';
    const g2 = ctx.createGain(); g2.gain.value = 0.12;
    const n = ctx.createBufferSource(); n.buffer = this.audio.noiseBuf; n.loop = true;
    const nf = this.nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.Q.value = 3; nf.frequency.value = 1500;
    const ng = ctx.createGain(); ng.gain.value = 0.14;
    const vib = this.vib = ctx.createOscillator(); vib.frequency.value = 5.3;
    this.vibG = ctx.createGain(); this.vibG.gain.value = 0;
    vib.connect(this.vibG); this.vibG.connect(o.frequency); this.vibG.connect(o2.detune);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    this.amp = ctx.createGain(); this.amp.gain.value = 0;
    o.connect(lp); o2.connect(g2).connect(lp); n.connect(nf).connect(ng).connect(lp);
    lp.connect(this.amp).connect(this.out);
    o.start(); o2.start(); n.start(); vib.start();
  }
  semis(oct, deg) { return oct * 12 + THAATS[this.thaat][deg]; }
  on(semi) {
    this.init();
    const ctx = this.audio.ctx, t = ctx.currentTime;
    const f = this.getSa() * 2 * Math.pow(2, semi / 12);
    const legato = this.held.size > 0;
    this.held.add(semi); this.cur = semi;
    this.osc.frequency.cancelScheduledValues(t); this.osc2.frequency.cancelScheduledValues(t);
    this.osc.frequency.setTargetAtTime(f, t, legato ? 0.05 : 0.008);
    this.osc2.frequency.setTargetAtTime(f * 2, t, legato ? 0.05 : 0.008);
    this.nf.frequency.setTargetAtTime(f * 2.2, t, 0.02);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setTargetAtTime(0.5, t, legato ? 0.03 : 0.06);
    this.vibG.gain.cancelScheduledValues(t);
    this.vibG.gain.setValueAtTime(0, t); this.vibG.gain.linearRampToValueAtTime(f * 0.012, t + 0.6);
  }
  off(semi) {
    this.held.delete(semi);
    if (this.held.size || !this.amp) return;
    const t = this.audio.ctx.currentTime;
    this.amp.gain.setTargetAtTime(0, t, 0.08);
  }
}

// ---------------------------------------------------------------------------
export class Piano {
  constructor(audio, getSa) { this.audio = audio; this.getSa = getSa; this.cache = new Map(); this.octave = 0; this.sustain = false; this.active = new Map(); }
  init() { if (!this.out) { this.audio.ensure(); this.out = bus(this.audio, 0.25, 0.7); } }
  render(f) {
    const ctx = this.audio.ctx, sr = ctx.sampleRate;
    const key = Math.round(f * 100);
    if (this.cache.has(key)) return this.cache.get(key);
    const dur = Math.max(1.8, Math.min(5, 5 - Math.log2(f / 110) * 1.1));
    const n = Math.floor(dur * sr), d = new Float32Array(n);
    const Bc = 0.00028 * Math.pow(f / 261, 0.6);
    const K = Math.min(24, Math.floor(9000 / f));
    for (let k = 1; k <= K; k++) {
      const fk = f * k * Math.sqrt(1 + Bc * k * k);
      const a = Math.pow(k, -1.1) * Math.exp(-k / (8 + 120 / Math.sqrt(f))) * (k === 1 ? 1 : 0.8);
      const t1 = (2.2 - Math.log2(f / 110) * 0.35) / (1 + 0.12 * k), t2 = t1 * 4;
      for (const det of [-0.8, 0.0, 0.9]) {
        const w = 2 * Math.PI * fk * Math.pow(2, det / 1200) / sr;
        for (let i = 0; i < n; i++) { const t = i / sr; d[i] += Math.sin(w * i) * a * (0.65 * Math.exp(-t / t1) + 0.35 * Math.exp(-t / t2)) * Math.min(1, t / 0.002) / 3; }
      }
    }
    for (let i = 0; i < 0.006 * sr; i++) d[i] += (Math.random() * 2 - 1) * 0.04 * (1 - i / (0.006 * sr));
    for (let i = 0; i < 0.1 * sr; i++) d[n - 1 - i] *= i / (0.1 * sr);
    const b = bufferFrom(ctx, d);
    this.cache.set(key, b);
    return b;
  }
  freq(semi) { return this.getSa() * Math.pow(2, (semi + this.octave * 12) / 12); }
  warm(range = [-12, 24]) {
    this.init();
    let s = range[0];
    const step = () => { if (s > range[1]) return; this.render(this.freq(s)); s++; setTimeout(step, 30); };
    step();
  }
  on(semi, vel = 0.9) {
    this.init();
    const ctx = this.audio.ctx;
    const b = this.render(this.freq(semi));
    const s = ctx.createBufferSource(); s.buffer = b;
    const g = ctx.createGain(); g.gain.value = vel * 0.9;
    s.connect(g).connect(this.out); s.start();
    this.off(semi, true);
    this.active.set(semi, { s, g });
  }
  off(semi, force = false) {
    const a = this.active.get(semi); if (!a) return;
    if (this.sustain && !force) return;
    this.active.delete(semi);
    const t = this.audio.ctx.currentTime;
    a.g.gain.setTargetAtTime(0, t, force ? 0.03 : 0.12); a.s.stop(t + 1);
  }
}

// ---------------------------------------------------------------------------
export class Manjira {
  constructor(tabla) { this.tabla = tabla; }
  hit() { this.tabla.hit('Manjira', undefined, 0.6); }
}
