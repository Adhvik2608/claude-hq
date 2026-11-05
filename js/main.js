import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Physics } from './engine/physics.js';
import { FollowCamera } from './engine/camera.js';
import { LightPool } from './engine/lightpool.js';
import { initMaterials } from './world/materials.js';
import { setAnisotropy } from './world/textures.js';
import { SkySystem } from './world/sky.js';
import { buildWorld } from './world/world.js';
import { Avatar, DEFAULT_LOOK } from './character/avatar.js';
import { Player } from './character/player.js';
import { AudioEngine } from './audio/engine.js';
import { Tanpura } from './audio/tanpura.js';
import { UI } from './ui/ui.js';
import { FH, STAIR, HX, HZ, floorY, roomAt, ROOMS, FLOORS, EXTERIOR_SPAWN, LIFT } from './config.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const game = { state: 'loading', t: 0, params };
window.__game = game;
window.__rooms = ROOMS;

function loadLook() {
  try { const s = localStorage.getItem('dh.look'); if (s) return { ...DEFAULT_LOOK, ...JSON.parse(s) }; } catch (e) {}
  return { ...DEFAULT_LOOK };
}

async function boot() {
  const progress = (msg, f) => { $('loadmsg').textContent = msg; $('loadbar').style.width = Math.round(f * 100) + '%'; };
  progress('Waking up', 0.02);
  const canvas = $('scene');
  const renderer = new Renderer(canvas);
  if (params.has('q')) { renderer.qualityKey = params.get('q'); renderer.autoScale = false; }
  setAnisotropy(Math.min(8, renderer.r.capabilities.getMaxAnisotropy()));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 6000);
  renderer.setup(scene, camera);
  const physics = new Physics();
  const input = new Input(canvas);
  const audio = new AudioEngine();
  const lightPool = new LightPool(scene, 8);
  Object.assign(game, { renderer, scene, camera, physics, input, audio, lightPool });

  await initMaterials((m, f) => progress(m, 0.05 + f * 0.4));
  const sky = new SkySystem(scene, renderer.r);
  sky.setShadowSize(renderer.quality.shadow);
  game.sky = sky;
  const world = await buildWorld({ scene, physics, audio, lightPool, progress: (m, f) => progress(m, 0.45 + f * 0.45) });
  game.world = world;
  game.lift = world.lift;

  progress('Dressing your character', 0.92);
  const look = loadLook();
  const avatar = new Avatar(look);
  scene.add(avatar.root);
  const player = new Player(avatar, physics);
  game.avatar = avatar; game.player = player;
  game.name = (() => { try { return localStorage.getItem('dh.name') || ''; } catch (e) { return ''; } })();
  player.onStep = (tag, run, water) => audio.footstep(tag, run, water);
  player.onLand = (v, tag) => { if (v < -4) audio.land(tag); };
  player.onJump = () => audio.jump();
  player.onFall = () => respawn();
  world.waterAreas.forEach(() => {});

  game.follow = new FollowCamera(camera, physics);
  game.tanpura = new Tanpura(audio);
  game.ui = new UI(game);
  let hour = 17.2;
  try { const h = parseFloat(localStorage.getItem('dh.hour')); if (!isNaN(h)) hour = h; } catch (e) {}
  if (params.has('hour')) hour = parseFloat(params.get('hour'));
  sky.setTime(hour);
  renderer.onQuality = (q) => sky.setShadowSize(q.shadow);

  // warm up shaders while the loader is still visible
  progress('Lighting the diyas', 0.97);
  camera.position.set(0, 12, 48); camera.lookAt(0, 6, 0);
  renderer.render(scene, camera);
  await new Promise((r) => setTimeout(r, 30));
  progress('Welcome home', 1);

  $('loader').classList.add('fade');
  setTimeout(() => $('loader').classList.add('hidden'), 900);
  if (params.has('creator')) { game.ui.creator.tab = params.get('tab') || 'body'; game.ui.creator.open('title'); }
  else if (params.has('play')) startPlay(params.get('room'));
  else { game.state = 'title'; $('title').classList.remove('hidden'); }
  requestAnimationFrame(loop);
}

function respawn() {
  const s = EXTERIOR_SPAWN;
  game.player.place(s.x, s.y + 0.5, s.z, s.yaw);
  game.follow.yaw = s.yaw + Math.PI;
}

export function startPlay(roomId) {
  game.state = 'play';
  $('title').classList.add('hidden');
  $('creator').classList.add('hidden');
  $('hud').classList.remove('hidden');
  game.audio.resume();
  const r = roomId && ROOMS.find((q) => q.id === roomId);
  if (r) teleport(r);
  else if (!game.started) respawn();
  game.started = true;
  game.ui.onPlay();
}
game.startPlay = startPlay;

export function teleport(room) {
  const [x, z, yaw] = room.spawn;
  game.player.place(x, floorY(room.floor) + 0.3, z, yaw);
  game.follow.yaw = yaw + Math.PI;
  game.follow.initialized = false;
}
game.teleport = teleport;

