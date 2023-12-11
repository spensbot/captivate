import { RealtimeState } from 'renderer/redux/realtimeStore'
import { CleanReduxState } from 'renderer/redux/store'

export interface EngineContext {
  realtimeState: () => RealtimeState
  controlState: () => CleanReduxState | null
}
