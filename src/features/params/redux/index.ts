import {
  DefaultParam,
  Params,
  defaultOutputParams,
  defaultParamsList,
} from 'features/params/shared/params'
import {
  DmxState,
  getCustomChannels,
} from 'features/fixtures/redux/fixturesSlice'
import { useActiveLightScene } from 'renderer/redux/store'
import { useRealtimeSelector } from 'renderer/redux/realtimeStore'

export function getAllParamKeys(dmx: DmxState): DefaultParam[] {
  return defaultParamsList.concat(Array.from(getCustomChannels(dmx)))
}

export function useBaseParam(
  param: DefaultParam,
  splitIndex: number
): number | undefined {
  const baseParam = useActiveLightScene((state) => {
    return state.splitScenes[splitIndex].baseParams[param]
  })
  return baseParam
}

export function useBaseParams(splitIndex: number): Partial<Params> {
  const baseParams = useActiveLightScene((state) => {
    return state.splitScenes[splitIndex].baseParams
  })
  return baseParams
}

export function useModParam(
  param: DefaultParam,
  modIndex: number,
  splitIndex: number
) {
  return useActiveLightScene((scene) => {
    return scene.modulators[modIndex].splitModulations[splitIndex][param]
  })
}

export function useOutputParam(
  param: DefaultParam,
  splitIndex: number
): number {
  const outputParam = useRealtimeSelector((state) => {
    return state.splitStates[splitIndex]?.outputParams?.[param]
  })
  if (outputParam === undefined) {
    console.error(
      `useOutputParam called on undefined output param ${param}. That's probably not what you wanted.`
    )
    return 0
  } else {
    return outputParam
  }
}

export function useOutputParams(splitIndex: number): Partial<Params> {
  const params = useRealtimeSelector((state) => {
    return state.splitStates[splitIndex]?.outputParams
  })
  if (params === undefined) {
    return defaultOutputParams()
  }
  return params
}
