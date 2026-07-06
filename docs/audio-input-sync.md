# Audio input, beat clock, and music energy

Captivate can listen to a microphone or desktop loopback source for live
meters, audio-reactive modulators, automatic scene energy matching, and optional
master BPM following. Ableton Link and MIDI clock remain separate sync paths,
so operators can choose the clock source that fits the show.

## Enable audio input

1. Open the music note button in the status bar.
2. Turn on **Audio Mode**.
3. Choose an **Input Device**:
   - A microphone or audio interface input from the local computer.
   - **Desktop Audio (Loopback)** when the platform exposes system audio.
4. Adjust **Input Gain** until the Level meter moves without staying pinned.
5. Optional: turn on **Auto Gain Control (AGC)** for material with large level
   changes between songs.

The browser remote can show meters and change audio settings, but capture runs
only on the show computer. Remote clients do not enumerate local phone/tablet
audio devices.

## What the metrics drive

| Metric | Source | Used by |
|--------|--------|---------|
| **Level** | RMS after input gain / AGC | Status meter and telemetry |
| **Energy** | Normalized multi-band loudness plus tempo and rhythm activity | Audio Energy modulators, auto-scene audio matching, visualizers |
| **Beat pulse** | Onset detector over low, mid, high, broad-band, and spectral-flux features | Beat meter, audio beat clock phase nudges, visualizers |
| **Detected BPM** | Beat intervals, autocorrelation, and PLP-style period estimation | Optional audio beat clock, BPM lock meter |
| **Spectrum** | Web Audio analyser bins, normalized to 0..1 | Audio Band modulators and visualizers |

Audio Band modulators read a configured frequency range from the live spectrum.
Audio Energy modulators read the smoothed Energy metric. If audio capture is
off, both audio-driven LFO shapes output 0 until capture resumes.

## Clock source rules

Only one external source should drive master BPM at a time:

- **MIDI clock** follows MIDI timing clock messages (`0xF8`) from enabled MIDI
  inputs. Turning it on disables **Use Audio Beat Clock**.
- **Use Audio Beat Clock** follows detected audio BPM when Audio Mode is on.
  Turning it on disables MIDI clock BPM.
- **Ableton Link** joins or leaves the Link session and can share Captivate's
  current tempo with other Link-enabled apps. When Link is on, **Start/stop
  sync** can follow remote Link transport when the peer supports it.

Manual tap tempo has two behaviors:

- With no MIDI clock and no audio beat clock, tap tempo updates the internal
  Link tempo and phase.
- With Audio Mode enabled, tap tempo also stores a short-lived BPM hint for the
  audio detector. The hint is clamped to 45..220 BPM, is strongest for about 10
  seconds, fades out over roughly the next minute, and is cleared on project
  load.

## Advanced beat detection

Use these controls when the BPM lock is unstable:

| Control | Range | Effect |
|---------|-------|--------|
| **Beat Sensitivity** | 0..1 | Higher values make transients trigger more easily. Lower values require clearer onsets. |
| **Min Beat Interval** | 120..800 ms | Rejects beats closer than this interval; useful for half/double-time mistakes or noisy tracks. |
| **BPM Response** | 0.05..0.95 | Higher values follow tempo changes faster. Lower values smooth jitter. |

The detector normalizes common half/double-time candidates and uses tap hints,
periodicity confidence, and recent beat intervals to avoid transient spikes
hijacking the tempo.

## Advanced music energy

Use these controls when auto-scene matching or Audio Energy modulators feel too
flat, too jumpy, or biased toward the wrong part of the mix:

| Control | Range | Effect |
|---------|-------|--------|
| **Energy Response** | 0.05..0.95 | Higher values follow drops, builds, and breakdowns faster. Lower values smooth short spikes. |
| **Energy Dynamics** | 0..1 | Lower values make the meter punchier. Higher values keep loud/quiet sections smoother. |
| **Rhythm Emphasis** | 0..1 | 0 favors bass and sustained low end; 1 favors percussion, hats, and bright transients. |

The energy calculation combines low, mid, broad, and high-band levels with
transients and input RMS, adapts an automatic floor/ceiling over musical bar
windows, and then blends in tempo/rhythm activity for perceived energy. When
detected BPM confidence is low, Link/session BPM can still provide the tempo
used for energy timing.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No audio devices listed | Confirm the primary app window is running on the show computer. The menu enumerates devices when opened and listens for OS/browser `devicechange` events after hardware is plugged in. |
| Desktop Audio has no signal | Platform loopback support varies. Captivate first tries Electron desktop capture, then browser display capture, then audio inputs named like `Stereo Mix`, `Loopback`, `What U Hear`, or `Monitor of`. |
| Level meter is always low | Raise Input Gain or turn on AGC. If using an interface, confirm the OS input route is active. |
| Level meter clips or beat detector is too chatty | Lower Input Gain, turn off AGC if it is over-boosting silence, or lower Beat Sensitivity. |
| Audio beat clock toggle is disabled | MIDI clock BPM is enabled in **Connections**. Turn off **Drive BPM from MIDI clock** first. |
| BPM locks at half/double time | Press status-bar **TAP** a few times with Audio Mode on, then adjust Min Beat Interval and BPM Response. |
| Link status seems stale while playing | Link on/off and peer count should update from connection fields even while beat/phase are extrapolated. Check `time.isEnabled`, `time.numPeers`, and `time.isStartStopSyncEnabled` in realtime state. |

## Developer notes

- The audio engine starts only in the primary renderer window:
  `src/renderer/index.tsx`.
- Capture, AGC, beat/BPM detection, energy calculation, telemetry, and metric
  IPC live in `src/renderer/audio/AudioInputEngine.ts`.
- Shared settings, clamp ranges, band helpers, metric normalization, and
  perceived-energy helpers live in `src/shared/audioEngine.ts`; AGC helpers live
  in `src/shared/audioAgc.ts`.
- Audio settings are stored under
  `device.connectionSettings.audioInput` in `src/renderer/redux/deviceState.ts`.
  MIDI clock and audio beat clock disable each other there.
- The main engine receives metrics over `audio_engine_metrics`, stores
  `_latestAudioMetrics`, and applies MIDI/audio beat following in
  `src/main/engine/engine.ts`.
- Link UI commands are `SetLinkEnabled` and `EnableStartStopSync`; the engine
  updates both control state and the node-link runtime immediately.
- Realtime UI extrapolates beats for smooth display, but Link/session fields are
  merged from engine updates via `src/shared/timeExtrapolation.ts`.
- `tools/audio_beat_calibrate.ts` can compare beat settings against an audio
  file:

```bash
npx ts-node tools/audio_beat_calibrate.ts "path/to/reference-track.wav"
```
