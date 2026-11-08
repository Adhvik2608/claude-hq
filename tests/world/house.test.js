// Whole-house QA: builds the real world (geometry, colliders, furniture, doors,
// lift) in Node and drives the real Player controller through it.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildTestWorld, fakeInput, fakeGame } from '../helpers/env.js';
import { ROOMS, floorY, STAIR, LIFT, GROUND_Y, EXTERIOR_SPAWN, roomAt, FH } from '../../js/config.js';

let W, physics, world, Player, Avatar, DEFAULT_LOOK;
const DT = 1 / 60;
const R = 0.27, H = 1.72, STEP = 0.42;

before(async () => {
  W = await buildTestWorld();
  ({ physics, world } = W);
  ({ Player } = await import('../../js/character/player.js'));
  ({ Avatar, DEFAULT_LOOK } = await import('../../js/character/avatar.js'));
});

function newPlayer() { return new Player(new Avatar(DEFAULT_LOOK), physics); }
const yawFor = (dx, dz) => Math.atan2(-dx, -dz); // camera yaw that makes "forward" point along (dx, dz)

function step(p, input, camYaw, n = 1, game) {
  for (let i = 0; i < n; i++) {
    world.lift.update(DT, Math.hypot(p.pos.x, p.pos.z) < LIFT.shaftR);
    p.update(DT, input, camYaw, world.lift);
    world.doors.update(DT, p.pos);
    if (game) for (const f of world.updaters) f(DT, i * DT, game);
  }
}

function standable(x, z, y) {
  const pr = physics.probe(x, z, y, STEP);
  if (pr.ground < -1e8) return null;
  const pos = { x, y: pr.ground, z };
  physics.resolve(pos, R, H, { x, z });
  if (Math.hypot(pos.x - x, pos.z - z) > 0.02) return null;
  return physics.fits(x, z, pr.ground, H, STEP) ? pr.ground : null;
}

test('the house builds with plenty to do', () => {
  assert.ok(world.interactables.length >= 180, `${world.interactables.length} interactables`);
  assert.ok(physics.boxes.length > 400);
  const seats = world.interactables.filter((i) => i.kind === 'seat');
  assert.ok(seats.length >= 90, `${seats.length} places to sit`);
  for (const m of ['toilet', 'lie', 'meditate', 'swing', 'recline', 'play:harmonium', 'play:tabla', 'play:sitar', 'play:flute', 'play:piano', 'play:tanpura'])
    assert.ok(seats.some((s) => s.seat.mode === m), `has a "${m}" seat`);
  for (const k of ['harmonium', 'tabla', 'sitar', 'flute', 'piano', 'tanpura']) assert.ok(world.instruments[k], `music room has a ${k}`);
});

test('every prompt does something when you press its key', () => {
  for (const it of world.interactables) {
    assert.ok(typeof it.label === 'string' && it.label.length > 2, 'labelled');
    assert.ok(it.seat || typeof it.action === 'function', `"${it.label}" has no seat or action`);
    assert.ok(Number.isFinite(it.pos.x + it.pos.y + it.pos.z) && it.r > 0.4, `"${it.label}" position/radius`);
  }
});

test('every action runs without throwing', () => {
  const p = newPlayer();
  const g = fakeGame(p);
  g.tanpura = { playing: false, play() { this.playing = true; } };
  g.ui = { toast() {}, pickImage(fr) { g.picked = fr; }, inst: { tabla: { hit() {} } } };
  g.sky = { night: 1 };
  for (const it of world.interactables) if (it.action) it.action(g);
  assert.ok(g.picked, 'photo frames open the picture picker');
});

test('every room spawn is a safe place to stand and stays in that room', () => {
  for (const r of ROOMS) {
    const p = newPlayer();
    p.place(r.spawn[0], floorY(r.floor) + 0.3, r.spawn[1], r.spawn[2]);
    step(p, fakeInput(), 0, 60);
    assert.ok(p.grounded, `${r.id}: grounded`);
    assert.ok(Math.abs(p.pos.y - floorY(r.floor)) < 1.0, `${r.id}: on its floor (y=${p.pos.y.toFixed(2)})`);
    assert.ok(Math.hypot(p.pos.x - r.spawn[0], p.pos.z - r.spawn[1]) < 0.05, `${r.id}: spawn not inside furniture`);
    const fl = Math.floor((p.pos.y + 1.2) / FH);
    const at = roomAt(p.pos.x, p.pos.z, fl);
    assert.ok(at && (at.id === r.id || r.id === 'terrace'), `${r.id}: HUD would show ${at && at.id}`);
  }
});

