/* Raag Sound Studio core: raag/taal data, helpers, sound library (sounds.json) and the recording playback engine.
   Shared by app.html and practice.html. Plays real recordings only. */
const KEYS = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const saFreq = k => 130.81 * Math.pow(2, KEYS.indexOf(k) / 12); // Sa in the 3rd octave

const SW = { S:["Sa",1], r:["Re",16/15], R:["Re",9/8], g:["Ga",6/5], G:["Ga",5/4], m:["Ma",4/3], M:["Ma",45/32],
             P:["Pa",3/2], d:["Dha",8/5], D:["Dha",5/3], n:["Ni",9/5], N:["Ni",15/8] };

const THAATS = {
  Bilawal:"S R G m P D N", Kalyan:"S R G M P D N", Khamaj:"S R G m P D n", Kafi:"S R g m P D n", Asavari:"S R g m P d n",
  Bhairavi:"S r g m P d n", Bhairav:"S r G m P d N", Marwa:"S r G M P D N", Poorvi:"S r G M P d N", Todi:"S r g M P d N"
};

// [id, name, devanagari, thaat, aaroh, avaroh, pakad, vadi, samvadi, time label, [startHour, endHour], jati, varjit, mood, tanpura first string, note]
const RAAG_ROWS = [
 ["yaman","Yaman","यमन","Kalyan",".N R G M D N S'","S' N D P M G R S",".N R G R , P R , .N R S","G","N","First prahar of night · 6–9 pm",[18,21],"Sampurna–Sampurna","None","Serene, devotional","P","Tivra Ma throughout. Usually the first raag a student learns."],
 ["bhupali","Bhupali","भूपाली","Kalyan","S R G P D S'","S' D P G R S","G R S .D S R G , P G , D P G R S","G","D","First prahar of night · 6–9 pm",[18,21],"Audav–Audav","Ma, Ni","Calm, devotional","P","Pentatonic. Shares its notes with Carnatic Mohanam."],
 ["hamsadhwani","Hamsadhwani","हंसध्वनि","Bilawal",".N S R G P N S'","S' N P G R S",".N S R G P , N P G R S","S","P","First prahar of night · 6–9 pm",[18,21],"Audav–Audav","Ma, Dha","Bright, auspicious","P","Came from Carnatic music. Often opens a concert."],
 ["kedar","Kedar","केदार","Kalyan","S m , m P , D P , N D S'","S' N D P , M P D P m , R S","S m , m P , D P m , P m R S","m","S","First prahar of night · 6–9 pm",[18,21],"Audav–Shadav (vakra)","Ga, Re in aaroh","Joyful, devotional","P","Leaps from Sa straight to Ma. Tivra Ma appears only in M P D P."],
 ["bihag","Bihag","बिहाग","Bilawal",".N S G m P N S'","S' N D P M P G m G R S",".N S G m P , M P G m G , R S","G","N","Second prahar of night · 9 pm–12 am",[21,24],"Audav–Sampurna","Re, Dha in aaroh","Romantic","P","Shuddha Ma leads. Tivra Ma only in the turn M P G m G."],
 ["desh","Desh","देस","Khamaj","S R m P N S'","S' n D P , m G R , G .N S","R m P N S' , n D P , m G R G .N S","R","P","Second prahar of night · 9 pm–12 am",[21,24],"Audav–Sampurna","Ga, Dha in aaroh","Monsoon, romance","P","Shuddha Ni going up, komal Ni coming down."],
 ["khamaj","Khamaj","खमाज","Khamaj","S G m P D N S'","S' n D P m G R S","n D m P D , m G R S","G","N","Second prahar of night · 9 pm–12 am",[21,24],"Shadav–Sampurna","Re in aaroh","Romantic, light","P","The home of many thumris and dadras."],
 ["kafi","Kafi","काफ़ी","Kafi","S R g m P D n S'","S' n D P m g R S","S R g m P , m g R , n D P , m g R S","P","S","Late night; also Holi songs in spring",[21,24],"Sampurna–Sampurna","None","Playful, light","P","The parent scale of many folk and semi-classical songs."],
 ["bageshree","Bageshree","बागेश्री","Kafi",".n S g m D n S'","S' n D , m P D m g , R S",".n .D S , m g , m D n D , m g R S","m","S","Second prahar of night · 9 pm–12 am",[21,24],"Audav–Sampurna","Re, Pa in aaroh","Longing (viraha)","m","Pa is touched only lightly while descending."],
 ["darbari","Darbari Kanada","दरबारी कान्हड़ा","Asavari","S R g , R S , m P d n S'","S' d n P , m P g m R S","g m R S , .d .n S R S","R","P","Midnight · 12–3 am",[0,3],"Sampurna–Shadav (vakra)","None","Grave, majestic","P","Komal Ga and Dha are sung with a slow, heavy andolan."],
 ["malkauns","Malkauns","मालकौंस","Bhairavi","S g m d n S'","S' n d m g S","m g m d n d m , g m g S","m","S","Third prahar of night · 12–3 am",[0,3],"Audav–Audav","Re, Pa","Meditative, deep","m","No Pa, so the tanpura's first string is tuned to Ma."],
 ["lalit","Lalit","ललित","Marwa",".N r G m , M m G , M d N S'","S' N d M d , m M m G , r S",".N r G m , d M m G , M G r S","m","S","Before dawn · 4–6 am",[4,6],"Shadav–Shadav","Pa","Contemplative","m","Both Ma sit side by side. No Pa."],
 ["bhairav","Bhairav","भैरव","Bhairav","S r G m P d N S'","S' N d P m G r S","G m d P , G m r S","d","r","Dawn · 4–7 am",[4,7],"Sampurna–Sampurna","None","Grave, devotional","P","Komal Re and Dha are sung with a slow andolan."],
 ["ahirbhairav","Ahir Bhairav","अहीर भैरव","Bhairav","S r G m P D n S'","S' n D P m G r S","G m r S , .n .D .n r S","m","S","Early morning · 6–9 am",[6,9],"Sampurna–Sampurna","None","Calm, devotional","P","Bhairav in the lower half, Kafi in the upper half."],
 ["bhairavi","Bhairavi","भैरवी","Bhairavi","S r g m P d n S'","S' n d P m g r S","m g r g , S r S , .d .n S","m","S","Morning; also closes a concert",[6,9],"Sampurna–Sampurna","None","Compassion, devotion","P","All four komal swaras. Singers often borrow other swaras freely."],
 ["todi","Miyan ki Todi","मियाँ की तोड़ी","Todi","S r g M d N S'","S' N d P M g r S",".d .N S r g , r g r S , M d N S'","d","g","Late morning · 9 am–12 pm",[9,12],"Shadav–Sampurna","Pa in aaroh","Tender, pleading","P","Pa is skipped going up and barely touched coming down."],
 ["asavari","Asavari","आसावरी","Asavari","S R m P d S'","S' n d P m g R S","R m P , n d P , d m P g R S","d","g","Late morning · 9 am–12 pm",[9,12],"Audav–Sampurna","Ga, Ni in aaroh","Renunciation, pathos","P","Its scale is the parent of Jaunpuri and Darbari."],
 ["jaunpuri","Jaunpuri","जौनपुरी","Asavari","S R m P d n S'","S' n d P m g R S","m P d n d P , m P g R S","d","g","Late morning · 9 am–12 pm",[9,12],"Shadav–Sampurna","Ga in aaroh","Serious, earnest","P","Close to Asavari, but komal Ni is used going up."],
 ["brindavani","Brindavani Sarang","वृन्दावनी सारंग","Kafi",".N S R m P N S'","S' n P m R S",".N S R m R , P m R , n P m R S","R","P","Midday · 12–3 pm",[12,15],"Audav–Audav","Ga, Dha","Bright, joyful","P","Shuddha Ni going up, komal Ni coming down."],
 ["bhimpalasi","Bhimpalasi","भीमपलासी","Kafi",".n S g m P n S'","S' n D P m g R S",".n S m , m g P m , g m g R S","m","S","Afternoon · 12–3 pm",[12,15],"Audav–Sampurna","Re, Dha in aaroh","Yearning, tender","P","Rests often on Ma and komal Ga."],
 ["multani","Multani","मुलतानी","Todi",".N S g M P N S'","S' N d P M g r S",".N S M g , M P g , M g r S","P","S","Late afternoon · 3–6 pm",[15,18],"Audav–Sampurna","Re, Dha in aaroh","Intense, reflective","P","Same scale as Todi but a completely different shape."],
 ["marwa","Marwa","मारवा","Marwa",".N r G M D N r' S'","r' N D M G r S",".D .N r S , .N r G M D , M G r","r","D","Sunset · 4–7 pm",[16,19],"Shadav–Shadav","Pa","Restless, longing at dusk","N","No Pa and a weak Sa. The tanpura is tuned to Ni."],
 ["puriyadhanashree","Puriya Dhanashree","पूरिया धनाश्री","Poorvi",".N r G M P d N S'","S' N d P M G r S",".N r G M P , d P M G , M r G r S","P","r","Sunset · 4–7 pm",[16,19],"Sampurna–Sampurna","None","Devotional, twilight","P","Komal Re and Dha with tivra Ma give the dusk colour."]
];
const RAAGS = RAAG_ROWS.map(r => ({ id:r[0], name:r[1], deva:r[2], thaat:r[3], aaroh:r[4], avaroh:r[5], pakad:r[6], vadi:r[7], samvadi:r[8],
  time:r[9], hours:r[10], jati:r[11], varjit:r[12], mood:r[13], tanpura:r[14], note:r[15] }));
