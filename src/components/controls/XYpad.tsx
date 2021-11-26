import React from 'react'
import useDragMapped from '../hooks/useDragMapped'
import {useDispatch} from 'react-redux'
import {setBaseParams, incrementBaseParams} from '../../redux/scenesSlice'
import {ParamKey} from '../../engine/params'
import XYCursor from './XYCursor'
import XYWindow from './XYWindow'

export default function XYpad() {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped(({ x, y, dx, dy }, e) => {
    if (e.metaKey) {
      dispatch(incrementBaseParams({
        [ParamKey.Width]: dx / 2,
        [ParamKey.Height]: dy / 2
      }))
    } else {
      dispatch(setBaseParams({
        [ParamKey.X]: x,
        [ParamKey.Y]: y
      }))
    }
  })

  const styles: {[key: string]: React.CSSProperties} = {
    root: {
      position: 'relative',
      width: '200px',
      height: '180px',
      background: `#000`,
      overflow: 'hidden'
    },
  }

  return (
    <div style={styles.root} ref={dragContainer} onMouseDown={onMouseDown}>
      <div style={styles.white}>
        <div style={styles.black}></div>
        <XYCursor />
        <XYWindow />
      </div>
    </div>
  )
}