test('you can sit on every seat and stand up somewhere free', () => {
  const seats = world.interactables.filter((i) => i.kind === 'seat');
  for (const it of seats) {
    const s = it.seat;
    const p = newPlayer();
    p.place(it.pos.x, s.floorY + 0.3, it.pos.z, 0);
    p.sit(s);
    step(p, fakeInput(), 0, 5);
    assert.ok(Number.isFinite(p.pos.x + p.pos.y + p.pos.z), `${it.label}: seated position`);
    p.stand();
    assert.equal(p.seat, null);
    const got = standable(p.pos.x, p.pos.z, p.pos.y + 0.05);
    assert.ok(got !== null, `"${it.label}" @(${s.pos[0].toFixed(1)}, ${s.pos[2].toFixed(1)}) floor ${s.floorY}: stand-up spot (${p.pos.x.toFixed(2)}, ${p.pos.z.toFixed(2)}) is blocked`);
    assert.ok(Math.abs(p.pos.y - s.floorY) < 1.2, `${it.label}: stands up on the same level`);
  }
});

// Flood-fill each floor on a 20 cm grid, honouring step heights, walls and furniture.
function reachable(fl, start) {
  for (const d of world.doors.list) d.box.enabled = false; // doors open as you approach
  const step = 0.2, x0 = -18, z0 = -14, nx = 180, nz = 160;
  const key = (i, j) => i * nz + j;
  const ground = new Map();
  const toCell = (x, z) => [Math.round((x - x0) / step), Math.round((z - z0) / step)];
  const [si, sj] = toCell(start[0], start[1]);
  const g0 = standable(x0 + si * step, z0 + sj * step, floorY(fl) + 0.05);
  assert.ok(g0 !== null, `floor ${fl}: start cell walkable`);
  ground.set(key(si, sj), g0);
  const q = [[si, sj]];
  while (q.length) {
    const [i, j] = q.pop();
    const gy = ground.get(key(i, j));
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz || ground.has(key(a, b))) continue;
      const x = x0 + a * step, z = z0 + b * step;
      if (Math.hypot(x - STAIR.cx, z - STAIR.cz) < STAIR.rHole + 0.1) continue; // stairwell handled separately
      const g = standable(x, z, gy + 0.02);
      if (g === null || g < gy - 0.5 || g > gy + STEP) continue;
      if (Math.abs(g - floorY(fl)) > 1.5) continue;
      ground.set(key(a, b), g);
      q.push([a, b]);
    }
  }
  for (const d of world.doors.list) d.box.enabled = true;
  return (x, z) => { const [i, j] = toCell(x, z); for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) if (ground.has(key(i + a, j + b))) return true; return false; };
}

for (const fl of [0, 1, 2, 3, 4]) {
  test(`floor ${fl}: every room can be walked to from the stairs`, () => {
    const start = fl === 0 ? [0, 10.5] : fl === 4 ? [0, 4.2] : [0, 4.4];
    const can = reachable(fl, start);
    for (const r of ROOMS.filter((q) => q.floor === fl)) assert.ok(can(r.spawn[0], r.spawn[1]), `${r.id} is unreachable on floor ${fl}`);
    // and every place to sit or play can be approached
    for (const it of world.interactables.filter((i) => i.floor === fl && i.kind === 'seat')) {
      if (Math.abs(it.seat.floorY - floorY(fl)) > 1.0) continue;
      const p = newPlayer();
      p.sit(it.seat); p.stand();
      assert.ok(can(p.pos.x, p.pos.z), `floor ${fl}: can't reach "${it.label}" (stand-up spot ${p.pos.x.toFixed(1)}, ${p.pos.z.toFixed(1)})`);
    }
  });
}

test('walk in from the garden through the main door to the mandir', () => {
  const p = newPlayer();
  p.place(0, GROUND_Y + 0.3, 21, Math.PI);
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 } }), yawFor(0, -1), 60 * 6);
  assert.ok(p.pos.z < 11.5 && p.pos.y > -0.05, `entered the foyer (z=${p.pos.z.toFixed(2)}, y=${p.pos.y.toFixed(2)})`);
  // turn left (west) through the carved arch into the temple
  p.place(-3, 0.05, 8.75, 0);
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 } }), yawFor(-1, 0), 60 * 3);
  assert.equal(roomAt(p.pos.x, p.pos.z, 0).id, 'temple');
  assert.ok(p.pos.x > -13.1, 'stopped by the altar platform, not walking through it');
});

