import type { DiagnosticLevel } from '../../shared/diagnostics'
import type { SaveConfig, SaveState } from '../../shared/save'
import {
  countProjectContent,
  describeSaveConfig,
  describeSaveFileSections,
  formatProjectContentCounts,
  type ProjectContentCounts,
} from '../../shared/projectPersistenceSummary'
import { sendDiagnosticsEvent, sendTelemetryMark } from '../ipcHandler'
import { pushStatusMessage } from '../redux/guiSlice'
import { store, type ReduxState } from '../redux/store'
import { currentRendererTelemetrySource } from './RendererTelemetry'

export type ProjectPersistencePhase =
  | 'autosave_restore_start'
  | 'autosave_restore_complete'
  | 'autosave_restore_failed'
  | 'autosave_write'
  | 'autosave_write_failed'
  | 'autosave_flush'
  | 'quit_save_complete'
  | 'quit_save_failed'
  | 'quit_save_flush'
  | 'project_save_start'
  | 'project_save_complete'
  | 'project_save_cancelled'
  | 'project_save_failed'
  | 'fixture_db_save_complete'
  | 'fixture_db_save_cancelled'
  | 'fixture_db_load_complete'
  | 'fixture_db_load_cancelled'
  | 'project_load_file_read'
  | 'project_load_parse_complete'
  | 'project_load_parse_failed'
  | 'project_load_dialog_opened'
  | 'project_load_dialog_cancelled'
  | 'project_load_apply_start'
  | 'project_load_apply_complete'
  | 'project_load_apply_failed'
  | 'project_load_empty_file'
  | 'project_load_content_mismatch'
  | 'state_reset'
  | 'state_apply_save'

export interface ProjectPersistenceLogInput {
  phase: ProjectPersistencePhase
  level?: DiagnosticLevel
  message?: string
  filePath?: string
  durationMs?: number
  before?: ProjectContentCounts
  after?: ProjectContentCounts
  file?: ProjectContentCounts
  saveConfig?: SaveConfig
  saveState?: SaveState
  restoreStatus?: string
  schema?: string
  version?: number
  serializedBytes?: number
  error?: unknown
  extra?: Record<string, unknown>
}

const DIAG_AREA = 'project-persistence'
const TELEMETRY_SUBSYSTEM = 'project.persistence'

function resolveLevel(
  phase: ProjectPersistencePhase,
  explicit?: DiagnosticLevel
): DiagnosticLevel {
  if (explicit !== undefined) {
    return explicit
  }
  if (phase.endsWith('_failed') || phase.includes('mismatch')) {
    return 'error'
  }
  if (
    phase === 'project_load_empty_file' ||
    phase === 'project_load_content_mismatch' ||
    phase === 'autosave_restore_failed'
  ) {
    return 'warn'
  }
  return 'info'
}

function errorDetails(error: unknown): { error: string; stack?: string } {
  if (error instanceof Error) {
    return {
      error: error.message,
      stack: error.stack,
    }
  }
  return { error: String(error) }
}

function buildMessage(input: ProjectPersistenceLogInput): string {
  if (input.message !== undefined && input.message.length > 0) {
    return input.message
  }
  const parts: string[] = [input.phase.replaceAll('_', ' ')]
  if (input.filePath !== undefined) {
    parts.push(`file=${input.filePath}`)
  }
  if (input.restoreStatus !== undefined) {
    parts.push(`restore=${input.restoreStatus}`)
  }
  if (input.before !== undefined) {
    parts.push(`before=[${formatProjectContentCounts(input.before)}]`)
  }
  if (input.after !== undefined) {
    parts.push(`after=[${formatProjectContentCounts(input.after)}]`)
  }
  if (input.file !== undefined) {
    parts.push(`file=[${formatProjectContentCounts(input.file)}]`)
  }
  if (input.durationMs !== undefined) {
    parts.push(`durationMs=${input.durationMs.toFixed(1)}`)
  }
  if (input.serializedBytes !== undefined) {
    parts.push(`bytes=${input.serializedBytes}`)
  }
  return parts.join(' ')
}

function buildData(input: ProjectPersistenceLogInput): Record<string, unknown> {
  const data: Record<string, unknown> = {
    phase: input.phase,
    ...(input.filePath !== undefined ? { filePath: input.filePath } : {}),
    ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
    ...(input.before !== undefined ? { before: input.before } : {}),
    ...(input.after !== undefined ? { after: input.after } : {}),
    ...(input.file !== undefined ? { file: input.file } : {}),
    ...(input.restoreStatus !== undefined
      ? { restoreStatus: input.restoreStatus }
      : {}),
    ...(input.schema !== undefined ? { schema: input.schema } : {}),
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(input.serializedBytes !== undefined
      ? { serializedBytes: input.serializedBytes }
      : {}),
    ...(input.saveConfig !== undefined
      ? { saveConfig: describeSaveConfig(input.saveConfig) }
      : {}),
    ...(input.saveState !== undefined
      ? { fileSections: describeSaveFileSections(input.saveState) }
      : {}),
    ...(input.extra !== undefined ? { extra: input.extra } : {}),
  }
  if (input.error !== undefined) {
    Object.assign(data, errorDetails(input.error))
  }
  return data
}

/** Structured save/load/autosave telemetry (diagnostics + telemetry hub + optional status bar). */
export function logProjectPersistence(input: ProjectPersistenceLogInput): void {
  const level = resolveLevel(input.phase, input.level)
  const source = currentRendererTelemetrySource()
  const message = buildMessage(input)
  const data = buildData(input)

  sendDiagnosticsEvent({
    source,
    area: DIAG_AREA,
    event: input.phase,
    level,
    message,
    data,
  })

  sendTelemetryMark({
    source,
    subsystem: TELEMETRY_SUBSYSTEM,
    metric: input.phase,
    type: 'event',
    level,
    message,
    data,
  })

  if (input.durationMs !== undefined) {
    sendTelemetryMark({
      source,
      subsystem: TELEMETRY_SUBSYSTEM,
      metric: `${input.phase}_ms`,
      type: 'duration',
      durationMs: input.durationMs,
    })
  }

  if (input.after !== undefined) {
    sendTelemetryMark({
      source,
      subsystem: TELEMETRY_SUBSYSTEM,
      metric: 'light_scenes',
      type: 'gauge',
      value: input.after.lightScenes,
    })
    sendTelemetryMark({
      source,
      subsystem: TELEMETRY_SUBSYSTEM,
      metric: 'universe_fixtures',
      type: 'gauge',
      value: input.after.universeFixtures,
    })
  }

  if (input.serializedBytes !== undefined) {
    sendTelemetryMark({
      source,
      subsystem: TELEMETRY_SUBSYSTEM,
      metric: 'serialized_bytes',
      type: 'gauge',
      value: input.serializedBytes,
      unit: 'bytes',
    })
  }

  if (level === 'warn' || level === 'error') {
    store.dispatch(
      pushStatusMessage({
        level,
        source: 'Project',
        message,
      })
    )
  }

  if (process.env.NODE_ENV === 'development') {
    const prefix = `[project:${input.phase}]`
    if (level === 'error') {
      console.error(prefix, message, data)
    } else if (level === 'warn') {
      console.warn(prefix, message, data)
    } else {
      console.log(prefix, message, data)
    }
  }
}

export function snapshotCurrentProjectCounts(state: ReduxState): ProjectContentCounts {
  return countProjectContent({
    dmx: state.dmx.present,
    control: state.control.present,
    laser: state.laser,
  })
}
