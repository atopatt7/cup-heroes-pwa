#!/usr/bin/env python3
"""
generate_sprites.py  --  Cup Heroes art generation via Gemini API

Install deps first:
  pip install google-genai Pillow rembg onnxruntime

Usage:
  PowerShell:
    $env:GEMINI_API_KEY = "your-key"
    python generate_sprites.py

  Or pass key directly:
    python generate_sprites.py --api-key YOUR_KEY

  Targets:  heroes | enemies | equipment | all (default)
  Options:  --force          re-generate existing files
            --list-models    show available Gemini models and exit
"""

import os, sys, io, time, argparse, base64
from pathlib import Path

# ---------------------------------------------------------------------------
# Dependency check
# ---------------------------------------------------------------------------
def check_deps():
    missing = []
    try:
        from google import genai   # noqa
    except ImportError:
        missing.append("google-genai")
    try:
        from PIL import Image      # noqa
    except ImportError:
        missing.append("Pillow")
    try:
        from rembg import remove   # noqa
    except ImportError:
        missing.append("rembg onnxruntime")
    if missing:
        print("Missing packages. Run:")
        print("  pip install " + " ".join(missing))
        sys.exit(1)

check_deps()

from google import genai
from google.genai import types
from PIL import Image
from rembg import remove

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SCRIPT_DIR  = Path(__file__).parent
SPRITES_DIR = SCRIPT_DIR / "public" / "sprites"
DELAY_SEC   = 4.5
MAX_RETRY   = 3

# Models that use generate_content with response_modalities=["IMAGE"]
GEMINI_IMAGE_MODELS = [
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-preview-image-generation",
]
# Models that use generate_images() (Imagen API)
IMAGEN_MODELS = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
    "imagen-4.0-ultra-generate-001",
]
_model_cache  = None   # (name, "gemini"|"imagen")


# ---------------------------------------------------------------------------
# Art style (shared across all images for consistency)
# ---------------------------------------------------------------------------
BASE_STYLE = (
    "cute chibi Q-version 2D cartoon game sprite, "
    "vivid saturated colors, bold clean black outlines, "
    "flat cel-shading with simple highlights, "
    "pure solid white background, "
    "full body visible centered in frame, "
    "professional mobile RPG game art"
)

ITEM_STYLE = (
    "cute chibi 2D cartoon RPG item icon, "
    "vivid saturated colors, bold clean black outlines, "
    "flat shading, pure solid white background, "
    "centered square composition, professional mobile game icon"
)

# ---------------------------------------------------------------------------
# Sprite definitions
# ---------------------------------------------------------------------------
HEROES = [
    dict(id="knight",    size=(200, 260), prompt=BASE_STYLE + ", "
         "blue silver armored knight hero, cup-shaped body (wide shoulders narrow base), "
         "gleaming sword in right hand, kite shield on left arm, golden trim armor, visor up, "
         "large sparkly round eyes, cheerful expression, FACING RIGHT"),
    dict(id="rogue",     size=(200, 260), prompt=BASE_STYLE + ", "
         "purple dark-grey hooded rogue hero, cup-shaped body, "
         "dual short daggers drawn, deep leather hood, glowing cunning eyes, sly smirk, "
         "FACING RIGHT agile pose"),
    dict(id="barbarian", size=(200, 260), prompt=BASE_STYLE + ", "
         "orange-red muscular barbarian hero, extra-wide cup-shaped body, "
         "massive battle axe over shoulder, spiked pauldrons, horned helmet, war paint, "
         "fierce cute round eyes, FACING RIGHT powerful stance"),
    dict(id="druid",     size=(200, 260), prompt=BASE_STYLE + ", "
         "green nature druid mage hero, slender cup-shaped body, "
         "wooden staff with glowing green orb, flower crown, flowing green robes with leaf patterns, "
         "gentle glowing eyes, magical leaves floating, FACING RIGHT peaceful pose"),
]

ENEMIES = [
    dict(id="slime",          size=(160, 160), prompt=BASE_STYLE + ", "
         "blue-green jelly slime monster, round chubby blob, "
         "two large round angry cute eyes, grumpy mouth, shiny translucent surface, "
         "FACING LEFT bouncy pose"),
    dict(id="goblin",         size=(160, 160), prompt=BASE_STYLE + ", "
         "small lime-green goblin, pointy ears, rusty dagger raised, "
         "toothy grin, cunning beady eyes, tattered leather vest, "
         "FACING LEFT sneaky crouch"),
    dict(id="orc",            size=(160, 160), prompt=BASE_STYLE + ", "
         "dark green muscular orc, stocky chibi body, two lower tusks, "
         "spiked club raised, scrappy leather armor, fierce angry eyes, "
         "FACING LEFT charging stance"),
    dict(id="troll",          size=(160, 160), prompt=BASE_STYLE + ", "
         "purple-grey rocky stone troll, large bulky body, rough rocky texture, "
         "jagged boulder overhead, small dim eyes, wide flat nose, "
         "FACING LEFT throw pose"),
    dict(id="forest_guardian", size=(220, 280), prompt=BASE_STYLE + ", "
         "giant forest treant boss, large imposing chibi tree spirit, bark texture body, "
         "thick branch arms, leaves and moss, glowing green eyes, mushrooms on body, "
         "green magical aura, FACING LEFT guardian stance"),
    dict(id="iron_knight",    size=(220, 280), prompt=BASE_STYLE + ", "
         "silver iron knight boss, full ornate plate armor, golden crown on helmet, "
         "long lance forward, visor down with glowing red eye slits, royal cape, "
         "FACING LEFT commanding battle stance"),
    dict(id="void_lord",      size=(220, 280), prompt=BASE_STYLE + ", "
         "dark void lord boss, black purple semi-transparent floating body, "
         "tattered cosmic robes, three glowing purple orbs orbiting, sinister purple eyes, "
         "dark energy wisps, FACING LEFT menacing float"),
]

