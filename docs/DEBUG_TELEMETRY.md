# Captivate Telemetry And Debugging

## Unified verbose log (recommended)

Captivate maintains **one always-on verbose log** for support and GitHub issues:

- **Live file:** `%APPDATA%\captivate2\logs\captivate-verbose.ndjson` (Windows)
- **Format:** NDJSON — one JSON object per line
- **Rotation:** 10 MB per file, up to 3 rotated backups (`.1`, `.2`, `.3`)

No environment variables are required. The log records:

- **Diagnostics** — all levels (`info`, `warn`, `error`) from main, renderer, engine, Lighting 3D, audio, streaming, WLED, etc.
- **Telemetry marks** — events, counters, durations, health; high-frequency gauges (e.g. FPS) are sampled at most once per second per metric
- **Session metadata** — app version, platform, session id on startup

### Export for GitHub issues

**Help → Export Debug Log…**

This saves an NDJSON file you can attach to a GitHub issue. The export includes:

1. Rotated verbose log history from the current session
2. A final **`telemetry_snapshot`** line with aggregated counters, gauges, timers, and recent events

### Live tail (developers / support)

```powershell
.\tools\tail-captivate-verbose-log.ps1
```

Or:

```powershell
Get-Content "$env:APPDATA\captivate2\logs\captivate-verbose.ndjson" -Tail 50 -Wait
```

### NDJSON line kinds

| `kind` | Contents |
| --- | --- |
| `session_start` | App version, platform, session id |
| `diagnostic` | Structured diagnostic event (`area`, `event`, `level`, `message`, `data`) |
| `mark` | Telemetry mark (`subsystem`, `metric`, `type`, values) |
| `telemetry_snapshot` | Export footer only — aggregated session telemetry |

### Project save / load tracing

Project persistence uses area **`project-persistence`** and subsystem **`project.persistence`**. Search the verbose log for phases such as:

- `project_save_complete`, `project_load_parse_complete`, `project_load_apply_complete`
- `project_load_content_mismatch`, `project_load_empty_file`
- `autosave_restore_complete`, `autosave_write`

Each line includes **before/after content counts** (scenes, fixtures, types) when relevant.

## What else is captured

- Main process health (CPU, memory, event loop lag)
- Engine timing (realtime tick, DMX calculate)
- Renderer health (uncaught errors, RAF FPS heartbeat)
- Lighting 3D (stalls, frame times, render errors)
- Audio engine (BPM, analysis timing)
- Streaming (NDI/RTSP, ffmpeg lifecycle)
- WLED (discovery, UDP errors)
- IPC usage counters (in telemetry snapshot footer)

## Legacy / advanced

**Help → Export Debug Log…** replaces the old separate env-var log files (`CAPTIVATE_TELEMETRY_LIVE_LOG`, `CAPTIVATE_PROJECT_PERSISTENCE_LOG`). Those env vars are no longer needed.

**Export Telemetry Snapshot** (JSON aggregates only) remains available via IPC for tooling; the debug log export is the user-facing path for issue reports.

## Recommended debug workflow

1. Reproduce the issue in Captivate (verbose log records automatically).
2. **Help → Export Debug Log…**
3. Attach the exported `.ndjson` file to your GitHub issue.
4. Note what you were doing and when (timestamps are ISO8601 on each line).

## Key signals to search for

- `project_load_content_mismatch` — save file had content but Redux counts differ after load
- `lighting3d` + `frame_stall_detected`
- `renderer` + `uncaught-error`
- `engine.realtime.tick_ms` (in snapshot timers)
- `stream.output` errors (in diagnostics or snapshot)
