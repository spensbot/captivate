# Screenshot capture workflow

Automates UI screenshots for the README and Wiki using Playwright + a packaged Captivate build.

## Prerequisites

1. **Packaged app** — build once so an unpacked Electron binary exists:

   ```bash
   npm run package:win
   ```

   Or point at any existing unpacked app:

   ```bash
   set CAPTIVATE_SCREENSHOT_APP=S:\path\to\win-unpacked\Captivate 2.exe
   ```

2. **Playwright** (dev dependency):

   ```bash
   npm install
   ```

3. **Demo project** — committed at `tools/screenshots/fixtures/demo.cap` (+ `demo.cfx`).
   Capture loads it automatically. Regenerate with:

   ```bash
   npm run screenshots:demo-project
   ```

   Includes Generic/Chauvet/Betopper fixtures from `assets/captivate_fixtures.db`, a Captivate-native fog type (Atmospherics), a WLED string (LED sidebar), and the default light/visual scenes.

## Commands

```bash
# Capture every shot in tools/screenshots/manifest.json → docs/screenshots/
npm run screenshots:capture

# Regenerate Wiki gallery + README snippet from the manifest (no app launch)
npm run screenshots:gallery

# Capture + regenerate docs
npm run screenshots:all
```

Environment knobs:

| Variable | Purpose |
|----------|---------|
| `CAPTIVATE_SCREENSHOT_APP` | Path to `Captivate 2.exe` / `.app` / electron binary |
| `CAPTIVATE_SCREENSHOT_PROJECT` | `.cap` to load before capture (default `tools/screenshots/fixtures/demo.cap`) |
| `CAPTIVATE_SCREENSHOT_OUT` | Override output directory (default `docs/screenshots`) |
| `CAPTIVATE_SCREENSHOT_ONLY` | Comma-separated shot ids (e.g. `lighting-scenes,mixer`) |
| `CAPTIVATE_SCREENSHOT_SETTLE_MS` | Wait after navigation before capture (default from manifest) |

## Manifest

`tools/screenshots/manifest.json` defines each shot:

- `page` — main-window page (`Modulation`, `Universe`, `Mixer`, …)
- `overlay` — optional `connections` / `settings` / `about`
- `openWindow` — optional detached page (`Video`, `Lighting3D`, `Laser`)
- `readme` / `wiki` — whether to include in generated galleries
- `requires` — soft tags (`movers`, `atmospherics`, `led`); capture still runs, but missing UI is logged as a skip warning

## Outputs

| Path | Use |
|------|-----|
| `docs/screenshots/*.png` | Image assets (git-tracked) |
| `docs/screenshots/GALLERY.md` | Wiki-ready gallery (copy/paste or sync to Wiki) |
| `docs/screenshots/README_SNIPPET.md` | “In the app” block for `README.md` |

## Wiki sync

1. Run `npm run screenshots:all`
2. Commit updated PNGs + `GALLERY.md` in this repo
3. Copy `GALLERY.md` content into the Wiki page (e.g. **Screenshots**), **or** link images from:

   `https://raw.githubusercontent.com/NicholasTracy/captivate-2/Main/docs/screenshots/<file>.png`

## Release CI → review PR → approve (merge)

On a **release build**, Windows captures shots and attaches `screenshots-review.zip` to the GitHub Release.

Then the **Screenshot review** workflow (`.github/workflows/screenshot-review.yml`):

1. **Opens a PR** with the PNGs + README “In the app” section updated  
   - Triggered automatically on `release: published`, or manually:  
     Actions → Screenshot review → `open-pr` + tag (e.g. `v1.1.2`)
2. **You review** the PR **Files changed** tab (image diffs)
3. **Merge the PR** (= approve) — commits land on `Main`
4. **Wiki** topic images are updated by copying `docs/screenshots/*.png` into the wiki repo (pages like Connections / Mixer reference those filenames), plus a `Screenshots` gallery page. Re-run Actions → Screenshot review → `publish-wiki` anytime.

Local apply (without GitHub):

```bash
# after unpacking screenshots-review.zip somewhere
npm run screenshots:apply-review -- --from path/to/unpacked-review
```

Capture failure does not fail the release (`continue-on-error`). The job loads `tools/screenshots/fixtures/demo.cap` when present.

## Notes

- Capture sets `CAPTIVATE_SCREENSHOT=1` so the renderer exposes a small harness API (`window.__captivateScreenshot`). That API is not available in normal runs.
- Detached windows are captured when `openWindow` is set; the script focuses the newest window matching that page query.
