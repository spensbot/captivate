# Atmospherics (fog, haze, FX)

Dedicated DMX path for atmospheric and FX fixtures (fog, haze, and pyro-like
devices). Scene lighting math still runs first; atmospherics then writes
trigger/level channels into the same universe buffers.

## Safety defaults

Atmospherics starts **safe-off**:

| Setting | Default |
|---------|---------|
| System enabled | `false` |
| Armed | `false` |
| Emergency stop | `false` |
| Allow pyro | `false` |
| Global level limit | `1` (full) |

Output is active only when **enabled and armed** and **emergency stop is clear**.
The Atmospherics page **System Active** toggle sets `enabled` and `armed`
together. **EMERGENCY STOP** latches independently and blocks all atmos
outputs until you clear it (clearing E-Stop does not change System Active).

Fixtures whose names contain `flame`, `spark`, or `pyro` (case-insensitive) are
blocked unless **Allow Pyro** is on. While blocked, triggers stay off and levels
fall back to the fixture channel `defaultValue`.

Treat this page like show-critical FX: keep System Active off until the stage is
ready, and use E-Stop first if anything misfires.

## Setup

1. Define or import a fixture with `fxtrTrigger` and/or `fxtrLevel` channels
   (model kind `atmosphericFxtr`). Keyword-only custom names are not enough
   unless the effective kind is atmospheric.
2. Patch the fixture into a universe. Captivate auto-manages an **Atmosphere**
   group and shows the Atmospherics page in the menu when mapped fixtures exist.
3. An Atmosphere split is auto-added with defaults:
   - `atmosFxtrOnOff` = **0.5** (group trigger / threshold param)
   - `atmosFxtrLevel` = **1** (group level)
4. Open **Atmospherics**, enable **System Active**, configure action timing, and
   optionally **Allow Pyro** for flame/spark/pyro-named fixtures.
5. Fire via:
   - Group slider crossing the trigger threshold
   - On-page **Trigger** control
   - MIDI `triggerAtmosFixture` (manual nonce)

The Atmospherics page stays on the main window (it is not a detachable page).

## Trigger actions

Per trigger channel (`AtmosTrigChConfig`):

| Action | Behavior |
|--------|----------|
| `momentary` | Pulse while the source is above threshold (default pulse **150 ms**) |
| `latching` | Toggle / hold based on crossings |
| `interval` | Repeat while active (default interval **500 ms**) |

Timing clamps: delays 0–600000 ms; pulse and interval minimum **10 ms**.
`useGroupThreshold` defaults to **true** (threshold from the Atmosphere split
base param). Levels default to **split** control via `atmosFxtrLevel`, scaled by
`globalLevelLimit`.

## Runtime pipeline

```text
calculateDmx (scenes + mixer)
  → AtmosphericsOutputManager.apply (raise trigger/level channels)
  → finalizeDmxUniverses (blackout + zero unpatched)
```

Runtime status is mirrored on realtime state as `atmos` (`AtmosRunState`):
enabled/armed/E-Stop, messages, and per-fixture blocked reasons
(`system inactive`, `emergency stop`, `fixture disabled`, `pyro disabled`, …).

There is no dedicated atmos IPC channel: settings live under
`connectionSettings.atmos`, manual fires use
`gui.atmosManualTriggerNonceByFixtureId`, and the engine publishes `atmos` on
the realtime store.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Atmospherics page empty / missing | Patch a fixture with `fxtrTrigger` / `fxtrLevel` (kind `atmosphericFxtr`) |
| “System inactive” | Turn on **System Active** |
| “Emergency stop latched” | Click **EMERGENCY STOP** again to clear |
| “Pyro disabled” | Enable **Allow Pyro**, or rename if the fixture is not pyro |
| Triggers never fire | Atmosphere split present; threshold vs live `atmosFxtrOnOff`; fixture `enabled` |
| Levels stuck at defaults | Fixture may be pyro-blocked; or level mode set to manual at 0 |
| Everything dark including fog | Global **Blackout** zeros all universes after atmos writes |

## Codepaths

| Role | Path |
|------|------|
| Types / defaults / clamps | `src/shared/atmospherics.ts` |
| Fixture mapping | `src/shared/atmosphericsMapping.ts` |
| Runtime writer | `src/main/engine/AtmosphericsOutputManager.ts` |
| Engine hook | `src/main/engine/engine.ts` |
| Operator UI | `src/renderer/pages/Atmospherics.tsx` |
| Atmosphere split auto-manage | `src/renderer/sync/AutoManagedSplitSync.tsx` |
| Device reducers | `src/renderer/redux/deviceState.ts` |

## Related

- [DMX output and movers](dmx-movers.md) — universe composition and blackout
- [Project files and autosave](PROJECTS.md) — atmos settings travel with Serial Device Settings
