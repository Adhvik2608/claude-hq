#!/usr/bin/env python3
"""Browse the Indian-classical sound/raag sources listed in REGISTRY.md.

Standard library only. Examples:
  python3 browse.py sources
  python3 browse.py freesound tanpura --min-duration 30 --all
  python3 browse.py freesound "tabla teentaal" --cc0 --download ./sounds
  python3 browse.py freesound --pack 12345
  python3 browse.py dunya raag            # list all Hindustani raags
  python3 browse.py dunya taal --carnatic
  python3 browse.py ragas                 # list OpenRaga raag JSON files
  python3 browse.py ragas yaman           # print one raag's JSON

Env vars: FREESOUND_API_KEY, DUNYA_TOKEN, GITHUB_TOKEN (optional, avoids rate limit).
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

UA = "claude-hq-sound-browser/1.0"

SOURCES = [
    ("@freesound", "Freesound API v2", "tanpura drones, tabla bols & loops", "FREESOUND_API_KEY"),
    ("@commons", "Wikimedia Commons", "backup tanpura recordings", "none"),
    ("@dunya", "CompMusic Dunya", "raag/taal catalogue", "DUNYA_TOKEN"),
    ("@raga-json", "OpenRaga ragamala-data", "raag theory JSON", "none"),
]


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")[:300]
        sys.exit(f"HTTP {e.code} for {url.split('?')[0]}\n{body}")
    except urllib.error.URLError as e:
        sys.exit(f"Network error for {url.split('?')[0]}: {e.reason}")


def download(url, outdir, filename, headers=None):
    os.makedirs(outdir, exist_ok=True)
    path = os.path.join(outdir, re.sub(r"[^\w.\-]+", "_", filename))
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())
    return path


def need(var):
    v = os.environ.get(var)
    if not v:
        sys.exit(f"Set {var} first (see sound-apis/REGISTRY.md for where to get it).")
    return v


# ---------------------------------------------------------------- freesound
FS = "https://freesound.org/apiv2"
FS_FIELDS = "id,name,username,license,duration,tags,previews,url,pack"


def cmd_freesound(a):
    token = need("FREESOUND_API_KEY")
    if a.pack:
        url = f"{FS}/packs/{a.pack}/sounds/?" + urllib.parse.urlencode(
            {"fields": FS_FIELDS, "page_size": a.page_size, "page": a.page, "token": token})
    else:
        if not a.query:
            sys.exit("Give a search query, e.g. browse.py freesound tanpura")
        filters = []
        if a.min_duration:
            filters.append(f"duration:[{a.min_duration} TO *]")
        if a.cc0:
            filters.append('license:"Creative Commons 0"')
        elif a.commercial:
            filters.append('(license:"Creative Commons 0" OR license:"Attribution")')
        params = {"query": a.query, "fields": FS_FIELDS, "page_size": a.page_size,
                  "page": a.page, "sort": a.sort, "token": token}
        if filters:
            params["filter"] = " ".join(filters)
        url = f"{FS}/search/text/?" + urllib.parse.urlencode(params)

    meta = []
    while url:
        data = get_json(url)
        if a.page == 1 and not meta:
            print(f"{data.get('count', '?')} sounds found\n")
        for s in data.get("results", []):
            lic = s.get("license", "").rstrip("/").split("/")[-2:]  # e.g. ['zero','1.0']
            print(f"[{s['id']}] {s['name']}  ({s.get('duration', 0):.0f}s)  by {s['username']}")
            print(f"    licence: {'/'.join(lic)}  tags: {', '.join(s.get('tags', [])[:8])}")
            print(f"    preview: {s['previews']['preview-hq-mp3']}")
            if a.download:
                p = download(s["previews"]["preview-hq-mp3"], a.download, f"{s['id']}_{s['name']}.mp3")
                print(f"    saved:   {p}")
            meta.append({"source": "freesound", "id": s["id"], "name": s["name"],
                         "author": s["username"], "license": s.get("license"),
                         "url": s.get("url"), "preview": s["previews"]["preview-hq-mp3"],
                         "duration": s.get("duration"), "tags": s.get("tags")})
        url = data.get("next") if a.all else None
        if url and "token=" not in url:
            url += f"&token={token}"
    if a.download and meta:
        with open(os.path.join(a.download, "metadata.json"), "w") as f:
            json.dump(meta, f, indent=2)
        print(f"\nWrote licence/attribution metadata to {a.download}/metadata.json")


# ---------------------------------------------------------------- dunya
DUNYA = "https://dunya.compmusic.upf.edu/api"


def cmd_dunya(a):
    token = need("DUNYA_TOKEN")
    tradition = "carnatic" if a.carnatic else "hindustani"
    path = f"{a.resource.strip('/')}/" + (f"{a.id}" if a.id else "")
    data = get_json(f"{DUNYA}/{tradition}/{path}", {"Authorization": f"Token {token}"})
    if a.json or a.id:
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return
    items = data.get("results", data) if isinstance(data, dict) else data
    for it in items:
        ident = it.get("uuid") or it.get("mbid") or it.get("id")
        name = it.get("name") or it.get("title") or it.get("common_name")
        print(f"{ident}  {name}")
    print(f"\n{len(items)} {a.resource} entries ({tradition}). "
          f"Detail: browse.py dunya {a.resource} --id <uuid>")


# ---------------------------------------------------------------- openraga
GH = "https://api.github.com/repos/OpenRaga/ragamala-data/contents/data"


def cmd_ragas(a):
    headers = {"Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    listing = get_json(GH, headers)
    files = [f for f in listing if f["type"] == "file" and f["name"].endswith(".json")]
    dirs = [f for f in listing if f["type"] == "dir"]
    if not a.name:
        for f in files:
            print(f["name"][:-5])
        for d in dirs:
            print(f"{d['name']}/  (folder, see {d['html_url']})")
        print(f"\n{len(files)} raag files. Show one: browse.py ragas <name>")
        return
    match = [f for f in files if a.name.lower() in f["name"].lower()]
    if not match:
        sys.exit(f"No raag file matching '{a.name}'")
    print(json.dumps(get_json(match[0]["download_url"]), indent=2, ensure_ascii=False))


def cmd_sources(_):
    print(f"{'codename':16} {'source':26} {'best for':32} key")
    for row in SOURCES:
        print(f"{row[0]:16} {row[1]:26} {row[2]:32} {row[3]}")
    print("\nFull details: sound-apis/REGISTRY.md")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("sources", help="list all codenames").set_defaults(fn=cmd_sources)

    f = sub.add_parser("freesound", help="search @freesound")
    f.add_argument("query", nargs="?")
    f.add_argument("--pack", type=int, help="list every sound in a Freesound pack")
    f.add_argument("--min-duration", type=float, help="seconds, e.g. 30 for long drones")
    f.add_argument("--cc0", action="store_true", help="only CC0 sounds")
    f.add_argument("--commercial", action="store_true", help="only CC0 + CC-BY sounds")
    f.add_argument("--sort", default="score",
                   choices=["score", "rating_desc", "downloads_desc", "duration_desc", "created_desc"])
    f.add_argument("--page", type=int, default=1)
    f.add_argument("--page-size", type=int, default=30)
    f.add_argument("--all", action="store_true", help="follow every page (watch the rate limit)")
    f.add_argument("--download", metavar="DIR", help="save HQ MP3 previews + metadata.json")
    f.set_defaults(fn=cmd_freesound)

    d = sub.add_parser("dunya", help="browse @dunya catalogue")
    d.add_argument("resource", help="raag, taal, laya, form, instrument, artist, recording, release, work "
                                    "(carnatic: raaga, talam, ...)")
    d.add_argument("--id", help="uuid/mbid for the detail view")
    d.add_argument("--carnatic", action="store_true")
    d.add_argument("--json", action="store_true", help="print raw JSON")
    d.set_defaults(fn=cmd_dunya)

    g = sub.add_parser("ragas", help="browse @raga-json (OpenRaga)")
    g.add_argument("name", nargs="?")
    g.set_defaults(fn=cmd_ragas)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
