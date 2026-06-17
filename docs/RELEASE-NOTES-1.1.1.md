## What's new in Captivate 2 1.1.1

This patch release fixes **Ableton Link** while transport is playing and adds **Advanced Music Energy** tuning in the audio input panel.

### Audio input

- **Advanced Music Energy** — New optional controls in the audio input menu (alongside Advanced Beat Detection) to tune how the energy meter and auto-scene matching react to your music:
  - **Energy Response** — How quickly the meter follows changes in loudness.
  - **Energy Dynamics** — Punchy vs smooth normalization for the energy reading.
  - **Rhythm Emphasis** — Balance bass vs rhythm when driving energy-based effects.

### Connections & transport

- **Ableton Link toggle** — Link on/off now updates immediately in the status bar and Connections dialog, including while transport is playing. Previously the UI could show Link as off even though the engine had joined a Link session.

### Build

- **Windows CI & packaging** — Fixed native module rebuilds on GitHub Actions after the Windows runner image moved to Visual Studio 2026.

### Bug fixes

- **Link UI while playing** — Fixed beat extrapolation dropping Link session fields during playback, which made the Link button appear stuck off.
- **Link control feedback** — Link, sync, and device status now read from control state for instant UI feedback instead of waiting on extrapolated realtime state.

### Installing

Download the installer for your operating system below. You can install over Captivate 2 1.1.0; projects and settings are kept.

#### macOS first-launch note

Captivate is not notarized yet because this project currently does not have an Apple Developer account or Apple hardware for full Apple signing/notarization. macOS may warn on first launch.

If macOS blocks launch:

1. Drag **Captivate 2.app** to **Applications**.
2. In **Applications**, right-click **Captivate 2.app** and choose **Open**.
3. Click **Open** in the warning dialog.
4. If still blocked, go to **System Settings -> Privacy & Security** and click **Open Anyway**.
