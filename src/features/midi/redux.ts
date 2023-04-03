import { DefaultParam } from '../../shared/params'
import { SceneType } from '.../../shared/Scenes'

type ModulationParam = 'period'

interface SetActiveSceneIndex {
  type: 'setActiveSceneIndex'
  sceneType: SceneType
  index: number
}

interface SetModulationParam {
  type: 'setModulationParam'
  param: ModulationParam
  sceneId: string;
  index: number
}

interface SetAutoSceneBombacity {
  type: 'setAutoSceneBombacity'
}

interface SetMaster {
  type: 'setMaster'
}
interface SetBpm {
  type: 'setBpm'
}

interface SetBaseParam {
  type: 'setBaseParam'
  paramKey: DefaultParam | string
}

interface TapTempo {
  type: 'tapTempo'
}

export type MidiAction =
  | SetActiveSceneIndex
  | SetAutoSceneBombacity
  | SetMaster
  | SetBaseParam
  | SetModulationParam
  | SetBpm
  | TapTempo
