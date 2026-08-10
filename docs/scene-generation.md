# Scene generation

Extras menu command that replaces all light scenes with a fresh set tailored to
the patched DMX rig. Visual scenes are never modified.

## Intent

Use this when you want a full show-ready light-scene ladder for the current
fixture layout (zones, groups, movers, strobe) instead of hand-building every
scene. It is destructive for light scenes; treat it like a regenerate, not a
merge.

## Usage

1. Patch fixtures and assign groups / window positions as needed.
2. Choose **Extras → Generate Scenes…**.
3. Review the confirm dialog (rig summary + danger warning).
4. Click **Generate**. A status toast reports how many light scenes were created.

There is no options dialog: no seed picker, scene count, or recipe UI. Cancel
leaves the project unchanged.

### Confirm summary

The dialog reports patched fixture count (or “No fixtures are patched yet”), up
to four usable group names, and whether movers / atmosphere were detected.
Atmosphere appears in the summary only; it does **not** change generated scene
content (atmospherics still use their own runtime path).

## Architecture

```text
Extras → "Generate Scenes…"
  → send_main_command({ type: 'generate-scenes' })
  → IPC main_command
  → focused renderer window
  → runGenerateScenesFromMenu()
       analyzeRigProfile(dmx.present)
       openAppConfirm("Generate Scenes?")
       generateLightScenesForRig(rig, { seed: Date.now(), preserveAuto })
       dispatch resetLightScenes(generated)
```

| Layer | Path |
|-------|------|
| Menu | `src/main/menu.ts` (`Extras` → `Generate Scenes…`) |
| IPC command | `generate-scenes` on `main_command` (`src/shared/ipc_channels.ts`) |
| Renderer handler | `src/renderer/index.tsx` |
| UI glue | `src/renderer/sceneGeneration/runGenerateScenesFromMenu.ts` |
| Generator API | `src/shared/sceneGeneration/generateLightScenes.ts` |
| Recipes / ladder | `src/shared/sceneGeneration/generateLightScenesInternals.ts` |
| Rig analysis | `src/shared/sceneGeneration/rigProfile.ts` |
| Default save path | `src/shared/sceneGeneration/generateDefaultLightScenes.ts` |
| Public exports | `src/shared/sceneGeneration/index.ts` |

## What is replaced / preserved

| State | Behavior |
|-------|----------|
| Light scenes (`control.light`) | Fully replaced via `resetLightScenes` |
| Visual scenes | Untouched |
| Auto-scene settings (`light.auto`) | Preserved from the current project |
| Per-scene `autoEnabled` | Set `true` on every generated scene |
| Active scene | First id after sort by ascending `epicness` |
| Scene ids / names | New `nanoid()` ids; random `"Adj Noun"` names |

Default `auto` when `preserveAuto` is omitted (API / default-save):

```ts
{ enabled: false, epicness: 0.5, period: 8, energyMatchEnabled: true, matchAudioEnergy: true }
```

## Generated content

| Set | Count | When |
|-----|-------|------|
| Core epicness ladder | **31** scenes (`EPICNESS_LADDER` from `0.03` … `1`) | Always |
| Mover showcases | **6** scenes | Only if the rig has movers |

Menu runs therefore produce **31** or **37** light scenes. Scenes are sorted by
`epicness` before commit. Recipes build modulators (LFO, beat, audio band,
energy, director, noise) and split scenes (pulse, zones, group-targeted). When
movers exist, core scenes also get `attachMoverAwareness` (extra Movers split /
modes); dedicated showcases cover sweep, tandem, tilt sweep, pan cascade,
mirror, and peak styles.

## Rig profiling

`analyzeRigProfile` reads the patched universe + fixture types:

| Detected | Affects generation? |
|----------|---------------------|
| Fixture count / window anchors | Zones, wig-wag columns, spectrum layout |
| Movers (`isMoverFixtureType`) | +6 showcases and mover awareness on core scenes |
| Strobe / `strobeRgb` channels | Optional strobe param in the peak-drive recipe |
| Usable groups (≥ **2** fixtures, non-reserved) | Dual-zone / group-targeted splits |
| Atmosphere fixtures | Confirm text only |
| Gobo / prism / color maps | Detected today, unused by recipes |

Reserved group names (never “usable” for generation): `Movers`, `Atmosphere`,
`Visualizer`, `All`. Fixtures whose type id is missing from `fixtureTypesByID`
are skipped. Empty rigs fall back to generic full-stage zones.

## Undo and focus

- The confirm text says Undo (Ctrl+Z) can reverse generation. Undo only targets
  the `control` history when the active page is **Modulation** or **Video**
  (`getUndoGroup`). On **Universe** / **Movers** the undo group is `dmx`; on
  other pages undo is unavailable. Switch to Modulation or Video before undoing
  a generate.
- The `generate-scenes` command runs only when the renderer document has focus
  (`document.hasFocus()`), matching other menu commands that open UI in the
  focused window.

## Developer: default save

Shipping defaults use the same recipes with a stable seed and labeled catalog:

```bash
npm run generate:default-save
```

- Seed: `DEFAULT_SAVE_LIGHT_SEED` = `'captivate-default-save-v1'`
- Synthetic profile: `defaultSaveRigProfile()` (16 fixtures, movers + strobe,
  no live patch)
- Output: `src/renderer/redux/defaultSave.json`
- Catalog asserts core/mover counts stay aligned with `defaultLightSceneCatalog.ts`

Menu generation seeds with `Date.now()`, so successive runs differ. Prefer the
default-save path when you need deterministic fixtures for CI or packaging.

## Constraints / pitfalls

1. **Destructive** — all light scenes are replaced; visuals stay.
2. **No merge** — custom scenes are not kept unless you Undo successfully.
3. **Groups need ≥2 fixtures** and must not use reserved names.
4. **Atmosphere / gobo / prism / colorMap** detection does not currently drive
   recipe content (except atmos in the confirm blurb).
5. **No movers** → no mover showcases and no mover-awareness splits on core
   scenes.
6. **Focus gate** — Extras command is ignored if the renderer window is not
   focused.

## Related

- [DMX output and movers](dmx-movers.md) — how generated mover splits become DMX
- [Atmospherics](atmospherics.md) — separate FX path; not written by this generator
- [Project files and autosave](PROJECTS.md) — light scenes travel in the `.cap` project
