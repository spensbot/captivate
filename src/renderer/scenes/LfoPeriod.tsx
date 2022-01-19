import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useActiveScene } from '../redux/store'
import { setPeriod } from '../redux/scenesSlice'
import DraggableNumber from '../base/DraggableNumber'

type Props = {
  index: number
}

// This is really bad react behavior... But IDK what else to do
let movement = 0

export default function LfoPeriod({ index }: Props) {
  const period = useActiveScene(
    (activeScene) => activeScene.modulators[index].lfo.period
  )
  const periodString = Number.isInteger(period)
    ? period.toString()
    : period.toFixed(2)

  const dispatch = useDispatch()

  function onChange(newVal: number) {
    dispatch(setPeriod({ index: index, newVal: newVal }))
  }

  return (
    <DraggableNumber
      value={period}
      min={0.25}
      max={32}
      onChange={onChange}
      style={{}}
    />
  )
}
