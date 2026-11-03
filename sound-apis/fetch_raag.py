#!/usr/bin/env python3
"""Fetch raag data for the practice screen.

  @raga-json  OpenRaga ragamala-data: the raag's own JSON file (CC BY 4.0)  -> raag/<id>.json
  @dunya      CompMusic Dunya: the full Hindustani raag catalogue         -> raag/catalogue.json

Usage
  python3 sound-apis/fetch_raag.py yaman            # OpenRaga file only
  DUNYA_TOKEN=... python3 sound-apis/fetch_raag.py yaman   # plus the Dunya catalogue

Network hosts: api.github.com, raw.githubusercontent.com, dunya.compmusic.upf.edu
Optional env: GITHUB_TOKEN (avoids GitHub's 60 requests/hour limit), DUNYA_TOKEN.
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "raag")
UA = "claude-hq-raag-fetcher/1.0"


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise SystemExit(f"HTTP {e.code} from {url.split('?')[0]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"Can't reach {url.split('/')[2]}: {e.reason}. Allow it in the environment's network settings.")


def norm(s):
    return re.sub(r"[^a-z]", "", s.lower())


def openraga(raag_id):
    h = {"Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        h["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    files, todo = [], ["https://api.github.com/repos/OpenRaga/ragamala-data/contents/data"]
    while todo:  # walk data/ (it may contain sub-folders)
        for f in get_json(todo.pop(), h):
            if f["type"] == "dir":
                todo.append(f["url"])
            elif f["name"].endswith(".json"):
                files.append(f)
    want = norm(raag_id)
    match = [f for f in files if norm(f["name"][:-5]) == want] or [f for f in files if want in norm(f["name"])]
    if not match:
        raise SystemExit(f"No OpenRaga file for '{raag_id}' among {len(files)} files.")
    data = get_json(match[0]["download_url"])
    return {"source": "@raga-json", "license": "CC BY 4.0", "credit": "OpenRaga ragamala-data",
            "url": match[0]["html_url"], "data": data}


def dunya_catalogue(token):
    url, raags = "https://dunya.compmusic.upf.edu/api/hindustani/raag/", []
    while url:
        page = get_json(url, {"Authorization": f"Token {token}"})
        items = page.get("results", page) if isinstance(page, dict) else page
        for r in items:
            raags.append({"name": r.get("name"), "common_name": r.get("common_name"), "uuid": r.get("uuid")})
        url = page.get("next") if isinstance(page, dict) else None
    return {"source": "@dunya", "credit": "CompMusic Dunya", "url": "https://dunya.compmusic.upf.edu", "raags": raags}


def main():
    raag_id = sys.argv[1] if len(sys.argv) > 1 else "yaman"
    os.makedirs(OUT, exist_ok=True)
    rj = openraga(raag_id)
    with open(os.path.join(OUT, f"{raag_id}.json"), "w") as f:
        json.dump(rj, f, indent=2, ensure_ascii=False)
    print(f"@raga-json: saved raag/{raag_id}.json from {rj['url']}")
    token = os.environ.get("DUNYA_TOKEN")
    if token:
        cat = dunya_catalogue(token)
        with open(os.path.join(OUT, "catalogue.json"), "w") as f:
            json.dump(cat, f, indent=2, ensure_ascii=False)
        print(f"@dunya: saved raag/catalogue.json with {len(cat['raags'])} raags")
    else:
        print("@dunya: skipped (set DUNYA_TOKEN to fetch the raag catalogue)")


if __name__ == "__main__":
    main()
