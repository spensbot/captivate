import type { Middleware } from '@reduxjs/toolkit'
import type { SaveInfo } from '../../shared/save'
import {
  logProjectPersistence,
  snapshotCurrentProjectCounts,
} from '../telemetry/projectPersistenceTelemetry'
import type { ReduxState } from './store'

const RESET_STATE = 'reset-state'
const APPLY_SAVE = 'apply-save'

/** Logs reducer-level reset/apply-save transitions (complements higher-level load/save telemetry). */
export const projectPersistenceMiddleware: Middleware<object, ReduxState> =
  (storeApi) => (next) => (action) => {
    const typed = action as { type?: string; payload?: unknown }
    const shouldLog =
      typed.type === RESET_STATE || typed.type === APPLY_SAVE
    const before = shouldLog
      ? snapshotCurrentProjectCounts(storeApi.getState())
      : undefined

    const result = next(action)

    if (!shouldLog || before === undefined) {
      return result
    }

    const after = snapshotCurrentProjectCounts(storeApi.getState())

    if (typed.type === RESET_STATE) {
      logProjectPersistence({
        phase: 'state_reset',
        before,
        after,
      })
    } else if (typed.type === APPLY_SAVE) {
      const info = typed.payload as SaveInfo
      logProjectPersistence({
        phase: 'state_apply_save',
        before,
        after,
        saveConfig: info.config,
        saveState: info.state,
      })
    }

    return result
  }
