#!/usr/bin/env python3
"""
generate_pages.py — one-command rebuild for a new Springboard edition.

Usage:
    python3 build/generate_pages.py path/to/NewIssue.pdf

What it does:
  1. Rasterizes every page of the PDF at 200 DPI.
  2. Converts each page to a WebP page image (assets/pages/) and a small
     WebP thumbnail (assets/thumbs/) for the filmstrip / TOC / OG preview.
  3. Copies the source PDF into assets/ as the "download original" link.
  4. Writes js/pages-data.generated.js — a fresh scaffold with correct
     page count and filenames. Titles/sections/snippets default to
     placeholders; open that file, move the real copy in from the old
     js/pages-data.js (or write new copy), rename it to pages-data.js.
  5. Updates TOTAL_PAGES in sw.js automatically.

Requires: poppler-utils (pdftoppm) on PATH, and Pillow (`pip install pillow`).
"""
import sys, os, re, shutil, subprocess, tempfile

def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)

def main():
    if len(sys.argv) != 2:
        die("usage: python3 build/generate_pages.py path/to/NewIssue.pdf")

    pdf_path = sys.argv[1]
    if not os.path.isfile(pdf_path):
        die(f"file not found: {pdf_path}")

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # flipbook/
    pages_dir = os.path.join(root, "assets", "pages")
    thumbs_dir = os.path.join(root, "assets", "thumbs")
    os.makedirs(pages_dir, exist_ok=True)
    os.makedirs(thumbs_dir, exist_ok=True)

    try:
        from PIL import Image
    except ImportError:
        die("Pillow is required: pip install pillow --break-system-packages")

    with tempfile.TemporaryDirectory() as tmp:
        prefix = os.path.join(tmp, "page")
        cmd = ["pdftoppm", "-jpeg", "-r", "200", "-jpegopt", "quality=85", pdf_path, prefix]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            die(f"pdftoppm failed (is poppler-utils installed?):\n{result.stderr}")

        raw_pages = sorted(f for f in os.listdir(tmp) if f.endswith(".jpg"))
        if not raw_pages:
            die("pdftoppm produced no pages")

        # wipe old page/thumb sets so a shorter issue doesn't leave stragglers
        for d in (pages_dir, thumbs_dir):
            for f in os.listdir(d):
                os.remove(os.path.join(d, f))

        total = len(raw_pages)
        for i, fname in enumerate(raw_pages, start=1):
            im = Image.open(os.path.join(tmp, fname))
            n = str(i).zfill(2)
            im.save(os.path.join(pages_dir, f"page-{n}.webp"), "WEBP", quality=82, method=6)
            thumb = im.copy()
            thumb.thumbnail((220, 300))
            thumb.save(os.path.join(thumbs_dir, f"page-{n}.webp"), "WEBP", quality=75, method=6)

    # copy source pdf for the "download original" link
    dest_pdf = os.path.join(root, "assets", "latest-issue.pdf")
    shutil.copy(pdf_path, dest_pdf)

    # scaffold pages-data
    scaffold_path = os.path.join(root, "js", "pages-data.generated.js")
    lines = [
        "// AUTO-GENERATED SCAFFOLD — fill in title/section/snippet for each page,",
        "// then rename this file to pages-data.js (replacing the old edition).",
        "const PHD_BOOK = {",
        '  title: "Springboard",',
        '  edition: "REPLACE ME (e.g. Q3 \'26 Edition)",',
        '  brand: "PHD Nigeria",',
        f"  totalPages: {total},",
        "  pages: [",
    ]
    for i in range(1, total + 1):
        lines.append(
            f'    {{ n: {i}, section: "TODO", title: "Page {i}", snippet: "" }},'
        )
    lines.append("  ]")
    lines.append("};")
    with open(scaffold_path, "w") as f:
        f.write("\n".join(lines) + "\n")

    # update TOTAL_PAGES in sw.js so offline caching covers every page
    sw_path = os.path.join(root, "sw.js")
    with open(sw_path) as f:
        sw = f.read()
    sw = re.sub(r"const TOTAL_PAGES = \d+;", f"const TOTAL_PAGES = {total};", sw)
    cache_match = re.search(r'const CACHE_VERSION = "springboard-v(\d+)";', sw)
    if cache_match:
        next_v = int(cache_match.group(1)) + 1
        sw = re.sub(r'const CACHE_VERSION = "springboard-v\d+";',
                     f'const CACHE_VERSION = "springboard-v{next_v}";', sw)
    with open(sw_path, "w") as f:
        f.write(sw)

    print(f"Done. {total} pages generated in assets/pages and assets/thumbs.")
    print(f"Edit {scaffold_path}, then rename it to js/pages-data.js.")
    print("sw.js cache version was bumped automatically so browsers pick up the new edition.")

if __name__ == "__main__":
    main()
