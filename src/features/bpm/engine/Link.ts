import TapTempoEngine from './TapTempoEngine'
import { TimeState } from '../shared/TimeState'
import NodeLink from 'node-link'

export const createBpmController = () => {
  const nodeLink = new NodeLink()

  nodeLink.setIsPlaying(true)
  nodeLink.enableStartStopSync(true)
  nodeLink.enable(true)

  const tapTempoEngine = new TapTempoEngine()

  let _lastFrameTime = 0
  // Todo: Desimate dt in this context
  function getNextTimeState(): TimeState {
    let currentTime = Date.now()
    const dt = currentTime - _lastFrameTime

    _lastFrameTime = currentTime

    return {
      ...nodeLink.getSessionInfoCurrent(),
      dt: dt,
      quantum: 4.0,
    }
  }

  function tapTempo() {
    tapTempoEngine.tap((newBpm) => {
      nodeLink.setTempo(newBpm)
    })
  }

  return {
    getNextTimeState,
    tapTempo,
    nodeLink,
  }
}

export type BPMController = ReturnType<typeof createBpmController>
