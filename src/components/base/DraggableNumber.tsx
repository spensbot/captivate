import React, { useState } from 'react'
import { clamp } from '../../util/helpers'
import useDragBasic from '../hooks/useDragBasic'

type Props = {
  value: number
  min: number
  max: number
  onChange: (newVal: number) => void
  style: React.CSSProperties
}

// This is really bad react behavior... But IDK what else to do
// This only works if you can't drag more than 1 thing at a time
let globalMovement = 0
let globalValue = 0

export default function DraggableNumber({value, min, max, onChange, style}: Props) {

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX
    const dy = - e.movementY
    const d = (dx + dy) / 50

    if (e.metaKey) {
      globalValue += d
    } else {
      if (Number.isInteger(globalValue)) {
        globalMovement += d*2
        if (globalMovement > 1) {
          globalValue += 1
          globalMovement = 0
        } else if (globalMovement < -1) {
          globalValue -= 1
          globalMovement = 0
        }
      } else {
        // We are somewhere between integers. 
        //   "Snap" to the next integer
        const floor = Math.floor(globalValue)
        const ceil = Math.ceil(globalValue)
        globalValue += d*2
        if (globalValue > ceil) {
          globalValue = ceil
        } else if (globalValue < floor) {
          globalValue = floor
        }
      }
    }

    globalValue = clamp(globalValue, min, max)

    onChange(globalValue)
  })

  function onMouseDownWrapper(e: React.MouseEvent) {
    globalMovement = 0
    globalValue = value
    onMouseDown(e)
  }

  const valueString = Number.isInteger(value) ? value.toString() : value.toFixed(2)

  return (
    <div ref={dragContainer} onMouseDown={onMouseDownWrapper} style={{ padding: '0.5rem 0.8rem', backgroundColor: '#0005', cursor: 'move', ...style }}>
      {valueString}
    </div>
  )
}
