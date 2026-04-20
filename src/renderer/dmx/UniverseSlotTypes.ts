import { Fixture } from '../../shared/dmxFixtures'

export interface GapSlot_t {
  kind: 'gap'
  ch: number
  count: number
}

export interface FixtureSlot_t {
  kind: 'fixture'
  localIndex: number
  globalIndex: number
  fixture: Fixture
}

export type Slot_t = GapSlot_t | FixtureSlot_t
