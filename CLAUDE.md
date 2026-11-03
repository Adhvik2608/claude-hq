# claude-hq

## Sound & raag APIs
When the user mentions tanpura, tabla, raag/raga, taal, bols, or a codename
(`@freesound`, `@commons`, `@dunya`, `@raga-json`), read `sound-apis/REGISTRY.md` first.
Only real recordings under CC0 or CC BY are used. Never add synthesized instrument sounds.

- Keys live in env vars: `FREESOUND_API_KEY`, `DUNYA_TOKEN`. Never commit them.
- Fetch or refresh the sound library: `python3 sound-apis/fetch_sounds.py` (writes `sound-apis/sounds.json` + `sound-apis/audio/`)
- Fetch raag data: `python3 sound-apis/fetch_raag.py yaman` (OpenRaga file → `raag/yaman.json`; with `DUNYA_TOKEN`, Dunya catalogue → `raag/catalogue.json`)
- Pages share `sound-apis/core.js` (data, sound library, playback engine) and `sound-apis/studio.css`.
  - Library: `sound-apis/app.html` → https://claude.ai/artifact/2DQ7pcVTJamnYxUH1MNpJ2
  - Practice screen (Yaman · Sa C# · Teentaal 115 bpm): `sound-apis/practice.html` → https://claude.ai/artifact/8eXjYJQjVXmfKAS2oHKrZd
  - Republish each with `core.js`, `studio.css`, `sounds.json`, every file in `audio/` and (practice) every file in `raag/` as supporting files.
- Terminal browser: `python3 sound-apis/browse.py --help`
