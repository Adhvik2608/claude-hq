import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, FLOORS, roomAt, floorY, FH, CEIL, STAIR, LIFT, HX, HZ, NOTE_NAMES, SARGAM, SARGAM_DEVA, EXTERIOR_SPAWN } from '../../js/config.js';
import { installFakeDom } from '../helpers/env.js';

installFakeDom();
const { WALLS, roomFinish } = await import('../../js/world/structure.js');

test('floors: five levels, 4 m apart', () => {
  assert.equal(FLOORS.length, 5);
  FLOORS.forEach((f, i) => { assert.equal(f.id, i); assert.equal(floorY(i), i * FH); });
  assert.ok(CEIL > 3 && CEIL < FH);
});

test('room ids are unique and rects are well formed', () => {
  const ids = new Set();
  for (const r of ROOMS) {
    assert.ok(!ids.has(r.id), `duplicate ${r.id}`); ids.add(r.id);
    const [x0, z0, x1, z1] = r.rect;
    assert.ok(x0 < x1 && z0 < z1, `${r.id} rect`);
    assert.ok(x0 >= -HX && x1 <= HX, `${r.id} within width`);
    assert.ok(z0 >= -HZ && z1 <= 15.5, `${r.id} within depth (incl. balconies)`);
    assert.ok(r.floor >= 0 && r.floor <= 4);
  }
});

test('the brief: every requested room exists', () => {
  const need = ['temple', 'music', 'bedroom', 'suite', 'kitchen', 'store', 'bathroom', 'washroom', 'terrace', 'pool'];
  for (const id of need) assert.ok(ROOMS.find((r) => r.id === id), id);
  assert.ok(ROOMS.some((r) => r.id.startsWith('balcony') && r.floor > 0), 'an upstairs balcony');
  // the temple opens off the entrance foyer on the ground floor
  assert.equal(ROOMS.find((r) => r.id === 'temple').floor, 0);
});

test('every spawn lies inside its own room and resolves back to it', () => {
  for (const r of ROOMS) {
    const [x, z] = r.spawn;
    const [x0, z0, x1, z1] = r.rect;
    assert.ok(x > x0 && x < x1 && z > z0 && z < z1, `${r.id} spawn inside rect`);
    const found = roomAt(x, z, r.floor);
    assert.ok(found, `${r.id} spawn resolves`);
    // nested terrace areas resolve to the smallest area containing them
    if (r.id !== 'terrace') assert.equal(found.id, r.id, `${r.id} spawn resolves to itself`);
    if (r.floor > 0) assert.ok(Math.hypot(x - STAIR.cx, z - STAIR.cz) > STAIR.rHole + 0.3, `${r.id} spawn not over the stairwell`);
  }
});

test('indoor rooms on the same floor do not overlap', () => {
  for (const f of [0, 1, 2, 3]) {
    const rs = ROOMS.filter((r) => r.floor === f);
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i].rect, b = rs[j].rect;
      const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
      const oz = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
      assert.ok(ox <= 1e-9 || oz <= 1e-9, `${rs[i].id} overlaps ${rs[j].id}`);
    }
  }
});

test('lift fits inside the stair core', () => {
  assert.ok(LIFT.r < LIFT.shaftR && LIFT.shaftR <= STAIR.rIn);
  assert.ok(STAIR.rOut < STAIR.rHole);
  // the landing door is wide enough for the player (diameter 0.54 m)
  assert.ok(2 * LIFT.shaftR * Math.sin(LIFT.doorHalf) > 0.9);
});

test('exterior spawn is on the garden level', () => {
  assert.ok(EXTERIOR_SPAWN.y < 0);
  assert.ok(EXTERIOR_SPAWN.z > HZ + 10);
});

test('music theory tables are complete', () => {
  assert.equal(NOTE_NAMES.length, 12);
  assert.equal(SARGAM.length, 12);
  assert.equal(SARGAM_DEVA.length, 12);
  assert.equal(SARGAM[0], 'Sa'); assert.equal(SARGAM[7], 'Pa');
});

// ---------------------------------------------------------------- wall plan
const finish = roomFinish();
const all = WALLS.flatMap((ws, n) => ws.map((w) => ({ n, w })));

test('every wall references known rooms and runs forwards', () => {
  for (const { n, w } of all) {
    const [axis, , from, to, neg, pos] = w;
    assert.ok(axis === 'x' || axis === 'z');
    assert.ok(from < to, `floor ${n} wall ${from}..${to}`);
    assert.ok(neg in finish, `unknown room ${neg}`);
    assert.ok(pos in finish, `unknown room ${pos}`);
    if (neg !== 'ext') assert.equal(ROOMS.find((r) => r.id === neg)?.floor, n, `${neg} is on floor ${n}`);
    if (pos !== 'ext') assert.equal(ROOMS.find((r) => r.id === pos)?.floor, n, `${pos} is on floor ${n}`);
  }
});

test('openings sit inside their wall, do not overlap, and fit under the ceiling', () => {
  for (const { n, w } of all) {
    const [, fixed, from, to, , , ops] = w;
    const sorted = [...ops].sort((a, b) => a.c - b.c);
    let prevEnd = from;
    for (const o of sorted) {
      const a = o.c - o.w / 2, b = o.c + o.w / 2;
      assert.ok(a >= from - 1e-9 && b <= to + 1e-9, `floor ${n} wall @${fixed}: opening ${o.c} outside ${from}..${to}`);
      assert.ok(a >= prevEnd - 1e-9, `floor ${n} wall @${fixed}: openings overlap at ${o.c}`);
      assert.ok(o.sill + o.h <= CEIL + 1e-9, `floor ${n} wall @${fixed}: opening ${o.c} taller than the ceiling`);
      if (o.sill === 0) assert.ok(o.w >= 0.95, `doorway at ${o.c} wide enough to walk through`);
      prevEnd = b;
    }
  }
});

test('every indoor room has at least one doorway', () => {
  for (const r of ROOMS.filter((q) => q.floor < 4 && !q.outdoor)) {
    const doors = all.filter(({ w }) => (w[4] === r.id || w[5] === r.id) && w[6].some((o) => o.sill === 0));
    assert.ok(doors.length > 0, `${r.id} has no way in`);
  }
});

test('the front door opens from the garden into the foyer', () => {
  const front = all.find(({ n, w }) => n === 0 && w[4] === 'foyer' && w[5] === 'ext');
  assert.ok(front.w[6].some((o) => o.kind === 'main'));
});
