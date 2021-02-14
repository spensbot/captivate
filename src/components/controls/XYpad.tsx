import React from 'react'
import useDragMapped from '../hooks/useDragMapped'
import {useDispatch} from 'react-redux'
import {setBaseParams, incrementBaseParams} from '../../redux/paramsSlice'
import {ParamKey} from '../../engine/params'
import XYCursor from './XYCursor'
import XYWindow from './XYWindow'

export default function XYpad() {
  const dispatch = useDispatch()

  const [dragContainer, onMouseDown] = useDragMapped((x, y, e) => {
    if (e.metaKey) {
      dispatch(incrementBaseParams({
        [ParamKey.Width]: e.movementX / 100,
        [ParamKey.Height]: - e.movementY / 90
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
      marginRight: '2rem',
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