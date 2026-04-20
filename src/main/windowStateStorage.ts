import { app, BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import type { Page } from '../shared/pages'

const WINDOW_STATE_DIRNAME = 'window-state'
const WINDOW_STATE_FILENAME = 'captivate-window-layout.json'
const WINDOW_STATE_VERSION = 1 as const

export interface WindowPlacement {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
  /** OS fullscreen (distinct from maximized). */
  isFullScreen?: boolean
}

export interface DetachedWindowPlacement extends WindowPlacement {
  page: Page
}

export interface VisualizerWindowState {
  isOpen: boolean
  placement: WindowPlacement | null
}

export interface PersistedWindowLayout {
  version: typeof WINDOW_STATE_VERSION
  main: WindowPlacement | null
  detached: DetachedWindowPlacement[]
  visualizer: VisualizerWindowState
}

export function initWindowLayout(): PersistedWindowLayout {
  return {
    version: WINDOW_STATE_VERSION,
    main: null,
    detached: [],
    visualizer: {
      isOpen: false,
      placement: null,
    },
  }
}

export function readWindowLayout(): PersistedWindowLayout {
  const defaults = initWindowLayout()
  const filePath = getWindowLayoutPath()
  if (!existsSync(filePath)) {
    return defaults
  }

  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PersistedWindowLayout>
    return sanitizeWindowLayout(parsed, defaults)
  } catch (_error) {
    return defaults
  }
}

export function writeWindowLayout(layout: PersistedWindowLayout): PersistedWindowLayout {
  const filePath = getWindowLayoutPath()
  mkdirSync(path.dirname(filePath), { recursive: true })
  const sanitized = sanitizeWindowLayout(layout, initWindowLayout())
  writeFileSync(filePath, JSON.stringify(sanitized, null, 2), 'utf8')
  return sanitized
}

export function getWindowLayoutPath() {
  return path.join(
    app.getPath('userData'),
    WINDOW_STATE_DIRNAME,
    WINDOW_STATE_FILENAME
  )
}

export function captureWindowPlacement(window: BrowserWindow): WindowPlacement {
  const isMaximized = window.isMaximized()
  const isFullScreen = window.isFullScreen()
  const bounds =
    isMaximized || isFullScreen ? window.getNormalBounds() : window.getBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    isMaximized,
    isFullScreen,
  }
}

export function buildWindowConstructorOptions(
  placement: WindowPlacement | null | undefined,
  fallbackWidth: number,
  fallbackHeight: number
): Pick<BrowserWindowConstructorOptions, 'x' | 'y' | 'width' | 'height'> {
  const fallback = {
    width: Math.max(320, Math.round(fallbackWidth)),
    height: Math.max(240, Math.round(fallbackHeight)),
  }
  const sanitized = sanitizePlacement(placement)
  if (sanitized === null) {
    return fallback
  }

  const width = Math.max(320, Math.round(sanitized.width))
  const height = Math.max(240, Math.round(sanitized.height))
  const boundsWithPosition =
    Number.isFinite(sanitized.x) && Number.isFinite(sanitized.y)
      ? {
          x: Math.round(sanitized.x as number),
          y: Math.round(sanitized.y as number),
          width,
          height,
        }
      : null

  if (boundsWithPosition === null) {
    return { width, height }
  }

  const display = screen.getDisplayMatching(boundsWithPosition)
  const workArea = display.workArea
  const intersects =
    boundsWithPosition.x + boundsWithPosition.width > workArea.x &&
    boundsWithPosition.x < workArea.x + workArea.width &&
    boundsWithPosition.y + boundsWithPosition.height > workArea.y &&
    boundsWithPosition.y < workArea.y + workArea.height

  if (!intersects) {
    return { width, height }
  }

  return {
    x: boundsWithPosition.x,
    y: boundsWithPosition.y,
    width,
    height,
  }
}

function sanitizeWindowLayout(
  input: Partial<PersistedWindowLayout>,
  defaults: PersistedWindowLayout
): PersistedWindowLayout {
  const detached = Array.isArray(input.detached)
    ? input.detached
        .map((entry) => sanitizeDetachedPlacement(entry))
        .filter((entry): entry is DetachedWindowPlacement => entry !== null)
    : []

  const visualizerInput = input.visualizer ?? defaults.visualizer
  const visualizer: VisualizerWindowState = {
    isOpen: Boolean(visualizerInput?.isOpen),
    placement: sanitizePlacement(visualizerInput?.placement ?? null),
  }

  return {
    version: WINDOW_STATE_VERSION,
    main: sanitizePlacement(input.main),
    detached,
    visualizer,
  }
}

function sanitizeDetachedPlacement(value: unknown): DetachedWindowPlacement | null {
  if (!isObject(value)) {
    return null
  }
  const page = typeof value.page === 'string' ? (value.page as Page) : null
  if (page === null || !isKnownPage(page)) {
    return null
  }
  const placement = sanitizePlacement(value)
  if (placement === null) {
    return null
  }
  return {
    ...placement,
    page,
  }
}

function sanitizePlacement(value: unknown): WindowPlacement | null {
  if (!isObject(value)) {
    return null
  }
  const width = Number(value.width)
  const height = Number(value.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null
  }
  const x = Number(value.x)
  const y = Number(value.y)
  return {
    width: Math.max(320, Math.round(width)),
    height: Math.max(240, Math.round(height)),
    x: Number.isFinite(x) ? Math.round(x) : undefined,
    y: Number.isFinite(y) ? Math.round(y) : undefined,
    isMaximized: Boolean(value.isMaximized),
    isFullScreen: Boolean(value.isFullScreen),
  }
}

function isKnownPage(value: Page) {
  return (
    value === 'Universe' ||
    value === 'Movers' ||
    value === 'Lighting3D' ||
    value === 'Atmospherics' ||
    value === 'Laser' ||
    value === 'Modulation' ||
    value === 'Video' ||
    value === 'VideoViewport' ||
    value === 'Streaming' ||
    value === 'Share' ||
    value === 'Mixer' ||
    value === 'Led'
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
