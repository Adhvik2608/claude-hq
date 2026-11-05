import { NOTE_NAMES } from '../config.js';

// Tanpura player.
//  - "model": a studio-modelled four-string tanpura rendered in a worker.
//  - "recording": your own tanpura recording (e.g. the exact one you love), looped
//    seamlessly and retuned to any Sa by resampling, with an equal-power crossfade
//    at the same playhead so a key change never sounds like a restart.

const FIRST = { P: 3 / 4, M: 2 / 3, N: 15 / 16, n: 8 / 9, D: 5 / 6, S: 1 / 2 };
export const FIRST_LABELS = [['P', 'Pa'], ['M', 'Ma'], ['N', 'Ni'], ['n', 'ni (komal)'], ['D', 'Dha'], ['S', 'Sa']];
const DEFAULTS = { key: 0, register: 'male', cents: 0, a4: 440, first: 'P', tempo: 4.6, volume: 0.8, jawari: 0.75, bright: 0.55, reverb: 0.45, source: 'model', recKey: 2, recCents: 0, recRegister: 'male', customHz: 0 };

export class Tanpura {
  constructor(audio) {
    this.audio = audio;
    this.state = { ...DEFAULTS };
    try { Object.assign(this.state, JSON.parse(localStorage.getItem('dh.tanpura') || '{}')); } catch (e) {}
    this.state.source = 'model';
    this.playing = false;
    this.voices = [];
    this.gen = 0;
    this.buffers = null;
    this.bufGen = -1;
    this.nextTime = 0;
    this.step = 0;
    this.listeners = new Set();
    this.pluckListeners = new Set();
    this.reqId = 0;
    this.rec = null;
    this._restoreRecording();
    this._loadManifest();
  }

  // ---------- pitch helpers
  midi(key = this.state.key, register = this.state.register) {
    const base = key <= 7 ? 48 + key : 36 + key; // G#2 .. G3 for a male voice
    return base + (register === 'female' ? 12 : 0);
  }
  saFreq() {
    const s = this.state;
    if (s.customHz > 0) return s.customHz;
    return s.a4 * Math.pow(2, (this.midi() - 69 + s.cents / 100) / 12);
  }
  keyLabel() { return NOTE_NAMES[this.state.key].replace('#', '♯'); }

  on(fn) { this.listeners.add(fn); }
  onPluck(fn) { this.pluckListeners.add(fn); }
  emit() { for (const f of this.listeners) f(this); try { localStorage.setItem('dh.tanpura', JSON.stringify({ ...this.state, source: undefined })); } catch (e) {} }

  set(p) {
    const s = this.state, before = { ...s };
    Object.assign(s, p);
    if ('customHz' in p && p.customHz > 0) {
      // snap custom Sa into key + cents so all instruments follow it
      const m = 69 + 12 * Math.log2(p.customHz / s.a4);
      let r = Math.round(m);
      s.cents = Math.round((m - r) * 100);
      let k = ((r % 12) + 12) % 12;
      s.key = k;
      s.register = r - (k <= 7 ? 48 + k : 36 + k) >= 6 ? 'female' : 'male';
    } else if ('key' in p || 'cents' in p || 'register' in p || 'a4' in p) s.customHz = 0;
    const pitchChanged = before.key !== s.key || before.register !== s.register || before.first !== s.first || before.a4 !== s.a4 || before.customHz !== s.customHz;
    const timbreChanged = before.jawari !== s.jawari || before.bright !== s.bright;
    if (this.audio.ctx) {
      if (this.out) this.out.gain.setTargetAtTime(s.volume, this.audio.now, 0.08);
      if (this.send) this.send.gain.setTargetAtTime(s.reverb * 0.55, this.audio.now, 0.1);
      if (before.cents !== s.cents && !pitchChanged) this._detuneLive();
      if (pitchChanged || timbreChanged) { this._render(); this._retuneRecording(); }
    }
    this.emit();
  }

  // ---------- audio graph
  _graph() {
    if (this.out) return;
    const a = this.audio; a.ensure();
    const ctx = a.ctx;
    this.out = ctx.createGain(); this.out.gain.value = this.state.volume;
    let node = this.in = ctx.createGain();
    for (const [type, f, g, q] of [['peaking', 205, 3, 1], ['peaking', 520, 1.5, 1.2], ['peaking', 1350, 2.5, 1.3], ['highshelf', 7500, -2.5, 0.7], ['lowshelf', 70, -2, 0.7]]) {
      const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.gain.value = g; b.Q.value = q;
      node.connect(b); node = b;
    }
    node.connect(this.out);
    this.out.connect(a.music);
    this.send = ctx.createGain(); this.send.gain.value = this.state.reverb * 0.55;
    this.out.connect(this.send).connect(a.reverb);
    this.pans = [-0.28, -0.08, 0.1, 0.26].map((p) => { const sp = ctx.createStereoPanner(); sp.pan.value = p; sp.connect(this.in); return sp; });
    try { this.worker = new Worker(new URL('./tanpura-worker.js', import.meta.url)); this.worker.onmessage = (e) => this._onRendered(e.data); }
    catch (e) { console.warn('Tanpura worker unavailable', e); }
  }

