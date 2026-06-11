# Visualizer streaming

Captivate can stream the detached visualizer window to external video tools and can relay incoming RTSP / NDI sources for use inside visualizer layers.

## Output streaming

Open the visualizer window first, then choose **Visualizer Streaming** from the visualizer UI.

| Protocol | Output path | Notes |
|----------|-------------|-------|
| **RTSP** | Captures visualizer frames, pipes raw BGRA video to FFmpeg, and starts an RTSP listener. | Uses H.264 (`libx264`), `yuv420p`, low-latency settings, and the selected TCP/UDP transport. |
| **NDI** | Captures visualizer frames and sends them through the native NDI SDK when runtime libraries are available. | The diagnostics panel also reports whether FFmpeg exposes `libndi_newtek`, which is required for incoming NDI relays. |

Default settings:

- FFmpeg path: `auto` (uses the bundled `ffmpeg-static` binary when available, otherwise `ffmpeg` on `PATH`).
- RTSP URL: `rtsp://127.0.0.1:8554/captivate`.
- RTSP transport: `tcp`.
- NDI source name: `Captivate Visualizer`.
- NDI muxer: `libndi_newtek`.

When the RTSP URL host is `127.0.0.1` or `localhost`, Captivate binds FFmpeg to `0.0.0.0` internally. Local clients can use the default URL; clients on another machine should connect to the show computer's LAN address, for example `rtsp://192.168.1.42:8554/captivate`.

## Runtime requirements

### FFmpeg

RTSP output and stream relays require FFmpeg. `auto` resolves in this order:

1. A custom FFmpeg path saved in streaming settings.
2. The packaged `ffmpeg-static` executable, including the `app.asar.unpacked` location in packaged builds.
3. `ffmpeg` from `PATH`.

Use **Save Defaults** in the streaming panel to persist a custom FFmpeg path. Settings are stored under the Electron `userData` directory in `streaming/visualizer-streaming-settings.json`.

### NDI

NDI output requires the NDI runtime libraries. Captivate searches:

1. Packaged assets in `assets/ndi-runtime`.
2. The runtime path configured in the streaming panel.
3. Common system install locations and `NDI_RUNTIME_DIR`, `NDI_SDK_DIR`, or `NDI_RUNTIME_PATH`.
4. Existing `PATH` entries.

The streaming diagnostics panel reports these NDI capabilities:

- **Native NDI SDK** - output path used when runtime libraries resolve.
- **FFmpeg libndi_newtek** - FFmpeg muxer support, also needed for incoming `ndi://` relays.
- **Unavailable** - no usable runtime / muxer combination was found.

## Capture constraints

- The visualizer window must be open; otherwise start returns `Open the visualizer window first.`.
- Captivate captures the BrowserWindow content size. Width is clamped to `2..7680` and height to `2..4320`, then rounded down to an even value for encoders.
- FPS is clamped to `1..120`.
- RTSP bitrate is clamped to `250..100000` kbps.
- Closing the visualizer window stops the stream.
- If FFmpeg stdin backs up beyond 8 MB, frames are dropped until the pipe drains.

## Incoming source relay

Visualizer layers that reference RTSP or NDI sources use a local MJPEG relay so Chromium can display them consistently.

| Source URL | Relay behavior |
|------------|----------------|
| `rtsp://...` or `rtsps://...` | FFmpeg reads the stream with the selected RTSP transport and publishes `http://127.0.0.1:<port>/<id>.mjpg`. |
| `ndi://Source Name` | FFmpeg reads the named NDI source through `libndi_newtek` and publishes the same MJPEG relay format. |
| Any other URL | Used directly without a relay. |

Relays are reused per source URL and are stopped when the visualizer layer no longer needs them or when the engine shuts down.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `Open the visualizer window first.` | Open or detach the visualizer before starting output streaming. |
| `FFmpeg not found at ...` | Keep FFmpeg as `auto`, install `ffmpeg` on `PATH`, or save a full FFmpeg executable path. |
| RTSP works locally but not from another device | Use the show computer's LAN IP in the player URL and allow the chosen RTSP port through the firewall. |
| NDI output is unavailable | Install NDI Runtime or place runtime libraries under `assets/ndi-runtime`; use **Auto Detect Runtime** and inspect the diagnostics panel. |
| NDI lists no sources for incoming layers | Confirm FFmpeg supports `libndi_newtek` input and that the NDI runtime is visible in the app environment. |
| Stream starts then errors | Check the diagnostics log or exported telemetry for `stream.output.*` FFmpeg, pipe, frame encode, or NDI send errors. |

## Implementation map

- Shared config and health types: `src/shared/visualizerStreaming.ts`
- Runtime probing and NDI library search: `src/main/engine/visualizerStreamingRuntime.ts`
- Output capture and encoder / sender lifecycle: `src/main/engine/VisualizerStreamOutputManager.ts`
- Incoming RTSP / NDI relay: `src/main/engine/VisualizerInputRelayManager.ts`
- Main-process IPC wiring: `src/main/engine/ipcHandler.ts`
- Renderer controls: `src/renderer/visualizer/StreamOutputControls.tsx`
