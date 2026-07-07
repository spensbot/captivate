import {
  DMX_MAX_VALUE,
  DMX_MIN_VALUE,
} from '../../shared/dmxFixtures'
import { mapAxisPhysicalDmxToNormalized } from '../../shared/dmxUtil'
import type { MoverAxisPhysicalCalibration } from '../../shared/dmxUtil'
import type { LightingPreviewFixtureRow } from './lightingPreviewFixtures'

export interface LiveAxisReadout {
  panRaw: number
  tiltRaw: number
  panNorm: number
  tiltNorm: number
}

export type MoverAxisSnapshot = LiveAxisReadout | null

export interface MoverAxisChannelPlan {
  universeIndex: number
  panCoarseChannel: number
  panFineChannel: number | null
  tiltCoarseChannel: number
  tiltFineChannel: number | null
  panMin: number
  panMax: number
  tiltMin: number
  tiltMax: number
  panCalibration?: MoverAxisPhysicalCalibration
  tiltCalibration?: MoverAxisPhysicalCalibration
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

function normalizeAxisValue(value: number, min: number, max: number): number {
  const minValue = Number.isFinite(min) ? min : 0
  const maxValue = Number.isFinite(max) ? max : 255

  if (Math.abs(maxValue - minValue) < 0.0001) {
    return clamp01(value / 255)
  }

  if (maxValue > minValue) {
    return clamp01((value - minValue) / (maxValue - minValue))
  }

  return clamp01((minValue - value) / (minValue - maxValue))
}

export function buildMoverAxisChannelPlans(
  rows: LightingPreviewFixtureRow[]
): Array<MoverAxisChannelPlan | null> {
  return rows.map((row) => {
    let panCoarseChannel: number | null = null
    let panFineChannel: number | null = null
    let tiltCoarseChannel: number | null = null
    let tiltFineChannel: number | null = null
    let panMin = DMX_MIN_VALUE
    let panMax = DMX_MAX_VALUE
    let tiltMin = DMX_MIN_VALUE
    let tiltMax = DMX_MAX_VALUE

    row.fixtureType.channels.forEach((channel, channelIndex) => {
      if (channel.type !== 'axis') return
      const absoluteChannel = row.fixture.ch + channelIndex - 1

      if (channel.dir === 'x') {
        if (channel.isFine) {
          panFineChannel = absoluteChannel
        } else {
          panCoarseChannel = absoluteChannel
          panMin = channel.min
          panMax = channel.max
        }
        return
      }

      if (channel.isFine) {
        tiltFineChannel = absoluteChannel
      } else {
        tiltCoarseChannel = absoluteChannel
        tiltMin = channel.min
        tiltMax = channel.max
      }
    })

    if (panCoarseChannel === null || tiltCoarseChannel === null) {
      return null
    }

    return {
      universeIndex: Math.max(1, Math.round(row.fixture.universe ?? 1)) - 1,
      panCoarseChannel,
      panFineChannel,
      tiltCoarseChannel,
      tiltFineChannel,
      panMin,
      panMax,
      tiltMin,
      tiltMax,
      panCalibration: row.fixtureType.moverCalibration?.pan,
      tiltCalibration: row.fixtureType.moverCalibration?.tilt,
    }
  })
}

export function readLiveAxisFromPlan(
  plan: MoverAxisChannelPlan,
  dmxOutByUniverse: number[][]
): LiveAxisReadout | null {
  const universeData = dmxOutByUniverse[plan.universeIndex]
  if (universeData === undefined) {
    return null
  }

  const panCoarse = universeData[plan.panCoarseChannel]
  const tiltCoarse = universeData[plan.tiltCoarseChannel]
  if (!Number.isFinite(panCoarse) || !Number.isFinite(tiltCoarse)) {
    return null
  }

  const panFine =
    plan.panFineChannel !== null ? universeData[plan.panFineChannel] ?? 0 : 0
  const tiltFine =
    plan.tiltFineChannel !== null ? universeData[plan.tiltFineChannel] ?? 0 : 0

  const panRaw = Number(panCoarse) + Number(panFine) / 256
  const tiltRaw = Number(tiltCoarse) + Number(tiltFine) / 256

  return {
    panRaw,
    tiltRaw,
    panNorm:
      plan.panCalibration !== undefined
        ? mapAxisPhysicalDmxToNormalized(panRaw, plan.panCalibration)
        : normalizeAxisValue(panRaw, plan.panMin, plan.panMax),
    tiltNorm:
      plan.tiltCalibration !== undefined
        ? mapAxisPhysicalDmxToNormalized(tiltRaw, plan.tiltCalibration)
        : normalizeAxisValue(tiltRaw, plan.tiltMin, plan.tiltMax),
  }
}

export function selectMoverAxisSnapshots(
  plans: Array<MoverAxisChannelPlan | null>,
  dmxOutByUniverse: number[][]
): MoverAxisSnapshot[] {
  return plans.map((plan) =>
    plan === null ? null : readLiveAxisFromPlan(plan, dmxOutByUniverse)
  )
}

export function moverAxisSnapshotsEqual(
  a: MoverAxisSnapshot[],
  b: MoverAxisSnapshot[]
): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    const av = a[i]
    const bv = b[i]
    if (av === null && bv === null) {
      continue
    }
    if (av === null || bv === null) {
      return false
    }
    if (
      av.panRaw !== bv.panRaw ||
      av.tiltRaw !== bv.tiltRaw ||
      av.panNorm !== bv.panNorm ||
      av.tiltNorm !== bv.tiltNorm
    ) {
      return false
    }
  }
  return true
}
