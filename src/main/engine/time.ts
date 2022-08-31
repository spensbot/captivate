import NodeLink from 'node-link'
import NodeAudio from 'node-audio'
import { TimeState } from '../../shared/TimeState'

export const _nodeLink = new NodeLink()
_nodeLink.setIsPlaying(true)
_nodeLink.enableStartStopSync(true)
_nodeLink.enable(true)

let _nodeAudio = new NodeAudio()
_nodeAudio.connect(null)
_nodeAudio.getConnectionState()
_nodeAudio.getSessionState()

export function setTempo(bpm: number) {
  _nodeLink.setTempo(bpm)
}

export function getNextTimeState(): TimeState {
  const linkState = _nodeLink.getSessionInfoCurrent()
  const audioState = _nodeAudio.getSessionState()

  const nextTimeState = {
    ...linkState,
    ...audioState,
    quantum: 4.0,
  }

  if (linkState.isEnabled) {
    nextTimeState.bpm = linkState.bpm
    nextTimeState.beats = linkState.beats
  }

  return nextTimeState
}
