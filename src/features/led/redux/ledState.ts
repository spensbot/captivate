import { LedFixture } from 'features/led/shared/ledFixtures'

// For non-dmx led devices (like WLED)
export interface LedState {
  ledFixtures: LedFixture[]
  activeFixture: null | number
}

export function initLedState(): LedState {
  return {
    ledFixtures: [],
    activeFixture: null,
  }
}
