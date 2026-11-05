import * as THREE from 'three';
import { FLOORS, ROOMS, NOTE_LABELS, SARGAM, SARGAM_DEVA, floorY, STAIR } from '../config.js';
import { FIRST_LABELS } from '../audio/tanpura.js';
import { Harmonium, Tabla, Sitar, Flute, Piano, THAATS, TAALS, TABLA_PADS, CHROMA_KEYS, SARGAM_KEYS } from '../audio/instruments.js';
import { QUALITY } from '../engine/renderer.js';
import { Creator } from './creator.js';

const $ = (id) => document.getElementById(id);
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const TANPURA_SVG = `<svg viewBox="0 0 120 300" aria-hidden="true">
  <defs><linearGradient id="tw" x1="0" x2="1"><stop offset="0" stop-color="#5a2e12"/><stop offset=".5" stop-color="#a5612a"/><stop offset="1" stop-color="#4a250e"/></linearGradient>
  <radialGradient id="tg" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#d79a55"/><stop offset=".6" stop-color="#8a4a1c"/><stop offset="1" stop-color="#3e1d08"/></radialGradient></defs>
  <rect x="52" y="10" width="16" height="190" rx="6" fill="url(#tw)"/>
  <rect x="49" y="8" width="22" height="16" rx="4" fill="#3a1d0a"/>
  <g fill="#e9c27a"><circle cx="46" cy="30" r="3"/><circle cx="74" cy="30" r="3"/><circle cx="46" cy="52" r="3"/><circle cx="74" cy="52" r="3"/></g>
  <ellipse cx="60" cy="242" rx="54" ry="52" fill="url(#tg)"/>
  <ellipse cx="60" cy="236" rx="40" ry="36" fill="#c58a4c" opacity=".55"/>
  <path d="M30 236 q30 -18 60 0" stroke="#e9c27a" stroke-width="1.5" fill="none" opacity=".7"/>
  <rect x="44" y="258" width="32" height="6" rx="2" fill="#f2e3c4"/>
  <g class="strs"><line class="str" x1="55" y1="26" x2="55" y2="260"/><line class="str" x1="58.3" y1="26" x2="58.3" y2="260"/><line class="str" x1="61.7" y1="26" x2="61.7" y2="260"/><line class="str" x1="65" y1="26" x2="65" y2="260"/></g>
</svg>`;

export class UI {
  constructor(game) {
    this.g = game;
    this.panelOpen = false;
    this.dockOpen = null;
    this.toastTimer = 0;
    const a = game.audio, tp = game.tanpura;
    const getSa = () => tp.saFreq();
    this.inst = { harmonium: new Harmonium(a, getSa), tabla: new Tabla(a, getSa), sitar: new Sitar(a, tp), flute: new Flute(a, getSa), piano: new Piano(a, getSa) };
    tp.on(() => { this.syncTanpura(); this.inst.harmonium.drones && this.inst.harmonium.retune && this.inst.harmonium.audio.ctx && this.inst.harmonium.retune(); });
    tp.onPluck((i) => this.pluck(i));
    this.creator = new Creator(game, this);
    this.bind();
    this.syncTanpura();
  }

  // ------------------------------------------------------------------ binding
  bind() {
    const g = this.g;
    $('btnEnter').onclick = () => { g.audio.resume(); g.startPlay(); };
    $('btnCreate').onclick = () => { g.audio.resume(); this.creator.open('title'); };
    $('tpPlay').onclick = () => { g.audio.resume(); g.tanpura.toggle(); };
    $('tpOpen').onclick = () => this.open('tanpura');
    $('panelClose').onclick = () => this.close();
    $('panelWrap').addEventListener('pointerdown', (e) => { if (e.target === $('panelWrap')) this.close(); });
    $('prompt').onclick = () => { const it = g.focusItem; if (g.player.seat) g.standUp(); else if (it) g.useItem(it); };
    for (const b of document.querySelectorAll('[data-open]')) b.onclick = () => { g.audio.resume(); this.open(b.dataset.open); };
    g.input.bindTouchUI({ stick: $('stick'), knob: $('knob'), jump: $('tJump'), run: $('tRun'), act: $('tAct') });
    g.input.onKey = (k, e) => this.key(k, e);
    g.input.onKeyUp = (k) => this.keyUp(k);
    // lift buttons
    const lb = $('liftBtns');
    for (const f of [...FLOORS].reverse()) {
      const b = h(`<button data-f="${f.id}" title="${esc(f.name)}">${f.short}</button>`);
      b.onclick = () => this.liftGo(f.id);
      lb.appendChild(b);
    }
    lb.appendChild(h(`<button data-open-doors>◀ ▶</button>`)).onclick = () => g.lift.call(g.lift.currentFloor());
    g.lift.on(() => this.syncLift());
    // instrument state
    this.inst.tabla.on((e) => { if (e.beat !== undefined) this.taalBeat(e.beat); if (e.playing !== undefined) this.syncTablaBtn(); });
  }

