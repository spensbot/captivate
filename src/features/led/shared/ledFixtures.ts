import { distanceBetween, pLerp, Point } from '../../utils/math/point'
import { BaseColors, getBaseColorsFromHsv } from '../../utils/baseColors'
import { getMovingWindow, getWindowMultiplier2D } from '../../dmx/shared/dmxUtil'
import { getParam, Params } from '../../dmx/shared/params'
import { indexArray } from '../../utils/util'
import { Window2D_t } from '../../shared/shared/window'

export const MAX_LED_COUNT = 367

export interface WLedFixture {
  type: 'WLed'
  name: string
  mdns: string
  led_count: number
  points: Point[] // 0 to 1 x and y
}

export type LedFixture = WLedFixture

export function initLedFixture(): LedFixture {
  return {
    type: 'WLed',
    name: 'Name',
    mdns: 'Wled1',
    led_count: 100,
    points: [{ x: 0.5, y: 0.5 }],
  }
}

export function getLedValues(
  params: Params,
  ledFixture: LedFixture,
  master: number
): BaseColors[] {
  let segments = pointsToSegments(ledFixture.points)
  let total_length = segments.reduce((acc, s) => acc + s.length, 0.0)
  let hue = getParam(params, 'hue')
  let saturation = getParam(params, 'saturation')
  let brightness = getParam(params, 'brightness')
  let movingWindow = getMovingWindow(params)

  let ledWindows = segments.reduce<Window2D_t[]>((acc, segment) => {
    let segment_led_count =
      (segment.length * ledFixture.led_count) / total_length

    return acc.concat(
      indexArray(segment_led_count).map((i) => {
        let ratio = i / segment_led_count
        let point = pLerp(segment.p0, segment.p1, ratio)
        let window: Window2D_t = {
          x: {
            pos: point.x,
            width: 0,
          },
          y: {
            pos: point.y,
            width: 0,
          },
        }
        return window
      })
    )
  }, [])

  return ledWindows.map((ledWindow) => {
    let windowMultiplier = getWindowMultiplier2D(ledWindow, movingWindow)

    return getBaseColorsFromHsv(
      hue,
      saturation,
      brightness * windowMultiplier * master
    )
  })
}

interface Segment {
  p0: Point
  p1: Point
  length: number
}

function pointsToSegments(points: Point[]): Segment[] {
  if (points.length < 2) return []

  let last = points[0]
  return points.slice(1).map((p) => {
    let segment: Segment = {
      p0: last,
      p1: p,
      length: distanceBetween(p, last),
    }
    last = p
    return segment
  })
}