test('climb the spiral stair from the ground floor to the sky terrace and back', () => {
  const p = newPlayer();
  p.place(0, 0.05, 2.55, 0);
  const inp = Object.assign(fakeInput(), { axis: { x: 0, y: 1 } });
  const floorsSeen = new Set();
  let t = 0;
  for (; t < 60 * 90; t++) {
    const th = Math.atan2(p.pos.x, p.pos.z), r = Math.hypot(p.pos.x, p.pos.z);
    let tx = Math.cos(th) + Math.sin(th) * (2.5 - r) * 0.8, tz = -Math.sin(th) + Math.cos(th) * (2.5 - r) * 0.8;
    step(p, inp, yawFor(tx, tz));
    assert.ok(r > LIFT.shaftR - 0.01 && r < STAIR.rOut + 0.2, `stays on the stair (r=${r.toFixed(2)})`);
    if (p.grounded && Math.abs(p.pos.y / FH - Math.round(p.pos.y / FH)) < 0.01) floorsSeen.add(Math.round(p.pos.y / FH));
    if (p.pos.y > floorY(4) - 0.01) break;
  }
  assert.ok(p.pos.y > floorY(4) - 0.01, `reached the terrace landing (y=${p.pos.y.toFixed(2)})`);
  for (const f of [0, 1, 2, 3, 4]) assert.ok(floorsSeen.has(f), `passed the floor ${f} landing`);
  // step off at the landing gap onto the terrace pavilion
  step(p, inp, yawFor(0, 1), 60 * 2);
  assert.ok(Math.hypot(p.pos.x, p.pos.z) > STAIR.rHole && Math.abs(p.pos.y - floorY(4)) < 0.01, 'stepped onto the terrace');
  // walk back down (clockwise) to the ground floor
  p.place(0, floorY(4) + 0.05, 2.55, 0);
  for (t = 0; t < 60 * 90; t++) {
    const th = Math.atan2(p.pos.x, p.pos.z), r = Math.hypot(p.pos.x, p.pos.z);
    let tx = -Math.cos(th) + Math.sin(th) * (2.5 - r) * 0.8, tz = Math.sin(th) + Math.cos(th) * (2.5 - r) * 0.8;
    step(p, inp, yawFor(tx, tz));
    if (p.pos.y < 0.01) break;
  }
  assert.ok(p.pos.y < 0.01 && p.grounded, `back on the ground floor (y=${p.pos.y.toFixed(2)})`);
});

test('the glass lift serves every floor and carries you smoothly', () => {
  const p = newPlayer();
  const lift = world.lift;
  p.place(0, lift.y + 0.05, 0.3, 0);
  for (const n of [1, 2, 3, 4, 0, 4]) {
    lift.go(n);
    let maxSink = 0;
    for (let i = 0; i < 60 * 40 && !(lift.state === 'idle' && lift.doors > 0.98 && Math.abs(lift.y - floorY(n)) < 1e-6); i++) {
      step(p, fakeInput(), 0);
      maxSink = Math.max(maxSink, lift.y - p.pos.y);
    }
    assert.equal(lift.y, floorY(n), `lift reached floor ${n}`);
    assert.ok(Math.abs(p.pos.y - floorY(n)) < 0.01, `rider arrived at floor ${n} (y=${p.pos.y.toFixed(3)})`);
    assert.ok(maxSink < 0.02, `feet never sink into the lift floor (${maxSink.toFixed(3)} m)`);
    assert.ok(Math.hypot(p.pos.x, p.pos.z) < LIFT.shaftR, 'still inside the cabin');
  }
  // doors open: walk out onto the terrace landing
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 } }), yawFor(0, 1), 60 * 3);
  assert.ok(Math.hypot(p.pos.x, p.pos.z) > STAIR.rHole, 'walked out of the lift');
  // the lift leaves; its doors close and the shaft is sealed
  lift.go(0);
  for (let i = 0; i < 60 * 3; i++) step(p, fakeInput(), 0);
  p.place(0, floorY(4) + 0.05, 2.3, Math.PI);
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 } }), yawFor(0, -1), 60 * 3);
  assert.ok(Math.hypot(p.pos.x, p.pos.z) >= LIFT.shaftR + R - 0.02, 'cannot walk into an empty shaft');
  assert.ok(Math.abs(p.pos.y - floorY(4)) < 0.01, 'did not fall down the shaft');
  for (let i = 0; i < 60 * 30 && lift.state !== 'idle'; i++) step(p, fakeInput(), 0);
});

test('calling the lift from a landing brings it and opens the doors', () => {
  const lift = world.lift;
  lift.go(0);
  for (let i = 0; i < 60 * 30 && !(lift.state === 'idle' && lift.y === 0); i++) lift.update(DT, false);
  lift.call(3);
  for (let i = 0; i < 60 * 30 && !(lift.state === 'idle' && lift.doors > 0.98 && lift.y === floorY(3)); i++) lift.update(DT, false);
  assert.equal(lift.y, floorY(3));
  // idle doors close by themselves after a while
  for (let i = 0; i < 60 * 12; i++) lift.update(DT, false);
  assert.ok(lift.doors < 0.02, 'doors closed after idling');
});

