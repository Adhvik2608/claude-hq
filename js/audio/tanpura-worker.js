// Renders tanpura string plucks offline (additive synthesis with a moving
// "jawari" formant, two-polarisation shimmer and a soft finger pluck).

function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function renderString(o, sr) {
  const { f0, dur, tau1, jawari, bright, seed, pluck, gain } = o;
  const N = Math.floor(dur * sr);
  const out = new Float32Array(N);
  const r = rng(seed);
  const nyq = Math.min(10500, sr * 0.45);
  const K = Math.min(140, Math.floor(nyq / f0));
  const B = 4e-6;
  const BLK = 32;
  const Fh = 3600 + 1800 * bright, Fl = 520 + 300 * bright, tauC = 1.25 + tau1 * 0.12;
  const sig2 = 2 * 0.52 * 0.52;
  const tauJ = tau1 * 0.82;
  for (let k = 1; k <= K; k++) {
    const fk = k * f0 * Math.sqrt(1 + B * k * k) * (1 + (r() - 0.5) * 0.00025);
    if (fk >= nyq) break;
    const w = 2 * Math.PI * fk / sr;
    const c = Math.cos(w), s = Math.sin(w);
    const ph = r() * Math.PI * 2;
    let x = Math.cos(ph), y = Math.sin(ph);
    // plucked-string spectrum with a soft finger pad
    const P = Math.abs(Math.sin(Math.PI * k * pluck)) / Math.pow(k, 1.05) * Math.exp(-k / (26 + bright * 24));
    const tk = tau1 / (1 + 0.011 * Math.pow(k, 1.32));
    const jk = Math.pow(k, -0.55) * 0.42 * jawari;
    const lf = Math.log2(fk);
    // polarisation beating
    const dHz = 0.18 + r() * (0.5 + k * 0.02);
    const dph = r() * Math.PI * 2, depth = 0.12 + r() * 0.16;
    const dHz2 = 0.05 + r() * 0.15, depth2 = 0.06 * r();
    let a0 = 0;
    for (let i = 0; i < N; i += BLK) {
      const t = (i + BLK) / sr;
      const Fc = Fl + (Fh - Fl) * Math.exp(-t / tauC);
      const d = lf - Math.log2(Fc);
      const W = Math.exp(-(d * d) / sig2);
      const envJ = (1 - Math.exp(-t / 0.07)) * Math.exp(-t / tauJ);
      let a1 = P * Math.exp(-t / tk) + jk * W * envJ;
      a1 *= 1 + depth * Math.sin(2 * Math.PI * dHz * t + dph) + depth2 * Math.sin(2 * Math.PI * dHz2 * t);
      if (t < 0.004) a1 *= t / 0.004;
      if (a1 < 1e-6 && a0 < 1e-6 && t > 0.5) break;
      const end = Math.min(N, i + BLK);
      const step = (a1 - a0) / BLK;
      let a = a0;
      for (let j = i; j < end; j++) {
        const nx = x * c - y * s;
        y = x * s + y * c; x = nx;
        out[j] += y * a;
        a += step;
      }
      // renormalise the phasor
      const m = 1.5 - 0.5 * (x * x + y * y); x *= m; y *= m;
      a0 = a1;
    }
  }
  // finger noise transient
  let lp = 0, hp = 0;
  const nlen = Math.floor(0.018 * sr);
  for (let i = 0; i < nlen; i++) {
    const n = r() * 2 - 1;
    lp += (n - lp) * 0.35; hp = n - lp;
    out[i] += (lp * 0.5 + hp * 0.2) * 0.025 * (1 - i / nlen);
  }
  // gentle release at the very end
  const fade = Math.floor(0.2 * sr);
  for (let i = 0; i < fade; i++) out[N - 1 - i] *= i / fade;
  if (gain !== 1) for (let i = 0; i < N; i++) out[i] *= gain;
  return out;
}

self.onmessage = (e) => {
  const { id, sr, strings } = e.data;
  const bufs = strings.map((s) => renderString(s, sr));
  // common normalisation keeps the balance between strings
  let peak = 0;
  for (const b of bufs) for (let i = 0; i < b.length; i += 3) { const v = Math.abs(b[i]); if (v > peak) peak = v; }
  const g = peak > 0 ? 0.7 / peak : 1;
  for (const b of bufs) for (let i = 0; i < b.length; i++) b[i] *= g;
  self.postMessage({ id, bufs }, bufs.map((b) => b.buffer));
};