  _strings() {
    const s = this.state;
    const sa = s.customHz > 0 ? s.customHz : s.a4 * Math.pow(2, (this.midi() - 69) / 12); // cents applied live via detune
    const fem = s.register === 'female';
    const tau = fem ? 0.85 : 1;
    const ratio = FIRST[s.first] ?? 0.75;
    return [
      { f0: sa * ratio, dur: 8.5, tau1: 5.6 * tau, jawari: s.jawari, bright: s.bright, seed: 11, pluck: 0.14, gain: 0.92 },
      { f0: sa * Math.pow(2, 1.0 / 1200), dur: 8, tau1: 5.2 * tau, jawari: s.jawari, bright: s.bright, seed: 23, pluck: 0.13, gain: 0.82 },
      { f0: sa * Math.pow(2, -1.4 / 1200), dur: 8, tau1: 5.2 * tau, jawari: s.jawari, bright: s.bright * 0.95, seed: 37, pluck: 0.15, gain: 0.82 },
      { f0: sa / 2, dur: 10, tau1: 7.2 * tau, jawari: s.jawari * 0.9, bright: s.bright * 0.85, seed: 41, pluck: 0.12, gain: 1.0 },
    ];
  }

  _render() {
    if (!this.worker) return;
    this.bufGenRendered = this._sig();
    const id = ++this.reqId;
    this.pending = id;
    this.worker.postMessage({ id, sr: this.audio.ctx.sampleRate, strings: this._strings() });
  }

  _onRendered({ id, bufs }) {
    if (id !== this.reqId) return;
    const ctx = this.audio.ctx;
    this.buffers = bufs.map((d) => { const b = ctx.createBuffer(1, d.length, ctx.sampleRate); b.copyToChannel(d, 0); return b; });
    this.gen++;
    this.pending = 0;
    this.emit();
  }

  _detuneLive() {
    const t = this.audio.now;
    for (const v of this.voices) v.src.detune.setTargetAtTime(this.state.cents, t, 0.15);
    if (this.rec && this.recSrc) this._retuneRecording();
  }

