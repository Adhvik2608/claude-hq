// Browser end-to-end QA. Runs the real page in headless Chromium (software WebGL)
// and drives it the way a person would. Usage: npm run test:e2e
// Needs the `playwright` package and a running server (npm start), or set BASE_URL.
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const { spawn } = require('node:child_process');
let BASE = process.env.BASE_URL || '';
let server = null;
// Start the static server ourselves unless BASE_URL points at one.
async function ensureServer() {
  if (BASE) return;
  const port = 8000 + Math.floor(Math.random() * 900);
  server = spawn(process.execPath, [path.join(__dirname, '../../serve.mjs')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
  BASE = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) { try { const r = await fetch(BASE); if (r.ok) return; } catch (e) {} await new Promise((r) => setTimeout(r, 100)); }
  throw new Error('static server did not start');
}
const results = [];
let failed = 0;
async function check(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(`ok   ${name} (${Date.now() - t0} ms)`); }
  catch (e) { failed++; results.push(`FAIL ${name}\n     ${String(e && e.message || e).split('\n').join('\n     ')}`); }
}

// A synthetic tanpura recording in D (rendered with the app's own string model) as WAV bytes.
function tanpuraWav(saHz) {
  const ctx = { self: { postMessage(m) { ctx.out = m; } }, Math, Float32Array };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(__dirname, '../../js/audio/tanpura-worker.js'), 'utf8'), ctx);
  const sr = 22050;
  const strings = [0.75, 1, 1, 0.5].map((r, i) => ({ f0: saHz * r, dur: 6, tau1: 5, jawari: 0.75, bright: 0.55, seed: 11 + i * 7, pluck: 0.13, gain: 1 }));
  ctx.self.onmessage({ data: { id: 1, sr, strings } });
  const bufs = ctx.out.bufs, len = sr * 9, mix = new Float32Array(len);
  for (const start of [0, 4.6]) [0, 0.3, 0.46, 0.64].forEach((off, i) => { const o = Math.floor((start + off * 4.6) * sr); for (let j = 0; j < bufs[i].length && o + j < len; j++) mix[o + j] += bufs[i][j] * 0.5; });
  const data = Buffer.alloc(44 + len * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + len * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(sr, 24); data.writeUInt32LE(sr * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(mix[i] * 32767))), 44 + i * 2);
  return data;
}
// 2x2 PNG for the photo-frame upload
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANBAEB4C2T5QAAAABJRU5ErkJggg==', 'base64');

