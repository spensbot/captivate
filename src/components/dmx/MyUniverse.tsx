import React from 'react'
import { getSlots } from '../../engine/dmxFixtures'
import {useTypedSelector} from '../../redux/store'
import UniverseSlot from './UniverseSlot'

export default function MyUniverse() {

  const universe = useTypedSelector(state => state.dmx.universe)

  const elements = getSlots(universe).map((slot, index) => {
    return (
      <UniverseSlot key={index} slot={slot} />
    )
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
