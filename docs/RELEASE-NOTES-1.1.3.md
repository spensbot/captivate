## What's new in Captivate 2 1.1.3

This patch fixes macOS packaging so Apple Silicon and Intel builds keep their native modules and can launch reliably.

### Fixes

- **macOS launch crash** — Packaging no longer deletes koffi’s prebuilt natives during the darwin universal rebuild. That had caused `Cannot find the native Koffi module` on startup.
- **macOS natives** — Prefer vendor universal prebuilds for USB / serialport where available; install the correct-arch `ffmpeg-static` binary and projectM runtime for each DMG in afterPack.
- **Resilience** — koffi is loaded lazily so a missing native cannot brick the main process at boot.

### Installing

Download the installer for your operating system below. You can install over Captivate 2 1.1.2; projects and settings are kept.

#### macOS install

Captivate 2 is not Apple-notarized. Download the **architecture-specific** DMG:

- **Apple Silicon (M1–M4):** `Captivate.2-1.1.3-arm64.dmg`
- **Intel Mac:** `Captivate.2-1.1.3-x64.dmg`

Check **About This Mac** → **Chip** (Apple M…) vs **Processor** (Intel). Do not use a generic `.dmg` without `-arm64` or `-x64` if both are listed.

First launch: drag to **Applications**, then **right-click → Open** and confirm. Full steps: [docs/MACOS-INSTALL.md](https://github.com/NicholasTracy/captivate-2/blob/Main/docs/MACOS-INSTALL.md).
