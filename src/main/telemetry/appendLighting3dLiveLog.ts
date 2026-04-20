import { appendFile } from 'fs/promises'
import path from 'path'
import type { TelemetryMark } from '../../shared/telemetry'

const FILE_NAME = 'captivate-telemetry-lighting3d-live.ndjson'

/**
 * When `CAPTIVATE_TELEMETRY_LIVE_LOG=1`, append each renderer Lighting 3D mark
 * as one NDJSON line under TEMP (or cwd) so shells can `Get-Content -Wait -Tail`.
 */
export function appendLighting3dLiveTelemetry(mark: TelemetryMark): void {
  if (process.env.CAPTIVATE_TELEMETRY_LIVE_LOG !== '1') {
    return
  }
  const subsystem =
    typeof mark.subsystem === 'string' ? mark.subsystem : 'unknown'
  if (!subsystem.startsWith('lighting3d')) {
    return
  }
  const base = process.env.TEMP || process.env.TMPDIR || process.cwd()
  const filePath = path.join(base, FILE_NAME)
  const line =
    JSON.stringify({
      receivedAtMs: Date.now(),
      ...mark,
    }) + '\n'
  void appendFile(filePath, line, 'utf8').catch(() => {
    // ignore disk full / AV locks
  })
}
