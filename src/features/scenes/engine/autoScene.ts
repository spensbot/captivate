import { randomElementExcludeCurrent } from '../../utils/util'
import { AutoScene_t } from '../shared/Scenes'
import { TimeState, isNewPeriod } from '../../bpm/shared/TimeState'
import { CleanReduxState } from '../../../renderer/redux/store'
import { RealtimeState } from '../../../renderer/redux/realtimeStore'

type OnNewScene = (id: string) => void

interface UserModified {
  beats: number
  scene: string
}

function initUserModified(): UserModified {
  return {
    beats: 0,
    scene: '',
  }
}

const _lastUserModified = {
  light: initUserModified(),
  visual: initUserModified(),
}

export function handleAutoScene({
  onNew,
  states,
}: {
  states: {
    // previous realtimeState
    realtimeState: RealtimeState
    timeState: TimeState
    controlState: CleanReduxState
  }
  onNew: {
    lightScene: OnNewScene
    visualScene: OnNewScene
  }
}) {
  const { light, visual } = states.controlState.control

  let possibleLightIds = light.ids.filter((id) => {
    const lightScene = light.byId[id]
    if (lightScene) {
      return (
        lightScene.autoEnabled &&
        Math.abs(lightScene.epicness - light.auto.epicness) < 0.5
      )
    }
    return false
  })
  if (
    isNewScene(
      light.active,
      states.realtimeState.time.beats,
      states.timeState,
      light.auto,
      _lastUserModified.light
    )
  ) {
    const newScene = randomElementExcludeCurrent(possibleLightIds, light.active)
    _lastUserModified.light.scene = newScene
    onNew.lightScene(newScene)
  }

  let possibleVisualIds = visual.ids.filter((id) => {
    const visualScene = visual.byId[id]
    if (visualScene) {
      return visualScene.autoEnabled
    }
    return false
  })
  if (
    isNewScene(
      visual.active,
      states.realtimeState.time.beats,
      states.timeState,
      visual.auto,
      _lastUserModified.visual
    )
  ) {
    const newScene = randomElementExcludeCurrent(
      possibleVisualIds,
      visual.active
    )
    _lastUserModified.visual.scene = newScene
    onNew.visualScene(newScene)
  }
}

function isNewScene(
  activeScene: string,
  beatsLast: number,
  nextTimeState: TimeState,
  auto: AutoScene_t,
  lastUserModified: UserModified
): boolean {
  const beatsPerScene = nextTimeState.quantum * auto.period
  if (activeScene !== lastUserModified.scene) {
    lastUserModified.scene = activeScene
    lastUserModified.beats = nextTimeState.beats
  }
  if (auto.enabled) {
    if (isNewPeriod(beatsLast, nextTimeState.beats, beatsPerScene)) {
      if (nextTimeState.beats - lastUserModified.beats > beatsPerScene) {
        return true
      } else {
      }
    }
  }
  return false
}