  key(k, e) {
    const g = this.g;
    if (g.state !== 'play') { if (k === 'Escape' && g.state === 'creator') this.creator.done(); return; }
    if (this.dockOpen && this.dockKey(k, e)) return;
    if (k === 'Escape') {
      if (this.panelOpen) return this.close();
      if (this.dockOpen) return this.closeInstrument(true);
      if (g.player.seat) return g.standUp();
    }
    if (this.panelOpen) return;
    if (g.inLift && /^Digit[0-4]$/.test(k)) return this.liftGo(+k.slice(5));
    if (/^Digit[1-5]$/.test(k) && !g.player.seat) { g.player.emote = ['namaste', 'wave', 'dance', 'clap', 'pray'][+k.slice(5) - 1]; return; }
    switch (k) {
      case 'KeyM': return this.open('studio');
      case 'Tab': return this.open('map');
      case 'KeyT': return this.open('time');
      case 'KeyC': return this.creator.open('play');
      case 'KeyH': return this.open('help');
      case 'KeyP': g.audio.resume(); return g.tanpura.toggle();
      case 'KeyV': g.follow.firstPerson = !g.follow.firstPerson; $('crosshair').classList.toggle('hidden', !g.follow.firstPerson); return;
    }
  }
  keyUp(k) { if (this.dockOpen) this.dockKeyUp(k); }

  onPlay() {
    this.toast(this.g.started && this.g.player.pos.z > 20 ? 'Welcome home. Walk up to the front door — the mandir is just inside.' : 'Welcome home.', 4500);
  }

  // ------------------------------------------------------------------ HUD
  setWhere(room, floor, outdoors, inLift) {
    const name = inLift ? 'Glass Lift' : room ? room.name : floor === 0 ? 'Garden' : 'Outside';
    const fl = FLOORS[floor].name;
    if (name !== this._where || fl !== this._floor) {
      this._where = name; this._floor = fl;
      $('whereRoom').textContent = name;
      $('whereFloor').textContent = !room && floor === 0 ? 'Outside' : fl;
    }
    const show = !!inLift;
    if (show !== this._liftShown) { this._liftShown = show; $('liftPanel').classList.toggle('hidden', !show); this.syncLift(); }
  }

