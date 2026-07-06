# Audio input and music energy

Captivate can analyze live audio from a microphone, interface input, or desktop
loopback source. The audio engine produces level, beat, BPM, spectrum, and
energy metrics used by scenes, modulation, visualizers, and status meters.

Open the status-bar music-note button to show **Audio Input**.

## Basic setup

1. Turn on **Audio Mode**.
2. Choose an **Input Device**. Captivate lists microphone inputs and a
   **Desktop Audio (Loopback)** source.
3. Adjust **Input Gain** so the Level meter moves without staying pinned.
4. Enable **Auto Gain Control** if songs vary widely in loudness.
5. Optional: turn on **Use Audio Beat Clock** to drive BPM and beat pulse from
   audio onsets.

Most audio sliders are disabled until **Audio Mode** is on. Remote-control
sessions adjust the show computer's audio settings; audio capture still happens
on the show computer.

## Meters and outputs

| Output | Meaning | Used by |
|--------|---------|---------|
| Level | Current input loudness after gain. | Setup and troubleshooting. |
| Energy | Smoothed musical loudness after adaptive normalization and shaping. | Energy-style effects, auto-scene matching, visualizers, and modulation. |
| BPM Lock | Confidence in the detected tempo when audio beat clock is enabled. | Beat-clock troubleshooting. |

When an auto scene has energy matching enabled and its **audio** toggle is
active, Captivate uses live `audio.energyLevel` instead of the scene's manual
energy slider. Built-in visualizers and projectM also receive audio energy, beat
pulse, input level, and spectrum data.

## Advanced Beat Detection

Turn on **Advanced Beat Detection** when beat detection is too sparse or too
busy.

| Control | Range | Effect |
|---------|-------|--------|
| Beat Sensitivity | 0-100% | Higher values trigger more often; lower values require clearer peaks. |
| Minimum Beat Interval | 120-800 ms | Ignores beats closer together than this interval. |
| BPM Response | 5-95% | Higher values let the estimated BPM follow changes faster; lower values reduce jitter. |

With Audio Mode on, the status-bar **TAP** button can feed a temporary BPM hint
into beat detection. The hint expires after a short window and is cleared on
project load.

## Advanced Music Energy

Turn on **Advanced Music Energy** to tune how the Energy meter reacts to the
music. These settings are stored under the project device settings and are saved
with the project.

| Control | Saved field | Range | Default | Effect |
|---------|-------------|-------|---------|--------|
| Energy Response | `energySmoothing` | 5-95% | 40% | How quickly the Energy meter follows drops, builds, and breakdowns. Higher reacts faster; lower smooths short spikes. |
| Energy Dynamics | `energyDynamics` | 0-100% | 45% | Dynamic range of the meter. Lower feels punchier; higher smooths energy changes across the song. |
| Rhythm Emphasis | `energyRhythmBias` | 0-100% | 50% | Balance between sub-bass / sustained low end and percussion / bright transients. Left is bass-heavy; right is rhythm-heavy. |

Internally, the renderer normalizes loudness with an adaptive floor and peak
hold, computes perceived energy from loudness, spectral fullness, rhythm drive,
tempo, beat pulse, and build/drop trends, then smooths the result into
`audio.energyLevel`.

## Tuning examples

| Goal | Try |
|------|-----|
| Fast drops and breakdowns should snap immediately | Raise **Energy Response**. |
| A noisy live input makes the Energy meter twitchy | Lower **Energy Response** and raise **Energy Dynamics**. |
| Kick and bass should dominate scene energy | Move **Rhythm Emphasis** left. |
| Hi-hats, percussion, and bright transients should influence scenes more | Move **Rhythm Emphasis** right. |
| Quiet songs never reach high-energy scenes | Enable **Auto Gain Control**, then lower **Energy Dynamics** if more punch is needed. |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Sliders are disabled | Turn on **Audio Mode**. |
| Level meter is flat | Select another input device, verify OS audio permissions, or raise **Input Gain**. |
| Level is high but Energy stays low | Raise **Energy Response**, lower **Energy Dynamics**, or adjust **Rhythm Emphasis** toward the dominant part of the music. |
| Auto scenes ignore live music | Enable audio input, enable auto-scene energy matching, and turn on the auto scene's **audio** toggle. |
| BPM changes are jumpy | Lower **BPM Response** or increase **Minimum Beat Interval**. |

## Implementation map

- Audio settings, ranges, defaults, and metrics: `src/shared/audioEngine.ts`
- Runtime analysis pipeline: `src/renderer/audio/AudioInputEngine.ts`
- Audio Input menu controls: `src/renderer/menu/AudioInputMenu.tsx`
- Auto-scene live energy selection: `src/shared/autoScene.ts`
- Modulation audio energy source: `src/shared/modulation.ts`
- Visualizer audio inputs: `src/visualizer/threejs/layers/BuiltinVisualizer.ts`
  and `src/visualizer/threejs/layers/ProjectM.ts`
