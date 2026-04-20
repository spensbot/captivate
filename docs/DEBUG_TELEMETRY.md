# Captivate Telemetry And Debugging

## What Is Captured

Captivate now records:

- Main process health:
  - CPU %
  - memory usage
  - event loop lag
- Engine timing:
  - realtime tick duration
  - DMX calculation duration
  - NodeLink fallback activations/recoveries
- Renderer health:
  - uncaught errors
  - unhandled promise rejections
  - event loop lag
  - RAF FPS heartbeat
- Lighting 3D health:
  - frame stalls and recoveries
  - average frame time and FPS
  - **fps_1s** (frames completed in the last second while the viewport is visible)
  - **frame_ms_max_1s** (worst single-frame time in that second)
  - frame render errors
- Audio engine telemetry:
  - input/energy levels
  - detected BPM
  - analysis timing
- Streaming telemetry:
  - NDI/RTSP start/stop/errors
  - frame pipeline timing
  - ffmpeg lifecycle events
- WLED telemetry:
  - discovery warnings/errors
  - device add/remove/rebind
  - UDP send errors and broadcast tick timing
- IPC usage counters across core commands.

## How To Export A Snapshot

Use:

- `Help -> Export Telemetry Snapshot`

This writes a JSON snapshot to the app log directory and shows the file path.

## Diagnostics Log Locations (Windows)

- `%APPDATA%\\captivate2\\logs\\captivate-diagnostics.log`
- `%TEMP%\\captivate-diagnostics.log`
- `C:\\Users\\<user>\\AppData\\Local\\Programs\\captivate2\\captivate-diagnostics.log`

Log rotation is enabled automatically when a log exceeds 10 MB.

## Lighting 3D live HUD (while the app is running)

In the Lighting 3D viewport (embedded or detached window):

- Press **Alt+Shift+H** to toggle an on-screen overlay with **FPS (1s)**, **avg / max / last frame ms**, **draw calls**, **triangle count**, **geometry/texture counts**, **JS heap** (Chromium), **canvas size / DPR**, fixture counts, and stall / volumetric-fog flags.
- The choice is persisted in `localStorage` under key **`captivate.debug.lighting3dPerfHud`** (`1` = show on next load).

Telemetry from the detached Lighting 3D window is tagged **`renderer-page`**; the main window uses **`renderer-main`**, so snapshots can tell which process produced each mark.

### Live NDJSON stream (agent / terminal friendly)

1. Set environment variable **`CAPTIVATE_TELEMETRY_LIVE_LOG=1`** and start Captivate (main process must pick this up).
2. Main process appends every `lighting3d*` **`TelemetryMark`** as one JSON line to:
   - **`%TEMP%\captivate-telemetry-lighting3d-live.ndjson`**
3. From PowerShell (repo root):

```powershell
.\tools\tail-lighting3d-telemetry-live.ps1
```

Or: `Get-Content $env:TEMP\captivate-telemetry-lighting3d-live.ndjson -Tail 50 -Wait`

**Note:** `captivate-diagnostics.log` only receives **warn/error** diagnostics (e.g. renderer event-loop lag). Gauges such as `lighting3d.render.frame_ms_avg` use the NDJSON stream or **Help → Export Telemetry Snapshot**.

## Recommended Debug Workflow

1. Start app fresh.
2. Reproduce issue.
3. Export telemetry snapshot from Help menu.
4. Collect:
   - latest telemetry JSON
   - latest diagnostics log
5. Compare timestamps around the issue window.

## Key Signals To Check

- `lighting3d.frame_stall_detected`
- `lighting3d.render.fps_1s` vs `lighting3d.render.frame_ms_avg` / `frame_ms_max_1s`
- `engine.realtime.tick_ms` p95
- `engine.dmx.calculate_ms` p95
- `process.event_loop_lag_ms`
- `audio.detected_bpm`
- `stream.output.*` error counters
