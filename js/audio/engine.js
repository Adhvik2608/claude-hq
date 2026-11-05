// Shared Web Audio graph: master bus, hall reverb, synthesized sound effects and ambience.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.9;
    this.ambienceOn = true;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.25;
    this.master.connect(comp).connect(ctx.destination);
    // buses
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.8; this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = 1; this.music.connect(this.master);
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(2.8, 2.2);
    this.reverbOut = ctx.createGain(); this.reverbOut.gain.value = 0.9;
    this.reverb.connect(this.reverbOut).connect(this.master);
    this.roomVerb = ctx.createConvolver(); this.roomVerb.buffer = this.impulse(1.2, 3.5);
    this.roomVerb.connect(this.master);
    this.noiseBuf = this.makeNoise(2);
    this.amb = { birds: 0, crickets: 0, nextBird: 0 };
    this.startAmbience();
    return ctx;
  }

  resume() { const c = this.ensure(); if (c && c.state !== 'running') c.resume(); }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.05); }
  setMuted(m) { this.muted = m; this.setVolume(this.volume); }

  impulse(seconds, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(seconds * rate);
    const buf = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = Math.random() * 2 - 1;
        const k = 0.25 + 0.7 * (1 - t);   // darker tail
        lp += (n - lp) * k;
        const early = i < rate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 3 : 0;
        d[i] = (lp + early) * Math.pow(1 - t, decay) * (i < 40 ? i / 40 : 1);
      }
    }
    return buf;
  }

  makeNoise(sec) {
    const ctx = this.ctx, len = Math.floor(sec * ctx.sampleRate);
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // generic helpers --------------------------------------------------------
  noise(dest, { t = this.now, dur = 0.1, type = 'bandpass', f = 1000, q = 1, gain = 0.3, attack = 0.002, f2 = null, rev = 0 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    src.loop = dur > 1.8;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(flt).connect(g).connect(dest);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(this.reverb); }
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
    return g;
  }

  tone(dest, { t = this.now, f = 440, dur = 0.3, gain = 0.2, type = 'sine', attack = 0.003, f2 = null, rev = 0, detune = 0 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(dest);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; g.connect(s).connect(this.reverb); }
    o.start(t); o.stop(t + dur + 0.05);
    return g;
  }

  // sound effects ------------------------------------------------------------
  footstep(tag = 'stone', run = false, water = false) {
    if (!this.ctx) return;
    const v = run ? 1.25 : 1, d = this.sfx;
    const j = 0.85 + Math.random() * 0.3;
    if (water) { this.noise(d, { dur: 0.35, type: 'lowpass', f: 1800 * j, f2: 400, gain: 0.22 * v, attack: 0.02 }); return; }
    switch (tag) {
      case 'wood': this.noise(d, { dur: 0.09, f: 700 * j, q: 1.4, gain: 0.16 * v }); this.tone(d, { f: 110 * j, dur: 0.07, gain: 0.12 * v }); break;
      case 'grass': this.noise(d, { dur: 0.13, type: 'highpass', f: 2200 * j, gain: 0.05 * v, attack: 0.015 }); break;
      case 'metal': case 'lift': this.noise(d, { dur: 0.08, f: 2600 * j, q: 4, gain: 0.08 * v }); break;
      case 'fabric': this.noise(d, { dur: 0.08, type: 'lowpass', f: 500 * j, gain: 0.08 * v }); break;
      default: this.noise(d, { dur: 0.07, f: 2400 * j, q: 1.6, gain: 0.08 * v, rev: 0.08 }); this.noise(d, { dur: 0.04, type: 'highpass', f: 5000, gain: 0.03 * v });
    }
  }
  jump() { if (!this.ctx) return; this.noise(this.sfx, { dur: 0.18, type: 'bandpass', f: 600, f2: 1600, gain: 0.05, attack: 0.03 }); }
  land(tag) { if (!this.ctx) return; this.tone(this.sfx, { f: 90, f2: 50, dur: 0.15, gain: 0.25 }); this.footstep(tag, true); }
  ui() { if (!this.ctx) return; this.tone(this.sfx, { f: 1320, dur: 0.06, gain: 0.04 }); }
  door(glass) {
    if (!this.ctx) return;
    if (glass) this.noise(this.sfx, { dur: 0.7, type: 'bandpass', f: 1200, f2: 3000, q: 0.7, gain: 0.05, attack: 0.15 });
    else { this.noise(this.sfx, { dur: 0.5, type: 'bandpass', f: 380, f2: 520, q: 6, gain: 0.05, attack: 0.1 }); this.tone(this.sfx, { f: 70, dur: 0.12, gain: 0.08, t: this.now + 0.05 }); }
  }
  liftDoor() { if (!this.ctx) return; this.noise(this.sfx, { dur: 0.9, type: 'bandpass', f: 900, f2: 2200, q: 0.8, gain: 0.05, attack: 0.25 }); }
  ding() {
    if (!this.ctx) return;
    const t = this.now;
    for (const [f, dt] of [[1318.5, 0], [1046.5, 0.32]]) for (const [m, a] of [[1, 0.12], [2.76, 0.03], [5.4, 0.012]]) this.tone(this.sfx, { t: t + dt, f: f * m, dur: 1.8 / m, gain: a, rev: 0.3 });
  }
  liftHum(on) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (on && !this.hum) {
      const o = ctx.createOscillator(); o.frequency.value = 62; const g = ctx.createGain(); g.gain.value = 0;
      const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 280;
      const ng = ctx.createGain(); ng.gain.value = 0.25;
      o.connect(g); n.connect(f).connect(ng).connect(g); g.connect(this.sfx);
      g.gain.setTargetAtTime(0.06, ctx.currentTime, 0.3);
      o.start(); n.start();
      this.hum = { o, n, g };
    } else if (!on && this.hum) {
      const h = this.hum; this.hum = null;
      h.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => { h.o.stop(); h.n.stop(); }, 1200);
    }
  }
  flush() { if (!this.ctx) return; this.noise(this.sfx, { dur: 3.2, type: 'lowpass', f: 2600, f2: 300, gain: 0.22, attack: 0.15, rev: 0.2 }); this.noise(this.sfx, { dur: 2.5, type: 'bandpass', f: 600, q: 2, gain: 0.08, attack: 0.4 }); }
  water(sec = 3) {
    if (!this.ctx) return;
    this.noise(this.sfx, { dur: sec, type: 'bandpass', f: 2200, q: 0.6, gain: 0.12, attack: 0.2, rev: 0.15 });
    this.noise(this.sfx, { dur: sec, type: 'lowpass', f: 900, gain: 0.08, attack: 0.25 });
  }
  splash() { if (!this.ctx) return; this.noise(this.sfx, { dur: 0.8, type: 'lowpass', f: 3000, f2: 300, gain: 0.3, attack: 0.01 }); }

  // Temple bell: inharmonic partials with slow beating
  bell(pitch = 1, big = false) {
    if (!this.ctx) return;
    const t = this.now;
    const f0 = (big ? 392 : 784) * pitch;
    const parts = [[0.5, 0.25, 6], [1, 0.3, 5], [1.183, 0.18, 4], [1.506, 0.14, 3.2], [2.0, 0.12, 2.6], [2.514, 0.1, 2], [2.662, 0.06, 1.7], [3.011, 0.05, 1.4], [4.166, 0.03, 1], [5.433, 0.02, 0.7]];
    for (const [m, a, d] of parts) {
      this.tone(this.sfx, { t, f: f0 * m, dur: d * (big ? 1.5 : 1), gain: a * 0.35, rev: 0.5, attack: 0.001 });
      this.tone(this.sfx, { t, f: f0 * m * 1.0025, dur: d * 0.9, gain: a * 0.12, attack: 0.001 });
    }
    this.noise(this.sfx, { t, dur: 0.03, type: 'highpass', f: 6000, gain: 0.15 });
  }

  // Shankh (conch): breathy brass-like tone with a rising pitch and vibrato
  conch() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = this.now, dur = 3.2;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(205, t); o.frequency.exponentialRampToValueAtTime(262, t + 0.6); o.frequency.setValueAtTime(262, t + dur - 0.6); o.frequency.exponentialRampToValueAtTime(240, t + dur);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = 3; vib.connect(vg).connect(o.frequency);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 2.5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 1150; f2.gain.value = 9; f2.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.35); g.gain.setValueAtTime(0.32, t + dur - 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f1).connect(f2).connect(g).connect(this.sfx);
    const s = ctx.createGain(); s.gain.value = 0.6; g.connect(s).connect(this.reverb);
    o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
    this.noise(this.sfx, { t, dur, type: 'bandpass', f: 900, q: 1, gain: 0.03, attack: 0.3 });
  }

  // ambience ---------------------------------------------------------------
  startAmbience() {
    const ctx = this.ctx;
    // wind / room tone
    const n = ctx.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    n.connect(f).connect(this.windGain).connect(this.sfx); n.start();
    // crickets: amplitude-modulated high tones
    const c = ctx.createOscillator(); c.frequency.value = 4400;
    const am = ctx.createOscillator(); am.frequency.value = 28; const amg = ctx.createGain(); amg.gain.value = 0.5;
    const cg = ctx.createGain(); cg.gain.value = 0.5;
    am.connect(amg).connect(cg.gain);
    this.cricketGain = ctx.createGain(); this.cricketGain.gain.value = 0;
    const chirp = ctx.createOscillator(); chirp.frequency.value = 2.2; const chg = ctx.createGain(); chg.gain.value = 0.5; chirp.connect(chg);
    const cg2 = ctx.createGain(); cg2.gain.value = 0.5; chg.connect(cg2.gain);
    c.connect(cg).connect(cg2).connect(this.cricketGain).connect(this.sfx);
    c.start(); am.start(); chirp.start();
    // water feature
    const wn = ctx.createBufferSource(); wn.buffer = this.noiseBuf; wn.loop = true;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 1600; wf.Q.value = 0.5;
    this.fountainGain = ctx.createGain(); this.fountainGain.gain.value = 0;
    wn.connect(wf).connect(this.fountainGain).connect(this.sfx); wn.start(0.5);
  }

  ambience(dt, { outdoors, night, fountain = 0 }) {
    if (!this.ctx || !this.ambienceOn) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(outdoors ? 0.035 : 0.006, t, 0.8);
    this.cricketGain.gain.setTargetAtTime(night > 0.5 ? (outdoors ? 0.012 : 0.003) : 0, t, 1.2);
    this.fountainGain.gain.setTargetAtTime(fountain * 0.05, t, 0.4);
    if (night < 0.5) {
      this.amb.nextBird -= dt;
      if (this.amb.nextBird < 0) {
        this.amb.nextBird = 1.5 + Math.random() * 5;
        this.bird(outdoors ? 0.05 : 0.012);
      }
    }
  }

  bird(gain) {
    const t = this.now;
    const base = 2600 + Math.random() * 1800;
    const n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.09 + Math.random() * 0.05);
      this.tone(this.sfx, { t: tt, f: base * (1 + Math.random() * 0.2), f2: base * (0.75 + Math.random() * 0.6), dur: 0.07 + Math.random() * 0.05, gain, attack: 0.01 });
    }
  }
}
