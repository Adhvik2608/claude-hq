import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { installFakeDom } from '../helpers/env.js';
import { Tanpura, detectSa, FIRST_LABELS } from '../../js/audio/tanpura.js';
import { NOTE_NAMES } from '../../js/config.js';

installFakeDom();
const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, msg || `${a} ≉ ${b} (±${eps})`);
const fresh = (state = {}) => { localStorage.clear(); const t = new Tanpura({ ctx: null }); Object.assign(t.state, state); return t; };
const midiHz = (m, a4 = 440) => a4 * Math.pow(2, (m - 69) / 12);

// ------------------------------------------------------------ pitch maths
test('default scale is not D, and every key maps into a singable male register', () => {
  const t = fresh();
  assert.notEqual(t.state.key, NOTE_NAMES.indexOf('D'));
  for (let k = 0; k < 12; k++) {
    const m = t.midi(k, 'male');
    assert.ok(m >= 44 && m <= 55, `key ${NOTE_NAMES[k]} -> midi ${m}`);
    assert.equal(t.midi(k, 'female'), m + 12);
    assert.equal(((m % 12) + 12) % 12, k, 'pitch class matches the key');
  }
});

test('Sa frequency follows key, register, cents and concert A', () => {
  const t = fresh({ key: 9, register: 'male' });         // A
  close(t.saFreq(), 110, 1e-9);
  t.state.key = 1;                                        // C#
  close(t.saFreq(), midiHz(49), 1e-9);
  t.state.register = 'female';
  close(t.saFreq(), midiHz(61), 1e-9);
  t.state.cents = 100;                                    // +1 semitone
  close(t.saFreq(), midiHz(62), 1e-9);
  t.state.cents = 0; t.state.a4 = 432;
  close(t.saFreq(), midiHz(61, 432), 1e-9);
});

test('B and A are available (the scales asked for)', () => {
  const t = fresh();
  t.set({ key: NOTE_NAMES.indexOf('B') }); close(t.saFreq(), midiHz(47), 1e-9);
  t.set({ key: NOTE_NAMES.indexOf('A') }); close(t.saFreq(), midiHz(45), 1e-9);
});

test('custom Sa in Hz snaps into key + cents and is used exactly', () => {
  const t = fresh();
  t.set({ customHz: 146.83 });                           // D3
  assert.equal(t.state.key, 2);
  assert.equal(t.state.register, 'male');
  assert.ok(Math.abs(t.state.cents) <= 1);
  assert.equal(t.saFreq(), 146.83);
  t.set({ customHz: 293.66 });                           // D4 = female D
  assert.equal(t.state.key, 2);
  assert.equal(t.state.register, 'female');
  t.set({ customHz: 150 });                              // between D and D#
  assert.equal(t.state.key, 2);
  close(t.state.cents, 1200 * Math.log2(150 / 146.832), 1);
  // choosing a key afterwards clears the custom frequency
  t.set({ key: 4 });
  assert.equal(t.state.customHz, 0);
  close(t.saFreq(), midiHz(52 + t.state.cents / 100), 1e-9);
});

test('settings persist between visits', () => {
  localStorage.clear();
  const a = new Tanpura({ ctx: null });
  a.set({ key: 11, register: 'female', tempo: 5.2, first: 'M' });
  const b = new Tanpura({ ctx: null });
  assert.equal(b.state.key, 11);
  assert.equal(b.state.register, 'female');
  assert.equal(b.state.tempo, 5.2);
  assert.equal(b.state.first, 'M');
  assert.equal(b.state.source, 'model', 'source always starts on the built-in model');
});

test('recording retune uses the smallest interval (never more than a tritone)', () => {
  const t = fresh({ recKey: 2, recCents: 0, recRegister: 'male' });  // recording in D
  for (let k = 0; k < 12; k++) for (const reg of ['male', 'female']) {
    t.state.key = k; t.state.register = reg; t.state.customHz = 0; t.state.cents = 0;
    const semis = 12 * Math.log2(t.recRate());
    assert.ok(semis <= 6 + 1e-9 && semis >= -6 - 1e-9, `${NOTE_NAMES[k]} ${reg}: ${semis}`);
    const pc = ((Math.round(semis) + 2) % 12 + 12) % 12;
    assert.equal(pc, k, 'lands on the requested pitch class');
  }
  t.state.key = 2; t.state.register = 'male';
  close(t.recRate(), 1, 1e-12, 'same key plays untouched');
  t.state.cents = 25;
  close(t.recRate(), Math.pow(2, 0.25 / 12), 1e-12, 'fine tuning applies');
});

