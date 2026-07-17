## What's new in Captivate 2 1.1.4

This patch fixes a **React crash on the Atmospherics page** when selecting a fog/FX fixture that did not yet have control config (minified React error #185).

### Bug fixes

- **Atmospherics** — Selecting a newly mapped atmospheric fixture no longer enters an infinite update loop. `selectAtmosFxtr` now creates the fixture config before selecting it.
- **Release screenshots** — Connections, About, Settings, Atmospherics, and LED captures no longer show the crash screen (they were poisoned after the Atmospherics failure).

### Installing

Download the installer for your operating system below. You can install over Captivate 2 1.1.3; projects and settings are kept.

#### macOS install

Captivate 2 is not Apple-notarized. Download the **architecture-specific** DMG:

- **Apple Silicon (M1–M4):** `Captivate.2-1.1.4-arm64.dmg`
- **Intel Mac:** `Captivate.2-1.1.4-x64.dmg`

Check **About This Mac** → **Chip** (Apple M…) vs **Processor** (Intel). Do not use a generic `.dmg` without `-arm64` or `-x64` if both are listed.

First launch: drag to **Applications**, then **right-click → Open** and confirm. Full steps: [docs/MACOS-INSTALL.md](https://github.com/NicholasTracy/captivate-2/blob/main/docs/MACOS-INSTALL.md).
