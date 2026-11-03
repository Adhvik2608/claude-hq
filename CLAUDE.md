# claude-hq

## Sound & raag APIs
When the user mentions tanpura, tabla, raag/raga, taal, bols, or a codename
(`@freesound`, `@commons`, `@dunya`, `@raga-json`), read `sound-apis/REGISTRY.md` first.
Only real recordings under CC0 or CC BY are used. Never add synthesized instrument sounds.

- Keys live in env vars: `FREESOUND_API_KEY`, `DUNYA_TOKEN`. Never commit them.
- Fetch or refresh the sound library: `python3 sound-apis/fetch_sounds.py` (writes `sound-apis/sounds.json` + `sound-apis/audio/`)
- App: `sound-apis/app.html`, published at https://claude.ai/artifact/2DQ7pcVTJamnYxUH1MNpJ2.
  Republish it with `sounds.json` and every file in `audio/` as supporting files.
- Terminal browser: `python3 sound-apis/browse.py --help`
