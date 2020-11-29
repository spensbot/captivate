import React from 'react'
import useDrag from './hooks/useDrag'
import {useDispatch} from 'react-redux'
import {setParams} from '../redux/paramsSlice'
import {Param} from '../engine/params'

export default function Hue() {

  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDrag((x, y) => {
    dispatch(setParams({[Param.Hue]: x}))
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      width: '100%',
      height: '30px',
      background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
    }
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}></div>
  )
}
