import React from 'react'
import { paramsList } from '../../engine/params'
import ModulationSlider from './ModulationSlider'

export default function ModulationMatrix({index}: {index: number}) {

  return (
    <div>
      {paramsList.map(paramKey => {
        return (
          <ModulationSlider key={paramKey} index={index} param={paramKey}/>
        )
      })}
    </div>
  )
}