import React from 'react'
import LfoMenu from './LfoMenu'
import LfoVisualizer from './LfoVisualizer'
import LfoCursor from './LfoCursor'
import ModulationMatrix from './ModulationMatrix'

type Props = {
  index: number
}

export default function ModulatorControl({index}: Props) {
  return (
    <div style={{marginRight: '1rem'}}>
      <LfoMenu index={index} />
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <LfoVisualizer width={200} height={150} padding={0.05} index={index}/>
        <LfoCursor index={index} padding={0.05}/>
      </div>
      <ModulationMatrix index={index} />
    </div>
  )
}
