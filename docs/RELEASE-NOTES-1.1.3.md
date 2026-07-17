## What's new in Captivate 2 1.1.3

This patch fixes **project load** when a save omits the device slice (which broke release screenshot capture) and completes the screenshot review pack on GitHub Releases.

### Bug fixes

- **Project load** — Loading a `.cap` that does not include device settings no longer tries to mutate frozen Redux state (`midiClockBpmEnabled` / Link flags). Projects with only DMX + scenes (including the screenshot demo) load cleanly.

### Screenshots (release review)

- Release CI can load `tools/screenshots/fixtures/demo.cap` and attach `screenshots-review.zip` for human review (still not auto-merged to Main).

### Installing

Download the installer for your operating system below. You can install over Captivate 2 1.1.2; projects and settings are kept.

#### macOS install

Captivate 2 is not Apple-notarized. Download the **architecture-specific** DMG:

- **Apple Silicon (M1–M4):** `Captivate.2-1.1.3-arm64.dmg`
- **Intel Mac:** `Captivate.2-1.1.3-x64.dmg`

Check **About This Mac** → **Chip** (Apple M…) vs **Processor** (Intel). Do not use a generic `.dmg` without `-arm64` or `-x64` if both are listed.

First launch: drag to **Applications**, then **right-click → Open** and confirm. Full steps: [docs/MACOS-INSTALL.md](https://github.com/NicholasTracy/captivate-2/blob/main/docs/MACOS-INSTALL.md).
