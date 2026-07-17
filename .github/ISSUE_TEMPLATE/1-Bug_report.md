---
name: Bug report
about: Something in Captivate 2 is broken or misbehaving.
title: '[Bug] '
labels: bug
---

Thanks for reporting a bug. A clear report (and a debug log when you can attach one) helps us fix it much faster.

## Before you file

Please skim the wiki troubleshooting guide first — many setup issues are already covered there:

- **[Troubleshooting (wiki)](https://github.com/NicholasTracy/captivate-2/wiki/Troubleshooting)**
- **[Getting started](https://github.com/NicholasTracy/captivate-2/wiki/Getting-Started)**
- **[Connections](https://github.com/NicholasTracy/captivate-2/wiki/Connections)** · **[Audio input](https://github.com/NicholasTracy/captivate-2/wiki/Audio-Input)** · **[Saving projects](https://github.com/NicholasTracy/captivate-2/wiki/Saving-Projects)**

Community help (not a substitute for this issue, but often faster for “how do I…?”):

- [Discord](https://discord.gg/96DVPcMUUv)
- [GitHub Discussions](https://github.com/NicholasTracy/captivate-2/discussions)

### Troubleshooting steps tried

Check what you already did (skip anything that does not apply):

- [ ] Updated to the [latest Captivate 2 release](https://github.com/NicholasTracy/captivate-2/releases/latest)
- [ ] Restarted Captivate (and the computer, if it felt stuck)
- [ ] Confirmed **Master** is up and **Blackout** is off
- [ ] Checked status-bar **dmx** / **midi** / **link** indicators ([Connections](https://github.com/NicholasTracy/captivate-2/wiki/Connections))
- [ ] Verified fixture addresses, universe, and **groups** on splits ([DMX setup](https://github.com/NicholasTracy/captivate-2/wiki/DMX-Setup))
- [ ] For audio issues: **Audio mode** on, correct input, meters move ([Audio input](https://github.com/NicholasTracy/captivate-2/wiki/Audio-Input))
- [ ] For project issues: kept `.cap` and `.cfx` together; tried **File → Load Project…** again ([Saving projects](https://github.com/NicholasTracy/captivate-2/wiki/Saving-Projects))
- [ ] Searched [existing issues](https://github.com/NicholasTracy/captivate-2/issues) for the same problem
- [ ] Followed the relevant section of [Troubleshooting](https://github.com/NicholasTracy/captivate-2/wiki/Troubleshooting)

## Summary

<!-- One or two sentences: what goes wrong? -->

## Expected behavior

<!-- What should have happened? -->

## Actual behavior

<!-- What happened instead? Include error text from the status bar or dialogs if any. -->

## Steps to reproduce

1.
2.
3.

## How often?

- [ ] Every time
- [ ] Often
- [ ] Sometimes / hard to reproduce
- [ ] Once so far

## Environment

- **Captivate 2 version:** <!-- Help → About, or the installer / release tag, e.g. 1.1.2 -->
- **OS:** <!-- e.g. Windows 11, macOS 15 arm64, Ubuntu 24.04 -->
- **Install type:** <!-- release installer / AppImage / DMG / built from source -->
- **Relevant hardware / connections (if any):** <!-- USB DMX adapter, Art-Net, MIDI, WLED, audio interface, etc. -->

## Debug log (please attach when you can)

Captivate keeps a verbose log automatically. Exporting it is the best way for us to see errors, project load/save traces, audio, DMX, and streaming signals.

### How to export

1. Reproduce the problem once in Captivate (so it is in the log).
2. In the menu bar: **Help → Export Debug Log…**
3. Save the `.ndjson` file somewhere easy to find.
4. **Drag that file onto this issue** (or use the GitHub attachment control).

The export includes recent verbose log lines plus a telemetry snapshot footer. You do **not** need to set any environment variables.

### Optional: where the live log lives

Only needed if Export fails — you can zip/copy the live file instead:

| OS | Typical path |
|----|----------------|
| **Windows** | `%APPDATA%\captivate2\logs\captivate-verbose.ndjson` |
| **macOS** | `~/Library/Logs/captivate2/captivate-verbose.ndjson` |
| **Linux** | `~/.config/captivate2/logs/captivate-verbose.ndjson` |

- [ ] Debug log attached (`.ndjson`)
- [ ] Could not export — explained why below

<!-- If you could not attach a log, say what happened when you tried Help → Export Debug Log… -->

## Extra context (optional)

<!-- Screenshots, project notes (avoid sharing private show content unless needed), anything else that helps. -->