SET_THEMES = {
    "forest_ranger":   "nature forest ranger, green wood and vine materials, leaf motifs",
    "iron_fortress":   "heavy iron fortress knight, thick grey steel, bolts and rivets",
    "shadow_assassin": "shadow assassin, dark purple black leather, sleek blade motifs",
    "flame_berserker": "flame berserker, orange red fiery metal, jagged bone decorations",
    "void_mage":       "void mage sorcerer, cosmic purple dark with glowing runes",
    "holy_guardian":   "holy guardian paladin, shining gold white, divine cross motifs",
}
SLOT_DESCS = {
    "weapon": "weapon sword or axe or staff or blade",
    "helmet": "helmet or hat headgear worn on the head",
    "armor":  "chest armor breastplate or robe covering the torso",
    "gloves": "gloves or gauntlets covering the hands",
    "pants":  "armored pants leg guards covering thighs and knees, NOT boots, NO feet shown",
    "boots":  "boots or shoes covering feet and ankles only, no legs above ankle",
}
EQUIPMENT = [
    dict(
        id=f"{sid}_{slot}",
        size=(96, 96),
        prompt=ITEM_STYLE + f", {SLOT_DESCS[slot]}, {theme}, "
               "fantasy RPG equipment icon, angled 3D view, detailed and charming"
    )
    for sid, theme in SET_THEMES.items()
    for slot in SLOT_DESCS
]

# ---------------------------------------------------------------------------
# API key helper
# ---------------------------------------------------------------------------
def get_api_key(cli_key=""):
    for src in [cli_key,
                os.environ.get("GEMINI_API_KEY", ""),
                _read_dotenv()]:
        if src:
            return src.strip().strip('"').strip("'")
    return ""

def _read_dotenv():
    p = SCRIPT_DIR / ".env"
    if not p.exists():
        return ""
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("GEMINI_API_KEY"):
            _, _, v = line.partition("=")
            return v.strip().strip('"').strip("'")
    return ""

# ---------------------------------------------------------------------------
# Model auto-detection
# ---------------------------------------------------------------------------
def find_model(client):
    global _model_cache
    if _model_cache:
        return _model_cache
    print("  Detecting image generation model...")
    test = "a small red circle, white background, simple icon"

    # Try Gemini generate_content models first
    for name in GEMINI_IMAGE_MODELS:
        try:
            resp = client.models.generate_content(
                model=name, contents=test,
                config=types.GenerateContentConfig(response_modalities=["IMAGE","TEXT"]),
            )
            for cand in resp.candidates:
                for part in cand.content.parts:
                    if part.inline_data is not None:
                        _model_cache = (name, "gemini")
                        print(f"  Using model: {name} (gemini)")
                        return _model_cache
        except Exception as e:
            msg = str(e)
            label = "not found" if ("404" in msg or "NOT_FOUND" in msg) else msg[:70]
            print(f"  x {name}: {label}")

    # Try Imagen generate_images models
    for name in IMAGEN_MODELS:
        try:
            resp = client.models.generate_images(
                model=name, prompt=test,
                config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio="1:1"),
            )
            if resp.generated_images:
                _model_cache = (name, "imagen")
                print(f"  Using model: {name} (imagen)")
                return _model_cache
        except Exception as e:
            msg = str(e)
            label = "not found" if ("404" in msg or "NOT_FOUND" in msg) else msg[:70]
            print(f"  x {name}: {label}")

    print("No working image generation model found.")
    print("Visit: https://ai.google.dev/gemini-api/docs/image-generation")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Extract raw bytes from a Gemini generate_content response
# ---------------------------------------------------------------------------
def _bytes_from_gemini(resp):
    for cand in resp.candidates:
        for part in cand.content.parts:
            if part.inline_data is not None:
                raw = part.inline_data.data
                return raw if isinstance(raw, (bytes, bytearray)) else base64.b64decode(raw)
    return None

