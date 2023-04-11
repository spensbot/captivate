import { Window2D_t } from 'features/shared/shared/window'
import {
  DefaultParam,
  Params,
  StrictParams,
  defaultOutputParams,
  getParam,
} from '../shared/params'
import { Normalized, clampNormalized } from 'features/utils/math/util'
import { getWindowMultiplier2D } from 'features/dmx/shared/dmxUtil'
import { applyRandomization } from 'features/bpm/shared/randomizer'

/**
 * used on engine side on led and dmx
 * @param params
 * @returns
 */
export function getMovingWindow(params: Partial<StrictParams>): Window2D_t {
  const x =
    params.x !== undefined && params.width !== undefined
      ? { pos: params.x, width: params.width }
      : undefined

  const y =
    params.y !== undefined && params.height !== undefined
      ? { pos: params.y, width: params.height }
      : undefined

  return {
    x: x,
    y: y,
  }
}

export function getBrightness(
  params: Partial<StrictParams>,
  randomizerLevel: Normalized,
  fixtureWindow: Window2D_t,
  movingWindow: Window2D_t
): Normalized {
  const unrandomizedBrightness =
    getParam(params, 'brightness') *
    getWindowMultiplier2D(fixtureWindow, movingWindow)
  return applyRandomization(
    unrandomizedBrightness,
    randomizerLevel,
    getParam(params, 'randomize')
  )
}

export const createOutputParams = (
  {
    baseParams,
    allParamKeys,
  }: {
    baseParams: Partial<Params>

    allParamKeys: string[]
  },
  transform: (params: {
    param: DefaultParam | string
    baseParam: number
  }) => number
) => {
  const _getOutputParam = (
    baseParam: number | undefined,
    param: DefaultParam | string
  ) => {
    if (baseParam === undefined) return undefined
    return clampNormalized(transform({ param, baseParam }))
  }
  const outputParams = defaultOutputParams()

  allParamKeys.forEach((param) => {
    outputParams[param] = _getOutputParam(baseParams[param], param)
  })

  return outputParams
}
