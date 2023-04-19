import { PayloadAction } from '@reduxjs/toolkit'

import { DefaultParam, Params } from '../shared/params'
import { clampNormalized } from 'features/utils/math/util'
import {
  createTypedReducers,
  modifyActiveLightScene,
} from 'renderer/redux/controlSlice/reducers/core'

type ParamsAction = PayloadAction<{
  splitIndex: number
  params: Partial<Params>
}>

type ParamAction = PayloadAction<{
  splitIndex: number
  paramKey: DefaultParam | string
  value: number | undefined
}>

export interface SetModulationPayload {
  splitIndex: number
  modIndex: number
  param: DefaultParam | string
  value: number | undefined
}

export const paramsActionReducer = createTypedReducers({
  setBaseParams: (state, { payload: { params, splitIndex } }: ParamsAction) => {
    for (let [key, value] of Object.entries(params)) {
      modifyActiveLightScene(state, (scene) => {
        const baseParams = scene.splitScenes[splitIndex].baseParams
        baseParams[key] = value
      })
    }
  },
  setBaseParam: (
    state,
    { payload: { paramKey, value, splitIndex } }: ParamAction
  ) => {
    modifyActiveLightScene(state, (scene) => {
      const baseParams = scene.splitScenes[splitIndex].baseParams
      baseParams[paramKey] = value
    })
  },
  deleteBaseParams: (
    state,
    {
      payload: { params, splitIndex },
    }: PayloadAction<{
      splitIndex: number
      params: readonly (DefaultParam | string)[]
    }>
  ) => {
    for (const param of params) {
      modifyActiveLightScene(state, (scene) => {
        const baseParams = scene.splitScenes[splitIndex].baseParams
        delete baseParams[param]

        // Now remove the params from any modulators
        scene.modulators.forEach((modulator) => {
          const modulation = modulator.splitModulations[splitIndex]
          delete modulation[param]
        })
      })
    }
  },
  incrementBaseParams: (
    state,
    { payload: { params, splitIndex } }: ParamsAction
  ) => {
    for (let [key, amount] of Object.entries(params)) {
      modifyActiveLightScene(state, (scene) => {
        if (amount !== undefined) {
          const baseParams = scene.splitScenes[splitIndex].baseParams
          const currentVal = baseParams[key as DefaultParam]
          if (currentVal !== undefined) {
            baseParams[key as DefaultParam] = clampNormalized(
              currentVal + amount
            )
          }
        }
      })
    }
  },
  // TODO: move this to modulators reducer once Params type is not needed
  setModulation: (state, { payload }: PayloadAction<SetModulationPayload>) => {
    const { splitIndex, modIndex, param, value } = payload
    modifyActiveLightScene(state, (scene) => {
      scene.modulators[modIndex].splitModulations[splitIndex][param] = value
    })
  },
})
