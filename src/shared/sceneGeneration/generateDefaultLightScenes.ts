import { LightScenes_t } from '../Scenes'
import { fixLightScenes } from '../fixState'
import { pruneUnusedModulators } from '../modulation'
import {
  DEFAULT_LIGHT_SCENE_CORE_CATALOG,
  DEFAULT_LIGHT_SCENE_MOVER_CATALOG,
} from './defaultLightSceneCatalog'
import {
  buildCoreScenes,
  buildMoverScenes,
  DEFAULT_SAVE_LIGHT_SEED,
} from './generateLightScenesInternals'
import { defaultSaveRigProfile } from './rigProfile'
import { createSeededRng } from './rng'

export { DEFAULT_SAVE_LIGHT_SEED }

/** Stable default-save light scenes from the same generator as Extras → Generate Scenes. */
export function generateDefaultLightScenes(): LightScenes_t {
  const rng = createSeededRng(DEFAULT_SAVE_LIGHT_SEED)
  const profile = defaultSaveRigProfile()
  const coreScenes = buildCoreScenes(rng, profile)
  const moverScenes = buildMoverScenes(rng, profile)

  if (coreScenes.length !== DEFAULT_LIGHT_SCENE_CORE_CATALOG.length) {
    throw new Error(
      `Default light core scene count mismatch: expected ${DEFAULT_LIGHT_SCENE_CORE_CATALOG.length}, got ${coreScenes.length}`
    )
  }
  if (moverScenes.length !== DEFAULT_LIGHT_SCENE_MOVER_CATALOG.length) {
    throw new Error(
      `Default light mover scene count mismatch: expected ${DEFAULT_LIGHT_SCENE_MOVER_CATALOG.length}, got ${moverScenes.length}`
    )
  }

  const labeled = [
    ...coreScenes.map((scene, index) => {
      const catalog = DEFAULT_LIGHT_SCENE_CORE_CATALOG[index]!
      return { id: catalog.id, name: catalog.name, scene }
    }),
    ...moverScenes.map((scene, index) => {
      const catalog = DEFAULT_LIGHT_SCENE_MOVER_CATALOG[index]!
      return { id: catalog.id, name: catalog.name, scene }
    }),
  ].sort((a, b) => a.scene.epicness - b.scene.epicness)

  const ids = labeled.map((entry) => entry.id)
  const byId: LightScenes_t['byId'] = {}
  for (const entry of labeled) {
    byId[entry.id] = { ...entry.scene, name: entry.name, autoEnabled: true }
  }

  for (const id of ids) {
    const scene = byId[id]
    if (scene !== undefined) {
      pruneUnusedModulators(scene)
    }
  }

  const result: LightScenes_t = {
    ids,
    byId,
    active: ids[0]!,
    auto: {
      enabled: false,
      epicness: 0.5,
      period: 8,
      energyMatchEnabled: true,
      matchAudioEnergy: true,
    },
  }
  fixLightScenes(result)
  return result
}
