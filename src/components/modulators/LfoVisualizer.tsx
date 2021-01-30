import React from 'react'
import { Lfo, GetSin, GetRamp, LfoShape } from '../../engine/oscillator'
import { GetValueFromPhase } from '../../engine/oscillator'
import { useDispatch } from 'react-redux'
import useDragBasic from '../hooks/useDragBasic'
import { incrementPeriod, incrementModulator, removeModulator, setModulatorShape } from '../../redux/modulatorsSlice'
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';

type Props = {
  lfo: Lfo
  index: number
}

const stepSize = 2
const height = 150
const width = 200
const padding = 5
const width_ = width - padding * 2
const height_ = height - padding * 2
const lineWidth = 2
const backgroundColor = '#000000'
const lineColor = '#33ff33'

export default function LfoVisualizer({lfo, index}: Props) {
  const dispatch = useDispatch();

  const [dragContainer, onMouseDown] = useDragBasic((e) => {
    const dx = - e.movementX / width
    const dy = e.movementY / height
    dispatch(incrementModulator({
      index: index,
      phaseShift: e.metaKey ? 0 : dx,
      flip: e.metaKey ? 0 : dy,
      symmetricSkew: e.metaKey ? dx : 0,
      skew: e.metaKey ? dy : 0,
    }))
  })

  function GetPoints() {
    const zeros = Array(width_ / stepSize + 1).fill(0)

    const pointsArray = zeros.map((_, i) => {
      const x = i * stepSize / width_
      const y = 1 - GetValueFromPhase(lfo, x)
      return [x * width_ + padding, y * height_ + padding]
    })

    const points = pointsArray.reduce((accum, point) => {
      return accum + `${point[0]},${point[1]}` + ' '
    }, "")
    
    return points
  }

  function incrementPeriodBy(amount: number) {
    return () => {
      dispatch(incrementPeriod({index: index, amount: amount}))
    }
  }

  return (
    <div>
      <div style={{ margin: '0.5rem', display: 'flex', flexDirection: 'row' }}>
        <Select labelId="lfo-shape-select-label" id="lfo-shape-select" value={lfo.shape}
          onChange={(e) => dispatch(setModulatorShape({ index: index, shape: e.target.value }))}>
          <MenuItem value={LfoShape.Ramp}>Ramp</MenuItem>
          <MenuItem value={LfoShape.Random}>Random</MenuItem>
          <MenuItem value={LfoShape.Sin}>Sin</MenuItem>
        </Select>
        <div style={{padding: '0.5rem', backgroundColor: '#fff5'}} onClick={incrementPeriodBy(-1)}></div>
        <div>{ lfo.period }</div>
        <div style={{padding: '0.5rem', backgroundColor: '#fff5'}} onClick={incrementPeriodBy(1)}></div>
        <IconButton style={{ backgroundColor: '#000c' }} color="primary" aria-label="delete" size="small" onClick={() => dispatch(removeModulator(index))}>
          <CloseIcon />
        </IconButton>
      </div>
      <div ref={dragContainer} onMouseDown={onMouseDown} style={{width: width, height: height, backgroundColor: backgroundColor, margin: '1rem'}}>
        <svg height={height} width={width}>
          <polyline points={GetPoints()} style={{ fill: 'none', stroke: lineColor, strokeWidth: lineWidth}}/>
        </svg>
      </div>
    </div>
  )
}
