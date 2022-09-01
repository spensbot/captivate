import NodeLink from 'node-link'
import NodeAudio, { AudioConnectionState } from 'node-audio'
import { TimeState } from '../../shared/TimeState'

export const _nodeLink = new NodeLink()
_nodeLink.setIsPlaying(true)
_nodeLink.enableStartStopSync(true)
_nodeLink.enable(true)

let _nodeAudio = new NodeAudio()
let _lastConnectionstate: AudioConnectionState = {
  available: [],
  connected: null,
}

interface Config {
  update_ms: number
  onUpdate: (connections: AudioConnectionState) => void
  getConnectable: () => string[]
}

export function maintainAudioConnection(config: Config) {
  _nodeAudio.connect(null)
  setInterval(() => {
    const connectable = config.getConnectable()
    if (connectable.length > 0) {
      const connectableId = connectable[0]
      if (_lastConnectionstate.connected?.id !== connectableId) {
        console.log('connectiong', connectable[0])
        _nodeAudio.connect(connectable[0])
      }
    }

    _lastConnectionstate = _nodeAudio.getConnectionState()
    config.onUpdate(_lastConnectionstate)
  }, config.update_ms)
}

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
