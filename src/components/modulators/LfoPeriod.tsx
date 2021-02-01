import React, { useState } from 'react'
import useDragBasic from '../hooks/useDragBasic'
import { useDispatch } from 'react-redux'
import { useTypedSelector } from '../../redux/store'
import { incrementPeriod } from '../../redux/modulatorsSlice'

type Props = {
  index: number
} 

// This is really bad react behaviour... But IDK what else to do
let movement = 0

export default function LfoPeriod({index}: Props) {
  const period = useTypedSelector(state => state.modulators[index].lfo.period)
  const periodString = Number.isInteger(period) ? period.toString() : period.toFixed(2)

  const dispatch = useDispatch();
  function incrementPeriodBy(amount: number) {
    dispatch(incrementPeriod({index: index, amount: amount}))
  }

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = e.movementX
    const dy = - e.movementY
    const d = (dx + dy) / 50

    if (e.metaKey) {
      incrementPeriodBy(d)
    } else {
      const newMovement = movement + (d * 2)
      if (newMovement > 1) {
        incrementPeriodBy(1)
        movement = 0
      } else if (newMovement < -1) {
        incrementPeriodBy(-1)
        movement = 0
      } else {
        movement = newMovement
      }
    }
  })

  function onMouseDownWrapper(e: React.MouseEvent) {
    movement = 0
    onMouseDown(e)
  }

  return (
    <div ref={dragContainer} onMouseDown={onMouseDownWrapper} style={{ padding: '0.5rem', backgroundColor: '#0005', cursor: 'move' }}>
      {periodString}
    </div>
  )
}