const RAAG = Object.fromEntries(RAAGS.map(r => [r.id, r]));

const TAALS = {
  teentaal:{ name:"Teentaal", deva:"तीनताल", vibhag:[4,4,4,4], marks:["X","2","0","3"], beats:"Dha Dhin Dhin Dha Dha Dhin Dhin Dha Dha Tin Tin Ta Ta Dhin Dhin Dha", use:"The most common taal. Khayal, gats, tabla solos." },
  ektaal:{ name:"Ektaal", deva:"एकताल", vibhag:[2,2,2,2,2,2], marks:["X","0","2","0","3","4"], beats:"Dhin Dhin DhaGe=Dha+Ge TiRaKiTa=Ti+Ra+Ki+Te Tu Na Kat Ta DhaGe=Dha+Ge TiRaKiTa=Ti+Ra+Ki+Te Dhin Na", use:"Slow (vilambit) khayal." },
  jhaptaal:{ name:"Jhaptaal", deva:"झपताल", vibhag:[2,3,2,3], marks:["X","2","0","3"], beats:"Dhi Na Dhi Dhi Na Ti=Tin Na Dhi Dhi Na", use:"Khayal and bhajans. A lilting 2 + 3 feel." },
  rupak:{ name:"Rupak", deva:"रूपक", vibhag:[3,2,2], marks:["0","1","2"], beats:"Tin Tin Na Dhi Na Dhi Na", use:"Sam falls on khali. Bhajans and light classical." },
  keherwa:{ name:"Keherwa", deva:"कहरवा", vibhag:[4,4], marks:["X","0"], beats:"Dha Ge Na Ti Na Ke Dhi Na", use:"Bhajans, ghazals and film songs." },
  dadra:{ name:"Dadra", deva:"दादरा", vibhag:[3,3], marks:["X","0"], beats:"Dha Dhi Na Dha Ti Na", use:"Dadra, ghazal and light classical." }
};
for (const [id, t] of Object.entries(TAALS)) {
  t.id = id;
  t.beats = t.beats.split(" ").map(tok => { const [label, b] = tok.split("="); return { label, bols:(b || label).split("+") }; });
  t.matras = t.beats.length;
  t.markAt = {}; let i = 0; t.vibhag.forEach((n, v) => { t.markAt[i] = t.marks[v]; i += n; });
}

