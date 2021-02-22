import React from 'react'
import { useDispatch } from 'react-redux';
import { ParamKey } from '../../engine/params';
import { useTypedSelector } from '../../redux/store'
import { setModulation } from '../../redux/scenesSlice'
import useDragMapped from '../hooks/useDragMapped'

export default function ModulationSlider({index, param}: {index: number, param: ParamKey}) {

  const amount = useTypedSelector(state => state.scenes.byId[state.scenes.active].modulators[index].modulation[param])
  const dispatch = useDispatch()
  const [dragContainer, onMouseDown] = useDragMapped(({ x }) => {
    dispatch(setModulation({param: param, index: index, value: x}))
  })

  const style: React.CSSProperties = {
    position: 'relative',
    userSelect: 'none',
    textAlign: 'center',
    backgroundColor: '#ffffff08',
    border: '1px solid #fff1',
    color: '#fff7',
    fontSize: '0.8rem'
  }

  const width = Math.abs(amount - 0.5)
  const left = amount > 0.5 ? 0.5 : amount

  return (
    <div ref={dragContainer} onMouseDown={onMouseDown} style={ style }>{param}
      <div style={{ backgroundColor:'#aaf3', position: 'absolute', top: 0, left: `${left * 100}%`, bottom: 0, width: `${width * 100}%`}}></div>
    </div>
  )
}