import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  type AppSettings,
} from '../shared/appSettings'

const DIRNAME = 'app-data'
const FILENAME = 'app-settings.json'

function storagePath(): string {
  const dir = path.join(app.getPath('userData'), DIRNAME)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, FILENAME)
}

export function readAppSettings(): AppSettings {
  const filePath = storagePath()
  if (!existsSync(filePath)) {
    return { ...DEFAULT_APP_SETTINGS }
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
    return normalizeAppSettings(parsed)
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

export function writeAppSettings(settings: AppSettings): AppSettings {
  const normalized = normalizeAppSettings(settings)
  writeFileSync(storagePath(), JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}
