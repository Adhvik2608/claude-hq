import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THAATS, TAALS, TABLA_PADS, CHROMA_KEYS, SARGAM_KEYS, Harmonium, Piano, Flute, Sitar } from '../../js/audio/instruments.js';

const BOLS = new Set(['Na', 'Tin', 'Tun', 'Te', 'Ra', 'Ke', 'Ge', 'Dha', 'Dhin', 'Dhi', 'Ti', 'Ta', 'Tu', 'Ki', 'Ka', 'Kat', 'Gha', 'Tirakita']);

test('every taal has one bol group per matra and sensible markers', () => {
  for (const [name, t] of Object.entries(TAALS)) {
    assert.equal(t.bols.length, t.beats, name);
    for (const k of Object.keys(t.marks)) assert.ok(+k >= 1 && +k <= t.beats, `${name} marker ${k}`);
    assert.ok(t.marks[1] !== undefined, `${name} marks the first beat`);
    assert.ok(t.bpm >= 40 && t.bpm <= 420, `${name} tempo`);
    for (const group of t.bols) for (const b of group.split(' ')) assert.ok(BOLS.has(b), `${name}: unknown bol ${b}`);
  }
  assert.deepEqual(Object.keys(TAALS).sort(), ['Dadra', 'Ektaal', 'Jhaptaal', 'Keherwa', 'Rupak', 'Teentaal']);
  assert.equal(TAALS.Teentaal.marks[9], '0', 'Teentaal khali on 9');
});

test('thaats: seven ascending notes starting on Sa, with Pa except in Marwa', () => {
  for (const [name, n] of Object.entries(THAATS)) {
    assert.equal(n.length, 7, name);
    assert.equal(n[0], 0);
    for (let i = 1; i < 7; i++) assert.ok(n[i] > n[i - 1] && n[i] < 12, name);
    assert.ok(n.includes(5) || n.includes(6), `${name} has a Ma`);
  }
  assert.deepEqual(THAATS.Bilawal, [0, 2, 4, 5, 7, 9, 11]);
  assert.deepEqual(THAATS.Bhairavi, [0, 1, 3, 5, 7, 8, 10]);
});

test('keyboard maps are unambiguous', () => {
  const chroma = Object.values(CHROMA_KEYS);
  assert.equal(new Set(chroma).size, chroma.length, 'one key per semitone');
  assert.deepEqual([...chroma].sort((a, b) => a - b), Array.from({ length: 18 }, (_, i) => i));
  for (const [k, [oct, deg]] of Object.entries(SARGAM_KEYS)) { assert.ok(/^Key[A-Z]$/.test(k)); assert.ok(oct >= -1 && oct <= 2 && deg >= 0 && deg < 7); }
  const padKeys = TABLA_PADS.map((p) => p[2]);
  assert.equal(new Set(padKeys).size, padKeys.length);
  assert.ok(!padKeys.includes('KeyE'), 'E stays free for standing up');
});

test('instruments follow the tanpura Sa', () => {
  const sa = 138.59;
  const getSa = () => sa;
  const h = new Harmonium({}, getSa);
  assert.equal(h.freq(0), sa);
  assert.ok(Math.abs(h.freq(12) - 2 * sa) < 1e-9);
  h.octave = -1;
  assert.ok(Math.abs(h.freq(0) - sa / 2) < 1e-9);
  const p = new Piano({}, getSa);
  assert.ok(Math.abs(p.freq(7) - sa * Math.pow(2, 7 / 12)) < 1e-9);
  const f = new Flute({}, getSa);
  f.thaat = 'Kafi';
  assert.equal(f.semis(0, 2), 3, 'komal ga in Kafi');
  assert.equal(f.semis(1, 0), 12);
  const s = new Sitar({}, { saFreq: getSa });
  s.thaat = 'Kalyan';
  assert.equal(s.semis(0, 3), 6, 'tivra Ma in Kalyan');
});
