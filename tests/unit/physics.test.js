import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Physics, angleIn } from '../../js/engine/physics.js';

const close = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, msg || `${a} ≉ ${b}`);

test('rect surface: ground found inside, missing outside and in the hole', () => {
  const p = new Physics();
  p.addRect(-5, -5, 5, 5, 2, 0.3, 'stone', { cx: 0, cz: 0, r: 1 });
  assert.equal(p.probe(3, 3, 2.1).ground, 2);
  assert.equal(p.probe(3, 3, 2.1).tag, 'stone');
  assert.ok(p.probe(0.2, 0.2, 2.1).ground < -1e8, 'hole has no floor');
  assert.ok(p.probe(6, 0, 2.1).ground < -1e8, 'outside has no floor');
});

test('step-up: small rises are walkable, tall ones become obstacles above', () => {
  const p = new Physics();
  p.addRect(-5, -5, 5, 5, 0, 0.3);
  p.addRect(0, -1, 1, 1, 0.3, 0.3, 'wood');   // low step
  p.addRect(2, -1, 3, 1, 0.8, 0.8, 'wood');   // too tall to step
  assert.equal(p.probe(0.5, 0, 0).ground, 0.3);
  const tall = p.probe(2.5, 0, 0);
  assert.equal(tall.ground, 0);
  assert.equal(tall.ceil, 0, 'tall block reads as a ceiling at its underside');
  assert.equal(p.fits(2.5, 0, 0, 1.7), false, 'cannot stand inside the tall block');
  assert.equal(p.fits(0.5, 0, 0, 1.7), true);
});

test('fits() rejects low headroom under a slab', () => {
  const p = new Physics();
  p.addRect(-5, -5, 5, 5, 0, 0.3);
  p.addRect(-1, -1, 1, 1, 2.0, 0.2); // slab underside at 1.8 m
  assert.equal(p.fits(0, 0, 0, 1.72), true);
  assert.equal(p.fits(0, 0, 0, 1.9), false);
});

test('box resolve pushes a circle out to exactly its radius', () => {
  const p = new Physics();
  p.addBox(0, 0, -1, 1, 2, 1);
  const pos = { x: -0.1, y: 0, z: 0 };
  p.resolve(pos, 0.3, 1.7, { x: -0.5, z: 0 });
  close(pos.x, -0.3, 1e-9);
  close(pos.z, 0, 1e-9);
});

test('box resolve ignores ankle-height boxes, boxes overhead and disabled boxes', () => {
  const p = new Physics();
  p.addBox(0, 0, -1, 1, 0.1, 1);          // rug-height
  p.addBox(0, 2.5, -1, 1, 3, 1);          // overhead
  const b = p.addBox(0, 0, -1, 1, 2, 1);  // wall, then disabled
  b.enabled = false;
  const pos = { x: 0.2, y: 0, z: 0 };
  p.resolve(pos, 0.3, 1.7);
  assert.deepEqual(pos, { x: 0.2, y: 0, z: 0 });
});

test('box resolve: centre inside box exits through nearest face', () => {
  const p = new Physics();
  p.addBox(0, 0, 0, 4, 2, 1);
  const pos = { x: 2, y: 0, z: 0.9 };
  p.resolve(pos, 0.3, 1.7);
  close(pos.z, 1.3, 1e-9);
});

test('cylinder obstacle pushes radially', () => {
  const p = new Physics();
  p.addCyl(0, 0, 0.5, 0, 2);
  const pos = { x: 0.6, y: 0, z: 0 };
  p.resolve(pos, 0.3, 1.7);
  close(Math.hypot(pos.x, pos.z), 0.8, 1e-9);
});

