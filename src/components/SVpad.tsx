import React, {useState} from 'react'
import useDrag from './hooks/useDrag'
import {useTypedSelector} from '../redux/store'
import {useDispatch} from 'react-redux'
import {setParams} from '../redux/paramsSlice'
import {Param} from '../engine/params'

export default function SVpad() {

  const radiusREM = 0.4

  const {X, Y, Hue} = useTypedSelector(state => state.params)
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDrag((x, y) => {
    dispatch(setParams({
      [Param.X]: x,
      [Param.Y]: y
    }))
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '350px',
      height: '200px',
      background: `hsl(${Hue * 360},100%, 50%)`,
    },
    white: {
      position: 'absolute',
      background: 'linear-gradient(to right, #fff, rgba(255,255,255,0))',
      top: '0', right: '0', bottom: '0', left: '0'
    },
    black: {
      position: 'absolute',
      background: 'linear-gradient(to top, #000, rgba(0,0,0,0))',
      top: '0', right: '0', bottom: '0', left: '0',
    },
    cursor: {
      position: 'absolute',
      top: `${(1 - Y) * 100}%`,
      left: `${X * 100}%`,
      width: `${radiusREM*2}rem`,
      height: `${radiusREM*2}rem`,
      borderRadius: '50%',
      border: '1.5px solid black',
      transform: `translate(-${radiusREM}rem, -${radiusREM}rem)`
    }
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <div style={styles.cursor}></div>
      </div>
    </div>
  )
}
