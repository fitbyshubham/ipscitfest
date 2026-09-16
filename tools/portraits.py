#!/usr/bin/env python3
"""
Portraits — turn the photographs in Mugshots/ into web images.

    python tools/portraits.py            match, resize and write
    python tools/portraits.py --dry-run  show the matches, write nothing

Drop photographs into Mugshots/ named however you like — "Abin.jpg",
"Vir Sandhu.jpg", even with a typo in the surname. Each file is matched to
one person in PEOPLE (data/fest.mjs), resized for the web, stripped of camera
metadata, and written to assets/people/<slug>.jpg, which is where the site
looks for it. The originals in Mugshots/ are never modified.

A file that matches nobody, or more than one person, is reported and skipped
rather than guessed at. Add it to ALIASES below to settle it by hand.

Needs Pillow (pip install pillow) and Node, which the site build uses anyway.
"""

import difflib
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Mugshots"
OUT = ROOT / "assets" / "people"

# The photographs are 4:5 head-and-shoulders. Kept at that ratio so the page can
# crop square or landscape frames from it with CSS, anchored near the top.
SIZE = (800, 1000)
QUALITY = 82

# Filename (without extension, lower case) -> slug, for anything the matcher
# cannot settle on its own.
ALIASES = {}

# The framing every portrait is cut to, measured off the ones that were shot
# close up: the top of the hair a tenth of the way down, hair-to-chin a quarter
# of the height, the head just left of centre.
FRAME_TOP, FRAME_HEAD, FRAME_CX = 0.09, 0.25, 0.46

# A photograph taken as a wide camera frame has to be cropped to the head
# before it will match those. Read three numbers off the frame -- the top of
# the hair and the chin as percentages of its height, the centre of the head as
# a percentage of its width -- and the crop lands on the framing above.
#
#   slug: (top of hair %H, chin %H, centre of head %W)
CROPS = {
    "aarav-anand":   (5.0, 45.0, 45.5),
    "atiksh-kasana": (19.3, 35.1, 46.1),
    "samrat-gupta":  (17.8, 35.3, 47.6),
}

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff"}
TITLES = {"mr", "mrs", "ms", "dr", "prof"}


def load_people():
    """Read PEOPLE straight from the data file, so this never drifts from the site."""
    script = (
        "import('./data/fest.mjs').then(m => console.log(JSON.stringify("
        "Object.fromEntries(Object.entries(m.PEOPLE).map(([k, v]) => "
        "[k, typeof v.name === 'string' ? v.name : '']))))) "
        ".catch(e => { console.error(e.message); process.exit(1); })"
    )
    res = subprocess.run(["node", "-e", script], cwd=ROOT, capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(f"Could not read data/fest.mjs: {res.stderr.strip()}")
    return {slug: name for slug, name in json.loads(res.stdout).items() if name}


def tokens(text):
    return [t for t in text.lower().replace("-", " ").replace("_", " ").split() if t not in TITLES]


def match(stem, people):
    """Return (slug, how) or (None, reason)."""
    key = stem.lower().strip()
    if key in ALIASES:
        return ALIASES[key], "alias"

    wanted = tokens(stem)
    if not wanted:
        return None, "empty name"

    # Exact full-name match first.
    for slug, name in people.items():
        if tokens(name) == wanted:
            return slug, "exact"

    # Then every word in the filename must appear exactly in one person's name:
    # "Abin", "Yug", "Trijat". Refuses "Arnav" alone, which fits two people.
    exact = [slug for slug, name in people.items() if set(wanted) <= set(tokens(name))]
    if len(exact) == 1:
        return exact[0], "name"
    if len(exact) > 1:
        return None, "ambiguous: " + ", ".join(exact)

    # Only then tolerate spelling slips — "Fatepuria" for Fatehpuria, "Khumbat"
    # for Kumbhat. The threshold is high enough that "Abin" never reaches "Jain".
    hits = []
    for slug, name in people.items():
        have = tokens(name)
        if all(difflib.get_close_matches(w, have, n=1, cutoff=0.8) for w in wanted):
            hits.append(slug)
    if len(hits) == 1:
        return hits[0], "fuzzy"
    if not hits:
        return None, "matches nobody"
    return None, "ambiguous: " + ", ".join(hits)


def framed(im, head_top_pc, chin_pc, cx_pc):
    """Crop to the head, so a wide frame sits like the close-up portraits."""
    W, H = im.size
    top, chin, cx = head_top_pc / 100 * H, chin_pc / 100 * H, cx_pc / 100 * W
    ch = (chin - top) / FRAME_HEAD
    cw = ch * SIZE[0] / SIZE[1]
    if ch > H:            # shot too close to frame it that wide; take all of it
        ch, cw = H, H * SIZE[0] / SIZE[1]
    if cw > W:
        cw, ch = W, W * SIZE[1] / SIZE[0]
    x0 = max(0, min(cx - FRAME_CX * cw, W - cw))
    y0 = max(0, min(top - FRAME_TOP * ch, H - ch))
    box = (round(x0), round(y0), round(x0 + cw), round(y0 + ch))
    return im.crop(box).resize(SIZE, Image.LANCZOS)


def convert(src, dst, slug=None):
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)          # honour camera rotation
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA")
            ground = Image.new("RGB", im.size, (238, 240, 234))
            ground.paste(im, mask=im.split()[-1])
            im = ground
        im = im.convert("RGB")
        if slug in CROPS:
            im = framed(im, *CROPS[slug])
        else:
            # Centre horizontally, keep the top: heads sit in the upper third.
            im = ImageOps.fit(im, SIZE, Image.LANCZOS, centering=(0.5, 0.15))
        # Saved without EXIF: no camera, date or location data leaves the building.
        im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)


def main():
    dry = "--dry-run" in sys.argv
    if not SRC.is_dir():
        sys.exit(f"No Mugshots/ folder at {SRC}")
    people = load_people()
    OUT.mkdir(parents=True, exist_ok=True)

    files = sorted(p for p in SRC.iterdir() if p.suffix.lower() in IMAGE_TYPES)
    done, skipped, claimed = [], [], {}

    for p in files:
        slug, how = match(p.stem, people)
        if not slug:
            skipped.append((p.name, how))
            continue
        if slug in claimed:
            skipped.append((p.name, f"{people[slug]} already taken by {claimed[slug]}"))
            continue
        claimed[slug] = p.name
        dst = OUT / f"{slug}.jpg"
        if not dry:
            convert(p, dst, slug)
        kb_in = p.stat().st_size // 1024
        kb_out = dst.stat().st_size // 1024 if dst.exists() else 0
        done.append((p.name, slug, people[slug], how, kb_in, kb_out))

    print(f"\n  Portraits — {len(done)} matched, {len(skipped)} skipped{'  (dry run)' if dry else ''}\n")
    for name, slug, person, how, kin, kout in done:
        size = f"{kin:>5} KB -> {kout:>4} KB" if not dry else f"{kin:>5} KB"
        print(f"   {name:<26} {person:<22} {how:<6} {size}")
    for name, why in skipped:
        print(f"   SKIPPED  {name:<26} {why}")
    print()


if __name__ == "__main__":
    main()
