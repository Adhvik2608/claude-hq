import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom } from '../helpers/env.js';

installFakeDom();
const THREE = await import('three');
const { Avatar, DEFAULT_LOOK, OPTIONS, randomLook, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTH_COLORS } = await import('../../js/character/avatar.js');
const { Animator } = await import('../../js/character/animator.js');

const JOINTS = ['body', 'hips', 'spine', 'chest', 'neck', 'head', 'headCenter', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'thighL', 'thighR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];

function check(av, label) {
  for (const j of JOINTS) assert.ok(av.j[j], `${label}: joint ${j}`);
  let meshes = 0;
  const box = new THREE.Box3();
  av.root.updateMatrixWorld(true);
  av.root.traverse((o) => {
    if (!o.isMesh) return;
    meshes++;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 7) assert.ok(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)), `${label}: NaN vertex`);
    box.expandByObject(o);
  });
  assert.ok(meshes > 40, `${label}: built ${meshes} meshes`);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.y > 1.4 && size.y < 2.1, `${label}: height ${size.y.toFixed(2)} m`);
  assert.ok(box.min.y > -0.06 && box.min.y < 0.06, `${label}: feet on the ground (${box.min.y.toFixed(3)})`);
  assert.ok(size.x < 1.0 && size.z < 0.9, `${label}: nothing sticks out (${size.x.toFixed(2)} x ${size.z.toFixed(2)})`);
}

test('default character builds standing on the ground', () => {
  check(new Avatar(DEFAULT_LOOK), 'default');
});

test('every single customisation option builds', () => {
  for (const [key, opts] of Object.entries(OPTIONS)) {
    for (const [value] of opts) check(new Avatar({ ...DEFAULT_LOOK, [key]: value }), `${key}=${value}`);
  }
});

test('colour palettes are valid hex and apply', () => {
  for (const c of [...SKIN_TONES, ...HAIR_COLORS, ...EYE_COLORS, ...CLOTH_COLORS]) assert.match(c, /^#[0-9a-f]{6}$/i);
  const av = new Avatar({ ...DEFAULT_LOOK, skin: SKIN_TONES[0], topColor: '#123456' });
  assert.equal('#' + av.m.skin.color.getHexString(), SKIN_TONES[0]);
  assert.equal('#' + av.m.top.color.getHexString(), '#123456');
});

test('height and build sliders change the body', () => {
  const short = new Avatar({ ...DEFAULT_LOOK, height: 0.9 }), tall = new Avatar({ ...DEFAULT_LOOK, height: 1.1 });
  const h = (av) => new THREE.Box3().setFromObject(av.root).getSize(new THREE.Vector3()).y;
  assert.ok(h(tall) - h(short) > 0.3);
  const slim = new Avatar({ ...DEFAULT_LOOK, build: 0 }), broad = new Avatar({ ...DEFAULT_LOOK, build: 1 });
  assert.ok(broad.j.shoulderL.position.x > slim.j.shoulderL.position.x);
});

test('surprise-me looks only use real option values', () => {
  for (let i = 0; i < 40; i++) {
    const l = randomLook();
    for (const [key, opts] of Object.entries(OPTIONS)) assert.ok(opts.some(([v]) => v === l[key]), `${key}=${l[key]}`);
    check(new Avatar(l), 'random ' + i);
  }
});

test('rebuilding a look does not leak meshes', () => {
  const av = new Avatar(DEFAULT_LOOK);
  const count = () => { let n = 0; av.root.traverse((o) => { if (o.isMesh) n++; }); return n; };
  const first = count();
  for (let i = 0; i < 5; i++) av.setLook(DEFAULT_LOOK);
  assert.equal(count(), first);
});

test('every animation mode produces finite poses and the right hip height', () => {
  const modes = ['walk', 'swim', 'sit', 'toilet', 'swing', 'recline', 'sitFloor', 'meditate', 'lie', 'play:harmonium', 'play:tabla', 'play:sitar', 'play:tanpura', 'play:flute', 'play:piano', 'emote:namaste', 'emote:wave', 'emote:dance', 'emote:clap', 'emote:pray'];
  for (const mode of modes) {
    const av = new Avatar(DEFAULT_LOOK);
    const an = new Animator(av);
    for (let i = 0; i < 90; i++) { an.hit(i % 2 ? 'L' : 'R'); an.update(1 / 60, { mode, speed: mode === 'walk' ? 2 : 0, grounded: true, vy: 0, seatH: 0.46 }); }
    av.root.traverse((o) => { assert.ok(Number.isFinite(o.rotation.x + o.rotation.y + o.rotation.z + o.position.x + o.position.y + o.position.z), `${mode}: ${o.name}`); });
    if (mode === 'sit') assert.ok(Math.abs(av.j.hips.position.y - 0.56) < 0.02, 'hips on the seat');
    if (mode === 'lie') {
      av.root.updateMatrixWorld(true);
      const hp = av.j.hips.getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(hp.y - 0.56) < 0.05 && Math.abs(hp.z) < 0.05, `lying hips at seat (${hp.toArray().map((v) => v.toFixed(2))})`);
    }
  }
});

test('walking and running cycle the legs', () => {
  const av = new Avatar(DEFAULT_LOOK);
  const an = new Animator(av);
  let min = 0, max = 0;
  for (let i = 0; i < 240; i++) { an.update(1 / 60, { mode: 'walk', speed: 5, grounded: true }); min = Math.min(min, av.j.thighL.rotation.x); max = Math.max(max, av.j.thighL.rotation.x); }
  assert.ok(max - min > 0.8, `stride ${(max - min).toFixed(2)} rad`);
  for (let i = 0; i < 60; i++) an.update(1 / 60, { mode: 'walk', speed: 0, grounded: false, vy: 3 });
  assert.ok(av.j.kneeL.rotation.x > 0.8, 'knees tuck when jumping');
});
