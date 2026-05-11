import { nanoid } from 'nanoid'
import {
  FixtureType,
  normalizeFixtureModelConfig,
  migrateLegacyFixtureChannelDiscriminators,
} from './dmxFixtures'
import {
  looksLikeQlcFixtureDefinition,
  parseQlcFixtureDefinition,
} from './qlcFixtureImport'
import {
  looksLikeOflFixtureDefinition,
  parseOflFixtureDefinition,
} from './oflFixtureImport'

export const FIXTURE_LIBRARY_SCHEMA = 'captivate.fixture-library'
export const FIXTURE_LIBRARY_VERSION = 2

export interface FixtureLibrary {
  schema: string
  version: number
  fixtures: FixtureType[]
}

type JsonRecord = { [key: string]: unknown }

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((item): item is string => typeof item === 'string')
}

function normalizeChannels(input: unknown): FixtureType['channels'] | null {
  if (Array.isArray(input)) {
    return deepClone(input as FixtureType['channels'])
  }

  if (input !== null && typeof input === 'object') {
    const values = Object.entries(input as JsonRecord)
      .sort(([leftKey], [rightKey]) => {
        const leftNum = Number(leftKey)
        const rightNum = Number(rightKey)
        if (Number.isFinite(leftNum) && Number.isFinite(rightNum)) {
          return leftNum - rightNum
        }
        return leftKey.localeCompare(rightKey)
      })
      .map(([, value]) => value)

    return deepClone(values as FixtureType['channels'])
  }

  return null
}

function normalizeSubFixtures(input: unknown): FixtureType['subFixtures'] {
  if (Array.isArray(input)) {
    return deepClone(input as FixtureType['subFixtures'])
  }

  if (input !== null && typeof input === 'object') {
    const values = Object.values(input as JsonRecord)
    return deepClone(values as FixtureType['subFixtures'])
  }

  return []
}

function normalizeFixtureType(input: unknown): FixtureType | null {
  if (input === null || typeof input !== 'object') return null

  const rawFixture = input as JsonRecord
  const rootFixture =
    rawFixture.fixture !== null && typeof rawFixture.fixture === 'object'
      ? (rawFixture.fixture as JsonRecord)
      : rawFixture

  const channelsRaw = normalizeChannels(rootFixture.channels)
  if (typeof rootFixture.name !== 'string' || channelsRaw === null) {
    return null
  }

  const channels = migrateLegacyFixtureChannelDiscriminators(channelsRaw)
  const normalizedFixtureType: FixtureType = {
    id:
      typeof rootFixture.id === 'string' && rootFixture.id.trim().length > 0
        ? rootFixture.id
        : nanoid(),
    name: rootFixture.name,
    intensity:
      typeof rootFixture.intensity === 'number' &&
      Number.isFinite(rootFixture.intensity)
        ? rootFixture.intensity
        : 0,
    manufacturer:
      typeof rootFixture.manufacturer === 'string'
        ? rootFixture.manufacturer
        : undefined,
    channels,
    subFixtures: normalizeSubFixtures(rootFixture.subFixtures),
    groups: normalizeStringList(rootFixture.groups),
    moverCalibration:
      rootFixture.moverCalibration !== undefined &&
      rootFixture.moverCalibration !== null &&
      typeof rootFixture.moverCalibration === 'object'
        ? deepClone(rootFixture.moverCalibration as FixtureType['moverCalibration'])
        : undefined,
  }

  normalizedFixtureType.model = normalizeFixtureModelConfig(
    (rootFixture as { model?: unknown }).model,
    normalizedFixtureType
  )

  return normalizedFixtureType
}