test('arc wall blocks except in open gaps at the right height', () => {
  const p = new Physics();
  let open = true;
  p.addArc(0, 0, 3, 0, 5, [{ a0: -0.4, a1: 0.4, y0: -0.5, y1: 0.5, open: () => open }]);
  // inside the ring moving outward through the gap at theta=0 (towards +z)
  let pos = { x: 0, y: 0, z: 3.0 };
  p.resolve(pos, 0.3, 1.7, { x: 0, z: 2.6 });
  close(pos.z, 3.0, 1e-9, 'open gap lets you through');
  open = false;
  pos = { x: 0, y: 0, z: 3.0 };
  p.resolve(pos, 0.3, 1.7, { x: 0, z: 2.6 });
  close(pos.z, 2.7, 1e-9, 'closed gap holds you inside');
  // gap only applies at its height band
  open = true;
  pos = { x: 0, y: 2, z: 3.0 };
  p.resolve(pos, 0.3, 1.7, { x: 0, z: 2.6 });
  close(pos.z, 2.7, 1e-9);
  // away from the gap the wall always blocks (from outside)
  pos = { x: 3.1, y: 0, z: 0 };
  p.resolve(pos, 0.3, 1.7, { x: 3.5, z: 0 });
  close(pos.x, 3.3, 1e-9);
});

test('spiral stair: flat landings at each floor, linear rise between', () => {
  const p = new Physics();
  const L = 0.36, rise = 4;
  p.addSpiral({ cx: 0, cz: 0, rIn: 1.5, rOut: 3.5, landing: L, turnRise: rise, turns: 4 });
  const at = (th, y) => p.probe(Math.sin(th) * 2.5, Math.cos(th) * 2.5, y, 0.42).ground;
  for (let k = 0; k <= 4; k++) close(at(0, k * rise), k * rise, 1e-9, `landing ${k}`);
  const span = Math.PI * 2 - 2 * L;
  for (let k = 0; k < 4; k++) {
    for (const f of [0.1, 0.5, 0.9]) {
      const th = L + f * span;
      close(at(th, k * rise + f * rise), k * rise + f * rise, 1e-9, `turn ${k} at ${f}`);
    }
  }
  // no stair beyond the top landing
  const top = at(Math.PI, 16.5);
  assert.ok(top < 16, 'nothing above the terrace landing');
  // outside the annulus there is no stair
  assert.ok(p.probe(0, 0.5, 0.2).ground < -1e8);
});

test('spiral is climbable in small steps (every step within step-up)', () => {
  const p = new Physics();
  p.addSpiral({ cx: 0, cz: 0, rIn: 1.5, rOut: 3.5, landing: 0.36, turnRise: 4, turns: 4 });
  let y = 0;
  for (let i = 0; i <= 4000; i++) {
    const th = (i / 4000) * Math.PI * 2 * 4;
    const g = p.probe(Math.sin(th) * 2.5, Math.cos(th) * 2.5, y, 0.42).ground;
    assert.ok(g >= y - 1e-9 && g - y <= 0.42, `step ${i}: ${y} -> ${g}`);
    y = g;
  }
  close(y, 16, 1e-9);
});

test('moving disc (lift floor) follows its getter', () => {
  const p = new Physics();
  let h = 0;
  p.addDisc(0, 0, 1.4, () => h, 0.2, 'lift');
  assert.equal(p.probe(0.3, 0.3, 0).ground, 0);
  h = 0.3;
  assert.equal(p.probe(0.3, 0.3, 0).ground, 0.3);
  assert.equal(p.probe(0.3, 0.3, 0).tag, 'lift');
});

test('raycast: hits camera blockers, skips others, passes through slab holes', () => {
  const p = new Physics();
  p.addBox(4, 0, -1, 5, 3, 1, { cam: true });
  p.addBox(2, 0, -1, 3, 3, 1, { cam: false });
  close(p.raycast({ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 10), 4, 1e-9);
  assert.equal(p.raycast({ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, 10), 10);
  p.addRect(-10, -10, 10, 10, 4, 0.3, 'stone', { cx: 0, cz: 0, r: 2 });
  assert.equal(p.raycast({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 10), 10, 'goes up through the hole');
  close(p.raycast({ x: 6, y: 1, z: 6 }, { x: 0, y: 1, z: 0 }, 10), 2.7, 1e-9);
});

test('angleIn handles wrap-around ranges', () => {
  assert.ok(angleIn(0, -0.3, 0.3));
  assert.ok(angleIn(Math.PI * 2 - 0.1, -0.3, 0.3));
  assert.ok(!angleIn(1, -0.3, 0.3));
  assert.ok(angleIn(3.1, 3, 3.3));
  assert.ok(angleIn(-3.1, 3, 3.3 + 0.0));
});