/* ============================== SOURCES ============================== */
const SOURCES = [
  { code:"@freesound", name:"Freesound", role:"Tanpura drones, tabla bols, theka loops", why:"The largest library of real, community-rated instrument recordings. Filtered to CC0 and CC BY so every file can ship in your app.", key:"FREESOUND_API_KEY", site:"https://freesound.org" },
  { code:"@commons", name:"Wikimedia Commons", role:"Backup tanpura recordings", why:"Curated, clearly licensed recordings. Used when Freesound has no good drone for a key.", key:"No key", site:"https://commons.wikimedia.org" },
  { code:"@dunya", name:"Dunya (CompMusic)", role:"Raag and taal catalogue", why:"The research-grade catalogue of Hindustani music: 195 raags and 26 taals with stable ids.", key:"DUNYA_TOKEN", site:"https://dunya.compmusic.upf.edu" },
  { code:"@raga-json", name:"OpenRaga ragamala-data", role:"Raag theory", why:"One structured JSON file per raag under CC BY 4.0, ready for raag detail pages.", key:"No key", site:"https://github.com/OpenRaga/ragamala-data" }
];
const BOL_LIST = [["Dha","धा"],["Dhin","धिं"],["Na","ना"],["Tin","तिं"],["Tun","तुन"],["Te","ते"],["Ge","गे"],["Ke","के"]];
// how theka syllables map onto recorded bols (falls back to combining strokes)
const BOL_ALIAS = { Dhi:"Dhin", Ta:"Na", Ti:"Te", Tu:"Tun", Kat:"Ke", Ka:"Ke", Ki:"Ke", Ra:"Te", Ghe:"Ge" };
const BOL_COMBO = { Dha:["Ge","Na"], Dhin:["Ge","Tin"] };

