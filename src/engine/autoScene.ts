import { ReduxStore } from '../redux/store'
import { TimeState } from '../redux/realtimeStore'
import { setActiveScene } from '../redux/scenesSlice'

export default function handleAutoScene(store: ReduxStore, timeState: TimeState) {
  const {auto, active} = store.getState().scenes

  if (auto.enabled && isNewScene(timeState, auto.period)) {
    setRandomScene(active, auto.bombacity, store)
  }
}

function isNewScene(ts: TimeState, autoScenePeriod: number): boolean {
  const beatsPerScene = ts.quantum * autoScenePeriod
  const dtMinutes = ts.dt / 60000
  const dtBeats = dtMinutes * ts.bpm
  return (ts.beats % beatsPerScene) < dtBeats
}

const MAX_DIF = 0.5

function setRandomScene(activeScene: string, bombacity: number, store: ReduxStore) {
  const scenes = store.getState().scenes
  const byId = scenes.byId
  const closest = scenes.ids.filter(id => {
    return Math.abs(bombacity - byId[id].bombacity) < MAX_DIF
      && id != activeScene
  })
  const weighted = closest.map(id => {
    const dif = Math.abs(bombacity - byId[id].bombacity)
    const weighted: [string, number] = [id, (1 - dif) - MAX_DIF / 3]
    return weighted
  })
  const totalWeight = weighted.reduce((accum, [id, weight]) => {
    return accum + weight
  }, 0)
  const byWeight = weighted.sort((left, right) => {
    return left[1] - right[1]
  })

  const randomWeight = Math.random() * totalWeight
  let newID: null | string = null
  let accum = 0
  let i = 0
  while (accum < randomWeight && i < byWeight.length) {
    const [id, weight] = byWeight[i]
    newID = id
    i += 1
    accum += weight
  }

  // console.log(`closest: ${closest.length} | weighted: ${weighted.length} | totalWeight: ${totalWeight} | byWeight: ${byWeight.length}`)
  // console.log(`total: ${totalWeight} | random: ${randomWeight}`)
  console.log(newID)

  if (newID) store.dispatch(setActiveScene(newID))
}