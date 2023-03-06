import { Point } from 'math/point'

const MIN_LED_COUNT = 1
// TODO: double-check this number
const MAX_LED_COUNT = 418

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
