#!/usr/bin/env python3
"""Fetch the best real tanpura and tabla recordings for the Raag Sound Studio.

Sources (free, commercial-safe licences only: CC0 or CC BY):
  @freesound  - tanpura drones, single tabla bols, theka loops  (needs FREESOUND_API_KEY)
  @commons    - Wikimedia Commons tanpura recordings (backup, no key)

What it does
  1. Searches both sources and keeps only CC0 / CC BY recordings.
  2. Ranks by community rating, number of ratings, downloads and source quality.
  3. Tanpura: downloads candidates and measures the real Sa from the audio
     (chroma analysis), so every drone is filed under the key it actually plays.
  4. Tabla: prefers one uploader/pack for all bols so the strokes sound like one drum.
  5. Trims, levels and encodes everything with ffmpeg into sound-apis/audio/,
     and writes sound-apis/sounds.json with credits for every file.

Usage
  export FREESOUND_API_KEY=...        # https://freesound.org/apiv2/apply
  python3 sound-apis/fetch_sounds.py  # about 3-5 minutes
  python3 sound-apis/fetch_sounds.py --dry-run   # rank and list, download nothing

Needs: Python 3.9+, numpy, ffmpeg. Network access to freesound.org,
cdn.freesound.org, commons.wikimedia.org and upload.wikimedia.org.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO_DIR = os.path.join(HERE, "audio")
MANIFEST = os.path.join(HERE, "sounds.json")
UA = "claude-hq-sound-fetcher/1.0 (raag sound studio)"
FS = "https://freesound.org/apiv2"
FIELDS = "id,name,username,license,duration,tags,description,avg_rating,num_ratings,num_downloads,previews,url,samplerate,bitdepth,type,pack"

KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
_SEP = r"[\s_-]*"
_NAT = r"(?![#♯b♭]|[\s_-]*(?:sharp|flat))"
_SH = _SEP + r"(?:#|♯|sharp)"
_FL = _SEP + r"(?:b(?![a-z])|♭|flat)"
KEY_SPELLINGS = {  # how uploaders write each key (C#, C sharp, C-sharp, Db, D flat …)
    "C": ["C" + _NAT], "C#": ["C" + _SH, "D" + _FL], "D": ["D" + _NAT], "D#": ["D" + _SH, "E" + _FL],
    "E": ["E" + _NAT], "F": ["F" + _NAT], "F#": ["F" + _SH, "G" + _FL], "G": ["G" + _NAT],
    "G#": ["G" + _SH, "A" + _FL], "A": ["A" + _NAT], "A#": ["A" + _SH, "B" + _FL], "B": ["B" + _NAT],
}
BOLS = {  # bol -> words uploaders use for it
    "Dha": ["dha"], "Dhin": ["dhin", "dhi"], "Na": ["na", "taa", "ta"], "Tin": ["tin", "teen"],
    "Tun": ["tun", "thun", "tu"], "Te": ["te", "ti", "tit", "tite"], "Ge": ["ge", "ghe", "ga", "gha"], "Ke": ["ke", "ka", "kat", "kath"],
}
TAALS = {"teentaal": ["teentaal", "teental", "tintal", "tintaal", "trital"], "keherwa": ["keherwa", "kaharwa", "kehrwa"],
         "dadra": ["dadra"], "rupak": ["rupak", "rupak taal"], "jhaptaal": ["jhaptaal", "jhaptal"], "ektaal": ["ektaal", "ektal"]}
TANPURA_WORDS = ("tanpura", "tambura", "tampura", "tanpoora", "tamboora", "tanpuri")

# ------------------------------------------------------------------ http
def get(url, headers=None, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(15 * (i + 1)); continue
            if e.code in (401, 403):
                sys.exit(f"HTTP {e.code} from {url.split('?')[0]}: check FREESOUND_API_KEY and network settings.")
            if i == retries - 1: raise
        except urllib.error.URLError as e:
            if i == retries - 1:
                sys.exit(f"Can't reach {url.split('/')[2]}: {e.reason}. Allow this host in the environment's network settings.")
        time.sleep(2 ** i)

def fs_search(token, query, flt="", sort="rating_desc", pages=2):
    out = []
    for page in range(1, pages + 1):
        params = {"query": query, "fields": FIELDS, "page_size": 150, "page": page, "sort": sort, "token": token,
                  "filter": ('license:("Creative Commons 0" OR "Attribution") ' + flt).strip()}
        data = json.loads(get(f"{FS}/search/text/?" + urllib.parse.urlencode(params)))
        out += data.get("results", [])
        time.sleep(1.1)  # stay under 60 requests/minute
        if not data.get("next"): break
    return out

def fs_licence(url):
    u = (url or "").lower()
    if "/zero/" in u or "publicdomain" in u: return "CC0"
    if "/by-nc" in u: return None          # excluded: non-commercial
    if "/by/" in u: return "CC BY"
    return None

def popularity(s):
    """Bayesian-ish quality score: a 4.8 from 40 ratings beats a 5.0 from 1."""
    r, n, d = s.get("avg_rating") or 0, s.get("num_ratings") or 0, s.get("num_downloads") or 0
    prior, weight = 3.5, 5
    bayes = (r * n + prior * weight) / (n + weight)
    fidelity = 0.3 if (s.get("samplerate") or 0) >= 44100 else 0
    fidelity += 0.2 if (s.get("bitdepth") or 0) >= 24 else 0
    fidelity += 0.2 if (s.get("type") or "") in ("wav", "flac", "aiff") else 0
    return round(bayes + 0.25 * math.log10(d + 1) + fidelity, 3)

def text_of(s):
    return " ".join([s.get("name", ""), " ".join(s.get("tags", [])), (s.get("description") or "")[:400]])

def word_in(words, text):
    return any(re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", text, re.I) for w in words)

def claimed_key(s):
    t = s.get("name", "") + " " + " ".join(s.get("tags", []))
    hits = [k for k, pats in KEY_SPELLINGS.items() if any(re.search(rf"(?<![A-Za-z]){p}(?![a-z])", t) for p in pats)]
    return hits[0] if len(hits) == 1 else None

# ------------------------------------------------------------------ audio
def ffmpeg(*args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args], capture_output=True)
    if r.returncode: raise RuntimeError(r.stderr.decode()[:300])

def decode(path, sr=22050, start=0.0, length=60.0):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", str(start), "-t", str(length), "-i", path,
                        "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32)

def analyse_tanpura(path):
    """Return (sa_key, cents_offset, confidence, tuning) measured from the drone itself."""
    sr, n, hop = 22050, 8192, 4096
    x = decode(path, sr, 1.0, 60.0)
    if len(x) < n * 4: return None
    win = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop] * win
    mag = np.abs(np.fft.rfft(frames, axis=1)).mean(axis=0)
    f = np.fft.rfftfreq(n, 1 / sr)
    band = (f > 55) & (f < 2000)
    f, p = f[band], mag[band] ** 2
    midi = 69 + 12 * np.log2(f / 440.0)
    # global tuning: energy-weighted circular mean of the cents deviation
    dev = (midi - np.round(midi)) * 2 * np.pi
    cents = float(np.angle(np.sum(p * np.exp(1j * dev))) / (2 * np.pi) * 100)
    pc = np.mod(np.round(midi - cents / 100), 12).astype(int)
    chroma = np.bincount(pc, weights=p, minlength=12)
    chroma = chroma / chroma.sum()
    sa = int(np.argmax(chroma))  # C=0 in MIDI pitch-class terms
    # Every Sa string also sounds a faint Pa (its 3rd harmonic, about 0.15 of Sa).
    # A Pa-tuned first string lifts Pa well above that; otherwise Ma or Ni wins.
    pa, ma, ni = (chroma[(sa + i) % 12] / chroma[sa] for i in (7, 5, 11))
    tuning = "Pa" if pa >= 0.25 else "Ma" if ma >= ni else "Ni"
    second = sorted(chroma)[-2]
    confidence = float(chroma[sa] / (second + 1e-9))
    return KEYS[sa], round(cents, 1), round(confidence, 2), tuning

def peak_db(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"], capture_output=True)
    m = re.search(r"max_volume:\s*(-?[\d.]+) dB", r.stderr.decode())
    return float(m.group(1)) if m else 0.0

def process_drone(src, dst, length=45):
    # skip the first second, keep up to 45 s, level to -18 LUFS, short fades so it loops cleanly
    ffmpeg("-ss", "1", "-t", str(length), "-i", src, "-af",
           f"loudnorm=I=-18:TP=-1.5:LRA=11,afade=t=in:d=0.05,afade=t=out:st={length - 0.05}:d=0.05",
           "-ar", "44100", "-ac", "2", "-b:a", "192k", dst)

def process_hit(src, dst):
    # cut leading silence, keep 2.5 s, peak-normalise to -1 dBFS
    tmp = dst + ".tmp.wav"
    ffmpeg("-i", src, "-af", "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:2.5,afade=t=out:st=2.3:d=0.2",
           "-ar", "44100", "-ac", "2", tmp)  # convert to stereo before measuring the peak
    gain = -1.0 - peak_db(tmp)
    ffmpeg("-i", tmp, "-af", f"volume={gain:.2f}dB", "-ar", "44100", "-ac", "2", "-b:a", "192k", dst)
    os.remove(tmp)

def process_loop(src, dst):
    ffmpeg("-t", "60", "-i", src, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "2", "-b:a", "192k", dst)

def duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True)
    try: return round(float(r.stdout.decode().strip()), 2)
    except ValueError: return 0

def download(url, dst, headers=None):
    with open(dst, "wb") as f: f.write(get(url, headers))

def safe(name): return re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").lower()

# ------------------------------------------------------------------ commons
def commons_tanpura():
    params = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrlimit": 50,
              "gsrsearch": "tanpura OR tambura OR tanpoora filetype:audio", "prop": "imageinfo", "iiprop": "url|extmetadata|mime"}
    data = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)))
    out = []
    for pg in (data.get("query", {}).get("pages", {}) or {}).values():
        ii = (pg.get("imageinfo") or [{}])[0]; md = ii.get("extmetadata", {})
        lic = (md.get("LicenseShortName", {}).get("value") or "")
        # CC0 / public domain or plain CC BY only (no NC, no SA, so files can ship inside an app)
        lic_n = "CC0" if re.search(r"CC0|Public domain", lic, re.I) else "CC BY" if re.fullmatch(r"CC BY(\s[\d.]+)?", lic.strip()) else None
        if not lic_n: continue
        artist = re.sub(r"<[^>]+>", "", md.get("Artist", {}).get("value") or "Unknown")
        out.append({"source": "@commons", "id": pg.get("pageid"), "name": pg.get("title", "").replace("File:", ""),
                    "author": artist.strip(), "license": lic_n, "license_text": lic,
                    "url": ii.get("descriptionurl"), "audio": ii.get("url"), "score": 3.6})
    return out

# ------------------------------------------------------------------ main steps
def find_tanpura(token, log):
    pool = {}
    queries = ["tanpura", "tambura", "tanpura drone", "tambura drone", "tanpura shruti"] + [f"tanpura {k}" for k in KEYS]
    for q in queries:
        for s in fs_search(token, q, "duration:[20 TO 900]", pages=1 if " " in q and q.split()[-1] in KEYS else 2):
            lic = fs_licence(s.get("license"))
            if lic and word_in(TANPURA_WORDS, text_of(s)) and not word_in(["loop kit", "beat", "remix", "song", "guitar"], s.get("name", "")):
                pool[s["id"]] = s
        log(f"  search '{q}': {len(pool)} usable tanpura recordings so far")
    ranked = sorted(pool.values(), key=popularity, reverse=True)
    return [{"source": "@freesound", "id": s["id"], "name": s["name"], "author": s["username"], "license": fs_licence(s["license"]),
             "url": s["url"], "audio": s["previews"]["preview-hq-mp3"], "score": popularity(s), "claimed_key": claimed_key(s),
             "orig_duration": s.get("duration")} for s in ranked]

def find_bols(token, log):
    best = {}
    for bol, words in BOLS.items():
        cands = []
        for q in [f"tabla {words[0]}", f"tabla {bol.lower()} stroke"]:
            for s in fs_search(token, q, "duration:[0.1 TO 4]", pages=1):
                name = s.get("name", "")
                if fs_licence(s.get("license")) and word_in(["tabla"], text_of(s)) and word_in(words, name):
                    cands.append(s)
        uniq = {s["id"]: s for s in cands}
        best[bol] = sorted(uniq.values(), key=popularity, reverse=True)[:12]
        log(f"  bol {bol}: {len(uniq)} candidates")
    # prefer the uploader/pack that covers the most bols, so every stroke comes from one drum
    groups = {}
    for bol, lst in best.items():
        for s in lst:
            g = (s.get("pack") or "") or s["username"]
            groups.setdefault(g, {})
            if bol not in groups[g] or popularity(s) > popularity(groups[g][bol]): groups[g][bol] = s
    def gscore(g): return (len(groups[g]), sum(popularity(s) for s in groups[g].values()) / len(groups[g]))
    order = sorted(groups, key=gscore, reverse=True)
    chosen = {}
    for g in order:
        for bol, s in groups[g].items():
            chosen.setdefault(bol, s)
    if order: log(f"  main tabla kit: {order[0]} ({len(groups[order[0]])} of {len(BOLS)} bols)")
    return {bol: {"source": "@freesound", "id": s["id"], "name": s["name"], "author": s["username"], "license": fs_licence(s["license"]),
                  "url": s["url"], "audio": s["previews"]["preview-hq-mp3"], "score": popularity(s), "kit": (s.get("pack") or s["username"])}
            for bol, s in chosen.items()}

def find_thekas(token, log):
    out = {}
    for taal, words in TAALS.items():
        cands = {}
        for w in words[:2]:
            for s in fs_search(token, f"tabla {w}", "duration:[4 TO 120]", pages=1):
                if fs_licence(s.get("license")) and word_in(words, text_of(s)):
                    cands[s["id"]] = s
        if cands:
            s = max(cands.values(), key=popularity)
            out[taal] = {"source": "@freesound", "id": s["id"], "name": s["name"], "author": s["username"], "license": fs_licence(s["license"]),
                         "url": s["url"], "audio": s["previews"]["preview-hq-mp3"], "score": popularity(s)}
        log(f"  theka {taal}: {len(cands)} candidates")
    return out

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="rank and list only")
    ap.add_argument("--max-tanpura", type=int, default=40, help="how many tanpura candidates to analyse")
    a = ap.parse_args()
    token = os.environ.get("FREESOUND_API_KEY") or sys.exit("Set FREESOUND_API_KEY first (free at https://freesound.org/apiv2/apply).")
    log = lambda m: print(m, flush=True)

    log("Searching tanpura recordings…")
    tanpura = find_tanpura(token, log)
    try:
        tanpura += commons_tanpura(); log(f"  + Wikimedia Commons: {len(tanpura)} total")
    except SystemExit as e:
        log(f"  Commons skipped: {e}")
    log("Searching tabla bols…"); bols = find_bols(token, log)
    log("Searching theka loops…"); thekas = find_thekas(token, log)
    if a.dry_run:
        for t in tanpura[:a.max_tanpura]: log(f"T {t['score']:.2f} {t['license']:6} {t.get('claimed_key') or '?':3} {t['name']} — {t['author']}")
        for b, s in bols.items(): log(f"B {b:5} {s['score']:.2f} {s['name']} — {s['author']}")
        for k, s in thekas.items(): log(f"L {k:9} {s['score']:.2f} {s['name']} — {s['author']}")
        return

    os.makedirs(AUDIO_DIR, exist_ok=True)
    sounds = []
    with tempfile.TemporaryDirectory() as tmp:
        log(f"Analysing up to {a.max_tanpura} tanpura recordings…")
        by_key = {}
        for t in tanpura[:a.max_tanpura]:
            raw = os.path.join(tmp, f"t{t['id']}.audio")
            try:
                download(t["audio"], raw)
                res = analyse_tanpura(raw)
            except Exception as e:
                log(f"  skip {t['name']}: {e}"); continue
            if not res: continue
            key, cents, conf, tuning = res
            agree = t.get("claimed_key") in (None, key)
            rank = t["score"] + min(conf, 3) * 0.3 + (0.3 if agree and t.get("claimed_key") else 0) - (0.8 if not agree else 0)
            log(f"  {key:2} {tuning} conf {conf:.2f} {'✓' if agree else '≠ title says ' + t['claimed_key']}  {t['name']}")
            if conf < 1.15: continue  # unclear Sa: probably not a clean drone
            if key not in by_key or rank > by_key[key][0]:
                by_key[key] = (rank, t, raw, cents, conf, tuning)
        for key, (rank, t, raw, cents, conf, tuning) in sorted(by_key.items(), key=lambda kv: KEYS.index(kv[0])):
            fn = f"audio/tanpura-{safe(key.replace('#', 's'))}.mp3"
            process_drone(raw, os.path.join(HERE, fn))
            sounds.append({**{k: t[k] for k in ("source", "id", "name", "author", "license", "url")}, "role": "tanpura", "key": key,
                           "cents": cents, "tuning": tuning, "confidence": conf, "score": round(rank, 2), "file": fn,
                           "duration": duration(os.path.join(HERE, fn)), "edited": "Trimmed to 45 s, loudness levelled"})
            log(f"  ✔ tanpura {key}: {t['name']} by {t['author']} ({t['license']})")

        for bol, s in bols.items():
            raw = os.path.join(tmp, f"b{s['id']}.audio"); download(s["audio"], raw)
            fn = f"audio/bol-{safe(bol)}.mp3"; process_hit(raw, os.path.join(HERE, fn))
            sounds.append({**{k: s[k] for k in ("source", "id", "name", "author", "license", "url", "score", "kit")}, "role": "bol", "bol": bol,
                           "file": fn, "duration": duration(os.path.join(HERE, fn)), "edited": "Silence trimmed, peak levelled"})
            log(f"  ✔ bol {bol}: {s['name']} by {s['author']}")

        for taal, s in thekas.items():
            raw = os.path.join(tmp, f"l{s['id']}.audio"); download(s["audio"], raw)
            fn = f"audio/theka-{taal}.mp3"; process_loop(raw, os.path.join(HERE, fn))
            sounds.append({**{k: s[k] for k in ("source", "id", "name", "author", "license", "url", "score")}, "role": "theka", "taal": taal,
                           "file": fn, "duration": duration(os.path.join(HERE, fn)), "edited": "Loudness levelled"})
            log(f"  ✔ theka {taal}: {s['name']} by {s['author']}")

    manifest = {"generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                "note": "Real recordings. CC0 or CC BY only. Credit every CC BY author shown here.", "sounds": sounds}
    with open(MANIFEST, "w") as f: json.dump(manifest, f, indent=2, ensure_ascii=False)
    n = {r: sum(1 for s in sounds if s["role"] == r) for r in ("tanpura", "bol", "theka")}
    log(f"\nDone: {n['tanpura']} tanpura keys, {n['bol']} bols, {n['theka']} theka loops → {MANIFEST}")

if __name__ == "__main__":
    main()
