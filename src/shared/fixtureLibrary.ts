import { nanoid } from 'nanoid'
import { FixtureType } from './dmxFixtures'

export const FIXTURE_LIBRARY_SCHEMA = 'captivate.fixture-library'
export const FIXTURE_LIBRARY_VERSION = 1

export interface FixtureLibrary {
  schema: string
  version: number
  fixtures: FixtureType[]
}

type JsonRecord = { [key: string]: unknown }

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeFixtureType(input: unknown): FixtureType | null {
  if (input === null || typeof input !== 'object') return null

  const raw = input as JsonRecord
  if (typeof raw.name !== 'string' || !Array.isArray(raw.channels)) return null

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim().length > 0
        ? raw.id
        : nanoid(),
    name: raw.name,
    intensity:
      typeof raw.intensity === 'number' && Number.isFinite(raw.intensity)
        ? raw.intensity
        : 0,
    manufacturer:
      typeof raw.manufacturer === 'string' ? raw.manufacturer : undefined,
    channels: deepClone(raw.channels as FixtureType['channels']),
    subFixtures: Array.isArray(raw.subFixtures)
      ? deepClone(raw.subFixtures as FixtureType['subFixtures'])
      : [],
    groups: Array.isArray(raw.groups)
      ? raw.groups.filter((group): group is string => typeof group === 'string')
      : [],
  }
}

function getFixtureCandidates(input: unknown): unknown[] {
  if (Array.isArray(input)) return input

  if (input !== null && typeof input === 'object') {
    const raw = input as JsonRecord
    if (Array.isArray(raw.fixtures)) {
      return raw.fixtures
    }
    return [input]
  }

  return []
}

export function parseFixtureLibrary(serialized: string): FixtureType[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(serialized)
  } catch (_err) {
    throw new Error('Fixture file is not valid JSON.')
  }

  const fixtures = getFixtureCandidates(parsed)
    .map(normalizeFixtureType)
    .filter((fixture): fixture is FixtureType => fixture !== null)

  if (fixtures.length === 0) {
    throw new Error('Fixture file does not contain any valid fixtures.')
  }

  return fixtures
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