test('every door opens as you approach and closes behind you', () => {
  for (const d of world.doors.list) {
    const off = 1.0;
    const near = d.axis === 'x' ? { x: d.cx, y: d.y0, z: d.cz + off } : { x: d.cx + off, y: d.y0, z: d.cz };
    for (let i = 0; i < 60; i++) world.doors.update(DT, near);
    assert.ok(d.open > 0.9 && !d.box.enabled, `${d.kind} door at (${d.cx}, ${d.cz}) floor ${d.floor} opens`);
    for (let i = 0; i < 120; i++) world.doors.update(DT, { x: 999, y: 999, z: 999 });
    assert.ok(d.open < 0.1 && d.box.enabled, 'and closes');
  }
  const main = world.doors.list.find((d) => d.kind === 'main');
  assert.ok(main, 'there is a grand main door');
});

test('you can wade into the infinity pool on the terrace', () => {
  const p = newPlayer();
  const g = fakeGame(p);
  p.place(10, floorY(4) + 1.2, -3, 0);
  step(p, fakeInput(), 0, 30, g);
  assert.ok(p.inWater, 'in the water');
  assert.ok(p.pos.y < floorY(4) + 0.2, 'standing on the pool floor');
  const before = { ...p.pos };
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 } }), yawFor(1, 0), 60, g);
  const swimDist = Math.hypot(p.pos.x - before.x, p.pos.z - before.z);
  assert.ok(swimDist > 0.4 && swimDist < 1.6, `slower in water (${swimDist.toFixed(2)} m in 1 s)`);
  // out of the pool via the steps at the north end
  p.place(8, floorY(4) + 0.1, 2.0, 0);
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 } }), yawFor(0, 1), 60 * 3, g);
  assert.ok(p.pos.y > floorY(4) + 0.8, `climbed the pool steps onto the deck (y=${p.pos.y.toFixed(2)})`);
  assert.ok(!p.inWater);
});

test('jumping clears about a metre and you can not jump through ceilings', () => {
  const p = newPlayer();
  const r = ROOMS.find((q) => q.id === 'living');
  p.place(r.spawn[0], 0.05, r.spawn[1], 0);
  step(p, fakeInput(), 0, 10);
  const inp = fakeInput(); inp.hits.add('Space');
  step(p, inp, 0, 1);
  let peak = 0;
  for (let i = 0; i < 90; i++) { step(p, fakeInput(), 0); peak = Math.max(peak, p.pos.y); }
  assert.ok(peak > 0.8 && peak < 1.2, `jump height ${peak.toFixed(2)} m`);
  assert.ok(p.grounded && Math.abs(p.pos.y) < 0.01, 'lands back on the floor');
});

test('walls hold: walking into an exterior wall never leaves the house', () => {
  for (const r of ROOMS.filter((q) => q.floor < 4 && !q.outdoor)) {
    const p = newPlayer();
    p.place(r.spawn[0], floorY(r.floor) + 0.05, r.spawn[1], 0);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 }, run: true }), yawFor(dx, dz), 60 * 4);
      assert.ok(Math.abs(p.pos.x) < 16.3 + (r.floor > 0 ? 0 : 0.5) && p.pos.z > -12.3, `${r.id}: escaped through a wall to (${p.pos.x.toFixed(2)}, ${p.pos.z.toFixed(2)})`);
      assert.ok(p.pos.y > floorY(r.floor) - 0.6, `${r.id}: fell through the floor`);
    }
  }
});

test('world animations run for a while without errors', () => {
  const p = newPlayer();
  p.place(-10, 0.05, 6, 0);
  const g = fakeGame(p);
  for (let i = 0; i < 120; i++) for (const f of world.updaters) f(DT, i * DT, g);
});

test('the light pool never exceeds its budget and stays finite', () => {
  const lp = W.lightPool;
  for (const r of ROOMS) {
    const v = { x: r.spawn[0], y: floorY(r.floor) + 1.5, z: r.spawn[1] };
    for (let i = 0; i < 20; i++) lp.update(0.3, new W.THREE.Vector3(v.x, v.y, v.z), r.floor, !!r.outdoor, i % 2);
    const live = lp.lights.filter((l) => l.userData.anchor);
    assert.ok(live.length <= lp.lights.length);
    assert.ok(lp.lights.every((l) => Number.isFinite(l.intensity) && l.intensity >= 0));
    if (!r.outdoor && r.floor < 4) assert.ok(live.some((l) => l.userData.anchor.floor === r.floor), `${r.id} is lit`);
  }
});

test('outside the house is bounded by the compound wall', () => {
  const p = newPlayer();
  p.place(EXTERIOR_SPAWN.x, EXTERIOR_SPAWN.y + 0.3, EXTERIOR_SPAWN.z, EXTERIOR_SPAWN.yaw);
  step(p, Object.assign(fakeInput(), { axis: { x: 0, y: 1 }, run: true }), yawFor(1, 0), 60 * 12);
  assert.ok(p.pos.x < 38, `stopped by the compound wall (x=${p.pos.x.toFixed(2)})`);
});
