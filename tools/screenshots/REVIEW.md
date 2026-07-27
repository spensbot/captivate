# Screenshot review pack

Captured automatically during a release build. **Not** committed to Main until approved.

## Approve (preferred)

1. Wait for the **Screenshot review** workflow to open a PR (or run it manually: Actions → Screenshot review → `open-pr`)
2. Review PNG diffs in the PR
3. **Merge the PR** — updates `docs/screenshots/` + README; Wiki **Screenshots** publishes on merge

## Manual

```bash
npm run screenshots:apply-review -- --from path/to/unpacked-screenshots-review
```

Empty or sparse UI usually means the capture did not load the demo project.
CI and local capture default to `tools/screenshots/fixtures/demo.cap` (see
`docs/SCREENSHOTS.md`); override with `CAPTIVATE_SCREENSHOT_PROJECT` if needed.
