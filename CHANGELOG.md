# Changelog

## 1.1.4

### Fixes

- Atmospherics no longer infinite-loops (React #185) when selecting a fixture without existing control config.

## 1.1.3

### Fixes

- Project load no longer mutates frozen Redux device state when a save omits the device slice (fixes release screenshot demo load).

## 1.1.2

### Show control & DMX

- Audio LFO envelope correctness (per-split state, beat clock, peek vs advance).
- Randomizer slot identity and universe-safe lookup.
- Gobo/prism mid-slot DMX, focus clamp, and safer type lookups.
- Modulation matrix dedicated-group / movers filter fixes.

### Packaging & docs

- projectM packaging env fixes; README CI/release badges.
- Release CI screenshot review pack (artifact + `screenshots-review.zip`, not auto-merged).
- Fixture-rich screenshot demo project (`tools/screenshots/fixtures/demo.cap`).

### Fixes

- Scene remove/copy guards, audio stream start race, mixer slice naming, and related hardening.

## 1.1.1

### Audio input

- Advanced Music Energy controls: energy response, dynamics, and rhythm emphasis in the audio input menu.

### Connections & fixes

- Ableton Link toggle and status stay in sync while transport is playing.
- Windows CI native rebuild fix for updated GitHub Actions runner images.

## 1.1.0

### Projects & fixtures

- File-based projects (`.cap` + `.cfx`), New Project dialog, file autosave, and Recent Projects.
- Subfixtures, emitter layout editor improvements, and fixture mapping/placement polish.

### Show engine & UI

- True transport stop/play freeze with live mixer, audio, and patching while paused.
- Instant DMX response for master, blackout, split params, and mixer overrides.
- Smoother engine/UI timing, engine-synced beat meter and mixer display, canvas LFO graph.
- Redesigned status bar; wide master fader and aligned blackout control.
- Lighting 3D preview improvements and detached preview window.

### Fixes

- Transport resume jump, live control lag, UI stutter, beat gauge drift, mixer display lag, and layout regressions.
- Windows/macOS packaging and CI build fixes.

## 1.0.1

### Community fixture library

- **Search For Fixture Online** now includes **Captivate Community Library** — download fixtures other users have shared, organized by manufacturer and model.
- **Share to Library…** on any fixture sends your definition to the community library after a quick GitHub sign-in in your browser (paste the sign-in code from your clipboard when asked).
- Clear step-by-step progress in the share dialog so you know what happens from sign-in through publishing.
- Help links and documentation for browsing and sharing fixtures.

### Fixtures improvements

- Cleaner **Fixtures** list layout with easier-to-read rows and **Load DB** / **Save DB** always at the bottom.
- **Fixture mapping** panel updates: compact position and rotation controls, clearer help, and options that match your fixture settings (including Z depth when enabled).
- Small polish across fixture editing and online search.

## 1.0.0

- First public release of Captivate 2.

## 0.9.4

- Initial Beta release
