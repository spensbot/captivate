import { nanoid } from 'nanoid'
import { fixLightScenes } from '../fixState'
import { pruneUnusedModulators } from '../modulation'
import { LightScenes_t } from '../Scenes'
import { createSeededRng } from './rng'
import {
  analyzeRigProfile,
  SceneGenerationRigInput,
} from './rigProfile'
import {
  buildLightScenesList,
  DEFAULT_SAVE_LIGHT_SEED,
} from './generateLightScenesInternals'

export interface GenerateLightScenesOptions {
  seed?: number | string
  preserveAuto?: LightScenes_t['auto']
}

export function generateLightScenesForRig(
  rig: SceneGenerationRigInput,
  options: GenerateLightScenesOptions = {}
): LightScenes_t {
  const rng = createSeededRng(options.seed ?? Date.now())
  const profile = analyzeRigProfile(rig)
  const scenes = buildLightScenesList(rng, profile)

  const ids = scenes.map(() => nanoid())
  const byId: LightScenes_t['byId'] = {}
  scenes.forEach((scene, index) => {
    byId[ids[index]!] = scene
  })

  const result: LightScenes_t = {
    ids,
    byId,
    active: ids[0]!,
    auto: options.preserveAuto ?? {
      enabled: false,
      epicness: 0.5,
      period: 8,
      energyMatchEnabled: true,
      matchAudioEnergy: true,
    },
  }

  fixLightScenes(result)
  for (const id of result.ids) {
    const scene = result.byId[id]
    if (scene !== undefined) {
      pruneUnusedModulators(scene)
    }
  }
  fixLightScenes(result)
  return result
}

export { DEFAULT_SAVE_LIGHT_SEED }
export { analyzeRigProfile, type RigProfile, type SceneGenerationRigInput } from './rigProfile'
