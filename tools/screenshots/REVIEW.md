# Screenshot review pack

Captured automatically during a release build. **Not** committed to Main.

## Publish (reviewable)

1. Download the `screenshot-review` workflow artifact, or `screenshots-review.zip` from the GitHub Release
2. Copy PNGs (+ `GALLERY.md` / `README_SNIPPET.md`) into `docs/screenshots/`
3. Open a PR with the visual updates
4. Optionally paste `GALLERY.md` into the Wiki Screenshots page

Empty or sparse UI usually means CI had no demo project — add
`tools/screenshots/fixtures/demo.cap` (see `docs/SCREENSHOTS.md`).
