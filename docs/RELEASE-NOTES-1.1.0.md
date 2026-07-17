## What's new in Captivate 2 1.1.0

This release adds **file-based projects**, **subfixture and emitter modeling**, a **smoother and more trustworthy show engine**, and **UI polish** across the status bar, sidebar, and 3D preview.

### Project files & workspace

- **Save projects to disk** — Shows use `.cap` project files with a paired `.cfx` fixture library beside the project (legacy `.captivate` saves still load and migrate).
- **New Project flow** — Choose a starter template, name the show, and pick a save location before you begin.
- **File autosave** — Background autosave writes the open project and fixture library to disk; **Recent Projects** in the File menu picks up where you left off.
- **Safer load/save** — Clearer progress and error handling when opening, saving, or migrating projects.

### Fixtures & emitters

- **Subfixtures** — Split complex fixtures into subfixtures and assign channels and 3D emitters per segment for more accurate output and preview.
- **Emitter layout editor** — Improved tools for placing emitters on fixture faces, including PAR-style ring layouts and uniform disc packing.
- **Fixture mapping & placement** — Cleaner placement UI, better channel/subfixture assignment, and continued support for color-map and mover calibration workflows.
- **Model & layout wizard** — Streamlined path from fixture geometry to emitter layout for 3D preview and output.

### Show engine, transport & DMX

- **Stop really stops** — Play/Stop freezes the beat clock, LFOs, scene modulation, and DMX output at the exact moment you stop; Play resumes from that same point without jumping ahead or behind.
- **Live while paused** — DMX mixer overrides, audio input meters, connection status, and fixture editing/mapping still work when transport is stopped.
- **Instant live controls** — Master, blackout, split parameters (HSB, sliders, modulation), and DMX mixer overrides now reach DMX output immediately instead of waiting on a debounced sync.
- **Smoother real-time output** — Engine timing, DMX compute, and UI updates were reworked so modulation stays smooth (especially at slow tempos) while DMX output remains accurate to your interface rate.
- **Authoritative beat & mixer display** — Beat meter and DMX mixer faders track the engine directly instead of drifting from client-side guessing.
- **Audio beat clock** — More stable tempo follow and nudging when audio input drives the master clock.

### DMX mixer & modulation UI

- **Live mixer faders** — Mixer output display updates at DMX rate and only when values change, reducing UI load during shows.
- **Smoother live cursors** — Scene and mixer sliders use shared motion smoothing so manual and live values feel less jittery.
- **LFO graph performance** — LFO waveform preview moved to canvas for lighter CPU use in dense scenes.

### Status bar & sidebar controls

- **Redesigned transport row** — Play/Stop, Tap, BPM, and beat meter share a consistent control height and clearer spacing.
- **Beat meter & TAP** — Wider beat gauge, larger TAP control with extra spacing, and engine-synced beat display.
- **Audio level meter** — Wider input meter in the status bar.
- **Master fader** — Master intensity is a wide cap-style fader aligned with the sidebar; blackout matches the same width.

### Lighting 3D preview

- **Faster, richer preview** — Major preview pipeline updates for multi-emitter fixtures, subfixtures, and more accurate color/intensity from DMX.
- **Detached preview window** — 3D preview can run in its own window with a lighter real-time feed so the main UI stays responsive.

### Connections & build

- **Art-Net & serial** — Refinements to DMX output buffering and connection handling.
- **Windows installer** — Choose install location, desktop shortcut, and more reliable packaged builds.
- **macOS universal build** — Native modules rebuilt for universal macOS packages where supported.

### Bug fixes

- **Transport resume jump** — Fixed stop appearing to freeze the UI while the engine clock kept running, causing LFOs and BPM to jump on play.
- **Live control lag** — Fixed noticeable delay on master, blackout, split sliders, and mixer overrides from control-state debouncing.
- **UI stutter over time** — Fixed accumulating frame drops during long runs, especially at slow BPM or while dragging tempo and sliders.
- **Beat gauge drift** — Fixed beat meter falling out of sync with the engine at low tempos.
- **DMX mixer display lag** — Fixed mixer faders updating too slowly or fighting full-app redraws.
- **Layout regressions** — Fixed status bar and global layout breakage introduced during performance work.
- **Release & CI builds** — Fixed typecheck, packaging, and native rebuild issues on Windows and macOS.

### Installing

Download the installer for your operating system below. You can install over Captivate 2 1.0.1; existing autosave recovery and legacy project import still work. New saves use `.cap` / `.cfx` by default.

#### macOS first-launch note

Captivate 2 is not Apple-notarized. Download the **architecture-specific** DMG from the release:

- **Apple Silicon (M1–M4):** `Captivate.2-<version>-arm64.dmg`
- **Intel Mac:** `Captivate.2-<version>-x64.dmg`

First launch: drag to **Applications**, then **right-click → Open**. See [docs/MACOS-INSTALL.md](https://github.com/NicholasTracy/captivate-2/blob/Main/docs/MACOS-INSTALL.md).