function extractFixturesFromRecord(raw: JsonRecord): unknown[] {
  if (Array.isArray(raw.fixtures) && raw.fixtures.length > 0) {
    return raw.fixtures
  }

  if (Array.isArray(raw.fixtureTypes)) {
    const fixtures = raw.fixtureTypes
    const byIdRecord =
      raw.fixtureTypesByID !== null && typeof raw.fixtureTypesByID === 'object'
        ? (raw.fixtureTypesByID as JsonRecord)
        : null

    // Some state formats store fixtureType ids in fixtureTypes and fixtures in fixtureTypesByID.
    if (
      fixtures.length > 0 &&
      typeof fixtures[0] === 'string' &&
      byIdRecord !== null
    ) {
      const mapped = (fixtures as string[])
        .map((id) => byIdRecord[id])
        .filter((fixture) => fixture !== undefined)
      if (mapped.length > 0) {
        return mapped
      }
      // ID list empty after resolution, or every id missing — fall through to byId values below.
    } else if (fixtures.length > 0) {
      // Inline fixture objects (non-string entries) in fixtureTypes.
      return fixtures
    }

    // fixtureTypes is [] or only unresolved string ids — try fixtureTypesByID next.
  }

  if (raw.fixtureTypesByID !== null && typeof raw.fixtureTypesByID === 'object') {
    return Object.values(raw.fixtureTypesByID as JsonRecord)
  }

  if (raw.dmx !== null && typeof raw.dmx === 'object') {
    return getFixtureCandidates(raw.dmx)
  }

  if (raw.state !== null && typeof raw.state === 'object') {
    return getFixtureCandidates(raw.state)
  }

  if (raw.present !== null && typeof raw.present === 'object') {
    return getFixtureCandidates(raw.present)
  }

  return [raw]
}

function getFixtureCandidates(input: unknown): unknown[] {
  if (Array.isArray(input)) return input

  if (input !== null && typeof input === 'object') {
    return extractFixturesFromRecord(input as JsonRecord)
  }

  return []
}

function normalizeFixtureCandidates(candidates: unknown[]): FixtureType[] {
  return candidates
    .map(normalizeFixtureType)
    .filter((fixture): fixture is FixtureType => fixture !== null)
}

export function parseFixtureLibrary(serialized: string): FixtureType[] {
  const trimmed = serialized.trim()
  if (trimmed.length === 0) {
    throw new Error('Fixture file is empty.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
    const fixtures = normalizeFixtureCandidates(getFixtureCandidates(parsed))
    if (fixtures.length > 0) {
      return fixtures
    }

    if (looksLikeOflFixtureDefinition(parsed)) {
      const oflFixtures = normalizeFixtureCandidates(
        parseOflFixtureDefinition(parsed)
      )
      if (oflFixtures.length > 0) {
        return oflFixtures
      }
    }
  } catch (_err) {
    if (!looksLikeQlcFixtureDefinition(serialized)) {
      throw new Error(
        'Fixture file is not valid Captivate JSON, Open Fixture Library JSON, or QLC+ fixture XML.'
      )
    }
  }

  if (looksLikeQlcFixtureDefinition(serialized)) {
    const fixtures = normalizeFixtureCandidates(
      parseQlcFixtureDefinition(serialized)
    )

    if (fixtures.length > 0) {
      return fixtures
    }
  }

  throw new Error(
    'Fixture file does not contain any valid fixtures. Expected fixture object(s) with name + channels.'
  )
}

export function cloneFixtureType(
  fixture: FixtureType,
  options?: { keepId?: boolean; id?: string }
): FixtureType {
  const cloned = deepClone(fixture)
  cloned.id = options?.keepId ? fixture.id : options?.id ?? nanoid()
  return cloned
}

export function toFixtureLibrary(fixtures: FixtureType[]): FixtureLibrary {
  return {
    schema: FIXTURE_LIBRARY_SCHEMA,
    version: FIXTURE_LIBRARY_VERSION,
    fixtures: fixtures.map((fixture) =>
      cloneFixtureType(fixture, { keepId: true })
    ),
  }
}

export function serializeFixtureLibrary(fixtures: FixtureType[]): string {
  return JSON.stringify(toFixtureLibrary(fixtures), null, 2)
}
