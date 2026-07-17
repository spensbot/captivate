## What's new in Captivate 2 1.1.2

This patch release hardens show control and packaging, and adds an automated **screenshot review pack** on GitHub Releases.

### Show control & modulation

- **Audio LFO envelopes** — Per-split envelope state with a true beat clock; peek vs advance behavior is consistent in the visualizer and engine.
- **Randomizer** — Slot identity and universe-safe fixture lookup so randomizer targets stay correct across patch changes.
- **Modulation matrix** — Dedicated-group hide and movers filtering behave correctly for complex patches.

### Fixtures & DMX

- **Gobo / prism mid-slot DMX** and safer focus clamping.
- Null-safe Focus / Gobo / Prism type lookups.
- Color wheel selection follows the fixture base channel more reliably.

### Packaging & CI

- Skip overwriting projectM after a lipo step; `package:*` forces runtime/bridge env correctly.
- NSIS robocopy check for Windows installers.
- Live CI / release badges on the README.

### Screenshots (release review)

- Release builds capture a **screenshot review pack** (`screenshots-review.zip` on the GitHub Release + `screenshot-review` workflow artifact).
- Images are **not** auto-merged to Main — download, review, and open a PR when you want docs/Wiki updates.
- Includes a fixture-rich `demo.cap` for populated captures.

### Bug fixes

- Scene remove / copy guards when no scene is active.
- Audio stream start-generation race.
- Mixer slice rename (`gui` → `mixer`) for clearer remote/control allowlists.
- Assorted NaN clamping, Y-mirror fallback, and modulator guard fixes.
- **Project load** — Loading a `.cap` that omits device settings no longer mutates frozen Redux state (`midiClockBpmEnabled` / Link flags).
- **Atmospherics** — Selecting a newly mapped atmospheric fixture no longer infinite-loops (React error #185); config is created before selection.

### Installing

Download the installer for your operating system below. You can install over Captivate 2 1.1.1; projects and settings are kept.

#### macOS install

Captivate 2 is not Apple-notarized. Download the **architecture-specific** DMG:

- **Apple Silicon (M1–M4):** `Captivate.2-1.1.2-arm64.dmg`
- **Intel Mac:** `Captivate.2-1.1.2-x64.dmg`

Check **About This Mac** → **Chip** (Apple M…) vs **Processor** (Intel). Do not use a generic `.dmg` without `-arm64` or `-x64` if both are listed.

First launch: drag to **Applications**, then **right-click → Open** and confirm. Full steps: [docs/MACOS-INSTALL.md](https://github.com/NicholasTracy/captivate-2/blob/main/docs/MACOS-INSTALL.md).