// ---------------------------------------------------------------------------
let last = performance.now();
const tmp = new THREE.Vector3();
const focus = new THREE.Vector3();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.t += dt;
  const { renderer, scene, camera, input, player, follow, world, lightPool, sky, ui } = game;

  if (game.state === 'title') {
    world.setVisibleFloors(0, true);
    const t = game.t * 0.045;
    camera.position.set(Math.sin(t) * 46, 13 + Math.sin(t * 1.7) * 3, Math.cos(t) * 46 + 6);
    camera.lookAt(0, 7, 2);
    world.doors.update(dt, tmp.set(0, -100, 0));
    for (const f of world.updaters) f(dt, game.t, game);
    lightPool.update(dt, camera.position, 0, true, sky.night);
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }
  if (game.state === 'creator') {
    ui.creator.render(dt);
    input.endFrame();
    return;
  }
  if (game.state !== 'play') { input.endFrame(); return; }
  tickPlay(dt, true);
}

// One step of gameplay. Rendering is optional so tests can fast-forward.
function tickPlay(dt, draw = true) {
  const { renderer, scene, camera, input, player, follow, world, lightPool, sky, ui } = game;
  const panelOpen = ui.panelOpen;
  const busy = panelOpen || !!ui.dockOpen;
  if (!panelOpen) follow.applyInput(input.consumeLook(), input.consumeZoom());
  else { input.consumeLook(); input.consumeZoom(); }
  input.enabled = !panelOpen;

  // ---- lift first so riders move with it this frame
  const lift = game.lift;
  const inLift = Math.hypot(player.pos.x - STAIR.cx, player.pos.z - STAIR.cz) < LIFT.shaftR && Math.abs(player.pos.y - lift.y) < 0.6;
  game.inLift = inLift;
  lift.update(dt, inLift);
  if (player.seat && !busy) {
    const ax = input.moveAxis();
    if (!player.seat.instrument && (Math.hypot(ax.x, ax.y) > 0.5 || input.hit('Space'))) standUp();
  }
  player.lookYaw = 0;
  player.update(dt, input, follow.yaw, lift);
  world.doors.update(dt, player.pos);
  for (const f of world.updaters) f(dt, game.t, game);

  // ---- location
  const floor = Math.max(0, Math.min(4, Math.floor((player.pos.y + 1.2) / FH)));
  const room = roomAt(player.pos.x, player.pos.z, floor);
  const outdoors = !room || room.outdoor || (floor === 4 && room.id !== 'pavilion');
  game.floor = floor; game.room = room; game.outdoors = outdoors;
  const nearAtrium = Math.abs(player.pos.x) < 5.8 && Math.abs(player.pos.z) < 5.8;
  world.setVisibleFloors(floor, outdoors || nearAtrium || inLift || !!(room && room.id.startsWith('gallery')) || follow.curDist > 7);
  ui.setWhere(room, floor, outdoors, inLift);
  ui.update(dt);

  // ---- interactables
  let best = null, bestD = 1e9;
  if (!player.seat && !busy) {
    for (const it of world.interactables) {
      if (it.cond && !it.cond(game)) continue;
      const dy = Math.abs(it.pos.y - (player.pos.y + 0.6));
      if (dy > 1.4) continue;
      const d = Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z);
      if (d < it.r && d < bestD) { best = it; bestD = d; }
    }
  }
  game.focusItem = best;
  ui.showPrompt(player.seat ? { label: player.seat.instrument ? 'Stand up (Esc)' : 'Stand up', key: player.seat.instrument ? 'Esc' : 'E' } : busy ? null : best);
  if (!busy && input.hit('KeyE')) {
    if (player.seat) standUp();
    else if (best) useItem(best);
  }
  if (!busy && best && best.key && best.key !== 'E' && input.hit('Key' + best.key)) useItem(best, true);

  // ---- camera
  player.headPos(focus);
  if (player.seat && player.seat.cam) {
    const c = player.seat.cam;
    follow.override = { pos: new THREE.Vector3(...c.pos), look: new THREE.Vector3(...c.look) };
  } else follow.override = null;
  if (player.seat && player.seat.mode === 'lie') focus.set(player.pos.x, player.pos.y + 0.9, player.pos.z);
  else if (player.seat) focus.y -= (1.72 - (player.seat.seatH + 0.85)) * 0.9;
  follow.update(dt, focus);
  avatarVisibility();

  lightPool.update(dt, tmp.copy(player.pos).setY(player.pos.y + 1.5), floor, outdoors, sky.night);
  if (draw) {
    renderer.adapt(dt);
    renderer.render(scene, camera);
  }
  input.endFrame();
}
game.simulate = (seconds, keys = []) => {
  for (const k of keys) game.input.keys.add(k);
  const n = Math.round(seconds * 60);
  for (let i = 0; i < n; i++) { game.t += 1 / 60; tickPlay(1 / 60, false); }
  for (const k of keys) game.input.keys.delete(k);
};

function avatarVisibility() {
  const { camera, player, follow } = game;
  const d = camera.position.distanceTo(focus);
  player.avatar.root.visible = !(follow.firstPerson || d < 0.45);
}

export function useItem(it, alt = false) {
  const { player, audio, ui } = game;
  audio.resume();
  if (it.kind === 'seat') {
    player.sit(it.seat);
    if (it.seat.instrument) ui.openInstrument(it.seat.instrument, true);
    audio.ui();
  } else if (it.action) it.action(game, alt);
}
game.useItem = useItem;

export function standUp() {
  const { player, ui } = game;
  if (!player.seat) return;
  if (player.seat.instrument) ui.closeInstrument();
  player.stand();
}
game.standUp = standUp;

boot().catch((e) => {
  console.error(e);
  $('loadmsg').textContent = 'Something went wrong: ' + e.message;
});
