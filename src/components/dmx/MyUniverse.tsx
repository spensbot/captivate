import React from 'react'
import {useTypedSelector} from '../../redux/store'
import root from '../../util/prepareDOM'
import MyUniverseFixture from './MyUniverseFixture'

export default function MyUniverse() {

  const universe = useTypedSelector(state => state.dmx.universe)

  const elements = Object.entries(universe).map(([channelNum, fixture]) => {
    return (
      <MyUniverseFixture key={channelNum} fixture={fixture} />
    )
  })

  const rootStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'start',
    flexWrap: 'wrap'
  }

  return (
    <div style={rootStyle}>
      {elements}
    </div>
  )
}
