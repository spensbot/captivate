/**
 * Global z-index scale for Captivate UI.
 *
 * Full-screen overlays (portaled to `document.body` via `OverlayPortal`):
 *   fullscreen (10000) — FullscreenOverlay shell (non-blocking container)
 *   wizard (10020)     — multi-step wizards
 *   appModal (10030)   — AppModal alerts, confirms, connections, about
 *   nestedModal (10040)— AppModal inside a wizard (e.g. emitter editor)
 *   popup (10050)      — Popup.tsx (channel editor, add fixture, patch slot)
 *   muiDialog (10060)  — MUI Dialog (QLC browser, share to library, etc.)
 *   muiMenu (10070)    — MUI Select menus / Popover help
 *   busy (10080)       — BusyModal blocking overlay
 *   critical (10100)   — Quit app / highest-priority system confirms
 *   tooltip (20001)    — MUI tooltips (always on top)
 *
 * In-page canvas (stay inside layout; use low values + `isolation: isolate`):
 *   See `canvasLayerZIndex` for fixture mapping pads and emitter layout editor.
 */
const fullscreenOverlay = 10000

export const overlayZIndex = {
  fullscreen: fullscreenOverlay,
  wizard: fullscreenOverlay + 20,
  appModal: fullscreenOverlay + 30,
  nestedModal: fullscreenOverlay + 40,
  popup: fullscreenOverlay + 50,
  muiDialog: fullscreenOverlay + 60,
  muiMenu: fullscreenOverlay + 70,
  busy: fullscreenOverlay + 80,
  critical: fullscreenOverlay + 100,
  tooltip: 20001,
} as const

/** Layers inside a fixture mapping pad or emitter layout canvas (not global overlays). */
export const canvasLayerZIndex = {
  grid: 0,
  windowOutline: 1,
  resizeHandle: 2,
  marker: 3,
  marquee: 2,
} as const

export type AppModalStack = 'appModal' | 'nestedModal' | 'critical'

export default {
  main: 0,
  /** Legacy in-panel tooltips (e.g. mixer value readout). Not for full-screen modals. */
  popups: 10,
  fullscreenOverlay,
  leftMenu: 1000,
  overlay: overlayZIndex,
  canvas: canvasLayerZIndex,
}
