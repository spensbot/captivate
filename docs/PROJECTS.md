# Project files and autosave

Captivate projects are file-based workspaces. Use them when a show should move
between computers, survive app restarts, or be kept with other production files.

## File pair

A project is saved as a `.cap` file. Captivate also writes a paired fixture
library file next to it with the same name and the `.cfx` extension:

```text
My Show/
  main-room.cap
  main-room.cfx
```

Keep the two files together when copying or backing up a show. The `.cap` file
contains the project state; the `.cfx` file is the adjacent fixture database that
Captivate writes and can merge when the project is loaded.

Legacy `.captivate` project files and `.captivate-fixtures` fixture databases can
still be opened. The next save normalizes project paths to `.cap` and fixture
database paths to `.cfx`; the content migration is the extension and save
location, not a different project model.

## Create, save, and load

### New Project

Use **File > New Project** to start a file-backed workspace.

1. Choose **Empty Project** or **Default Scenes**.
2. Pick a folder and project name.
3. Captivate writes both the `.cap` and matching `.cfx` files.

The dialog warns that unsaved work in the current project will be lost before the
new state is written.

### Save Project

**File > Save Project** writes the active project path. **Save Project As...**
chooses a new path. Manual project saves are full saves: Captivate writes every
project section that it knows how to persist, then writes the paired fixture
database.

### Load Project

**File > Load Project...** reads a `.cap` or legacy `.captivate` file, then shows
checkboxes for the sections found in that file. Leave a section checked to apply
it, or uncheck it to keep the current in-memory state for that section.

After applying the selected sections, Captivate also looks for the sibling `.cfx`
file and merges fixture definitions from it if the file exists.

## What is saved

Project files use the `captivate.project` schema. Current saves include these
sections:

| Section | Contents |
|---------|----------|
| DMX Settings | Universes, patched fixtures, fixture types, and DMX editor state. |
| Light Scenes | Light scenes, splits, auto-scene settings, modulation mappings, and scene parameters. |
| Visual Scenes | Visual scene state and visual parameters. |
| Visualizer Streaming Defaults | Streaming output defaults such as FFmpeg / NDI runtime settings when available. |
| Serial Device Settings (MIDI & DMX) | MIDI/DMX connection state and audio input settings, including Advanced Music Energy controls. |
| App UI Settings | A profile subset: active page, blackout, LED/video toggles, depth view, and LED sidebar visibility. |
| DMX Mixer State | Mixer values and related live mixer state. |
| Laser Engine | Laser fixtures, zones, scenes, and laser project state. |

The paired `.cfx` file contains serialized fixture definitions from the current
fixture library.

## What is not restored from a project

Some data is application preference or runtime state instead of project content:

- Theme, language, autosave preference, last project path, and last fixture path
  are app settings.
- Recent Projects is stored by the desktop app under user data, not inside the
  `.cap` file.
- Transient UI state such as open dialogs, status messages, and temporary
  calibration overrides is cleared during load.
- The short-lived BPM tap hint used by audio beat detection is cleared when
  device state is normalized on load.

## Autosave and recovery

Captivate has two persistence paths:

1. **Project file autosave** writes the active `.cap` and `.cfx` files every 15
   seconds when **File > Autosave** is enabled and a project path is set. It skips
   the disk write if the Redux state snapshot has not changed.
2. **Session recovery** stores local autosave snapshots when there is no project
   path or project file autosave is disabled. This is a fallback for the current
   computer, not a portable project file.

Autosave is enabled by default as an app preference. It starts writing project
files after you create, save, or load a project path. On quit, Captivate makes a
best-effort final workspace write when a project path exists, then flushes the
local session snapshot.

## Recent projects

The File menu keeps up to 12 recent project paths. Each entry shows the file name
and the time it was recorded. Missing files are pruned when the menu reads the
list, and **Clear Recent Projects** removes the stored list.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Autosave is not creating `.cap` / `.cfx` files | Confirm the project has been created or saved to disk, then confirm **File > Autosave** is checked. Unsaved sessions only use local recovery. |
| A copied project is missing custom fixture definitions | Copy the sibling `.cfx` file with the `.cap`, or use **Load Fixture Database...** to merge a saved fixture database. |
| Loading a project changes only part of the show | Reopen the load dialog and verify the section checkboxes. Unchecked sections are intentionally left unchanged. |
| A legacy save reports an incompatible format | Start a new project and import the fixture database when prompted. Modern supported project files use the `captivate.project` schema. |

## Implementation map

- File extensions and sibling path rules: `src/shared/projectFiles.ts`
- Project save schema and section labels: `src/shared/save.ts`
- Project write pipeline: `src/renderer/project/projectFileWriter.ts`
- Load dialog and selective apply: `src/renderer/menu/ProjectSaveLoadDialogs.tsx`
- Menu actions and fixture DB merge: `src/renderer/menu/projectSaveLoadActions.ts`
- File autosave and session recovery: `src/renderer/autosave.ts`
- Recent Projects storage: `src/main/recentProjectsStorage.ts`