# ---------------------------------------------------------------------------
# Image generation
# ---------------------------------------------------------------------------
def generate_one(client, spec, out_dir, force=False):
    out_path = out_dir / f"{spec['id']}.png"
    if not force and out_path.exists():
        print(f"  skip (exists): {spec['id']}.png")
        return "skip"

    model_info = find_model(client)
    model_name, model_type = model_info
    w, h = spec["size"]

    # Pick aspect ratio for Imagen
    if abs(w/h - 1.0) < 0.15:   ratio = "1:1"
    elif w < h:                   ratio = "3:4"
    else:                         ratio = "4:3"

    for attempt in range(1, MAX_RETRY + 1):
        try:
            print(f"  [{attempt}/{MAX_RETRY}] generating {spec['id']}.png ({w}x{h})...")

            if model_type == "gemini":
                resp = client.models.generate_content(
                    model=model_name, contents=spec["prompt"],
                    config=types.GenerateContentConfig(response_modalities=["IMAGE","TEXT"]),
                )
                img_bytes = _bytes_from_gemini(resp)
            else:  # imagen
                resp = client.models.generate_images(
                    model=model_name, prompt=spec["prompt"],
                    config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio=ratio),
                )
                img_bytes = resp.generated_images[0].image.image_bytes \
                            if resp.generated_images else None

            if not img_bytes:
                print(f"  no image in response, skipping")
                return "fail"

            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            print(f"  removing background...")
            img = remove(img).resize((w, h), Image.LANCZOS)

            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(out_path, "PNG")
            print(f"  done: {spec['id']}.png")
            return "ok"

        except Exception as e:
            msg = str(e)
            if "429" in msg or "RATE_LIMIT" in msg.upper():
                wait = 15 * attempt
                print(f"  rate limit, waiting {wait}s...")
                time.sleep(wait)
            elif "SAFETY" in msg.upper() or "RECITATION" in msg.upper():
                print(f"  safety filter, skipping {spec['id']}")
                return "fail"
            else:
                print(f"  error attempt {attempt}: {msg[:120]}")
                if attempt < MAX_RETRY:
                    time.sleep(5)
    return "fail"

def run_batch(client, specs, out_dir, label, force=False):
    out_dir.mkdir(parents=True, exist_ok=True)
    ok = fail = skip = 0
    print(f"\n{'='*48}\n  {label} ({len(specs)} images)\n{'='*48}")
    for i, spec in enumerate(specs, 1):
        print(f"\n[{i}/{len(specs)}] {spec['id']}")
        result = generate_one(client, spec, out_dir, force)
        if result == "ok":   ok   += 1
        elif result == "skip": skip += 1
        else:                fail += 1
        if i < len(specs) and result != "skip":
            time.sleep(DELAY_SEC)
    print(f"\n  ok:{ok}  skip:{skip}  fail:{fail}")
    return ok, skip, fail

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Cup Heroes sprite generator")
    ap.add_argument("target", nargs="?",
                    choices=["heroes","enemies","equipment","all"], default="all")
    ap.add_argument("--force",       "-f", action="store_true")
    ap.add_argument("--api-key",     "-k", default="")
    ap.add_argument("--list-models", action="store_true")
    args = ap.parse_args()

    key = get_api_key(args.api_key)
    if not key:
        print("GEMINI_API_KEY not found. Use one of:")
        print("  PowerShell : $env:GEMINI_API_KEY = 'your-key'")
        print("  Arg        : python generate_sprites.py --api-key YOUR_KEY")
        print("  .env file  : GEMINI_API_KEY=your-key")
        sys.exit(1)

    client = genai.Client(api_key=key)

    if args.list_models:
        print("Available models:")
        try:
            for m in client.models.list():
                print(f"  {getattr(m,'name',m)}")
        except Exception as e:
            print(f"  Error: {e}")
        sys.exit(0)

    print("Cup Heroes - Gemini Sprite Generator")
    print(f"  output : {SPRITES_DIR}")
    print(f"  force  : {args.force}")
    print(f"  key    : {key[:8]}...{key[-4:]}")

    t0 = time.time()
    total = [0, 0, 0]

    if args.target in ("heroes", "all"):
        r = run_batch(client, HEROES, SPRITES_DIR/"heroes", "Heroes", args.force)
        for i,v in enumerate(r): total[i]+=v

    if args.target in ("enemies", "all"):
        r = run_batch(client, ENEMIES, SPRITES_DIR/"enemies", "Enemies", args.force)
        for i,v in enumerate(r): total[i]+=v

    if args.target in ("equipment", "all"):
        r = run_batch(client, EQUIPMENT, SPRITES_DIR/"equipment", "Equipment", args.force)
        for i,v in enumerate(r): total[i]+=v

    print(f"\n{'='*48}")
    print(f"  Finished in {time.time()-t0:.0f}s")
    print(f"  ok:{total[0]}  skip:{total[1]}  fail:{total[2]}")
    print("  Sprites saved to: " + str(SPRITES_DIR))
    print("=" * 48)


if __name__ == "__main__":
    main()