  showPrompt(it) {
    const el = $('prompt');
    if (!it || this.panelOpen) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); this._prompt = null; return; }
    const label = it.label, key = it.key || 'E';
    if (this._prompt === label + key) return;
    this._prompt = label + key;
    $('promptKey').textContent = key;
    $('promptText').textContent = label;
    el.classList.remove('hidden');
  }

  toast(msg, ms = 2600) {
    const el = $('toast');
    el.textContent = msg; el.classList.remove('hidden');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

  update(dt) {
    this.g.audio.ambience(dt, { outdoors: this.g.outdoors, night: this.g.sky.night, fountain: Math.max(0, 1 - Math.hypot(this.g.player.pos.x, this.g.player.pos.z - 27) / 14) * (this.g.floor === 0 ? 1 : 0) });
  }

  // ------------------------------------------------------------------ lift
  liftGo(n) { this.g.audio.ui(); this.g.lift.go(n); this.syncLift(n); }
  syncLift(pressed) {
    const l = this.g.lift;
    $('liftInd').textContent = FLOORS[l.currentFloor()].short;
    $('liftDir').textContent = l.state === 'moving' ? (l.v > 0 ? '▲' : '▼') : '';
    for (const b of document.querySelectorAll('#liftBtns [data-f]')) {
      const f = +b.dataset.f;
      b.classList.toggle('lit', (l.state !== 'idle' && l.target === f) || l.queue.includes(f) || pressed === f);
    }
  }

  // ------------------------------------------------------------------ tanpura
  pluck(i) {
    const s = $('tpStrings').children[i];
    if (s) { s.classList.remove('pluck'); void s.offsetWidth; s.classList.add('pluck'); }
    const p = document.querySelectorAll('.tp-hero .str')[i];
    if (p) { p.classList.remove('pluck'); void p.getBoundingClientRect(); p.classList.add('pluck'); }
    this.g.world.onPluck && this.g.world.onPluck(i);
  }
  syncTanpura() {
    const tp = this.g.tanpura, s = tp.state;
    $('tanpuraPill').classList.toggle('on', tp.playing);
    const cents = s.customHz > 0 ? '' : s.cents ? ` ${s.cents > 0 ? '+' : ''}${s.cents}¢` : '';
    $('tpKey').textContent = `Sa · ${NOTE_LABELS[s.key]}${cents}`;
    if (this.current === 'tanpura') this.renderTanpura(true);
  }

  renderTanpura(update = false) {
    const tp = this.g.tanpura, s = tp.state;
    const body = $('panelBody');
    const hz = tp.saFreq().toFixed(2);
    if (update && body.querySelector('.tp-hero')) {
      body.querySelector('.tp-big').textContent = `Sa = ${NOTE_LABELS[s.key]}`;
      body.querySelector('.tp-sub').textContent = `${hz} Hz · ${s.register === 'female' ? 'High (female) register' : 'Low (male) register'}${tp.pending ? ' · tuning…' : ''}`;
      body.querySelector('#tpBig').textContent = tp.playing ? 'Pause' : 'Play';
      body.querySelectorAll('.keygrid .chip').forEach((c) => c.classList.toggle('on', +c.dataset.k === s.key));
      body.querySelectorAll('[data-reg]').forEach((c) => c.classList.toggle('on', c.dataset.reg === s.register));
      body.querySelectorAll('[data-first]').forEach((c) => c.classList.toggle('on', c.dataset.first === s.first));
      body.querySelectorAll('[data-src]').forEach((c) => c.classList.toggle('on', c.dataset.src === s.source));
      const ct = body.querySelector('#tpCents'); if (ct && document.activeElement !== ct) { ct.value = s.cents; this.rangeFill(ct); ct.nextElementSibling.textContent = (s.cents > 0 ? '+' : '') + s.cents + '¢'; }
      const rn = body.querySelector('#recName'); if (rn) rn.textContent = tp.hasRecording() ? (tp.recordingName() || 'Recording') : 'No recording loaded';
      const rk = body.querySelector('#recKey'); if (rk) rk.value = s.recKey;
      return;
    }
    body.innerHTML = '';
    const el = h(`<div>
      <div class="tp-hero">${TANPURA_SVG}
        <div>
          <p class="eyebrow deva" style="margin:0">तानपूरा</p>
          <div class="tp-big">Sa = ${NOTE_LABELS[s.key]}</div>
          <div class="tp-sub">${hz} Hz</div>
          <div class="row" style="margin-top:14px"><button class="btn primary" id="tpBig">${tp.playing ? 'Pause' : 'Play'}</button><span class="note">Changing Sa retunes on the next pluck — the drone never restarts.</span></div>
        </div>
      </div>
      <h3>Choose your Sa (scale)</h3>
      <div class="keygrid">${NOTE_LABELS.map((n, i) => `<button class="chip ${i === s.key ? 'on' : ''}" data-k="${i}">${n}</button>`).join('')}</div>
      <div class="grid2" style="margin-top:6px">
        <div>
          <h3>Register</h3>
          <div class="chips"><button class="chip" data-reg="male">Low<span class="sm">male voice</span></button><button class="chip" data-reg="female">High<span class="sm">female voice</span></button></div>
          <h3>First string</h3>
          <div class="chips">${FIRST_LABELS.map(([k, l]) => `<button class="chip" data-first="${k}">${l}</button>`).join('')}</div>
        </div>
        <div>
          <h3>Custom scale</h3>
          <div class="ctl"><label for="tpCents">Fine tune</label><input type="range" id="tpCents" min="-50" max="50" step="1" value="${s.cents}"/><output>${s.cents}¢</output></div>
          <div class="row tight"><input class="field" id="tpHz" type="number" min="60" max="600" step="0.01" placeholder="Exact Sa in Hz, e.g. 146.83" style="min-width:0"/><button class="btn small" id="tpHzSet">Set</button></div>
          <div class="ctl"><label for="tpA4">Concert A</label><select class="field" id="tpA4">${[432, 435, 438, 440, 442, 444].map((v) => `<option ${v === s.a4 ? 'selected' : ''}>${v}</option>`).join('')}</select><output>Hz</output></div>
        </div>
      </div>
      <h3>Sound</h3>
      <div class="grid2">
        <div>${this.slider('tpTempo', 'Pluck cycle', 2.6, 8, 0.1, s.tempo, (v) => v.toFixed(1) + 's')}${this.slider('tpVol', 'Volume', 0, 1, 0.01, s.volume, (v) => Math.round(v * 100))}</div>
        <div>${this.slider('tpJaw', 'Jawari buzz', 0, 1.2, 0.01, s.jawari, (v) => Math.round(v * 100))}${this.slider('tpBright', 'Brightness', 0, 1, 0.01, s.bright, (v) => Math.round(v * 100))}${this.slider('tpRev', 'Temple hall', 0, 1, 0.01, s.reverb, (v) => Math.round(v * 100))}</div>
      </div>
      <h3>Tanpura source</h3>
      <div class="chips"><button class="chip" data-src="model">Studio-modelled tanpura<span class="sm">built in · any scale</span></button><button class="chip" data-src="recording">Your recording<span class="sm" id="recName">${esc(tp.hasRecording() ? tp.recordingName() || 'Recording' : 'No recording loaded')}</span></button></div>
      <div class="card" style="margin-top:12px">
        <p class="note" style="margin:0 0 10px">Have a specific tanpura recording you love? Load the audio file and it plays here exactly as recorded, retuned to whichever Sa you pick with a seamless crossfade at the same point in the cycle. Its key is detected automatically; correct it below if needed.</p>
        <div class="row tight">
          <label class="btn small" for="recFile" style="cursor:pointer">Load recording…</label><input type="file" id="recFile" accept="audio/*" hidden/>
          <span class="note">Recording is in</span>
          <select class="field" id="recKey" style="min-width:0;flex:0 0 auto">${NOTE_LABELS.map((n, i) => `<option value="${i}" ${i === s.recKey ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <button class="btn small ghost" id="recForget">Remove</button>
        </div>
      </div>
    </div>`);
    body.appendChild(el);
    el.querySelector('#tpBig').onclick = () => { this.g.audio.resume(); tp.toggle(); };
    el.querySelectorAll('.keygrid .chip').forEach((c) => c.onclick = () => { this.g.audio.resume(); tp.set({ key: +c.dataset.k, cents: 0 }); if (!tp.playing) tp.play(); });
    el.querySelectorAll('[data-reg]').forEach((c) => c.onclick = () => tp.set({ register: c.dataset.reg }));
    el.querySelectorAll('[data-first]').forEach((c) => c.onclick = () => tp.set({ first: c.dataset.first }));
    el.querySelectorAll('[data-src]').forEach((c) => c.onclick = async () => {
      if (c.dataset.src === 'recording') {
        if (!tp.rec) { const ok = await tp.activatePendingRecording(); if (!ok) { this.toast('Load a tanpura recording first.'); return; } }
        tp.useSource('recording');
      } else tp.useSource('model');
    });
    this.bindSlider(el, 'tpCents', (v) => tp.set({ cents: v }), (v) => (v > 0 ? '+' : '') + v + '¢');
    this.bindSlider(el, 'tpTempo', (v) => tp.set({ tempo: v }));
    this.bindSlider(el, 'tpVol', (v) => tp.set({ volume: v }));
    this.bindSlider(el, 'tpJaw', (v) => tp.set({ jawari: v }), null, true);
    this.bindSlider(el, 'tpBright', (v) => tp.set({ bright: v }), null, true);
    this.bindSlider(el, 'tpRev', (v) => tp.set({ reverb: v }));
    el.querySelector('#tpA4').onchange = (e) => tp.set({ a4: +e.target.value });
    el.querySelector('#tpHzSet').onclick = () => { const v = parseFloat(el.querySelector('#tpHz').value); if (v > 50 && v < 800) { tp.set({ customHz: v }); this.toast(`Sa set to ${v} Hz`); } };
    el.querySelector('#recFile').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      this.toast('Reading your tanpura…');
      try { const st = await tp.loadRecording(await f.arrayBuffer(), f.name); this.toast(`Loaded. Detected Sa ≈ ${NOTE_LABELS[st.recKey]}${st.recCents ? ` (${st.recCents > 0 ? '+' : ''}${st.recCents}¢)` : ''}.`, 4000); if (!tp.playing) tp.play(); }
      catch (err) { this.toast('Could not read that file: ' + err.message, 4000); }
    };
    el.querySelector('#recKey').onchange = (e) => { tp.set({ recKey: +e.target.value, recCents: 0 }); tp._retuneRecording(); };
    el.querySelector('#recForget').onclick = () => tp.forgetRecording();
    this.renderTanpura(true);
  }

  slider(id, label, min, max, step, val, fmt = (v) => v) {
    const p = ((val - min) / (max - min)) * 100;
    return `<div class="ctl"><label for="${id}">${label}</label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${p}%" data-fmt/><output>${fmt(+val)}</output></div>`;
  }
  rangeFill(r) { const p = ((r.value - r.min) / (r.max - r.min)) * 100; r.style.setProperty('--p', p + '%'); }
  bindSlider(root, id, fn, fmt, onRelease = false) {
    const r = root.querySelector('#' + id); if (!r) return;
    const out = r.nextElementSibling;
    const f = fmt || ((v) => (Math.abs(v) < 2 && r.step !== '1' ? Math.round(v * 100) : r.step === '0.1' ? v.toFixed(1) + 's' : v));
    r.addEventListener('input', () => { this.rangeFill(r); out.textContent = f(+r.value); if (!onRelease) fn(+r.value); });
    r.addEventListener('change', () => fn(+r.value));
  }

  // ------------------------------------------------------------------ panels
  open(name) {
    const g = this.g;
    if (name === 'character') return this.creator.open('play');
    if (this.current === name && this.panelOpen) return this.close();
    this.current = name;
    this.panelOpen = true;
    g.input.keys.clear();
    $('panelWrap').classList.remove('hidden');
    const panel = $('panel');
    panel.classList.toggle('narrow', ['time', 'help', 'settings'].includes(name));
    const body = $('panelBody');
    body.innerHTML = '';
    if (name === 'tanpura') this.renderTanpura();
    else if (name === 'studio') this.renderStudio(body);
    else if (name === 'map') this.renderMap(body);
    else if (name === 'time') this.renderTime(body);
    else if (name === 'settings') this.renderSettings(body);
    else if (name === 'help') this.renderHelp(body);
  }
  close() {
    this.panelOpen = false; this.current = null;
    $('panelWrap').classList.add('hidden');
  }

  renderStudio(body) {
    const cards = [
      ['tanpura', 'Tanpura', 'तानपूरा', 'The drone that holds everything together.'],
      ['harmonium', 'Harmonium', 'हारमोनियम', 'Reed organ with bass & female reeds and Sa/Pa drones.'],
      ['tabla', 'Tabla', 'तबला', 'Play bols on the pads or run a theka in six taals.'],
      ['sitar', 'Sitar', 'सितार', 'Buzzing jawari strings with meend glides.'],
      ['flute', 'Bansuri', 'बांसुरी', 'Breathy bamboo flute with natural vibrato.'],
      ['piano', 'Grand piano', 'पियानो', 'A concert grand tuned to your Sa.'],
    ];
    body.appendChild(h(`<div><h2>Music Studio</h2><p class="lead">Every instrument follows your tanpura's Sa (now ${NOTE_LABELS[this.g.tanpura.state.key]}). Play right here, or walk to the music room on the first floor and sit at the instrument.</p>
      <div class="grid2" id="studioCards"></div></div>`));
    const wrap = body.querySelector('#studioCards');
    for (const [id, name, deva, desc] of cards) {
      const c = h(`<div class="card"><div class="row" style="justify-content:space-between"><div><div style="font-family:var(--display);font-size:26px;font-weight:700">${name}</div><div class="deva muted">${deva}</div></div></div><p class="note">${desc}</p><div class="row tight"><button class="btn small primary" data-play>Play here</button>${id !== 'tanpura' ? '<button class="btn small" data-walk>Sit at it in the music room</button>' : ''}</div></div>`);
      c.querySelector('[data-play]').onclick = () => { if (id === 'tanpura') { this.open('tanpura'); } else { this.close(); this.openInstrument(id); } };
      const w = c.querySelector('[data-walk]');
      if (w) w.onclick = () => { this.close(); const seat = this.g.world.instruments[id]; if (seat) { this.g.player.place(seat.seat.pos[0], seat.seat.pos[1] + 0.2, seat.seat.pos[2] + 0.8); this.g.useItem(seat); } else this.openInstrument(id); };
      wrap.appendChild(c);
    }
    const riyaz = h(`<div class="card" style="margin-top:14px"><div style="font-family:var(--display);font-size:24px;font-weight:700">Riyaz mode</div><p class="note">Tanpura + tabla theka together, tuned to the same Sa.</p><button class="btn small primary">Start riyaz</button></div>`);
    riyaz.querySelector('button').onclick = () => { this.g.audio.resume(); if (!this.g.tanpura.playing) this.g.tanpura.play(); this.close(); this.openInstrument('tabla'); if (!this.inst.tabla.playing) { this.inst.tabla.start(); this.syncTablaBtn(); } };
    body.appendChild(riyaz);
  }

  renderMap(body) {
    const g = this.g;
    let fl = g.floor ?? 0;
    body.appendChild(h(`<div><h2>The House</h2><p class="lead">Tap a room to go there.</p><div class="tabs" id="mapTabs"></div><div class="map-wrap"><svg class="map-svg" id="mapSvg" viewBox="-17 -16.5 34 34"></svg></div><div class="row" style="margin-top:12px"><button class="btn small" id="mapGarden">Front garden</button><button class="btn small" id="mapGate">Main gate</button></div></div>`));
    const tabs = body.querySelector('#mapTabs');
    const draw = () => {
      tabs.innerHTML = '';
      for (const f of FLOORS) { const b = h(`<button class="chip ${f.id === fl ? 'on' : ''}">${f.name}</button>`); b.onclick = () => { fl = f.id; draw(); }; tabs.appendChild(b); }
      const svg = body.querySelector('#mapSvg');
      let s = `<rect x="-16" y="-12" width="32" height="24" fill="rgba(255,255,255,.02)" stroke="rgba(233,185,110,.25)" stroke-width=".1"/>`;
      const rooms = ROOMS.filter((r) => r.floor === fl).sort((a, b) => (b.rect[2] - b.rect[0]) * (b.rect[3] - b.rect[1]) - (a.rect[2] - a.rect[0]) * (a.rect[3] - a.rect[1]));
      for (const r of rooms) {
        const [x0, z0, x1, z1] = r.rect;
        const cur = g.room && g.room.id === r.id;
        // map is drawn looking down with +Z (the front) at the bottom
        s += `<rect class="room ${cur ? 'cur' : ''}" data-id="${r.id}" x="${x0}" y="${z0}" width="${x1 - x0}" height="${z1 - z0}" rx=".2"/>`;
        s += `<text x="${(x0 + x1) / 2}" y="${(z0 + z1) / 2 + (r.id === 'terrace' ? 9 : 0)}">${esc(r.name.split(' · ')[0])}</text>`;
      }
      s += `<circle cx="0" cy="0" r="${STAIR.rHole}" fill="none" stroke="rgba(233,185,110,.55)" stroke-width=".08" stroke-dasharray=".3 .2"/><circle cx="0" cy="0" r="1.5" fill="rgba(233,185,110,.2)"/><text x="0" y="0" style="font-size:.5px">Lift</text>`;
      if (fl === 0) s += `<text x="0" y="14.8" style="font-size:.55px;fill:#c6af93">▼ Entrance</text>`;
      if (g.floor === fl) s += `<circle class="me" cx="${g.player.pos.x}" cy="${g.player.pos.z}" r=".45"/>`;
      svg.innerHTML = s;
      svg.querySelectorAll('.room').forEach((el) => el.onclick = () => { const r = ROOMS.find((q) => q.id === el.dataset.id); this.close(); g.teleport(r); this.toast(r.name); });
    };
    draw();
    body.querySelector('#mapGarden').onclick = () => { this.close(); g.player.place(0, -0.2, 22, Math.PI); g.follow.yaw = 0; };
    body.querySelector('#mapGate').onclick = () => { this.close(); g.player.place(0, -0.2, 40, Math.PI); g.follow.yaw = 0; };
  }

  renderTime(body) {
    const sky = this.g.sky;
    body.appendChild(h(`<div><h2>Time of day</h2><p class="lead" id="timeLbl">${sky.label()}</p>
      ${this.slider('timeR', 'Hour', 0, 24, 0.05, sky.hour, (v) => v.toFixed(1))}
      <div class="chips">${[['Sunrise', 6.4], ['Morning', 9], ['Noon', 12.5], ['Golden hour', 17.2], ['Dusk', 18.5], ['Night', 21.5]].map(([n, v]) => `<button class="chip" data-h="${v}">${n}</button>`).join('')}</div></div>`));
    const set = (v) => { sky.setTime(v); body.querySelector('#timeLbl').textContent = sky.label(); try { localStorage.setItem('dh.hour', v); } catch (e) {} };
    this.bindSlider(body, 'timeR', set, (v) => v.toFixed(1));
    body.querySelectorAll('[data-h]').forEach((b) => b.onclick = () => { const v = +b.dataset.h; const r = body.querySelector('#timeR'); r.value = v; this.rangeFill(r); r.nextElementSibling.textContent = v.toFixed(1); set(v); });
  }

  renderSettings(body) {
    const g = this.g;
    body.appendChild(h(`<div><h2>Settings</h2>
      <h3>Graphics</h3><div class="chips" id="qual">${Object.entries(QUALITY).map(([k, q]) => `<button class="chip ${k === g.renderer.qualityKey ? 'on' : ''}" data-q="${k}">${q.label}</button>`).join('')}</div>
      <p class="note">Ultra adds ambient occlusion. Resolution also adapts automatically to keep things smooth.</p>
      <h3>Sound</h3>
      ${this.slider('setVol', 'Master volume', 0, 1, 0.01, g.audio.volume, (v) => Math.round(v * 100))}
      <div class="chips"><button class="chip ${g.audio.ambienceOn ? 'on' : ''}" id="setAmb">Nature ambience</button></div>
      <h3>Camera</h3>
      ${this.slider('setSens', 'Look speed', 0.002, 0.008, 0.0001, g.follow.sens, (v) => Math.round(v * 10000))}
      <div class="chips"><button class="chip ${g.follow.firstPerson ? 'on' : ''}" id="setFP">First person (V)</button></div>
    </div>`));
    body.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { g.renderer.setQuality(b.dataset.q); body.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b)); });
    this.bindSlider(body, 'setVol', (v) => g.audio.setVolume(v));
    this.bindSlider(body, 'setSens', (v) => { g.follow.sens = v; }, (v) => Math.round(v * 10000));
    body.querySelector('#setAmb').onclick = (e) => { g.audio.ambienceOn = !g.audio.ambienceOn; e.target.classList.toggle('on', g.audio.ambienceOn); if (!g.audio.ambienceOn && g.audio.ctx) { g.audio.windGain.gain.value = 0; g.audio.cricketGain.gain.value = 0; g.audio.fountainGain.gain.value = 0; } };
    body.querySelector('#setFP').onclick = (e) => { g.follow.firstPerson = !g.follow.firstPerson; e.target.classList.toggle('on', g.follow.firstPerson); };
  }

  renderHelp(body) {
    const rows = [['W A S D', 'Walk'], ['Shift', 'Sprint'], ['Space', 'Jump'], ['E', 'Sit · use · stand up'], ['F', 'Secondary action'], ['Drag', 'Look around'], ['Wheel', 'Zoom'], ['V', 'First person'], ['P', 'Tanpura on/off'], ['M', 'Music studio'], ['Tab', 'House map'], ['T', 'Time of day'], ['C', 'Edit character'], ['1–5', 'Namaste · wave · dance · clap · pray'], ['0–4', 'Pick a floor (in the lift)'], ['Esc', 'Close / stand up']];
    body.appendChild(h(`<div><h2>Controls</h2><p class="lead">The lift is in the centre of the house, inside the spiral staircase.</p><div class="help-grid">${rows.map(([k, d]) => `<div><kbd>${k}</kbd>${d}</div>`).join('')}</div></div>`));
  }

  // ------------------------------------------------------------------ instruments dock
  openInstrument(name, seated = false) {
    const g = this.g;
    g.audio.resume();
    if (name === 'tanpura') { this.open('tanpura'); return; }
    this.dockOpen = name; this.seated = seated;
    if (!seated) g.player.frozen = true;
    const d = $('dock');
    d.classList.remove('hidden');
    d.innerHTML = '';
    const sa = NOTE_LABELS[g.tanpura.state.key];
    const title = { harmonium: 'Harmonium', tabla: 'Tabla', sitar: 'Sitar', flute: 'Bansuri', piano: 'Grand Piano' }[name];
    const head = h(`<div class="dock-head"><h3>${title} <span class="muted" style="font-size:16px">· Sa = ${sa}</span></h3><div class="row" id="dockCtl"></div><button class="btn small" id="dockClose">Done (Esc)</button></div>`);
    d.appendChild(head);
    head.querySelector('#dockClose').onclick = () => this.closeInstrument(true);
    const ctl = head.querySelector('#dockCtl');
    this.keyEls = {};
    if (name === 'harmonium' || name === 'piano') {
      const inst = this.inst[name];
      const kb = this.keyboard(name === 'harmonium' ? -5 : 0, name === 'harmonium' ? 19 : 24, name === 'harmonium', (s) => name === 'harmonium' ? inst.noteOn(s) : inst.on(s), (s) => name === 'harmonium' ? inst.noteOff(s) : inst.off(s));
      d.appendChild(kb);
      if (name === 'harmonium') {
        for (const [k, l] of [['bass', 'Bass reed'], ['female', 'Female reed']]) { const b = h(`<button class="chip ${inst.stops[k] ? 'on' : ''}">${l}</button>`); b.onclick = () => { inst.stops[k] = !inst.stops[k]; b.classList.toggle('on'); }; ctl.appendChild(b); }
        for (const dn of ['Sa', 'Pa']) { const b = h(`<button class="chip ${inst.drones[dn] ? 'on' : ''}">${dn} drone</button>`); b.onclick = () => { const on = !inst.drones[dn]; inst.drone(dn, on); b.classList.toggle('on', on); }; ctl.appendChild(b); }
      } else { inst.warm(); const b = h(`<button class="chip">Sustain</button>`); b.onclick = () => { inst.sustain = !inst.sustain; b.classList.toggle('on', inst.sustain); }; ctl.appendChild(b); }
      const oct = h(`<span class="row tight"><button class="chip">− oct</button><button class="chip">+ oct</button></span>`);
      oct.children[0].onclick = () => { inst.octave = Math.max(-1, inst.octave - 1); this.toast('Octave ' + inst.octave); };
      oct.children[1].onclick = () => { inst.octave = Math.min(1, inst.octave + 1); this.toast('Octave ' + inst.octave); };
      ctl.appendChild(oct);
    } else if (name === 'tabla') {
      const t = this.inst.tabla;
      t.ensureTuned();
      const sel = h(`<select class="field" style="min-width:0;flex:0 0 auto">${Object.keys(TAALS).map((k) => `<option ${k === t.taal ? 'selected' : ''}>${k}</option>`).join('')}</select>`);
      sel.onchange = () => { t.taal = sel.value; t.bpm = TAALS[t.taal].bpm; bpm.querySelector('input').value = t.bpm; bpm.querySelector('output').textContent = t.bpm; this.rangeFill(bpm.querySelector('input')); this.renderTaal(); };
      const bpm = h(`<span class="row tight" style="min-width:220px"><span class="note">Laya</span><input type="range" min="40" max="420" step="1" value="${t.bpm}" style="width:120px"/><output>${t.bpm}</output></span>`);
      const r = bpm.querySelector('input'); this.rangeFill(r);
      r.oninput = () => { t.bpm = +r.value; bpm.querySelector('output').textContent = r.value; this.rangeFill(r); };
      const play = h(`<button class="btn small primary" id="thekaBtn">${t.playing ? 'Stop theka' : 'Play theka'}</button>`);
      play.onclick = () => { t.playing ? t.stop() : t.start(); this.syncTablaBtn(); };
      const mj = h(`<button class="chip ${t.manjira ? 'on' : ''}">Manjira</button>`); mj.onclick = () => { t.manjira = !t.manjira; mj.classList.toggle('on', t.manjira); };
      ctl.append(sel, bpm, play, mj);
      const pads = h(`<div class="pads"></div>`);
      for (const [bol, kind, key] of TABLA_PADS) {
        const p = h(`<button class="pad ${kind}" data-key="${key}">${bol}<small>${key.replace('Key', '')}</small></button>`);
        p.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tablaHit(bol, p); });
        this.keyEls[key] = { el: p, bol };
        pads.appendChild(p);
      }
      d.appendChild(pads);
      d.appendChild(h(`<div class="taal" id="taalRow"></div>`));
      this.renderTaal();
    } else if (name === 'sitar' || name === 'flute') {
      const inst = this.inst[name];
      if (name === 'sitar') inst.ensure();
      const sel = h(`<select class="field" style="min-width:0;flex:0 0 auto">${Object.keys(THAATS).map((k) => `<option ${k === inst.thaat ? 'selected' : ''}>${k}</option>`).join('')}</select>`);
      sel.onchange = () => { inst.thaat = sel.value; this.closeInstrument(); this.openInstrument(name, seated); };
      ctl.appendChild(h(`<span class="note">Thaat</span>`)); ctl.appendChild(sel);
      if (name === 'sitar') { const mb = h(`<button class="chip ${inst.meend ? 'on' : ''}">Meend glide</button>`); mb.onclick = () => { inst.meend = !inst.meend; mb.classList.toggle('on', inst.meend); }; ctl.appendChild(mb); }
      const rows = [[-1, 'Mandra', 'ZXCVBNM'], [0, 'Madhya', 'ASDFGHJ'], [1, 'Taar', 'QWERTYU']];
      for (const [oct, label, keys] of rows) {
        const row = h(`<div class="sargam" style="margin-top:8px"></div>`);
        row.appendChild(h(`<div class="note" style="width:62px;align-self:center">${label}</div>`));
        for (let deg = 0; deg < 7; deg++) {
          const semi = inst.semis(oct, deg);
          const pc = ((THAATS[inst.thaat][deg] % 12) + 12) % 12;
          const k = 'Key' + keys[deg];
          const b = h(`<button class="sn">${SARGAM[pc]}<small>${SARGAM_DEVA[pc]} · ${keys[deg]}</small></button>`);
          const on = (e) => { e && e.preventDefault(); b.classList.add('down'); this.instNote(name, semi, true); };
          const off = () => { b.classList.remove('down'); this.instNote(name, semi, false); };
          b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
          this.keyEls[k] = { el: b, semi };
          row.appendChild(b);
        }
        d.appendChild(row);
      }
      this.keyEls.KeyK = { el: null, semi: inst.semis(1, 0) };
      this.keyEls.KeyI = { el: null, semi: inst.semis(2, 0) };
    }
  }

  keyboard(from, to, harmonium, on, off) {
    const wrap = h(`<div class="keys ${harmonium ? 'harmonium' : ''}"></div>`);
    const isBlack = (s) => [1, 3, 6, 8, 10].includes(((s % 12) + 12) % 12);
    const keyFor = {};
    for (const [k, s] of Object.entries(CHROMA_KEYS)) keyFor[s] = k.replace('Key', '').replace('Semicolon', ';').replace('Quote', "'");
    const whites = [];
    for (let s = from; s <= to; s++) if (!isBlack(s)) whites.push(s);
    const W = 100 / whites.length;
    let wi = 0;
    const press = (el, s) => { el.classList.add('down'); on(s); this.g.player.anim.hit(s % 2 ? 'L' : 'R'); };
    const rel = (el, s) => { el.classList.remove('down'); off(s); };
    for (let s = from; s <= to; s++) {
      const pc = ((s % 12) + 12) % 12;
      const lab = `<span class="lab"><b>${SARGAM[pc]}</b>${keyFor[s] ? `<span class="kb">${keyFor[s]}</span>` : ''}</span>`;
      let el;
      if (!isBlack(s)) { el = h(`<div class="wk" style="${s === 0 || s === 12 ? 'background:linear-gradient(#fff3d6,#f0d7a8)' : ''}">${lab}</div>`); wi++; }
      else { el = h(`<div class="bk" style="left:calc(${wi * W}% - ${W * 0.32}%);width:${W * 0.64}%">${lab}</div>`); }
      const ss = s;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); press(el, ss); });
      el.addEventListener('pointerup', () => rel(el, ss));
      el.addEventListener('pointercancel', () => rel(el, ss));
      wrap.appendChild(el);
      for (const [k, v] of Object.entries(CHROMA_KEYS)) if (v === s) this.keyEls[k] = { el, semi: s, press: () => press(el, ss), rel: () => rel(el, ss) };
    }
    return wrap;
  }

  instNote(name, semi, on) {
    const inst = this.inst[name];
    if (name === 'sitar') { if (on) { inst.play(semi); this.g.player.anim.hit('R'); } }
    else if (name === 'flute') { on ? inst.on(semi) : inst.off(semi); if (on) this.g.player.anim.hit('L'); }
  }

  tablaHit(bol, el) {
    this.inst.tabla.hit(bol);
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
    const dayan = ['Na', 'Tin', 'Tun', 'Te', 'Dha', 'Dhin', 'Tirakita'].includes(bol), bayan = ['Ge', 'Ke', 'Dha', 'Dhin'].includes(bol);
    if (dayan) this.g.player.anim.hit('R');
    if (bayan) this.g.player.anim.hit('L');
  }

  renderTaal() {
    const t = this.inst.tabla, T = TAALS[t.taal];
    const row = $('taalRow'); if (!row) return;
    row.innerHTML = T.bols.map((b, i) => `<div class="b" data-i="${i}"><small>${T.marks[i + 1] || '&nbsp;'}</small>${b.replace(/ /g, '')}</div>`).join('');
  }
  taalBeat(i) {
    const row = $('taalRow'); if (!row) return;
    row.querySelectorAll('.b').forEach((b) => b.classList.toggle('now', +b.dataset.i === i));
    this.g.player.anim.hit(i % 2 ? 'L' : 'R');
    this.g.world.onBeat && this.g.world.onBeat(i);
  }
  syncTablaBtn() { const b = $('thekaBtn'); if (b) b.textContent = this.inst.tabla.playing ? 'Stop theka' : 'Play theka'; }

  dockKey(k, e) {
    if (e && e.repeat) return true;
    const name = this.dockOpen;
    const m = this.keyEls && this.keyEls[k];
    if (k === 'Escape') { this.closeInstrument(true); return true; }
    if (!m) return name !== null && /^Key|^Semicolon|^Quote|^Space/.test(k);
    if (name === 'tabla') { this.tablaHit(m.bol, m.el); return true; }
    if (m.press) { m.press(); return true; }
    if (m.el) m.el.classList.add('down');
    this.instNote(name, m.semi, true);
    return true;
  }
  dockKeyUp(k) {
    const m = this.keyEls && this.keyEls[k];
    if (!m) return;
    if (m.rel) return m.rel();
    if (m.el) m.el.classList.remove('down');
    if (this.dockOpen === 'flute') this.instNote('flute', m.semi, false);
  }

  closeInstrument(standUp = false) {
    const g = this.g;
    if (!this.dockOpen) return;
    const name = this.dockOpen;
    this.dockOpen = null;
    $('dock').classList.add('hidden');
    g.player.frozen = false;
    if (name === 'harmonium') this.inst.harmonium.allOff();
    if (name === 'flute') { this.inst.flute.held.clear(); this.inst.flute.off(); }
    if (standUp && g.player.seat && g.player.seat.instrument) { g.player.stand(); }
  }

  // ------------------------------------------------------------------ pictures
  pickImage(frame) {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async () => {
      const f = input.files[0]; if (!f) return;
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
        // cover-fit into the frame
        const ar = img.width / img.height, fr = frame.w / frame.h;
        if (ar > fr) { t.repeat.set(fr / ar, 1); t.offset.set((1 - fr / ar) / 2, 0); } else { t.repeat.set(1, ar / fr); t.offset.set(0, (1 - ar / fr) / 2); }
        frame.mesh.material.map = t; frame.mesh.material.emissiveMap = frame.mesh.material.emissiveIntensity > 0 ? t : null; frame.mesh.material.needsUpdate = true;
        this.g.world.saveFrame && this.g.world.saveFrame(frame, f);
        this.toast('Picture placed.');
      };
      img.src = url;
    };
    input.click();
  }
}
