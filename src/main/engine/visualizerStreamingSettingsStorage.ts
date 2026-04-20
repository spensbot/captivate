import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import {
  initVisualizerStreamingSettings,
  VisualizerStreamingSettings,
} from 'shared/visualizerStreaming'

const STREAMING_SETTINGS_DIRNAME = 'streaming'
const STREAMING_SETTINGS_FILENAME = 'visualizer-streaming-settings.json'

export function getVisualizerStreamingSettingsPath() {
  return path.join(
    app.getPath('userData'),
    STREAMING_SETTINGS_DIRNAME,
    STREAMING_SETTINGS_FILENAME
  )
}

export function readVisualizerStreamingSettings(): VisualizerStreamingSettings {
  const defaults = initVisualizerStreamingSettings()
  const filePath = getVisualizerStreamingSettingsPath()
  if (!existsSync(filePath)) {
    return defaults
  }

  try {
    const raw = readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<VisualizerStreamingSettings>
    return sanitizeSettings({
      ...defaults,
      ...parsed,
    })
  } catch (_err) {
    return defaults
  }
}

export function writeVisualizerStreamingSettings(
  settings: VisualizerStreamingSettings
) {
  const filePath = getVisualizerStreamingSettingsPath()
  mkdirSync(path.dirname(filePath), { recursive: true })
  const sanitized = sanitizeSettings(settings)
  writeFileSync(filePath, JSON.stringify(sanitized, null, 2), 'utf8')
  return sanitized
}

export function patchVisualizerStreamingSettings(
  patch: Partial<VisualizerStreamingSettings>
) {
  const current = readVisualizerStreamingSettings()
  return writeVisualizerStreamingSettings({
    ...current,
    ...patch,
  })
}

function sanitizeSettings(
  settings: VisualizerStreamingSettings
): VisualizerStreamingSettings {
  return {
    defaultFfmpegPath:
      typeof settings.defaultFfmpegPath === 'string' &&
      settings.defaultFfmpegPath.trim().length > 0
        ? settings.defaultFfmpegPath.trim()
        : 'auto',
    ndiRuntimePath:
      typeof settings.ndiRuntimePath === 'string'
        ? settings.ndiRuntimePath.trim()
        : '',
  }
}
