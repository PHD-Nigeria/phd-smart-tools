# Springboard — PHD Nigeria Flipbook

An interactive, installable flipbook of PHD Nigeria's *Springboard* staff newsletter (Q2 '26 edition), built as a static site so it can be hosted directly on GitHub Pages — no backend, no build step, no dependencies to install.

**Live demo once deployed:** `https://<your-github-username>.github.io/<repo-name>/`

---

## ✨ What's inside

- **Realistic page-turning book** — drag the corner or click/tap to flip, with a two-page spread on desktop and single-page mode on mobile.
- **Deep links** — every page has its own shareable URL (`#p=7`); the Share button copies it (or opens the native share sheet on mobile).
- **Resume where you left off** — your last-read page is remembered locally and restored on your next visit.
- **Live search** — type in the search box to filter pages by title, section or content and jump straight there.
- **Table of contents drawer** — thumbnail-grid navigation grouped by section.
- **Filmstrip** — a scrubbable strip of every page along the bottom rail.
- **Autoplay** — hands-free slideshow mode with adjustable speed; pauses automatically when the tab isn't visible.
- **Page-turn sound** — a synthesized "whoosh" (generated in-browser, no audio files to ship), toggle any time.
- **Keyboard shortcuts** — `←/→` or `space` to flip, `Home`/`End` to jump to the ends, `T` for contents, `F` for fullscreen, `M` to mute, `/` to search.
- **Fullscreen mode** and a **light/dark reading theme** toggle.
- **Works offline** — a service worker caches the whole issue after your first visit (installable as a PWA, add-to-home-screen ready).
- **Respects `prefers-reduced-motion`** and ships with visible keyboard focus states.
- **One-command rebuild for the next edition** — see below.

Design language borrows PHD's own CI Partner palette (purple `#3A008C`, lime `#9FEA47`, coral `#FF7373`, lavender `#9B83FF`, pink `#FF70F2`) and the Syne display face, with a "springboard" motif (a coiled-spring loader, bounce-settle page turns) running through the interaction design.

---

## 🚀 Deploy to GitHub Pages

1. Create a new repository (e.g. `phd-springboard`) under the `PHD-Nigeria` GitHub org.
2. Push this folder's contents to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Springboard Q2 '26 flipbook"
   git branch -M main
   git remote add origin https://github.com/<org>/<repo>.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**. The included workflow (`.github/workflows/deploy.yml`) will build and publish automatically on every push to `main` — no manual steps after that.
4. Your flipbook will be live at `https://<org>.github.io/<repo>/` within a minute or two.

No build tools, npm installs, or servers required — it's plain HTML/CSS/JS.

---

## 🔁 Publishing the next edition

When the next issue is ready as a PDF:

```bash
pip install pillow --break-system-packages   # one-time
python3 build/generate_pages.py path/to/NextIssue.pdf
```

This regenerates every page image (WebP, full-size + thumbnail), copies the source PDF in for the download link, bumps the service-worker cache version so returning visitors get the fresh issue instead of a stale cached one, and writes `js/pages-data.generated.js` — a scaffold with the right page count. Open it, fill in each page's `title` / `section` / `snippet` (used by search, the TOC and the section chip), then rename it to `js/pages-data.js`, replacing the old one. Commit and push — the GitHub Actions workflow does the rest.

---

## 📁 Structure

```
index.html              the whole reader shell
css/style.css           design tokens + layout + flip mechanics
js/app.js               all interaction logic (flip, drag, search, autoplay, PWA…)
js/pages-data.js         per-page metadata (title, section, search snippet)
assets/pages/            full-size WebP page images
assets/thumbs/           small WebP thumbnails (filmstrip / TOC / OG image)
assets/SPRINGBOARD_Q2_26.pdf   original source PDF (download link in Settings)
manifest.json / sw.js    PWA install + offline support
build/generate_pages.py  one-command rebuild script for future editions
.github/workflows/deploy.yml   auto-deploy to GitHub Pages on push
```

---

## 🛠 Local preview

Any static file server works, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. (Opening `index.html` directly via `file://` will work for most features, but the service worker and fetch-based caching need an actual HTTP origin.)
