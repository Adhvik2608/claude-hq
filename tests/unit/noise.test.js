import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, makeNoise2D, fbm, clamp, lerp, smooth, damp, dampAngle } from '../../js/util/noise.js';

test('random and noise are deterministic for a seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  const n1 = makeNoise2D(7, 8), n2 = makeNoise2D(7, 8);
  assert.equal(n1(1.3, 2.7), n2(1.3, 2.7));
});

test('noise stays in range and tiles with its period (seamless textures)', () => {
  const n = makeNoise2D(3, 8);
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 8, y = Math.random() * 8;
    const v = n(x, y);
    assert.ok(v >= 0 && v <= 1);
    assert.ok(Math.abs(n(x + 8, y) - v) < 1e-12);
    assert.ok(Math.abs(n(x, y + 8) - v) < 1e-12);
    const f = fbm(n, x, y, 5);
    assert.ok(f >= 0 && f <= 1);
    assert.ok(Math.abs(fbm(n, x + 8, y, 5) - f) < 1e-12, 'fbm tiles too');
  }
});

test('easing helpers', () => {
  assert.equal(clamp(5, 0, 1), 1);
  assert.equal(lerp(2, 4, 0.5), 3);
  assert.equal(smooth(0, 1, 0.5), 0.5);
  assert.ok(Math.abs(damp(0, 10, 5, 10) - 10) < 1e-9);
  // shortest way around the circle
  const a = dampAngle(3.1, -3.1, 1000, 1);
  assert.ok(Math.abs(Math.cos(a) - Math.cos(-3.1)) < 1e-6 && Math.abs(Math.sin(a) - Math.sin(-3.1)) < 1e-6);
  assert.ok(Math.abs(a - 3.1) < 0.1, 'turns the short way (across ±π), not all the way round');
});
