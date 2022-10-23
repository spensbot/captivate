import {
  addSplitScene,
  autoBombacity,
  newScene,
  modifyScene,
  removeModulator,
  reorderScene,
  resetModulator,
  setActiveLedFxName,
  setActiveScene,
  setActiveSceneAutoEnabled,
  setActiveSceneBombacity,
  setAutoSceneBombacity,
  setAutoSceneEnabled,
  setAutoScenePeriod,
  setBaseParams,
  setModulatorShape,
  setPeriod,
  setRandomizer,
  setURL,
  sortScenesByBombacity,
} from 'renderer/redux/controlSlice'
import { store } from 'renderer/redux/store'

export const modulationSorter = (target, data) => {
  let sceneType = 'light'

  switch (target) {
    case 'newScene': {
      store.dispatch(newScene(sceneType))
      break
    }
    case 'modifyLightScene': {
      store.dispatch(
        modifyScene({ sceneType, val: { id: data.id, config: data.config } })
      )
      break
    }
    case 'activeScene': {
      store.dispatch(setActiveScene({ sceneType, val: data.id }))
      break
    }
    case 'activeSceneBombacity': {
      store.dispatch(setActiveSceneBombacity({ sceneType, val: data.value }))
      break
    }
    case 'activeSceneAutoEnabled': {
      store.dispatch(setActiveSceneAutoEnabled({ sceneType, val: data.value }))
      break
    }
    case 'reorderScenes': {
      store.dispatch(
        reorderScene({
          sceneType,
          val: { fromIndex: data.fromIndex - 1, toIndex: data.toIndex - 1 },
        })
      )
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
    case 'autoSceneBombacity': {
      store.dispatch(setAutoSceneBombacity({ sceneType, val: data.value }))
      break
    }
    case 'ledfxname': {
      store.dispatch(setActiveLedFxName({ sceneType, val: data.name }))
      break
    }
    case 'modulatorShape': {
      store.dispatch(
        setModulatorShape({ index: data.index - 1, shape: data.shape - 1 })
      )
      break
    }
    case 'period': {
      store.dispatch(setPeriod({ index: data.index - 1, newVal: data.value }))
      break
    }
    case 'resetModulator': {
      store.dispatch(resetModulator(`${data.index - 1}`))
      break
    }
    case 'removeModulator': {
      store.dispatch(removeModulator(`${data.index - 1}`))
      break
    }
    case 'baseParams': {
      store.dispatch(
        setBaseParams({
          splitIndex: data.splitIndex ? data.splitIndex : null,
          params: data.params,
        })
      )
      break
    }
    case 'randomizer': {
      store.dispatch(setRandomizer(data.params))
      break
    }
    case 'addSplitScene': {
      store.dispatch(addSplitScene(undefined))
      break
    }
    case 'autoBombacity': {
      store.dispatch(autoBombacity(sceneType))
      break
    }
    case 'sortByBombacity': {
      store.dispatch(sortScenesByBombacity(sceneType))
      break
    }
    case 'setURL': {
      store.dispatch(setURL(data.url))
      break
    }
    default: {
      throw Error('Invalid property.')
    }
  }
}
