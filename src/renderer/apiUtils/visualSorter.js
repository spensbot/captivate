import { store } from 'renderer/redux/store'
import {
  activeVisualSceneEffect_add,
  activeVisualSceneEffect_set,
  activeVisualScene_setActiveEffectIndex,
  newScene,
  modifyScene,
  reorderScene,
  setActiveScene,
  setActiveSceneAutoEnabled,
  setAutoSceneEnabled,
  setAutoScenePeriod,
  setVisualSceneConfig,
} from 'renderer/redux/controlSlice'

export const visualSorter = (target, data) => {
  let sceneType = 'visual'
  switch (target) {
    case 'modifyVisualScene': {
      store.dispatch(
        modifyScene({ sceneType, val: { id: data.id, config: data.config } })
      )
      break
    }

    case 'newEmptyScene': {
      store.dispatch(newScene(sceneType))
      break
    }

    case 'autoSceneEnabled': {
      store.dispatch(setAutoSceneEnabled({ sceneType, val: data.value }))
      break
    }
    case 'autoScenePeriod': {
      store.dispatch(setAutoScenePeriod({ sceneType, val: data.value }))
      break
    }
    case 'activeScene': {
      store.dispatch(setActiveScene({ sceneType, val: data.id }))
      break
    }
    case 'activeSceneAutoEnabled': {
      store.dispatch(setActiveSceneAutoEnabled({ sceneType, val: data.value }))
      break
    }
    case 'reorderScene': {
      store.dispatch(
        reorderScene({
          sceneType,
          val: { fromIndex: data.fromIndex - 1, toIndex: data.toIndex - 1 },
        })
      )
    }
    case 'activeSceneEffectIndex': {
      store.dispatch(activeVisualScene_setActiveEffectIndex(data.index))
      break
    }
    case 'activeSceneEffectSet': {
      store.dispatch(activeVisualSceneEffect_set(data.effect))
      break
    }
    case 'activeSceneEffectAdd': {
      store.dispatch(activeVisualSceneEffect_add(data.effect))
    }
    case 'visualSceneConfig': {
      store.dispatch(setVisualSceneConfig(data.config))
    }
    default: {
      throw Error('Invalid property.')
    }
  }
}
