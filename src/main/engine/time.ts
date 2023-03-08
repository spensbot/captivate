import NodeLink from 'node-link'
import NodeAudio, { AudioConnectionState } from 'node-audio'
import { TimeState } from '../../shared/TimeState'
import { RollingAverageBiased, RollingRange } from '../../math/rollingAverage'

export const _nodeLink = new NodeLink()
_nodeLink.setIsPlaying(true)
_nodeLink.enableStartStopSync(true)
_nodeLink.enable(true)

let _nodeAudio = new NodeAudio()
let _lastConnectionstate: AudioConnectionState = {
  available: [],
  connected: null,
}
let _rmsRange = new RollingRange(90, 0.1, 10)
let _rmsAvg = new RollingAverageBiased(90, 0, 0.5)

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

  _rmsAvg.push(audioState.rms)
  const rmsAvg = _rmsAvg.get()
  _rmsRange.push(rmsAvg)
  const rmsRatio = _rmsRange.getRatio(rmsAvg)

  console.log(
    `min: ${_rmsRange.getMin().toFixed(2)} | max: ${_rmsRange
      .getMax()
      .toFixed(2)}`
  )

  audioState.rms = rmsRatio

  const nextTimeState: TimeState = {
    bpm: linkState.isEnabled ? linkState.bpm : audioState.bpm,
    beats: linkState.isEnabled ? linkState.beats : audioState.beats,
    link: {
      ...linkState,
      quantum: 4.0,
    },
    audio: audioState,
  }

  if (linkState.isEnabled) {
    nextTimeState.bpm = linkState.bpm
    nextTimeState.beats = linkState.beats
  }

  return nextTimeState
}
