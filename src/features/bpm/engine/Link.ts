import { UserCommand } from 'features/shared/engine/ipc_channels'
import TapTempoEngine from './TapTempoEngine'
import { TimeState } from '../shared/TimeState'
import NodeLink from 'node-link'
import { RealtimeState } from 'renderer/redux/realtimeStore'

export const _nodeLink = new NodeLink()

_nodeLink.setIsPlaying(true)
_nodeLink.enableStartStopSync(true)
_nodeLink.enable(true)

const _tapTempoEngine = new TapTempoEngine()

export function _tapTempo() {
  _tapTempoEngine.tap((newBpm) => {
    _nodeLink.setTempo(newBpm)
  })
}

export const onLinkUserCommand = (
  command: UserCommand,
  _realtimeState: RealtimeState
) => {
  if (command.type === 'IncrementTempo') {
    _nodeLink.setTempo(_realtimeState.time.bpm + command.amount)
  } else if (command.type === 'SetLinkEnabled') {
    _nodeLink.enable(command.isEnabled)
  } else if (command.type === 'EnableStartStopSync') {
    _nodeLink.enableStartStopSync(command.isEnabled)
  } else if (command.type === 'SetIsPlaying') {
    _nodeLink.setIsPlaying(command.isPlaying)
  } else if (command.type === 'SetBPM') {
    _nodeLink.setTempo(command.bpm)
  } else if (command.type === 'TapTempo') {
    _tapTempo()
  }
}

let _lastFrameTime = 0
// Todo: Desimate dt in this context
export function getNextTimeState(): TimeState {
  let currentTime = Date.now()
  const dt = currentTime - _lastFrameTime

  _lastFrameTime = currentTime

  return {
    ..._nodeLink.getSessionInfoCurrent(),
    dt: dt,
    quantum: 4.0,
  }
}
