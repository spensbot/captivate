import type { SaveConfig, SaveState, SaveType } from './save'
import { saveTypes } from './save'

export interface ProjectContentCounts {
  lightScenes: number
  visualScenes: number
  universeFixtures: number
  fixtureTypes: number
  ledFixtures: number
  laserFixtures: number
}

export interface CleanReduxStateCountsSource {
  dmx: {
    universe: unknown[]
    fixtureTypes: unknown[]
    led?: { ledFixtures?: unknown[] }
  }
  control: {
    light: { ids: unknown[] }
    visual: { ids: unknown[] }
  }
  laser?: { units?: unknown[]; fixtures?: unknown[] }
}

export function countProjectContent(
  source: SaveState | CleanReduxStateCountsSource
): ProjectContentCounts {
  const dmx = 'dmx' in source ? source.dmx : undefined
  const light = 'light' in source ? source.light : undefined
  const visual = 'visual' in source ? source.visual : undefined
  const laser = 'laser' in source ? source.laser : undefined

  if ('control' in source) {
    return {
      lightScenes: source.control.light.ids.length,
      visualScenes: source.control.visual.ids.length,
      universeFixtures: source.dmx.universe.length,
      fixtureTypes: source.dmx.fixtureTypes.length,
      ledFixtures: source.dmx.led?.ledFixtures?.length ?? 0,
      laserFixtures: source.laser?.units?.length ?? 0,
    }
  }

  const laserCounts = laser as { units?: unknown[]; fixtures?: unknown[] } | undefined

  return {
    lightScenes: light?.ids?.length ?? 0,
    visualScenes: visual?.ids?.length ?? 0,
    universeFixtures: dmx?.universe?.length ?? 0,
    fixtureTypes: dmx?.fixtureTypes?.length ?? 0,
    ledFixtures: dmx?.led?.ledFixtures?.length ?? 0,
    laserFixtures:
      laserCounts?.units?.length ?? laserCounts?.fixtures?.length ?? 0,
  }
}

export function describeSaveConfig(config: SaveConfig): Record<SaveType, boolean> {
  const out = {} as Record<SaveType, boolean>
  for (const key of saveTypes) {
    out[key] = config[key] === true
  }
  return out
}

/** Which top-level sections exist in a parsed project file (before apply). */
export function describeSaveFileSections(
  state: SaveState
): Record<SaveType, boolean> {
  const out = {} as Record<SaveType, boolean>
  for (const key of saveTypes) {
    out[key] = state[key] !== undefined
  }
  return out
}

export function formatProjectContentCounts(counts: ProjectContentCounts): string {
  return (
    `scenes=${counts.lightScenes}/${counts.visualScenes} ` +
    `fixtures=${counts.universeFixtures} types=${counts.fixtureTypes} ` +
    `led=${counts.ledFixtures} laser=${counts.laserFixtures}`
  )
}
