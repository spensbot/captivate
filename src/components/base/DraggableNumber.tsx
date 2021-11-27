import React, { useState } from 'react'
import { clamp } from '../../util/helpers'
import useDragBasic from '../hooks/useDragBasic'

type Type = 'continuous' | 'snap'

interface Props {
  type?: Type
  withMetaKey?: Type
  value: number
  min: number
  max: number
  onChange: (newVal: number) => void
  style?: React.CSSProperties
}

// This is really bad react behavior... But IDK what else to do
// This only works if you can't drag more than 1 thing at a time
let globalMovement = 0
let globalValue = 0

export default function DraggableNumber({ type="snap", withMetaKey="continuous", value, min, max, onChange, style }: Props) {
  
  const speedAdjust = 500 / (max - min)

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX
    const dy = - e.movementY
    const d = (dx + dy) / speedAdjust

    console.log(d)

    const adjust_continuous = () => {
      globalValue += d / 2
    }
    const adjust_snap = () => {
      // console.log(`${globalValue} + ${globalMovement}`)
      if (Number.isInteger(globalValue)) {
        globalMovement += d
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
        globalValue += d
        if (globalValue > ceil) {
          globalValue = ceil
        } else if (globalValue < floor) {
          globalValue = floor
        }
      }
    }

    if (e.metaKey) {
      if (withMetaKey === 'snap') {
        adjust_snap()
      } else {
        adjust_continuous()
      }
    } else {
      if (type === 'snap') {
        adjust_snap()
      } else {
        adjust_continuous()
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

  let valueString = (type === 'snap' && Number.isInteger(value)) ? value.toString() : value.toFixed(2)

  return (
    <div ref={dragContainer} onMouseDown={onMouseDownWrapper} style={{ padding: '0.5rem 0.8rem', backgroundColor: '#0005', cursor: 'move', ...style }}>
      {valueString}
    </div>
  )
}
