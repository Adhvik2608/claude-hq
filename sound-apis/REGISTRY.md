# Raag Sound Studio: Source Registry

Only the strongest free sources are used: **real recordings** (no synthesized sound) under
licences that allow shipping inside an app (**CC0 or CC BY**). Say a codename and Claude
knows the endpoint, key and licence rules.

| Need | Codename | Notes |
|---|---|---|
| Tanpura drone, any Sa | `@freesound` | Backup: `@commons` |
| Tabla bols (Dha, Dhin, Na, Tin, Tun, Te, Ge, Ke) | `@freesound` | Thekas are sequenced from these at any tempo |
| Recorded theka loops | `@freesound` | Fixed tempo, used where a good loop exists |
| Raag theory (aaroh, avaroh, pakad, vadi/samvadi) | `@raga-json` | |
| Raag and taal catalogue (official names, ids) | `@dunya` | |

The fetched library lives in `sound-apis/sounds.json` + `sound-apis/audio/`.
Refresh it with `python3 sound-apis/fetch_sounds.py` (see below).

---

## `@freesound`: Freesound API v2
- Docs: https://freesound.org/docs/api/ · key: https://freesound.org/apiv2/apply → env `FREESOUND_API_KEY`
- Search: `GET https://freesound.org/apiv2/search/text/?query=tanpura&filter=license:("Creative Commons 0" OR "Attribution")&fields=id,name,username,license,duration,avg_rating,num_ratings,previews&token=KEY`
- Audio: `previews["preview-hq-mp3"]`. Original WAV needs OAuth2 (`/apiv2/sounds/<id>/download/`).
- Limits: about 60 requests/min, 2,000/day.
- Rule: **never** use CC BY-NC sounds. Credit every CC BY author in the app.

## `@commons`: Wikimedia Commons
- `GET https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=tanpura filetype:audio&prop=imageinfo&iiprop=url|extmetadata&format=json`
- Use only CC0, public domain or plain CC BY (no NC, no SA). Send a descriptive User-Agent.

## `@dunya`: CompMusic Dunya
- Docs: https://dunya.compmusic.upf.edu/docs/hindustani.html · token from your Dunya account → env `DUNYA_TOKEN`
- `GET https://dunya.compmusic.upf.edu/api/hindustani/raag/` with header `Authorization: Token <DUNYA_TOKEN>`
- Also `taal/`, `laya/`, `form/`, `artist/`, `recording/`. Use the metadata only; most of its audio is research-restricted.

## `@raga-json`: OpenRaga ragamala-data
- https://github.com/OpenRaga/ragamala-data, one JSON file per raag in `data/`, CC BY 4.0 (credit OpenRaga).

---

## How `fetch_sounds.py` picks the best recordings
1. Searches `@freesound` (and `@commons` for tanpura), keeping only CC0 / CC BY.
2. Ranks by Bayesian-averaged rating (a 4.8 from 40 ratings beats a 5.0 from 1), downloads and source fidelity (44.1 kHz+, 24-bit, WAV/FLAC).
3. **Tanpura:** downloads the top candidates and measures the real Sa and first-string tuning (Pa/Ma/Ni) from the audio. Unclear drones are rejected, and each key keeps its best recording. The app pitch-shifts at most 3 semitones for a missing key and corrects the measured cents.
4. **Tabla:** picks the uploader or pack that covers the most bols, so every stroke comes from one drum.
5. Trims, levels loudness and encodes 192 kbps MP3 with ffmpeg, then writes credits for every file to `sounds.json`.

Network hosts needed: `freesound.org`, `cdn.freesound.org`, `commons.wikimedia.org`, `upload.wikimedia.org`.
