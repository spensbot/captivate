import { scenesSlice } from './slice'

export const {
  setMaster,

  // LIGHT & VISUAL SCENES
  setAutoSceneEnabled,
  setAutoSceneBombacity,
  setAutoScenePeriod,
  newScene,
  removeScene,
  setActiveScene,
  setActiveSceneIndex,
  setActiveSceneBombacity,
  setActiveSceneAutoEnabled,
  setActiveSceneName,
  reorderScene,
  copyActiveScene,
  sortScenesByBombacity,
  autoBombacity,

  // LIGHT SCENES
  resetLightScenes,
  setBaseParams,
  setBaseParam,
  deleteBaseParams,
  incrementBaseParams,
  setModulatorShape,
  setPeriod,
  incrementPeriod,
  incrementModulator,
  addModulator,
  removeModulator,
  setModulation,
  resetModulator,
  setRandomizer,
  addSplitScene,
  removeSplitSceneByIndex,
  setSceneGroup,

  // VISUAL SCENES
  resetVisualScenes,
  setVisualSceneConfig,
  activeVisualSceneEffect_add,
  activeVisualSceneEffect_removeIndex,
  activeVisualSceneEffect_reorder,
  activeVisualScene_setActiveEffectIndex,
  activeVisualSceneEffect_set,
} = scenesSlice.actions