/* ============================== HELPERS ============================== */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z"/></svg>';
const STOP = '<svg viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1"/></svg>';
function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast("Copied"); } catch { toast("Select the text and copy it manually"); } }
function parseSeq(str) { const out = []; for (const tok of str.split(/\s+/).filter(Boolean)) { if (tok === ",") { out.push({ rest:true }); continue; }
  const m = tok.match(/^(\.?)([SrRgGmMPdDnN])('?)$/); if (m) out.push({ s:m[2], oct:m[1] ? -1 : m[3] ? 1 : 0 }); } return out; }
function swHTML(n) { if (n.rest) return '<span class="rest">,</span>';
  return `<span class="${["sw", "rgdn".includes(n.s) ? "k" : "", n.s === "M" ? "tv" : "", n.oct < 0 ? "lo" : n.oct > 0 ? "hi" : ""].join(" ")}">${SW[n.s][0]}</span>`; }
const seqHTML = str => `<span class="seq">${parseSeq(str).map(swHTML).join("")}</span>`;
const tpName = p => ({ P:"Pa", m:"Ma", N:"Ni", Pa:"Pa", Ma:"Ma", Ni:"Ni" }[p]);
const nowHour = () => new Date().getHours();
const inHours = (r, h) => r.hours[0] <= h && h < r.hours[1];
const legend = `<div class="legend"><span>Underlined = komal</span><span>Tick above Ma = tivra</span><span>Dot above = taar saptak</span><span>Dot below = mandra saptak</span></div>`;

/* ============================== RECORDINGS ============================== */
let LIB = { tanpura:{}, bol:{}, theka:{}, all:[], generated:null };
async function loadManifest() {
  try {
    const r = await fetch("sounds.json", { cache:"no-cache" });
    if (!r.ok) throw new Error(r.status);
    const m = await r.json();
    LIB = { tanpura:{}, bol:{}, theka:{}, all:m.sounds || [], generated:m.generated || null };
    for (const s of LIB.all) { if (s.role === "tanpura") LIB.tanpura[s.key] = s; if (s.role === "bol") LIB.bol[s.bol] = s; if (s.role === "theka") LIB.theka[s.taal] = s; }
  } catch { /* no manifest yet: the page shows its empty state */ }
}
const count = role => Object.keys(LIB[role]).length;
// nearest real drone for a key, pitched at most 3 semitones, with the measured cents corrected
function droneFor(key) {
  const ki = KEYS.indexOf(key); let best = null;
  for (const [k, s] of Object.entries(LIB.tanpura)) {
    let d = ki - KEYS.indexOf(k); if (d > 6) d -= 12; if (d < -6) d += 12;
    if (Math.abs(d) <= 3 && (!best || Math.abs(d) < Math.abs(best.shift))) best = { s, shift:d };
  }
  if (!best) return null;
  return { ...best, rate:Math.pow(2, best.shift / 12 - (best.s.cents || 0) / 1200) };
}
function resolveBol(b) { const name = BOL_ALIAS[b] && !LIB.bol[b] ? BOL_ALIAS[b] : b;
  if (LIB.bol[name]) return [LIB.bol[name]]; if (BOL_COMBO[name]) return BOL_COMBO[name].map(x => LIB.bol[x]).filter(Boolean); return []; }

/* ============================== AUDIO ============================== */
const Engine = (() => {
  let ctx = null, master, droneBus, tablaBus, analyser;
  const buffers = new Map(), subs = { state:[], beat:[] }, vis = [];
  let drone = null, seq = null, loopSrc = null, timer = null, raf = 0, label = null, active = false;
  const on = (e, f) => subs[e].push(f), emit = (e, ...a) => subs[e].forEach(f => f(...a));
  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 2.5;
    master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
    droneBus = ctx.createGain(); droneBus.connect(master); tablaBus = ctx.createGain(); tablaBus.connect(master);
  }
  async function buf(file) {
    if (!buffers.has(file)) buffers.set(file, fetch(file).then(r => { if (!r.ok) throw new Error("Missing " + file); return r.arrayBuffer(); }).then(a => ctx.decodeAudioData(a)));
    return buffers.get(file);
  }
  function fire(b, t, gain, bus, rate = 1, offset = 0, dur) {
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(bus);
    s.start(t, offset, dur); return { s, g };
  }
  // seamless drone: overlapping copies with 2 s equal-power crossfades
  function droneTick() {
    const now = ctx.currentTime;
    while (drone && drone.next < now + 1) {
      const b = drone.buffer, xf = Math.min(2, b.duration / 4), seg = (b.duration - xf) / drone.rate, t = drone.next;
      const v = fire(b, t, 0, droneBus, drone.rate);
      v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(1, t + (drone.first ? 0.6 : xf / drone.rate));
      v.g.gain.setValueAtTime(1, t + seg); v.g.gain.linearRampToValueAtTime(0, t + seg + xf / drone.rate);
      drone.first = false; drone.next = t + seg;
    }
    while (seq && seq.next < now + 0.15) {
      const T = TAALS[seq.taal]; if (seq.i >= T.matras) seq.i = 0;
      const beat = T.beats[seq.i], dur = 60 / seq.bpm, sub = dur / beat.bols.length, idx = seq.i;
      beat.bols.forEach((b, k) => resolveBol(b).forEach(s => { const bb = seq.bufs[s.file]; if (bb) fire(bb, seq.next + k * sub, (idx === 0 && k === 0 ? 1 : .85) * (k ? .85 : 1), tablaBus); }));
      vis.push({ t:seq.next, fn:() => emit("beat", idx, seq && seq.taal, beat.label) });
      seq.next += dur; seq.i = idx + 1;
    }
  }
  function frame() {
    if (!ctx) return; const now = ctx.currentTime;
    for (let i = vis.length - 1; i >= 0; i--) if (vis[i].t <= now) vis.splice(i, 1)[0].fn();
    raf = requestAnimationFrame(frame);
  }
  async function start(cfg, lbl) {
    ensure(); stop(true); active = true; label = lbl;
    const t0 = ctx.currentTime + 0.15;
    droneBus.gain.value = cfg.droneVol ?? 1; tablaBus.gain.value = cfg.tablaVol ?? 1;
    try {
      if (cfg.drone) { const d = cfg.drone; drone = { buffer:await buf(d.file), rate:d.rate, next:t0, first:true }; }
      if (cfg.loop) { const b = await buf(cfg.loop.file); loopSrc = ctx.createBufferSource(); loopSrc.buffer = b; loopSrc.loop = true; loopSrc.connect(tablaBus); loopSrc.start(ctx.currentTime + 0.05); }
      if (cfg.seq) { const files = [...new Set(TAALS[cfg.seq.taal].beats.flatMap(b => b.bols.flatMap(x => resolveBol(x).map(s => s.file))))];
        const bufs = {}; for (const f of files) bufs[f] = await buf(f);
        seq = { ...cfg.seq, bufs, i:0, next:ctx.currentTime + (cfg.drone ? 0.8 : 0.1) }; }
    } catch (e) { toast(e.message); stop(); return; }
    if (!active) return;
    timer = setInterval(droneTick, 25); droneTick(); if (!raf) raf = requestAnimationFrame(frame);
    emit("state", true, label);
  }
  function update(p) {
    if (!active) return;
    if (p.droneVol !== undefined) droneBus.gain.setTargetAtTime(p.droneVol, ctx.currentTime, .05);
    if (p.tablaVol !== undefined) tablaBus.gain.setTargetAtTime(p.tablaVol, ctx.currentTime, .05);
    if (p.bpm && seq) seq.bpm = p.bpm;
    if (p.label) { label = p.label; emit("state", true, label); }
  }
  async function hit(file) { ensure(); try { fire(await buf(file), ctx.currentTime + .01, 1, master); } catch (e) { toast(e.message); } }
  function stop(silent) {
    if (timer) { clearInterval(timer); timer = null; }
    if (ctx) { const g = master.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + .15);
      const old = { loopSrc }; setTimeout(() => { try { old.loopSrc && old.loopSrc.stop(); } catch {} }, 200);
      g.setValueAtTime(0, t + .2); g.linearRampToValueAtTime(1, t + .25); }
    drone = seq = loopSrc = null; vis.length = 0; const was = active; active = false;
    if (!silent && was) emit("state", false, null);
  }
  function level() { if (!analyser || !active) return null; const a = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(a); return a; }
  return { start, update, stop, hit, on, level, get playing() { return active; } };
})();

function thekaPlayable(T) { return T.beats.every(b => b.bols.every(x => resolveBol(x).length)); }
