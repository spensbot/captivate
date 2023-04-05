import { Window2D_t } from "features/shared/shared/window"
import { Params, getParam } from "../shared/params"
import { Normalized } from "features/utils/math/util"
import { getWindowMultiplier2D } from "features/dmx/shared/dmxUtil"
import { applyRandomization } from "features/bpm/shared/randomizer"

/**
 * used on engine side on led and dmx
 * @param params
 * @returns
 */
export function getMovingWindow(params: Partial<Params>): Window2D_t {
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
  params: Partial<Params>,
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