(async () => {
  await ensureServer();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/tanpura\.json|404/.test(m.text())) errors.push('console: ' + m.text()); });
  const ev = (fn, arg) => page.evaluate(fn, arg);

  const phoneOnly = process.env.ONLY === 'phone';
  if (!phoneOnly) {
  await check('page loads, builds the house and shows the title screen', async () => {
    await page.goto(BASE + '?q=low', { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), null, { timeout: 240000 });
    assert.equal(await ev(() => window.__game.state), 'title');
    assert.ok(await page.isVisible('#btnEnter'));
    assert.match(await page.title(), /Dream House/);
  });

  await check('"Enter the house" starts at the front garden with the HUD', async () => {
    await page.click('#btnEnter');
    await page.waitForFunction(() => window.__game.state === 'play');
    assert.ok(await page.isVisible('#hud'));
    const z = await ev(() => window.__game.player.pos.z);
    assert.ok(z > 30, 'spawned in the garden');
  });

  await check('keyboard walking moves the character', async () => {
    const before = await ev(() => window.__game.player.pos.z);
    await page.keyboard.down('KeyW');
    // software rendering in CI runs at a few fps, so wait on distance rather than time
    await page.waitForFunction((z0) => z0 - window.__game.player.pos.z > 0.5, before, { timeout: 30000 });
    await page.keyboard.up('KeyW');
    const after = await ev(() => window.__game.player.pos.z);
    assert.ok(before - after > 0.5, `moved ${(before - after).toFixed(2)} m towards the house`);
  });

  await check('every HUD panel opens and closes', async () => {
    for (const name of ['studio', 'map', 'time', 'settings', 'help']) {
      await page.click(`[data-open="${name}"]`);
      await page.waitForSelector('#panelWrap:not(.hidden)');
      assert.ok((await page.textContent('#panelBody')).length > 20, `${name} has content`);
      await page.click('#panelClose');
      await page.waitForSelector('#panelWrap.hidden', { state: 'attached' });
    }
  });

  await check('tanpura plays from the pill and renders its strings in a worker', async () => {
    await page.click('#tpPlay');
    await page.waitForFunction(() => window.__game.tanpura.playing && window.__game.tanpura.buffers && window.__game.tanpura.voices.length > 0, null, { timeout: 60000 });
    const n = await ev(() => window.__game.tanpura.buffers.length);
    assert.equal(n, 4);
  });

  await check('choosing B in the tanpura panel retunes without restarting the drone', async () => {
    await page.click('#tpOpen');
    await page.waitForSelector('.keygrid .chip');
    const gen0 = await ev(() => window.__game.tanpura.gen);
    await page.click('.keygrid .chip[data-k="11"]');
    await page.waitForFunction((g) => window.__game.tanpura.gen > g, gen0, { timeout: 60000 });
    const st = await ev(() => ({ key: window.__game.tanpura.state.key, playing: window.__game.tanpura.playing, hz: window.__game.tanpura.saFreq() }));
    assert.equal(st.key, 11);
    assert.ok(st.playing, 'still playing after the key change');
    assert.ok(Math.abs(st.hz - 123.47) < 0.05, `Sa = ${st.hz}`);
    assert.match(await page.textContent('#tpKey'), /B/);
    await page.click('#panelClose');
  });

  await check('a custom Sa in Hz and fine tuning work', async () => {
    await page.click('#tpOpen');
    await page.fill('#tpHz', '146.83');
    await page.click('#tpHzSet');
    const hz = await ev(() => window.__game.tanpura.saFreq());
    assert.equal(hz, 146.83);
    await page.click('#panelClose');
  });

  await check('loading your own tanpura recording detects its key and plays it in any scale', async () => {
    await page.click('#tpOpen');
    await page.setInputFiles('#recFile', { name: 'my-tanpura.wav', mimeType: 'audio/wav', buffer: tanpuraWav(146.83) });
    await page.waitForFunction(() => window.__game.tanpura.state.source === 'recording' && window.__game.tanpura.rec, null, { timeout: 60000 });
    const st = await ev(() => ({ recKey: window.__game.tanpura.state.recKey, name: window.__game.tanpura.recordingName() }));
    assert.equal(st.recKey, 2, 'detected D');
    assert.equal(st.name, 'my-tanpura.wav');
    await page.waitForFunction(() => window.__game.tanpura.recSrc, null, { timeout: 20000 });
    await page.click('.keygrid .chip[data-k="9"]'); // A
    await page.waitForTimeout(400);
    const rate = await ev(() => window.__game.tanpura.recSrc.rate);
    assert.ok(Math.abs(12 * Math.log2(rate) - -5) < 0.05, `A is a fourth below D (rate ${rate})`);
    await page.click('[data-src="model"]');
    await page.waitForFunction(() => window.__game.tanpura.state.source === 'model');
    await page.click('#panelClose');
  });

  await check('map teleports into the temple and the HUD names the room', async () => {
    await page.click('[data-open="map"]');
    await page.click('.map-svg .room[data-id="temple"]', { force: true });
    await page.waitForFunction(() => window.__game.room && window.__game.room.id === 'temple');
    await page.waitForFunction(() => /Mandir/.test(document.getElementById('whereRoom').textContent));
  });

  await check('ringing the temple bell and doing aarti from the prompts', async () => {
    const ok = await ev(() => {
      const g = window.__game;
      const bell = g.world.interactables.find((i) => /temple bell/.test(i.label));
      const aarti = g.world.interactables.find((i) => /aarti/.test(i.label));
      g.player.place(bell.pos.x + 0.3, 0.1, bell.pos.z, 0);
      g.simulate(0.2);
      const shown = document.getElementById('promptText').textContent;
      g.useItem(bell); g.useItem(aarti);
      return { shown, emote: g.player.emote };
    });
    assert.match(ok.shown, /bell|aarti|shankh|tanpura|Sit|Photo|photo/i);
    assert.equal(ok.emote, 'pray');
  });

  await check('putting your own photo in a temple frame', async () => {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      ev(() => { const g = window.__game; g.ui.pickImage(g.world.frames.find((f) => f.id === 'temple-om')); }),
    ]);
    await chooser.setFiles({ name: 'family.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => /placed/.test(document.getElementById('toast').textContent), null, { timeout: 20000 });
  });

  await check('every instrument dock opens from the music studio and plays from the keyboard', async () => {
    for (const id of ['harmonium', 'tabla', 'sitar', 'flute', 'piano']) {
      await page.click('[data-open="studio"]');
      await page.click(`#studioCards .card:has-text("${{ harmonium: 'Harmonium', tabla: 'Tabla', sitar: 'Sitar', flute: 'Bansuri', piano: 'Grand piano' }[id]}") [data-play]`);
      await page.waitForSelector('#dock:not(.hidden)');
      assert.equal(await ev(() => window.__game.ui.dockOpen), id);
      for (const k of ['KeyA', 'KeyD', 'KeyG', 'KeyJ', 'KeyK']) { await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); }
      assert.ok(await ev(() => window.__game.player.frozen), 'the character stays put while you play');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#dock.hidden', { state: 'attached' });
      assert.ok(!(await ev(() => window.__game.player.frozen)));
    }
  });

  await check('tabla theka runs through the taal cycle', async () => {
    await page.click('[data-open="studio"]');
    await page.click('#studioCards .card:has-text("Tabla") [data-play]');
    await page.click('#thekaBtn');
    await page.waitForSelector('#taalRow .b.now', { timeout: 20000 });
    await page.click('#thekaBtn');
    await page.keyboard.press('Escape');
  });

  await check('sitting at the harmonium in the music room opens it, Esc stands you up', async () => {
    await ev(() => { const g = window.__game; const h = g.world.instruments.harmonium; g.player.place(h.seat.pos[0] + 2, h.seat.pos[1] + 0.3, h.seat.pos[2], 0); g.useItem(h); });
    await page.waitForSelector('#dock:not(.hidden)');
    assert.equal(await ev(() => window.__game.player.seat && window.__game.player.seat.mode), 'play:harmonium');
    await page.keyboard.press('KeyE'); // E is a note here, it must not stand you up
    assert.ok(await ev(() => !!window.__game.player.seat), 'E plays a note instead of standing up');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__game.player.seat);
  });

  await check('lift panel appears inside the lift and takes you to the terrace', async () => {
    await ev(() => { const g = window.__game; g.player.place(0, g.lift.y + 0.1, 0.2, 0); g.simulate(0.3); });
    await page.waitForSelector('#liftPanel:not(.hidden)');
    await page.click('#liftBtns [data-f="4"]');
    await ev(() => window.__game.simulate(16));
    const st = await ev(() => ({ y: window.__game.lift.y, py: window.__game.player.pos.y }));
    assert.equal(st.y, 16);
    assert.ok(Math.abs(st.py - 16) < 0.02);
    assert.match(await page.textContent('#liftInd'), /T/);
  });

  await check('time of day changes to night', async () => {
    await page.click('[data-open="time"]');
    await page.click('[data-h="21.5"]');
    assert.ok(await ev(() => window.__game.sky.night > 0.9));
    await page.click('#panelClose');
  });

  await check('character creator: every tab, surprise me, and the look is saved', async () => {
    await page.keyboard.press('KeyC');
    await page.waitForSelector('#creator:not(.hidden)');
    for (const tab of ['Body', 'Face', 'Eyes', 'Hair', 'Outfit', 'Extras']) {
      await page.click(`#ccTabs .chip:has-text("${tab}")`);
      const chips = await page.$$('#ccBody .chip');
      if (chips.length) await chips[chips.length - 1].click();
      const sw = await page.$$('#ccBody .sw:not(.sw-custom)');
      if (sw.length) await sw[sw.length - 1].click();
    }
    await page.click('#ccRandom');
    await page.fill('#ccName', 'Adhvik');
    await page.click('#ccDone');
    await page.waitForFunction(() => window.__game.state === 'play');
    const saved = await ev(() => JSON.parse(localStorage.getItem('dh.look') || 'null'));
    assert.ok(saved && saved.hair, 'look saved');
    assert.equal(await ev(() => localStorage.getItem('dh.name')), 'Adhvik');
  });

  await check('settings: quality switch rebuilds the renderer', async () => {
    await page.click('[data-open="settings"]');
    await page.click('[data-q="medium"]');
    assert.equal(await ev(() => window.__game.renderer.qualityKey), 'medium');
    await page.click('[data-q="low"]');
    await page.click('#panelClose');
  });

  await check('centred overlays (prompt, toast, instrument dock) stay centred on screen', async () => {
    await page.click('[data-open="studio"]');
    await page.click('#studioCards .card:has-text("Tabla") [data-play]');
    await page.waitForSelector('#dock:not(.hidden)');
    await page.waitForTimeout(500);
    const r = await ev(() => { const d = document.getElementById('dock').getBoundingClientRect(); return { l: d.left, r: d.right, w: innerWidth }; });
    assert.ok(r.l >= 0 && r.r <= r.w, `dock inside the screen (${Math.round(r.l)}..${Math.round(r.r)})`);
    assert.ok(Math.abs((r.l + r.r) / 2 - r.w / 2) < 2, 'dock centred');
    await page.keyboard.press('Escape');
    await ev(() => window.__game.ui.toast('Centred?'));
    await page.waitForTimeout(500);
    const t = await ev(() => { const d = document.getElementById('toast').getBoundingClientRect(); return (d.left + d.right) / 2 - innerWidth / 2; });
    assert.ok(Math.abs(t) < 2, `toast centred (${t})`);
  });

  await check('no errors in the console during the whole run', async () => {
    assert.deepEqual(errors, []);
  });
  }
  await page.close();

  // ---- phone
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const perr = [];
  phone.on('pageerror', (e) => perr.push(e.message));
  await check('phone: loads, shows touch controls and never scrolls sideways', async () => {
    await phone.goto(BASE + '?play&q=low', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await phone.waitForFunction(() => document.getElementById('loader').classList.contains('hidden'), null, { timeout: 240000 });
    assert.ok(await phone.isVisible('#stick'), 'joystick visible');
    const clash = await phone.evaluate(() => {
      const a = document.getElementById('where').getBoundingClientRect(), b = document.getElementById('hudButtons').getBoundingClientRect();
      return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    assert.equal(clash, 0, 'room name is not hidden behind the HUD buttons');
    assert.ok(await phone.isVisible('#tAct'), 'action button visible');
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
    await phone.tap('#tpOpen');
    await phone.waitForSelector('#panelWrap:not(.hidden)');
    const panelOverflow = await phone.evaluate(() => { const p = document.getElementById('panel').getBoundingClientRect(); return p.right - innerWidth; });
    assert.ok(panelOverflow <= 0, 'panel fits the screen');
    await phone.tap('#panelClose');
    await phone.waitForSelector('#panelWrap.hidden', { state: 'attached' });
    // the touch layer must not swallow taps meant for the 3D view (dragging to look around)
    const hit = await phone.evaluate(() => document.elementsFromPoint(innerWidth / 2, innerHeight / 2).slice(0, 3).map((e) => e.id || e.className || e.tagName).join(' > '));
    assert.match(hit, /^scene/, `centre of the screen reaches the 3D canvas (${hit})`);
    // the joystick walks the character
    const z0 = await phone.evaluate(() => window.__game.player.pos.z);
    const box = await phone.locator('#stick').boundingBox();
    const cdp = await phone.context().newCDPSession(phone);
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx, y: cy - 50 }] });
    await phone.waitForFunction((z) => Math.abs(window.__game.player.pos.z - z) > 0.3, z0, { timeout: 30000 });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.deepEqual(perr, []);
  });

  await browser.close();
  if (server) server.kill();
  console.log(results.join('\n'));
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); if (server) server.kill(); process.exit(1); });
