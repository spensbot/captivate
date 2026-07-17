# Installing Captivate 2 on macOS

Captivate 2 is **not notarized** with Apple (no paid Developer Program). macOS may show a security warning the first time you open it. Follow the steps below for your Mac type.

## Which download is for my Mac?

On the [Releases](https://github.com/NicholasTracy/captivate-2/releases/latest) page, pick **one** macOS `.dmg`:

| Your Mac | Download this file |
|----------|-------------------|
| **Apple Silicon** (M1, M2, M3, M4, etc.) | `Captivate.2-<version>-arm64.dmg` |
| **Intel** (processor listed as Intel Core…) | `Captivate.2-<version>-x64.dmg` |

**How to check:** Apple menu → **About This Mac**

- **Chip:** Apple M… → use **arm64**
- **Processor:** Intel Core… → use **x64**

Do **not** use a generic `.dmg` without `-arm64` or `-x64` in the name if both arch-specific files are listed — those are the supported installers.

## Install steps

1. Download the correct `.dmg` for your Mac (see table above).
2. Open the DMG and drag **Captivate 2** to **Applications**.
3. Eject the DMG.
4. In **Applications**, **right-click** **Captivate 2.app** → **Open** (do not double-click the first time).
5. Click **Open** in the dialog (“Apple cannot verify…”).

After this one-time approval, you can launch Captivate normally from Applications or the Dock.

### If macOS still blocks launch

1. **System Settings** → **Privacy & Security**
2. Scroll to the Captivate message and click **Open Anyway**

Or run in Terminal (adjust path if needed):

```bash
xattr -cr "/Applications/Captivate 2.app"
codesign --force --deep --sign - "/Applications/Captivate 2.app"
```

Then open from Applications again (right-click → Open once if prompted).

## Troubleshooting

### App bounces in the dock and quits immediately

Usually the wrong architecture (e.g. x64 on Apple Silicon without Rosetta) or a damaged copy.

1. Confirm you installed the **arm64** build on Apple Silicon (or **x64** on Intel).
2. Delete `/Applications/Captivate 2.app` and reinstall from the correct DMG.
3. Run the Terminal commands above, then try **Open** again.

### “Captivate 2 is damaged and can’t be opened”

Quarantine flag from the browser. Run:

```bash
xattr -cr "/Applications/Captivate 2.app"
```

Then right-click → **Open**.

## For release notes (copy/paste block)

```markdown
### macOS install

Captivate 2 is not Apple-notarized. Use the **architecture-specific** DMG:

- **Apple Silicon (M1–M4):** `Captivate.2-<version>-arm64.dmg`
- **Intel Mac:** `Captivate.2-<version>-x64.dmg`

Check **About This Mac** → **Chip** (Apple M…) vs **Processor** (Intel).

First launch: drag to Applications, then **right-click → Open** and confirm. See [macOS install guide](https://github.com/NicholasTracy/captivate-2/blob/Main/docs/MACOS-INSTALL.md) if Gatekeeper blocks the app.
```
