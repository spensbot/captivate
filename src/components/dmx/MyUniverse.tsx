import React from 'react'
import { Fixture, Universe } from '../../engine/dmxFixtures'
import {useTypedSelector} from '../../redux/store'
import MyUniverseFixture from './MyUniverseFixture'

export default function MyUniverse() {

  const universe = useTypedSelector(state => state.dmx.universe)

  interface GapSlot {
    kind: 'gap'
    count: number
  }

  interface FixtureSlot {
    kind: 'fixture'
    fixture: Fixture
  }

  interface Slot {
    channel: number
    data: GapSlot | FixtureSlot 
  }

  function getSlots(universe: Universe): Slot[] {
    const slots: Slot[] = []

    universe.forEach((fixture, index) => {
      if (fixture !== null) {
        slots.push({
          channel: index + 1,
          data: {
            kind: 'fixture',
            fixture: fixture
          }
        })
      } else {
        const lastSlot = slots[slots.length - 1]
        if (lastSlot.data.kind === 'gap') {
          lastSlot.data.count += 1
        } else {
          slots.push({
            channel: index + 1,
            data: {
              kind: 'gap',
              count: 1
            }
          })
        }
      }
    });

    return slots
  }

  const elements = getSlots(universe).map(slot => {
    if (slot.data.kind === 'gap') {
      return null
    } else {
      return (
        <MyUniverseFixture key={slot.channel} channel={slot.channel} fixture={slot.data.fixture} />
      )
    }
  })

  return (
    <div style={{ backgroundColor: '#ffffff07', padding: '0.5rem', height: '100%', maxHeight: '100%'}}>
      <div style={{fontSize: '1.5rem'}}>Universe</div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'start', flexWrap: 'wrap', overflow: 'scroll'}}>
        {elements}
      </div>
      <div style={{backgroundColor: '#0007', width: '100%', height: '50%'}}>
        Fixture placement
      </div>
    </div>
  )
}