test('first-string choices produce the right ratio below Sa', () => {
  const ratios = { P: 3 / 4, M: 2 / 3, N: 15 / 16, n: 8 / 9, D: 5 / 6, S: 1 / 2 };
  assert.deepEqual(FIRST_LABELS.map(([k]) => k).sort(), Object.keys(ratios).sort());
  for (const [k, r] of Object.entries(ratios)) {
    const t = fresh({ key: 0, first: k });
    const s = t._strings();
    close(s[0].f0 / t.saFreq(), r, 1e-9, k);
    close(s[1].f0 / t.saFreq(), 1, 0.001);
    close(s[2].f0 / t.saFreq(), 1, 0.001);
    close(s[3].f0 / t.saFreq(), 0.5, 1e-9, 'kharaj is an octave below');
  }
});

// ------------------------------------------------------------ rendered audio
const ctx = { self: { postMessage(m) { ctx.out = m; } }, Math, Float32Array, out: null };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../../js/audio/tanpura-worker.js', import.meta.url), 'utf8'), ctx);
const render = (strings, sr = 16000) => { ctx.self.onmessage({ data: { id: 1, sr, strings } }); return ctx.out.bufs; };

function fundamental(buf, sr, lo, hi) {
  // autocorrelation over a 0.5 s window after the attack
  const start = Math.floor(sr * 0.6), n = Math.floor(sr * 0.5);
  let best = 0, bestLag = 0;
  for (let lag = Math.floor(sr / hi); lag <= Math.ceil(sr / lo); lag++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += buf[start + i] * buf[start + i + lag];
    if (s > best) { best = s; bestLag = lag; }
  }
  // parabolic refinement
  const ac = (lag) => { let s = 0; for (let i = 0; i < n; i++) s += buf[start + i] * buf[start + i + lag]; return s; };
  const a = ac(bestLag - 1), b = ac(bestLag), c = ac(bestLag + 1);
  const shift = (a - c) / (2 * (a - 2 * b + c));
  return sr / (bestLag + shift);
}

test('worker renders clean, normalised, decaying strings', () => {
  const t = fresh({ key: 0 });
  const bufs = render(t._strings());
  assert.equal(bufs.length, 4);
  let peak = 0;
  for (const b of bufs) {
    for (let i = 0; i < b.length; i++) { assert.ok(Number.isFinite(b[i])); peak = Math.max(peak, Math.abs(b[i])); }
    const rms = (a, z) => { let s = 0; for (let i = a; i < z; i++) s += b[i] * b[i]; return Math.sqrt(s / (z - a)); };
    assert.ok(rms(1600, 8000) > rms(b.length - 16000, b.length - 8000) * 2, 'string decays');
    assert.equal(b[b.length - 1], 0, 'tail fades to silence (no click when it ends)');
  }
  close(peak, 0.7, 0.02, 'common normalisation');
});

test('rendered strings are in tune (within 1 cent of their target)', () => {
  for (const key of [0, 2, 7, 9, 11]) {
    const t = fresh({ key });
    const strings = t._strings().map((s) => ({ ...s, dur: 1.4 }));
    const bufs = render(strings, 32000);
    for (const i of [0, 1, 3]) {
      const f0 = strings[i].f0;
      const f = fundamental(bufs[i], 32000, f0 * 0.8, f0 * 1.25);
      const cents = 1200 * Math.log2(f / f0);
      assert.ok(Math.abs(cents) < 1, `${NOTE_NAMES[key]} string ${i}: ${f.toFixed(3)} Hz vs ${f0.toFixed(3)} (${cents.toFixed(2)}¢)`);
    }
  }
});

test('key detection recognises a tanpura in every key, register and tuning', () => {
  for (const [register, first] of [['male', 'P'], ['female', 'P'], ['male', 'M'], ['female', 'N']]) for (let key = 0; key < 12; key++) {
    const t = fresh({ key, register, first });
    const sr = 12000;
    const bufs = render(t._strings().map((s) => ({ ...s, dur: 6 })), sr);
    // play one cycle the way the player does (Pa, Sa, Sa, low Sa)
    const len = sr * 7, mix = new Float32Array(len);
    [0, 0.3, 0.46, 0.64].forEach((off, i) => { const o = Math.floor(off * 4.6 * sr); for (let j = 0; j < bufs[i].length && o + j < len; j++) mix[o + j] += bufs[i][j]; });
    const got = detectSa({ sampleRate: sr, length: len, getChannelData: () => mix });
    assert.ok(got, 'detected something');
    assert.equal(got.key, key, `${register}/${first}: expected ${NOTE_NAMES[key]}, got ${NOTE_NAMES[got.key]}`);
    assert.equal(got.register, register, `${NOTE_NAMES[key]} ${first}: register`);
    assert.ok(Math.abs(got.cents) <= 20, `cents ${got.cents}`);
  }
});

test('detection refuses clips shorter than a second', () => {
  assert.equal(detectSa({ sampleRate: 8000, length: 4000, getChannelData: () => new Float32Array(4000) }), null);
});
