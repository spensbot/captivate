import React from 'react'
import useDragMapped from '../hooks/useDragMapped'
import {useDispatch} from 'react-redux'
import {setBaseParams} from '../../redux/paramsSlice'
import {ParamKey} from '../../engine/params'
import SVCursor from './SVCursor'
import { useRealtimeSelector } from '../../redux/realtimeStore'

export default function SVpad() {

  const hue = useRealtimeSelector(state => state.outputParams.Hue)
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y }) => {
    dispatch(setBaseParams({
      [ParamKey.Saturation]: x,
      [ParamKey.Brightness]: y
    }))
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '200px',
      height: '160px',
      background: `hsl(${hue * 360},100%, 50%)`,
      overflow: 'hidden'
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
    }
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <SVCursor />
      </div>
    </div>
  )
}
