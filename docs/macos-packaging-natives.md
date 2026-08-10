# macOS packaging and native modules

Developer runbook for building Captivate 2 DMGs without wiping per-arch natives
(koffi, usb/serialport prebuilds, midi, node-link, ffmpeg-static, projectM).

User-facing install / Gatekeeper steps live in [MACOS-INSTALL.md](MACOS-INSTALL.md).
This page covers **packaging internals**.

## Intent

macOS ships **separate arm64 and x64 DMGs**. Several native addons must exist for
both architectures (or as vendor fat binaries). An earlier universal-rebuild step
cleared whole package `build/` trees and broke koffi’s cnoke layout, causing
startup errors like `Cannot find the native Koffi module` (fixed in 1.1.3).

## Package commands

| Script | Role |
|--------|------|
| `npm run package:mac` | Full macOS path: sets universal-native + ad-hoc sign env, runs bundle, builds arm64 then x64 DMGs |
| `npm run package:bundle` / `__package:bundle:inner` | Clean → prepare natives → rebuild → darwin universal lipo → webpack build → verify |
| `npm run rebuild` | `electron-rebuild` for the host Electron ABI |
| `npm run verify:release-assets` | Asserts koffi / midi / usb / serialport / node-link / ffmpeg / projectM assets |

`package:mac` sets:

- `CAPTIVATE_DARWIN_UNIVERSAL_NATIVE=1`
- `CAPTIVATE_MAC_ADHOC_SIGN=1`
- `CSC_IDENTITY_AUTO_DISCOVERY=false`

Bundle pipeline (`__package:bundle:inner`):

```text
check-build-env
  → clean dist
  → prepare:projectm-bridge
  → prepare:projectm-runtime
  → prepare:node-link
  → rebuild
  → tools/rebuild-darwin-universal-natives.cjs
  → build
  → verify:release-assets
```

## Universal native rebuild

`tools/rebuild-darwin-universal-natives.cjs` rebuilds release/app modules for
arm64 and x64, then `lipo`s node-gyp `build/Release|Debug` `.node` files into
universal binaries.

Runs only when:

- `process.platform === 'darwin'`, and
- `CAPTIVATE_DARWIN_UNIVERSAL_NATIVE` is truthy **or** `CI` is truthy

Skip with `CAPTIVATE_SKIP_DARWIN_UNIVERSAL_NATIVE=1`.

### Do not wipe / lipo these layouts

| Package | Layout | Rule |
|---------|--------|------|
| **koffi** | `build/koffi/<platform>_<arch>/koffi.node` (cnoke) | Never delete the whole `build/` tree; keep both `darwin_arm64` and `darwin_x64` |
| **usb** | `prebuilds/darwin-x64+arm64/` | Already fat — do not lipo or delete |
| **@serialport/bindings-cpp** | `prebuilds/darwin-x64+arm64/` | Same as usb |
| **node-gyp modules** (e.g. midi, node-link) | `build/Release|Debug` | Safe to wipe **only** those Release/Debug dirs, then rebuild + lipo |

## afterPack arch fixups

`.erb/scripts/macAdhocSign.js` (afterPack / ad-hoc sign when
`CAPTIVATE_MAC_ADHOC_SIGN` is set) reinstalls **arch-correct** `ffmpeg-static`
and projectM runtime into each DMG. Host `npm install` alone is not enough for
the opposite architecture.

## Runtime koffi loading

`src/main/engine/koffiNative.ts` lazy-loads koffi:

- `tryGetKoffi()` — returns `null` and logs if the native is missing (main process
  still boots)
- `getKoffi()` — throws with a rebuild/reinstall message when required

Consumers include NDI (`VisualizerNdiSender.ts`), projectM runtime helpers, and
Pangolin BEYOND SDK bindings. A missing koffi binary should not brick app start,
but those features will fail until natives are restored.

## Verification

`npm run verify:release-assets` fails the build when critical natives are absent.
On darwin (or CI) it especially asserts:

- `release/app/node_modules/koffi/build/koffi/darwin_arm64/koffi.node`
- `…/darwin_x64/koffi.node`
- usb + `@serialport/bindings-cpp` `prebuilds/darwin-x64+arm64/node.napi.node`
- midi Release or prebuilds, node-link native, ffmpeg-static binary
- projectM bridge / runtime when CI or the corresponding `CAPTIVATE_BUILD_*` flags are set

## Common pitfalls

1. **Clearing `node_modules/*/build` wholesale** — deletes koffi cnoke prebuilds.
2. **Lipoing vendor `prebuilds/`** — usb/serialport are already universal; treat
   them as opaque.
3. **Packaging only on one arch without the universal script** — the other DMG
   (or Rosetta) may load the wrong `.node`.
4. **Skipping `verify:release-assets`** — packaging can look “successful” while
   natives are missing.
5. **Confusing this with Gatekeeper** — launch blocked by macOS security is
   covered in [MACOS-INSTALL.md](MACOS-INSTALL.md), not by native rebuilds.

## Codepaths

| Role | Path |
|------|------|
| macOS package entry | `package.json` → `package:mac` |
| Bundle + verify chain | `package.json` → `__package:bundle:inner` |
| Universal rebuild / lipo | `tools/rebuild-darwin-universal-natives.cjs` |
| Asset assertions | `tools/verify-release-assets.js` |
| afterPack / ffmpeg / projectM | `.erb/scripts/macAdhocSign.js` |
| Lazy koffi loader | `src/main/engine/koffiNative.ts` |
| projectM prepare | `tools/prepare_projectm_runtime.js`, `tools/projectm_runtime_fetch.mjs` |

## Related

- [macOS install guide](MACOS-INSTALL.md) — end-user DMG / Gatekeeper steps
- [RELEASE-NOTES-1.1.3](RELEASE-NOTES-1.1.3.md) — packaging fix summary
- [Visualizer streaming](visualizer-streaming.md) — NDI path that uses koffi
- [Laser FB4 / Pangolin BEYOND](laser-fb4-beyond.md) — BEYOND SDK also loads via koffi