  // ---------- transport
  async play() {
    this.audio.resume();
    this._graph();
    if (this.state.source === 'recording' && this.rec) { this._startRecording(); this.playing = true; this.emit(); return; }
    if (!this.buffers || this.bufGenRendered !== this._sig()) this._render();
    this.playing = true;
    this.nextTime = this.audio.now + 0.12;
    this.step = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => this._schedule(), 50);
    this.emit();
  }
  _sig() { const s = this.state; return [s.key, s.register, s.first, s.a4, s.customHz, s.jawari, s.bright].join('|'); }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    const t = this.audio.now;
    for (const v of this.voices) { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.35); }
    this._stopRecording(1.2);
    this.emit();
  }

  toggle() { this.playing ? this.stop() : this.play(); }

  _schedule() {
    if (!this.playing || !this.buffers) return;
    const ctx = this.audio.ctx;
    const ahead = document.hidden ? 14 : 0.45;
    const C = this.state.tempo;
    const offs = [0, 0.3, 0.46, 0.64];
    while (this.nextTime < ctx.currentTime + ahead) {
      const idx = this.step % 4;
      this._pluck(idx, this.nextTime);
      const cur = offs[idx], nxt = idx === 3 ? 1 : offs[idx + 1];
      const human = 1 + (Math.random() - 0.5) * 0.03;
      this.nextTime += (nxt - cur) * C * human;
      this.step++;
    }
    // prune finished voices
    const now = ctx.currentTime;
    this.voices = this.voices.filter((v) => v.end > now);
  }

  _pluck(i, t) {
    const ctx = this.audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.buffers[i];
    src.detune.value = this.state.customHz > 0 ? 0 : this.state.cents;
    const g = ctx.createGain();
    const vel = 0.82 + Math.random() * 0.18;
    g.gain.value = vel;
    src.connect(g).connect(this.pans[i]);
    src.start(t);
    const v = { src, g, gen: this.gen, end: t + src.buffer.duration };
    // after a retune, older voices melt away as the first new pluck arrives
    for (const o of this.voices) if (o.gen !== this.gen && !o.fading) { o.fading = true; o.g.gain.setTargetAtTime(0, t, 0.55); }
    this.voices.push(v);
    const delay = Math.max(0, (t - ctx.currentTime) * 1000);
    if (delay < 2000) setTimeout(() => { for (const f of this.pluckListeners) f(i); }, delay);
  }

  // ---------- recorded tanpura
  async loadRecording(arrayBuffer, name = 'Your recording', meta = null) {
    this.audio.resume();
    this._graph();
    const ctx = this.audio.ctx;
    const raw = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const loop = makeLoop(ctx, raw);
    this.rec = { buffer: loop, name };
    if (meta) Object.assign(this.state, meta);
    else {
      const d = detectSa(raw);
      if (d) { this.state.recKey = d.key; this.state.recCents = d.cents; this.state.recRegister = d.register; }
    }
    this._saveRecording(arrayBuffer, name);
    this.state.source = 'recording';
    if (this.playing) { this.stop(); setTimeout(() => this.play(), 400); }
    this.emit();
    return this.state;
  }

  recRate() {
    const s = this.state;
    const recMidi = this.midi(s.recKey, s.recRegister) + s.recCents / 100;
    let target = Math.log2(this.saFreq() / s.a4) * 12 + 69;
    // retune by the smallest interval (octave-equivalent) to keep the timbre natural
    let diff = target - recMidi;
    while (diff > 6) diff -= 12;
    while (diff < -6) diff += 12;
    return Math.pow(2, diff / 12);
  }

  _startRecording() {
    const ctx = this.audio.ctx;
    this._stopRecording(0.05);
    const src = ctx.createBufferSource(); src.buffer = this.rec.buffer; src.loop = true;
    const rate = this.recRate();
    src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(g).connect(this.in);
    const t = ctx.currentTime + 0.05;
    src.start(t, 0);
    g.gain.setTargetAtTime(1, t, 0.4);
    this.recSrc = { src, g, rate, t0: t, off: 0 };
    clearInterval(this.recTimer);
    this.recTimer = setInterval(() => { for (const f of this.pluckListeners) f(Math.floor(Math.random() * 4)); }, this.state.tempo * 250);
  }

  _stopRecording(fade = 0.5) {
    clearInterval(this.recTimer);
    if (!this.recSrc) return;
    const r = this.recSrc; this.recSrc = null;
    const t = this.audio.now;
    r.g.gain.cancelScheduledValues(t); r.g.gain.setTargetAtTime(0, t, fade / 3);
    r.src.stop(t + fade * 2);
  }

  _retuneRecording() {
    if (!this.recSrc || !this.rec) return;
    const ctx = this.audio.ctx;
    const old = this.recSrc;
    const now = ctx.currentTime + 0.02;
    const len = this.rec.buffer.duration;
    const pos = (old.off + (now - old.t0) * old.rate) % len;
    const rate = this.recRate();
    if (Math.abs(rate - old.rate) < 1e-4) return;
    const src = ctx.createBufferSource(); src.buffer = this.rec.buffer; src.loop = true; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(g).connect(this.in);
    src.start(now, pos);
    // equal-power crossfade at the same playhead
    const X = 1.1, n = 32;
    const cin = new Float32Array(n), cout = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i / (n - 1); cin[i] = Math.sin(x * Math.PI / 2); cout[i] = Math.cos(x * Math.PI / 2); }
    g.gain.setValueCurveAtTime(cin, now, X);
    old.g.gain.cancelScheduledValues(now);
    old.g.gain.setValueAtTime(old.g.gain.value, now);
    old.g.gain.setValueCurveAtTime(cout.map((v) => v * Math.max(0.001, old.g.gain.value)), now, X);
    old.src.stop(now + X + 0.1);
    this.recSrc = { src, g, rate, t0: now, off: pos };
  }

  useSource(src) {
    if (src === 'recording' && !this.rec) return;
    const wasPlaying = this.playing;
    if (wasPlaying) this.stop();
    this.state.source = src;
    this.emit();
    if (wasPlaying) setTimeout(() => this.play(), 450);
  }

  // ---------- persistence of the recording (IndexedDB)
  _db() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('dream-house', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('files');
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  }
  async _saveRecording(buf, name) {
    try { const db = await this._db(); const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put({ buf, name, meta: { recKey: this.state.recKey, recCents: this.state.recCents, recRegister: this.state.recRegister } }, 'tanpura'); } catch (e) {}
  }
  async _restoreRecording() {
    try {
      const db = await this._db();
      const req = db.transaction('files').objectStore('files').get('tanpura');
      req.onsuccess = () => { const v = req.result; if (v && v.buf) this._pendingRec = v; this.emit(); };
    } catch (e) {}
  }
  async forgetRecording() {
    this.rec = null; this._pendingRec = null; this.useSource('model');
    try { const db = await this._db(); db.transaction('files', 'readwrite').objectStore('files').delete('tanpura'); } catch (e) {}
    this.emit();
  }
  async activatePendingRecording() {
    const v = this._pendingRec || this._manifestRec;
    if (!v) return false;
    await this.loadRecording(v.buf, v.name, v.meta);
    return true;
  }
  hasRecording() { return !!(this.rec || this._pendingRec || this._manifestRec); }
  recordingName() { return (this.rec || this._pendingRec || this._manifestRec || {}).name; }

  // Optional drop-in file: assets/audio/tanpura.json -> { "file": "tanpura.mp3", "sa": "C#", "cents": 0, "register": "male" }
  async _loadManifest() {
    try {
      const r = await fetch('assets/audio/tanpura.json', { cache: 'no-cache' });
      if (!r.ok) return;
      const m = await r.json();
      const fr = await fetch('assets/audio/' + m.file);
      if (!fr.ok) return;
      const buf = await fr.arrayBuffer();
      const key = Math.max(0, NOTE_NAMES.indexOf((m.sa || 'C').toUpperCase().replace('♯', '#')));
      this._manifestRec = { buf, name: m.name || m.file, meta: { recKey: key, recCents: m.cents || 0, recRegister: m.register || 'male' } };
      this.emit();
    } catch (e) {}
  }
}

