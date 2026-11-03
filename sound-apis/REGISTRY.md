# Indian Classical Sound API Registry

Short **codenames** for every sound and data source the app can use. Say a codename
(for example "pull 10 tanpura drones from `@freesound`") and Claude knows which API,
endpoint, key and licence rules apply. `CLAUDE.md` at the repo root points Claude here.

To browse what each source holds:
- **Visual library:** open `sound-apis/library.html` in a browser (search, play, page through everything).
- **Terminal:** `python3 sound-apis/browse.py --help`

---

## Quick map: what do I want, which codename?

| I want… | Use | Fallback |
|---|---|---|
| Tanpura drone (any Sa: C, C#, D…) | `@freesound` | `@archive`, `@ragajunglism` |
| Tabla loops / thekas (teentaal, keherwa, dadra, rupak…) | `@freesound` | `@archive` |
| Single tabla bols / strokes (dha, na, tin, ge, ke…) | `@freesound` | `@tabla-strokes` |
| Raag info (aaroh, avaroh, pakad, vadi/samvadi, thaat, time) | `@raga-json` | `@raagadb`, `@dunya` |
| Full raag recordings / concerts | `@dunya` | `@saraga`, `@archive` |
| Raag / taal catalogue (official names + IDs) | `@dunya` | `@raga-json` |
| ML / pitch / tonic annotations | `@saraga` | `@dunya` |

---

## `@freesound`: Freesound.org API v2 ⭐ primary sound source
**Best for:** tanpura drones, tabla loops, single tabla bols, sitar, harmonium, swarmandal.
Freesound has thousands of user-uploaded tabla and tanpura recordings, many of them good studio takes.

- **Docs:** https://freesound.org/docs/api/
- **Get a key:** https://freesound.org/apiv2/apply (free, takes a minute) → env var `FREESOUND_API_KEY`
- **Auth:** `?token=KEY` query param, or header `Authorization: Token KEY`
- **Search:** `GET https://freesound.org/apiv2/search/text/?query=tanpura&fields=id,name,username,license,duration,tags,previews&page_size=50&sort=rating_desc&token=KEY`
  - filter examples: `filter=duration:[30 TO *]` (long drones), `filter=tag:tabla tag:loop`, `filter=license:"Creative Commons 0"`
  - sort: `score`, `rating_desc`, `downloads_desc`, `duration_desc`, `created_desc`
- **Sound detail:** `GET /apiv2/sounds/<id>/`
- **Pack (curated sets):** `GET /apiv2/packs/<id>/sounds/`
- **Audio:** `previews["preview-hq-mp3"]` (~128 kbps MP3, token is enough). Getting the **original WAV** needs OAuth2 (`/apiv2/sounds/<id>/download/`).
- **Limits:** about 60 requests/min and 2,000/day on a standard key.
- **Licences (per sound):** CC0 (free for anything), CC-BY (credit the uploader), CC-BY-NC (no commercial use). **Always store the `license` and `username` fields with every sound you ship.** For a commercial app, filter to `license:"Creative Commons 0" OR license:"Attribution"`.
- **Good queries:** `tanpura`, `tanpura C#`, `tambura drone`, `tabla teentaal`, `tabla theka`, `tabla dha`, `tabla bol`, `keherwa`, `dadra`, `sitar raga yaman`

## `@dunya`: CompMusic Dunya API ⭐ primary raag/taal catalogue
**Best for:** the official list of Hindustani **raags, taals, layas, forms, artists, recordings** (and Carnatic too), all linked by MusicBrainz IDs.

- **Site / docs:** https://dunya.compmusic.upf.edu/developers/ · https://dunya.compmusic.upf.edu/docs/hindustani.html
- **Get a token:** register at Dunya, then copy the token from your user page → env var `DUNYA_TOKEN`
- **Auth header:** `Authorization: Token <DUNYA_TOKEN>`
- **Hindustani endpoints** (`https://dunya.compmusic.upf.edu/api/hindustani/…`):
  `raag/` · `raag/<uuid>` · `taal/` · `laya/` · `form/` · `instrument/` · `artist/` · `recording/` · `recording/<mbid>` · `release/` · `work/`
- **Carnatic:** `/api/carnatic/raaga/`, `talam/`, `recording/`…
- **Python client:** `pip install git+https://github.com/MTG/pycompmusic` →
  `from compmusic import dunya; dunya.set_token(T); dunya.hindustani.get_raags()`; audio via `dunya.hindustani.download_mp3(mbid, outdir)`
- **Scale:** about 1,124 Hindustani recordings (305 hrs), 195 raags, 26 taals, 363 artists.
- **Access:** metadata is open to any token. **Most audio is restricted**: request access on the site (research or non-commercial use). Don't plan on bundling this audio in a commercial app.

## `@saraga`: Saraga open datasets (UPF / MTG)
**Best for:** downloadable Hindustani and Carnatic concert audio with **tonic (Sa), pitch, taal and section annotations**. Ideal for raag detection, tonic detection and practice/scoring features.

- **Zenodo:** https://zenodo.org/records/4301737 (Hindustani zip about 4 GB, Carnatic about 14 GB)
- **Python:** `pip install mirdata` → `mirdata.initialize("saraga_hindustani")` / `"saraga_carnatic"` / `"saraga_audiovisual"`, then `.download()`, `.track_ids`, `.load_tracks()`
- **Licence:** CC BY-NC 4.0, so **non-commercial only**.

## `@tabla-strokes`: Four-Way Tabla Stroke dataset
**Best for:** thousands of **isolated, labelled tabla strokes** (onsets for bayan, dayan, resonant bayan and resonant dayan). Use it for bol-detection or to slice individual bols.

- **Zenodo:** https://zenodo.org/record/7110248
- **Python:** `mirdata.initialize("four_way_tabla")`
- About 26,600 training strokes and 4,500 test strokes. Licence is CC BY (the version differs between sources, so check Zenodo).
- Related: *Tabla Solo Dataset* (38 teentaal solos with bol scores, Pt. Arvind Mulgaonkar): https://zenodo.org/record/1267023 (restricted, request access).

## `@raga-json`: OpenRaga ragamala-data
**Best for:** structured **raag theory**, one JSON file per raag (RagaJSON format) for your raag pages.

- **Repo:** https://github.com/OpenRaga/ragamala-data (data in `data/`)
- **Raw file:** `https://raw.githubusercontent.com/OpenRaga/ragamala-data/main/data/<file>.json`
- **List files:** `GET https://api.github.com/repos/OpenRaga/ragamala-data/contents/data`
- **Licence:** CC BY 4.0 (commercial use OK with credit)
- ⚠ Schema not verified here. Check which fields (aaroh/avaroh/pakad/vadi…) exist before relying on them.

## `@raagadb`: RaagaDB
**Best for:** a second raag-theory source, 80+ raags with Aaroh, Avroh, Pakad, Vadi and Samvadi.
- **Repo:** https://github.com/Parv-B/RaagaDB. ⚠ Check its licence and file format before use.
- Code reference: the `pytheory` Python library has `pytheory.Raga` with aroha, avaroha, pakad, vadi/samvadi, time, rasa and jati.

## `@archive`: Internet Archive
**Best for:** old public-domain and AIR-era raag recordings, plus extra tabla and tanpura material. No key needed.

- **Search:** `GET https://archive.org/advancedsearch.php?q=tanpura AND mediatype:audio&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&rows=50&page=1&output=json`
- **Files in an item:** `GET https://archive.org/metadata/<identifier>`
- **Download / stream:** `https://archive.org/download/<identifier>/<filename>`
- **Licence:** per item, and often unclear. Check `licenseurl`. Fine for personal use; check carefully before shipping.

## `@ragajunglism`: Ragajunglism tanpuras (non-API)
- https://ragajunglism.org/tanpuras: real tanpura recordings in **all 12 keys**, described as "open-access".
- No API and no explicit licence. Download manually and **email the site for permission** before bundling.

---

## Rules Claude follows with these sources
1. **Keys come from env vars** (`FREESOUND_API_KEY`, `DUNYA_TOKEN`) and are never hard-coded or committed.
2. **Every stored sound carries metadata:** `source`, `id`, `name`, `author`, `license`, `url`.
3. **Commercial build:** only CC0 or CC-BY sounds go into the app. Saraga, Dunya audio and CC-BY-NC Freesound sounds stay out.
4. **Cache, don't hot-link:** download curated sounds once into the app's assets and don't hit the API on every play (rate limits).
5. **Tanpura tuning:** tag each drone with its Sa (C, C#, D…) and pattern (Pa-Sa-Sa-Sa, Ma-Sa, Ni-Sa) so the app can switch key.
