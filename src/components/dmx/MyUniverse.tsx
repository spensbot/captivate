import React from 'react'
import { Universe, Fixture } from '../../engine/dmxFixtures'
import {useTypedSelector} from '../../redux/store'
import FixturePlacement from './FixturePlacement'
import UniverseSlot from './UniverseSlot'

interface GapSlot_t {
  kind: 'gap'
  ch: number
  count: number
}

interface FixtureSlot_t {
  kind: 'fixture'
  index: number
  fixture: Fixture
}

export type Slot_t = GapSlot_t | FixtureSlot_t

export default function MyUniverse() {

  const universe = useTypedSelector(state => state.dmx.universe)
  const fixtureTypesByID = useTypedSelector(state => state.dmx.fixtureTypesByID)
  
  function getSlots(universe: Universe): Slot_t[] {
    const slots: Slot_t[] = []
  
    if (universe.length > 0) {
      if (universe[0].ch > 1) {
        slots.push({
          kind: 'gap',
          ch: 1,
          count: universe[0].ch - 1
        })
      }

      for (let i = 0; i < universe.length - 1 ; i++) {
        const f0 = universe[i]
        const f1 = universe[i + 1]
        const f0_endCh = f0.ch + fixtureTypesByID[f0.type].channels.length - 1

        slots.push({
          kind: 'fixture',
          fixture: f0,
          index: i
        })

        if (f1.ch - (f0_endCh + 1) > 1) {
          slots.push({
            kind: 'gap',
            ch: f0_endCh + 1,
            count: f1.ch - (f0_endCh + 1)
          })
        }
      }

      slots.push({
        kind: 'fixture',
        fixture: universe[universe.length - 1],
        index: universe.length - 1
      })
  
      const last = universe[universe.length - 1]
      const lastCount = fixtureTypesByID[last.type].channels.length
      const lastChannel = last.ch + lastCount - 1
      if (lastChannel < 512) {
        slots.push({
          kind: 'gap',
          ch: lastChannel + 1,
          count: 512 - lastChannel
        })
      }
    }
  
    return slots
  }

  const elements = getSlots(universe).map((slot, index) => {
    return (
      <UniverseSlot key={index} slot={slot}/>
    )
  })

  return (
    <div style={{
      backgroundColor: '#0003', padding: '0.5rem',
      height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column'
    }}>
      <div style={{fontSize: '1.5rem', margin: '0 0 0.5rem'}}>Universe</div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'start', flexWrap: 'wrap', overflow: 'scroll'}}>
        {elements}
      </div>
      <FixturePlacement />
    </div>
  )
}