// Build a seamless loop by crossfading the tail into the head.
function makeLoop(ctx, b) {
  const sr = b.sampleRate, L = b.length;
  const X = Math.min(Math.floor(2.0 * sr), Math.floor(L * 0.15));
  const out = ctx.createBuffer(b.numberOfChannels, L - X, sr);
  for (let c = 0; c < b.numberOfChannels; c++) {
    const s = b.getChannelData(c), d = out.getChannelData(c);
    for (let i = 0; i < X; i++) { const x = i / X; d[i] = s[i] * Math.sin(x * Math.PI / 2) + s[L - X + i] * Math.cos(x * Math.PI / 2); }
    for (let i = X; i < L - X; i++) d[i] = s[i];
  }
  return out;
}

// Estimate the Sa of a tanpura recording from its pitch-class energy (Sa strings dominate; Pa reinforces).
export function detectSa(b) {
  const sr = b.sampleRate;
  const ch = b.getChannelData(0);
  const start = Math.floor(Math.min(b.length * 0.1, sr)), len = Math.min(b.length - start, Math.floor(sr * 4));
  if (len < sr) return null;
  const dec = 4, n = Math.floor(len / dec), x = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) { for (let j = 0; j < dec; j++) lp += (ch[start + i * dec + j] - lp) * 0.3; x[i] = lp; }
  const fs = sr / dec;
  const energy = (f) => {
    const w = 2 * Math.PI * f / fs, c = 2 * Math.cos(w);
    let s1 = 0, s2 = 0;
    for (let i = 0; i < n; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
    return s1 * s1 + s2 * s2 - c * s1 * s2;
  };
  const scores = [];
  for (let m10 = 0; m10 < 120; m10++) { // pitch classes in 10-cent steps
    const pc = m10 / 10;
    let e = 0;
    for (let oct = 2; oct <= 4; oct++) {
      const midi = 12 * (oct + 1) + pc;
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      e += energy(f) * (oct === 3 ? 1.2 : 1);
    }
    scores.push(e);
  }
  let best = 0, bestScore = -1;
  for (let i = 0; i < 120; i++) {
    const s = scores[i] + 0.45 * scores[(i + 70) % 120];
    if (s > bestScore) { bestScore = s; best = i; }
  }
  const pc = best / 10;
  let key = Math.round(pc) % 12;
  const cents = Math.round((pc - Math.round(pc)) * 100);
  // register from the strongest octave of Sa
  const e2 = energy(440 * Math.pow(2, (36 + key - 69) / 12)), e3 = energy(440 * Math.pow(2, (48 + key - 69) / 12)), e4 = energy(440 * Math.pow(2, (60 + key - 69) / 12));
  const register = e4 > e3 * 1.3 && e4 > e2 ? 'female' : 'male';
  return { key, cents, register };
}
