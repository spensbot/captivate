import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import {
  clampRemotePort,
  defaultRemoteControlSettings,
  generateRemotePin,
  type RemoteControlSettings,
} from '../../../shared/remoteControl'

const FILE_NAME = 'remote-control-settings.json'

function settingsPath(): string {
  return path.join(app.getPath('userData'), FILE_NAME)
}

export async function loadRemoteControlSettings(): Promise<RemoteControlSettings> {
  try {
    const raw = await fs.readFile(settingsPath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<RemoteControlSettings>
    const pin =
      typeof parsed.pin === 'string' && parsed.pin.trim().length >= 4
        ? parsed.pin.trim()
        : generateRemotePin()
    return {
      enabled: parsed.enabled === true,
      port: clampRemotePort(Number(parsed.port)),
      pin,
    }
  } catch {
    return defaultRemoteControlSettings()
  }
}

export async function saveRemoteControlSettings(
  settings: RemoteControlSettings
): Promise<RemoteControlSettings> {
  const normalized: RemoteControlSettings = {
    enabled: settings.enabled === true,
    port: clampRemotePort(settings.port),
    pin:
      typeof settings.pin === 'string' && settings.pin.trim().length >= 4
        ? settings.pin.trim()
        : generateRemotePin(),
  }
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true })
  await fs.writeFile(settingsPath(), JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}
